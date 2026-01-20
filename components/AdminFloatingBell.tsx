"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Counts = {
  sessoes: number;
  compras: number;
};

function canUseNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

async function ensureNotificationPermission() {
  if (!canUseNotifications()) return "unsupported" as const;

  if (Notification.permission === "granted") return "granted" as const;
  if (Notification.permission === "denied") return "denied" as const;

  const permission = await Notification.requestPermission();
  return permission as "granted" | "denied" | "default";
}

function notifyBrowser(title: string, body: string) {
  if (!canUseNotifications()) return;
  if (Notification.permission !== "granted") return;

  try {
    const n = new Notification(title, {
      body,
      icon: "/logo.png",
      badge: "/logo.png",
    });

    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (e) {
    console.warn("Notification falhou:", e);
  }
}

async function playSoundSafe() {
  try {
    const audio = new Audio("/sounds/notify.mp3");
    audio.volume = 0.8;
    await audio.play();
  } catch (e) {
    console.warn("Som bloqueado/erro:", e);
  }
}

export default function AdminFloatingBell() {
  const router = useRouter();
  const pathname = usePathname();

  const [isAdmin, setIsAdmin] = useState(false);
  const [notifStatus, setNotifStatus] = useState<
    "unknown" | "unsupported" | "default" | "granted" | "denied"
  >("unknown");

  const [counts, setCounts] = useState<Counts>({ sessoes: 0, compras: 0 });
  const [open, setOpen] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const total = useMemo(() => counts.sessoes + counts.compras, [counts]);

  // Carrega contagem inicial
  async function refreshCounts() {
    const { count: sessoes } = await supabase
      .from("sessoes")
      .select("*", { count: "exact", head: true })
      .eq("status", "aguardando");

    const { count: compras } = await supabase
      .from("compras")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente");

    setCounts({ sessoes: sessoes || 0, compras: compras || 0 });
  }

  useEffect(() => {
    if (!canUseNotifications()) {
      setNotifStatus("unsupported");
      return;
    }
    setNotifStatus(Notification.permission as any);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user || !mounted) return;

      const { data: u } = await supabase
        .from("usuarios")
        .select("tipo")
        .eq("id", user.id)
        .single();

      if (!u || u.tipo !== "admin" || !mounted) return;

      setIsAdmin(true);
      await refreshCounts();

      // listener global
      const channel = supabase
        .channel("admin-bell-global")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sessoes" },
          (payload) => {
            const sessao: any = payload.new;
            if (sessao?.status === "aguardando") {
              refreshCounts();
              playSoundSafe();
              notifyBrowser(
                "🔔 Nova consulta aguardando",
                "Clique para abrir o Admin."
              );
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "compras" },
          (payload) => {
            const compra: any = payload.new;
            if (compra?.status === "pendente") {
              refreshCounts();
              playSoundSafe();
              notifyBrowser(
                "💳 Pagamento pendente",
                "Clique para abrir o Admin."
              );
            }
          }
        )
        .subscribe((status, err) => {
          console.log("[realtime] admin-bell:", status);
          if (err) console.error("[realtime] admin-bell error:", err);
        });

      channelRef.current = channel;
    };

    init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  if (!isAdmin) return null;

  async function enableNotifications() {
    const permission = await ensureNotificationPermission();
    setNotifStatus(permission as any);

    if (permission === "granted") {
      notifyBrowser(
        "✅ Notificações ativadas",
        "Você receberá alertas de pendências."
      );
      await playSoundSafe(); // destrava som via clique
    } else if (permission === "denied") {
      alert(
        "Notificações bloqueadas. Libere no cadeado da barra de endereço > Notificações > Permitir."
      );
    } else if (permission === "unsupported") {
      alert("Este navegador não suporta notificações.");
    }
  }

  function goAdminDefault() {
    // Se tiver consultas pendentes, vai pra elas. Senão vai pra pagamentos. Senão dashboard.
    if (counts.sessoes > 0) router.push("/admin?tab=consultas");
    else if (counts.compras > 0) router.push("/admin?tab=pagamentos");
    else router.push("/admin");
  }

  function goTo(tab: "consultas" | "pagamentos") {
    router.push(`/admin?tab=${tab}`);
    setOpen(false);
  }

  // Oculta no /admin? se você quiser, remova essa condição
  const hideOnAdmin = pathname?.startsWith("/admin");
  if (hideOnAdmin) {
    // Se você quer que apareça também no /admin, apaga esse bloco inteiro.
    // return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Dropdown */}
      {open && (
        <div className="mb-3 w-72 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <p className="text-white font-bold">Pendências</p>
              <button
                onClick={() => setOpen(false)}
                className="text-white/60 hover:text-white"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <p className="text-white/60 text-sm mt-1">
              {total > 0
                ? `Você tem ${total} pendência(s).`
                : "Nenhuma pendência agora."}
            </p>
          </div>

          <div className="p-3 space-y-2">
            <button
              onClick={() => goTo("consultas")}
              className="w-full flex items-center justify-between rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 text-left transition-all"
            >
              <div className="flex items-center gap-2">
                <span>💬</span>
                <div>
                  <p className="text-white font-medium">Consultas</p>
                  <p className="text-white/50 text-xs">
                    Aguardando atendimento
                  </p>
                </div>
              </div>
              <span className="text-white font-bold">{counts.sessoes}</span>
            </button>

            <button
              onClick={() => goTo("pagamentos")}
              className="w-full flex items-center justify-between rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 text-left transition-all"
            >
              <div className="flex items-center gap-2">
                <span>💳</span>
                <div>
                  <p className="text-white font-medium">Pagamentos</p>
                  <p className="text-white/50 text-xs">
                    Pendentes de aprovação
                  </p>
                </div>
              </div>
              <span className="text-white font-bold">{counts.compras}</span>
            </button>

            <div className="pt-2 border-t border-white/10 flex gap-2">
              <button
                onClick={refreshCounts}
                className="flex-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 text-white/80 text-sm"
              >
                🔄 Atualizar
              </button>

              {notifStatus !== "granted" && (
                <button
                  onClick={enableNotifications}
                  className="flex-1 rounded-xl bg-green-500/15 hover:bg-green-500/20 border border-green-500/30 px-3 py-2 text-green-200 text-sm"
                >
                  🔔 Ativar alertas
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botão flutuante */}
      <button
        onClick={() => {
          // Clique simples abre dropdown; duplo clique (ou click + ctrl) manda pro admin direto
          setOpen((v) => !v);
        }}
        onDoubleClick={goAdminDefault}
        className="relative w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 shadow-2xl shadow-purple-500/30 hover:scale-110 transition-all flex items-center justify-center"
        title="Pendências do Admin (duplo clique abre o Admin)"
      >
        <span className="text-2xl">🔔</span>

        {/* Badge */}
        {total > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[22px] h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
            {total > 99 ? "99+" : total}
          </span>
        )}

        {/* Ring quando tem pendência */}
        {total > 0 && (
          <span className="absolute inset-0 rounded-full ring-2 ring-red-500/60 animate-pulse" />
        )}
      </button>

      {/* Clique direto pra ação (atalho) */}
      <div className="mt-2 flex justify-center gap-2">
        <button
          onClick={goAdminDefault}
          className="text-xs px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-white/70 hover:bg-white/15"
          title="Ir direto para a área com pendência"
        >
          Abrir Admin
        </button>
      </div>
    </div>
  );
}

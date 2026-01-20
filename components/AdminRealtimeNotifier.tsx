"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  // o caminho está certo: /public/sounds/notify.mp3 -> "/sounds/notify.mp3"
  try {
    const audio = new Audio("/sounds/notify.mp3");
    audio.volume = 0.8;
    await audio.play();
  } catch (e) {
    // Chrome bloqueia autoplay se o usuário não interagiu antes
    console.warn("Som bloqueado pelo navegador (precisa interação):", e);
  }
}

export default function AdminRealtimeNotifier() {
  const [enabled, setEnabled] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // 1) precisa estar logado
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user || !mounted) return;

      // 2) precisa ser admin
      const { data: u } = await supabase
        .from("usuarios")
        .select("tipo")
        .eq("id", user.id)
        .single();

      if (!u || u.tipo !== "admin" || !mounted) return;

      // 3) sobe listener global
      const channel = supabase
        .channel("admin-updates-global")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sessoes" },
          (payload) => {
            const sessao: any = payload.new;
            if (sessao?.status === "aguardando") {
              notifyBrowser(
                "🔔 Nova consulta aguardando",
                "Abra o admin para ver."
              );
              playSoundSafe();
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "compras" },
          (payload) => {
            const compra: any = payload.new;
            if (compra?.status === "pendente") {
              notifyBrowser(
                "💳 Pagamento pendente",
                "Abra o admin para aprovar."
              );
              playSoundSafe();
            }
          }
        )
        .subscribe((status, err) => {
          console.log("[realtime] global:", status);
          if (err) console.error("[realtime] global error:", err);
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

  // botão para habilitar permissão + destravar som
  const enableNotificationsAndSound = async () => {
    const permission = await ensureNotificationPermission();

    if (permission === "granted") {
      setEnabled(true);
      notifyBrowser(
        "✅ Notificações ativas",
        "Você será avisada sobre novas pendências."
      );
      // IMPORTANTE: isso destrava áudio no Chrome porque é por clique do usuário
      await playSoundSafe();
    } else if (permission === "denied") {
      alert(
        "Notificações bloqueadas. Libere no cadeado da barra de endereço > Notificações > Permitir."
      );
    } else if (permission === "unsupported") {
      alert("Este navegador não suporta notificações.");
    }
  };

  // um botão pequeno flutuante (você pode mudar o visual)
  return (
    <div className="fixed bottom-5 left-5 z-50">
      <button
        onClick={enableNotificationsAndSound}
        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
          enabled
            ? "bg-green-500/15 border-green-500/30 text-green-200"
            : "bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
        }`}
        title="Ativar notificações e som"
      >
        {enabled ? "🔔 Notificações ON" : "🔔 Ativar alertas"}
      </button>
    </div>
  );
}

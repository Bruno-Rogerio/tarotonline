// app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Compra = {
  id: string;
  usuario_id: string;
  minutos: number;
  valor: number;
  status: string;
  created_at: string;
  usuarios: {
    nome: string;
    telefone: string;
  };
};

type SessaoPendente = {
  id: string;
  usuario_id: string;
  tarologo_id: string;
  minutos_comprados: number;
  created_at: string;
  usuario: {
    nome: string;
    telefone: string;
    minutos_disponiveis: number;
  };
  tarologo: {
    nome: string;
  };
};

type Usuario = {
  id: string;
  nome: string;
  telefone: string;
  minutos_disponiveis: number;
  created_at: string;
};

type Estatisticas = {
  totalUsuarios: number;
  totalConsultas: number;
  consultasHoje: number;
  receitaTotal: number;
  receitaMes: number;
  usuariosAtivos: number;
};

type EstatisticasAcesso = {
  acessosHoje: number;
  acessosSemana: number;
  acessosTotal: number;
  estadosMaisAcessam: { estado: string; total: number }[];
};

function canUseNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

async function ensureNotificationPermission() {
  if (!canUseNotifications()) return "unsupported" as const;

  if (Notification.permission === "granted") return "granted" as const;
  if (Notification.permission === "denied") return "denied" as const;

  // "default" -> pede permissão
  const permission = await Notification.requestPermission();
  return permission as "granted" | "denied" | "default";
}

function notifyBrowser(title: string, body: string) {
  if (!canUseNotifications()) return;

  if (Notification.permission !== "granted") return;

  // Evita spam quando a aba está ativa (opcional)
  const shouldNotify = document.visibilityState !== "visible";

  if (!shouldNotify) return;

  try {
    const n = new Notification(title, {
      body,
      icon: "/logo.png",
      badge: "/logo.png",
    });

    // Foco ao clicar
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (e) {
    // alguns browsers podem bloquear em situações específicas
    console.warn("Notification falhou:", e);
  }
}

function playSound() {
  try {
    const audio = new Audio("/sounds/notify.mp3");
    audio.volume = 0.8;
    audio.play().catch(() => {});
  } catch {}
}

export default function AdminPage() {
  const [abaAtiva, setAbaAtiva] = useState<
    "dashboard" | "consultas" | "pagamentos" | "usuarios"
  >("dashboard");
  const [comprasPendentes, setComprasPendentes] = useState<Compra[]>([]);
  const [sessoesPendentes, setSessoesPendentes] = useState<SessaoPendente[]>(
    [],
  );
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState("");
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    totalUsuarios: 0,
    totalConsultas: 0,
    consultasHoje: 0,
    receitaTotal: 0,
    receitaMes: 0,
    usuariosAtivos: 0,
  });
  const [estatisticasAcesso, setEstatisticasAcesso] =
    useState<EstatisticasAcesso>({
      acessosHoje: 0,
      acessosSemana: 0,
      acessosTotal: 0,
      estadosMaisAcessam: [],
    });
  const [adminId, setAdminId] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalCreditos, setModalCreditos] = useState<Usuario | null>(null);
  const [minutosAdicionar, setMinutosAdicionar] = useState(10);
  const [novaAtividade, setNovaAtividade] = useState(false);
  const router = useRouter();

  const [notifStatus, setNotifStatus] = useState<
    "unknown" | "unsupported" | "default" | "granted" | "denied"
  >("unknown");

  useEffect(() => {
    if (!canUseNotifications()) {
      setNotifStatus("unsupported");
      return;
    }
    setNotifStatus(Notification.permission as any);
  }, []);

  useEffect(() => {
    let channel: any;
    let isMounted = true;

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: userData } = await supabase
        .from("usuarios")
        .select("tipo")
        .eq("id", user.id)
        .single();

      if (!userData || userData.tipo !== "admin") {
        alert("Apenas admins podem acessar.");
        router.push("/");
        return;
      }

      if (!isMounted) return;

      setAdminId(user.id);
      await carregarDados();

      // Pede permissão uma vez ao abrir o admin
      await ensureNotificationPermission();

      channel = supabase
        .channel("admin-updates")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sessoes" },
          (payload) => {
            console.log("[realtime] sessoes:", payload);

            const novaSessao = payload.new as any;

            // notifica quando status ficar "aguardando"
            if (novaSessao?.status === "aguardando") {
              carregarSessoesPendentes();
              mostrarAlertaNovaAtividade();

              notifyBrowser(
                "🔔 Nova consulta aguardando",
                "Entrou uma nova solicitação de consulta.",
              );
              playSound();
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "compras" },
          (payload) => {
            console.log("[realtime] compras:", payload);

            const novaCompra = payload.new as any;

            // notifica quando status ficar "pendente"
            if (novaCompra?.status === "pendente") {
              carregarComprasPendentes();
              mostrarAlertaNovaAtividade();

              notifyBrowser(
                "💳 Pagamento pendente",
                "Entrou um novo pagamento para aprovação.",
              );
              playSound();
            }
          },
        )
        .subscribe((status, err) => {
          console.log("[realtime] admin-updates:", status);
          if (err) console.error("[realtime] admin-updates error:", err);
        });

      setLoading(false);
    };

    init();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    if (busca) {
      const filtrados = usuarios.filter(
        (u) =>
          u.nome.toLowerCase().includes(busca.toLowerCase()) ||
          u.telefone?.includes(busca),
      );
      setUsuariosFiltrados(filtrados);
    } else {
      setUsuariosFiltrados(usuarios);
    }
  }, [busca, usuarios]);

  useEffect(() => {
    const total = sessoesPendentes.length + comprasPendentes.length;
    if (total > 0) {
      document.title = `(${total}) Admin - Viaa Tarot`;
    } else {
      document.title = "Admin - Viaa Tarot";
    }
  }, [sessoesPendentes.length, comprasPendentes.length]);

  function mostrarAlertaNovaAtividade() {
    setNovaAtividade(true);
    setTimeout(() => setNovaAtividade(false), 5000);
  }
  async function ativarNotificacoes() {
    const permission = await ensureNotificationPermission();
    setNotifStatus(permission);

    if (permission === "unsupported") {
      alert("Este navegador não suporta notificações.");
      return;
    }

    if (permission === "granted") {
      try {
        new Notification("✅ Notificações ativadas", {
          body: "Você será avisada quando entrar consulta ou pagamento pendente.",
          icon: "/logo.png",
          badge: "/logo.png",
        });
        playSound();
      } catch {}
    } else if (permission === "denied") {
      alert(
        "As notificações estão bloqueadas no navegador. Você pode liberar nas configurações do site (ícone de cadeado na barra de endereço).",
      );
    }
  }

  async function carregarDados() {
    await Promise.all([
      carregarComprasPendentes(),
      carregarSessoesPendentes(),
      carregarEstatisticas(),
      carregarUsuarios(),
      carregarEstatisticasAcesso(),
    ]);
  }

  async function carregarEstatisticasAcesso() {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const { count: acessosHoje } = await supabase
        .from("acessos")
        .select("*", { count: "exact", head: true })
        .gte("created_at", hoje.toISOString());

      const semanaAtras = new Date();
      semanaAtras.setDate(semanaAtras.getDate() - 7);
      const { count: acessosSemana } = await supabase
        .from("acessos")
        .select("*", { count: "exact", head: true })
        .gte("created_at", semanaAtras.toISOString());

      const { count: acessosTotal } = await supabase
        .from("acessos")
        .select("*", { count: "exact", head: true });

      const { data: acessosPorEstado } = await supabase
        .from("acessos")
        .select("estado");

      const contagem: Record<string, number> = {};
      acessosPorEstado?.forEach((acesso) => {
        const estado = acesso.estado || "Desconhecido";
        contagem[estado] = (contagem[estado] || 0) + 1;
      });

      const estadosMaisAcessam = Object.entries(contagem)
        .map(([estado, total]) => ({ estado, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      setEstatisticasAcesso({
        acessosHoje: acessosHoje || 0,
        acessosSemana: acessosSemana || 0,
        acessosTotal: acessosTotal || 0,
        estadosMaisAcessam,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas de acesso:", error);
    }
  }

  async function carregarEstatisticas() {
    const { count: totalUsuarios } = await supabase
      .from("usuarios")
      .select("*", { count: "exact", head: true })
      .eq("tipo", "cliente");

    const { count: totalConsultas } = await supabase
      .from("sessoes")
      .select("*", { count: "exact", head: true })
      .in("status", ["em_andamento", "finalizada"]);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const { count: consultasHoje } = await supabase
      .from("sessoes")
      .select("*", { count: "exact", head: true })
      .eq("status", "finalizada")
      .gte("created_at", hoje.toISOString());

    const { data: comprasAprovadas } = await supabase
      .from("compras")
      .select("valor")
      .eq("status", "aprovado");

    const receitaTotal =
      comprasAprovadas?.reduce((acc, c) => acc + c.valor, 0) || 0;

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const { data: comprasMes } = await supabase
      .from("compras")
      .select("valor")
      .eq("status", "aprovado")
      .gte("created_at", inicioMes.toISOString());

    const receitaMes = comprasMes?.reduce((acc, c) => acc + c.valor, 0) || 0;

    const { count: usuariosAtivos } = await supabase
      .from("usuarios")
      .select("*", { count: "exact", head: true })
      .eq("tipo", "cliente")
      .gt("minutos_disponiveis", 0);

    setEstatisticas({
      totalUsuarios: totalUsuarios || 0,
      totalConsultas: totalConsultas || 0,
      consultasHoje: consultasHoje || 0,
      receitaTotal,
      receitaMes,
      usuariosAtivos: usuariosAtivos || 0,
    });
  }

  async function carregarUsuarios() {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nome, telefone, minutos_disponiveis, created_at")
      .eq("tipo", "cliente")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setUsuarios(data);
      setUsuariosFiltrados(data);
    }
  }

  async function carregarComprasPendentes() {
    const { data, error } = await supabase
      .from("compras")
      .select(
        `
        *,
        usuarios (nome, telefone)
      `,
      )
      .eq("status", "pendente")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setComprasPendentes(data as any);
    }
  }

  async function carregarSessoesPendentes() {
    const { data, error } = await supabase
      .from("sessoes")
      .select(
        `
      id,
      usuario_id,
      tarologo_id,
      minutos_comprados,
      created_at,
      usuario:usuarios!sessoes_usuario_id_fkey(nome, telefone, minutos_disponiveis),
      tarologo:tarologos(nome)
    `,
      )
      .eq("status", "aguardando")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSessoesPendentes(data as any);
    }
  }

  async function aprovarCompra(compra: Compra) {
    setLoading(true);

    await supabase
      .from("compras")
      .update({ status: "aprovado" })
      .eq("id", compra.id);

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("minutos_disponiveis")
      .eq("id", compra.usuario_id)
      .single();

    await supabase
      .from("usuarios")
      .update({
        minutos_disponiveis:
          (usuario?.minutos_disponiveis || 0) + compra.minutos,
      })
      .eq("id", compra.usuario_id);

    alert("✅ Compra aprovada e minutos liberados!");
    carregarDados();
    setLoading(false);
  }

  async function recusarCompra(compra: Compra) {
    if (!confirm("Tem certeza que deseja recusar esta compra?")) return;

    setLoading(true);

    await supabase
      .from("compras")
      .update({ status: "cancelado" })
      .eq("id", compra.id);

    alert("❌ Compra recusada!");
    carregarDados();
    setLoading(false);
  }

  async function aceitarConsulta(sessao: SessaoPendente) {
    setLoading(true);

    const { error } = await supabase
      .from("sessoes")
      .update({
        status: "em_andamento",
        admin_id: adminId,
        inicio: new Date().toISOString(),
      })
      .eq("id", sessao.id);

    if (error) {
      alert("Erro ao aceitar consulta: " + error.message);
      setLoading(false);
      return;
    }

    router.push(`/chat/${sessao.id}`);
  }

  async function recusarConsulta(sessao: SessaoPendente) {
    if (!confirm("Tem certeza que deseja recusar esta consulta?")) return;

    setLoading(true);

    await supabase.from("sessoes").delete().eq("id", sessao.id);

    alert("❌ Consulta recusada!");
    carregarDados();
    setLoading(false);
  }

  async function adicionarCreditos() {
    if (!modalCreditos) return;

    setLoading(true);

    const { error } = await supabase
      .from("usuarios")
      .update({
        minutos_disponiveis:
          modalCreditos.minutos_disponiveis + minutosAdicionar,
      })
      .eq("id", modalCreditos.id);

    if (error) {
      alert("Erro ao adicionar créditos");
    } else {
      alert(
        `✅ ${minutosAdicionar} minutos adicionados para ${modalCreditos.nome}!`,
      );
    }

    setModalCreditos(null);
    setMinutosAdicionar(10);
    carregarDados();
    setLoading(false);
  }

  async function handleSair() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const totalPendentes = sessoesPendentes.length + comprasPendentes.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">⚡</div>
          <div className="text-white/80">Carregando painel...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900">
      {/* Toast de nova atividade */}
      {novaAtividade && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-bold">Nova atividade!</p>
              <p className="text-sm text-white/80">Verifique as pendências</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Viaa Tarot" className="w-8 h-8" />
              <span className="text-lg font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent hidden sm:inline">
                Viaa Tarot
              </span>
              <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full ml-2">
                Admin
              </span>
              {totalPendentes > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                  {totalPendentes} pendente{totalPendentes > 1 ? "s" : ""}
                </span>
              )}
            </Link>

            <div className="flex items-center gap-2 md:gap-4">
              {/* Notificações */}
              {notifStatus !== "unsupported" && (
                <button
                  onClick={ativarNotificacoes}
                  className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm ${
                    notifStatus === "granted"
                      ? "bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20"
                      : notifStatus === "denied"
                        ? "bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                        : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20"
                  }`}
                  title={
                    notifStatus === "granted"
                      ? "Notificações ativas"
                      : notifStatus === "denied"
                        ? "Notificações bloqueadas no navegador"
                        : "Ativar notificações"
                  }
                >
                  <span>
                    {notifStatus === "granted"
                      ? "🔔"
                      : notifStatus === "denied"
                        ? "🔕"
                        : "🔔"}
                  </span>
                  <span className="hidden md:inline">
                    {notifStatus === "granted"
                      ? "Notificações ativas"
                      : notifStatus === "denied"
                        ? "Bloqueadas"
                        : "Ativar notificações"}
                  </span>
                </button>
              )}

              {/* Link Cupons no Header */}
              <Link
                href="/admin/cupons"
                className="text-pink-400 hover:text-pink-300 text-sm hidden sm:flex items-center gap-1 px-3 py-1.5 bg-pink-500/10 rounded-lg border border-pink-500/30 hover:bg-pink-500/20 transition-all"
              >
                <span>🎟️</span>
                <span>Cupons</span>
              </Link>

              {/* Link Promoções no Header */}
              <Link
                href="/admin/promocoes"
                className="text-yellow-400 hover:text-yellow-300 text-sm hidden sm:flex items-center gap-1 px-3 py-1.5 bg-yellow-500/10 rounded-lg border border-yellow-500/30 hover:bg-yellow-500/20 transition-all"
              >
                <span>🎁</span>
                <span>Promoções</span>
              </Link>
              <Link
                href="/"
                className="text-white/60 hover:text-white text-sm hidden sm:block"
              >
                Home
              </Link>
              <button
                onClick={handleSair}
                className="text-white/60 hover:text-white text-sm"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Abas */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "dashboard", label: "Dashboard", icon: "📊", count: 0 },
            {
              id: "consultas",
              label: "Consultas",
              icon: "💬",
              count: sessoesPendentes.length,
            },
            {
              id: "pagamentos",
              label: "Pagamentos",
              icon: "💳",
              count: comprasPendentes.length,
            },
            { id: "usuarios", label: "Usuários", icon: "👥", count: 0 },
          ].map((aba) => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id as any)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                abaAtiva === aba.id
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              } ${
                aba.count > 0 && abaAtiva !== aba.id
                  ? "ring-2 ring-red-500 ring-offset-2 ring-offset-purple-950"
                  : ""
              }`}
            >
              <span>{aba.icon}</span>
              <span className="hidden sm:inline">{aba.label}</span>
              {aba.count > 0 && (
                <span
                  className={`absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full text-xs font-bold ${
                    abaAtiva === aba.id
                      ? "bg-white text-purple-600"
                      : "bg-red-500 text-white animate-pulse"
                  }`}
                >
                  {aba.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* DASHBOARD */}
        {abaAtiva === "dashboard" && (
          <div className="space-y-6">
            {/* Alerta de pendências */}
            {totalPendentes > 0 && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⚠️</span>
                  <div>
                    <p className="text-white font-bold">
                      Você tem {totalPendentes} item
                      {totalPendentes > 1 ? "s" : ""} pendente
                      {totalPendentes > 1 ? "s" : ""}!
                    </p>
                    <p className="text-white/70 text-sm">
                      {sessoesPendentes.length > 0 &&
                        `${sessoesPendentes.length} consulta(s)`}
                      {sessoesPendentes.length > 0 &&
                        comprasPendentes.length > 0 &&
                        " • "}
                      {comprasPendentes.length > 0 &&
                        `${comprasPendentes.length} pagamento(s)`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setAbaAtiva(
                      sessoesPendentes.length > 0 ? "consultas" : "pagamentos",
                    )
                  }
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all text-sm font-medium"
                >
                  Ver agora →
                </button>
              </div>
            )}

            {/* Cards de ACESSOS */}
            <div>
              <h3 className="text-white/80 font-medium mb-3 flex items-center gap-2">
                <span>👁️</span> Acessos ao Site
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl p-4 border border-cyan-500/30">
                  <div className="text-3xl mb-2">📈</div>
                  <div className="text-2xl font-bold text-white">
                    {estatisticasAcesso.acessosHoje}
                  </div>
                  <div className="text-white/60 text-sm">Acessos hoje</div>
                </div>

                <div className="bg-gradient-to-br from-teal-500/20 to-cyan-500/20 backdrop-blur-sm rounded-2xl p-4 border border-teal-500/30">
                  <div className="text-3xl mb-2">📊</div>
                  <div className="text-2xl font-bold text-white">
                    {estatisticasAcesso.acessosSemana}
                  </div>
                  <div className="text-white/60 text-sm">Última semana</div>
                </div>

                <div className="bg-gradient-to-br from-sky-500/20 to-indigo-500/20 backdrop-blur-sm rounded-2xl p-4 border border-sky-500/30">
                  <div className="text-3xl mb-2">🌐</div>
                  <div className="text-2xl font-bold text-white">
                    {estatisticasAcesso.acessosTotal}
                  </div>
                  <div className="text-white/60 text-sm">Total de acessos</div>
                </div>

                <div className="bg-gradient-to-br from-violet-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl p-4 border border-violet-500/30">
                  <div className="text-3xl mb-2">📍</div>
                  <div className="text-2xl font-bold text-white">
                    {estatisticasAcesso.estadosMaisAcessam[0]?.estado || "-"}
                  </div>
                  <div className="text-white/60 text-sm">Estado top</div>
                </div>
              </div>
            </div>

            {/* Cards de Estatísticas do Negócio */}
            <div>
              <h3 className="text-white/80 font-medium mb-3 flex items-center gap-2">
                <span>💼</span> Estatísticas do Negócio
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/30">
                  <div className="text-3xl mb-2">👥</div>
                  <div className="text-2xl font-bold text-white">
                    {estatisticas.totalUsuarios}
                  </div>
                  <div className="text-white/60 text-sm">Total usuários</div>
                </div>

                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl p-4 border border-green-500/30">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-2xl font-bold text-white">
                    {estatisticas.usuariosAtivos}
                  </div>
                  <div className="text-white/60 text-sm">Com créditos</div>
                </div>

                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/30">
                  <div className="text-3xl mb-2">🔮</div>
                  <div className="text-2xl font-bold text-white">
                    {estatisticas.totalConsultas}
                  </div>
                  <div className="text-white/60 text-sm">Total consultas</div>
                </div>

                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl p-4 border border-yellow-500/30">
                  <div className="text-3xl mb-2">📅</div>
                  <div className="text-2xl font-bold text-white">
                    {estatisticas.consultasHoje}
                  </div>
                  <div className="text-white/60 text-sm">Consultas hoje</div>
                </div>

                <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 backdrop-blur-sm rounded-2xl p-4 border border-pink-500/30">
                  <div className="text-3xl mb-2">💰</div>
                  <div className="text-2xl font-bold text-white">
                    R$ {estatisticas.receitaMes.toFixed(0)}
                  </div>
                  <div className="text-white/60 text-sm">Receita mês</div>
                </div>

                <div className="bg-gradient-to-br from-indigo-500/20 to-violet-500/20 backdrop-blur-sm rounded-2xl p-4 border border-indigo-500/30">
                  <div className="text-3xl mb-2">💎</div>
                  <div className="text-2xl font-bold text-white">
                    R$ {estatisticas.receitaTotal.toFixed(0)}
                  </div>
                  <div className="text-white/60 text-sm">Receita total</div>
                </div>
              </div>
            </div>

            {/* ✨ SEÇÃO DE ACESSO RÁPIDO ✨ */}
            <div>
              <h3 className="text-white/80 font-medium mb-3 flex items-center gap-2">
                <span>⚡</span> Acesso Rápido
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Card Cupons */}
                <Link
                  href="/admin/cupons"
                  className="group bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl p-5 border border-pink-500/30 hover:border-pink-400/60 transition-all hover:shadow-lg hover:shadow-pink-500/10 hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-lg shadow-pink-500/30">
                      🎟️
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold text-lg">
                        Cupons de Desconto
                      </h4>
                      <p className="text-white/60 text-sm">
                        Criar e gerenciar cupons
                      </p>
                    </div>
                    <span className="text-pink-400 group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-pink-500/20">
                    <p className="text-pink-300/80 text-sm">
                      🎯 Crie cupons de % OFF, R$ OFF ou minutos extras para
                      campanhas
                    </p>
                  </div>
                </Link>

                {/* Card Promoções */}
                <Link
                  href="/admin/promocoes"
                  className="group bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl p-5 border border-yellow-500/30 hover:border-yellow-400/60 transition-all hover:shadow-lg hover:shadow-yellow-500/10 hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-lg shadow-yellow-500/30">
                      🎁
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold text-lg">
                        Promoções & Fidelidade
                      </h4>
                      <p className="text-white/60 text-sm">
                        Configure bônus automáticos
                      </p>
                    </div>
                    <span className="text-yellow-400 group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-yellow-500/20">
                    <p className="text-yellow-300/80 text-sm">
                      🎯 Recompense clientes fiéis com minutos de bônus
                      automaticamente
                    </p>
                  </div>
                </Link>

                {/* Card Relatórios (placeholder futuro) */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">
                      📊
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white/70 font-bold text-lg">
                        Relatórios
                      </h4>
                      <p className="text-white/40 text-sm">Em breve</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações rápidas - Consultas e Pagamentos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Consultas pendentes */}
              <div
                className={`bg-white/10 backdrop-blur-sm rounded-2xl p-5 border transition-all ${
                  sessoesPendentes.length > 0
                    ? "border-yellow-500/50 shadow-lg shadow-yellow-500/10"
                    : "border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span>💬</span> Consultas Pendentes
                  </h3>
                  {sessoesPendentes.length > 0 && (
                    <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                      {sessoesPendentes.length}
                    </span>
                  )}
                </div>

                {sessoesPendentes.length === 0 ? (
                  <p className="text-white/50 text-sm">
                    ✅ Nenhuma consulta aguardando
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sessoesPendentes.slice(0, 3).map((sessao) => (
                      <div
                        key={sessao.id}
                        className="bg-white/5 rounded-xl p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-white font-medium text-sm">
                            {sessao.usuario.nome}
                          </p>
                          <p className="text-purple-300 text-xs">
                            → {sessao.tarologo.nome}
                          </p>
                        </div>
                        <button
                          onClick={() => aceitarConsulta(sessao)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-all"
                        >
                          Aceitar
                        </button>
                      </div>
                    ))}
                    {sessoesPendentes.length > 3 && (
                      <button
                        onClick={() => setAbaAtiva("consultas")}
                        className="text-purple-400 text-sm hover:text-purple-300 w-full text-center pt-2"
                      >
                        Ver todas ({sessoesPendentes.length})
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Pagamentos pendentes */}
              <div
                className={`bg-white/10 backdrop-blur-sm rounded-2xl p-5 border transition-all ${
                  comprasPendentes.length > 0
                    ? "border-green-500/50 shadow-lg shadow-green-500/10"
                    : "border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span>💳</span> Pagamentos Pendentes
                  </h3>
                  {comprasPendentes.length > 0 && (
                    <span className="bg-green-500 text-black text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                      {comprasPendentes.length}
                    </span>
                  )}
                </div>

                {comprasPendentes.length === 0 ? (
                  <p className="text-white/50 text-sm">
                    ✅ Nenhum pagamento aguardando
                  </p>
                ) : (
                  <div className="space-y-2">
                    {comprasPendentes.slice(0, 3).map((compra) => (
                      <div
                        key={compra.id}
                        className="bg-white/5 rounded-xl p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-white font-medium text-sm">
                            {compra.usuarios.nome}
                          </p>
                          <p className="text-green-400 text-xs font-medium">
                            R$ {compra.valor.toFixed(2)} • {compra.minutos} min
                          </p>
                        </div>
                        <button
                          onClick={() => aprovarCompra(compra)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-all"
                        >
                          Aprovar
                        </button>
                      </div>
                    ))}
                    {comprasPendentes.length > 3 && (
                      <button
                        onClick={() => setAbaAtiva("pagamentos")}
                        className="text-purple-400 text-sm hover:text-purple-300 w-full text-center pt-2"
                      >
                        Ver todos ({comprasPendentes.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CONSULTAS */}
        {abaAtiva === "consultas" && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span>💬</span> Solicitações de Consulta
            </h2>

            {sessoesPendentes.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
                <div className="text-5xl mb-4">✅</div>
                <div className="text-white text-lg">
                  Nenhuma consulta pendente
                </div>
                <p className="text-white/50 text-sm mt-2">
                  Novas solicitações aparecerão aqui automaticamente
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessoesPendentes.map((sessao) => (
                  <div
                    key={sessao.id}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-yellow-500/30 hover:border-purple-500/50 transition-all shadow-lg shadow-yellow-500/5"
                  >
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-purple-300 text-sm font-medium mb-2">
                          Cliente
                        </h3>
                        <p className="text-white font-bold text-lg">
                          {sessao.usuario.nome}
                        </p>
                        <p className="text-white/60 text-sm">
                          📱 {sessao.usuario.telefone}
                        </p>
                        <p className="text-green-400 text-sm mt-1">
                          💰 {sessao.usuario.minutos_disponiveis} min
                          disponíveis
                        </p>
                      </div>

                      <div>
                        <h3 className="text-purple-300 text-sm font-medium mb-2">
                          Consulta
                        </h3>
                        <p className="text-white">
                          <span className="text-white/60">Tarólogo: </span>
                          <span className="font-bold">
                            {sessao.tarologo.nome}
                          </span>
                        </p>
                        <p className="text-white">
                          <span className="text-white/60">Duração: </span>
                          <span className="font-bold">
                            {sessao.minutos_comprados} minutos
                          </span>
                        </p>
                        <p className="text-white/50 text-sm mt-1">
                          📅{" "}
                          {new Date(sessao.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4 pt-4 border-t border-white/10">
                      <button
                        onClick={() => aceitarConsulta(sessao)}
                        className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-500/20"
                      >
                        ✅ Aceitar e Iniciar
                      </button>
                      <button
                        onClick={() => recusarConsulta(sessao)}
                        className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-xl transition-all border border-red-500/30"
                      >
                        ❌ Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PAGAMENTOS */}
        {abaAtiva === "pagamentos" && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span>💳</span> Pagamentos Pendentes
            </h2>

            {comprasPendentes.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
                <div className="text-5xl mb-4">✅</div>
                <div className="text-white text-lg">
                  Nenhum pagamento pendente
                </div>
                <p className="text-white/50 text-sm mt-2">
                  Novos pagamentos aparecerão aqui automaticamente
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {comprasPendentes.map((compra) => (
                  <div
                    key={compra.id}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-yellow-500/30 hover:border-green-500/30 transition-all shadow-lg shadow-yellow-500/5"
                  >
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-purple-300 text-sm font-medium mb-2">
                          Cliente
                        </h3>
                        <p className="text-white font-bold text-lg">
                          {compra.usuarios.nome}
                        </p>
                        <p className="text-white/60 text-sm">
                          📱 {compra.usuarios.telefone}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-purple-300 text-sm font-medium mb-2">
                          Compra
                        </h3>
                        <p className="text-white">
                          <span className="text-white/60">Minutos: </span>
                          <span className="font-bold text-purple-300">
                            {compra.minutos} min
                          </span>
                        </p>
                        <p className="text-white">
                          <span className="text-white/60">Valor: </span>
                          <span className="font-bold text-green-400">
                            R$ {compra.valor.toFixed(2)}
                          </span>
                        </p>
                        <p className="text-white/50 text-sm mt-1">
                          📅{" "}
                          {new Date(compra.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4 pt-4 border-t border-white/10">
                      <button
                        onClick={() => aprovarCompra(compra)}
                        className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-500/20"
                      >
                        ✅ Aprovar Pagamento
                      </button>
                      <button
                        onClick={() => recusarCompra(compra)}
                        className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-xl transition-all border border-red-500/30"
                      >
                        ❌ Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* USUÁRIOS */}
        {abaAtiva === "usuarios" && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>👥</span> Gerenciar Usuários
              </h2>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                  🔍
                </span>
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome ou telefone..."
                  className="pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-72"
                />
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
              <div className="hidden md:grid grid-cols-5 gap-4 p-4 bg-white/5 border-b border-white/10 text-white/60 text-sm font-medium">
                <div>Nome</div>
                <div>Telefone</div>
                <div>Créditos</div>
                <div>Cadastro</div>
                <div className="text-right">Ações</div>
              </div>

              <div className="divide-y divide-white/10">
                {usuariosFiltrados.length === 0 ? (
                  <div className="p-8 text-center text-white/50">
                    Nenhum usuário encontrado
                  </div>
                ) : (
                  usuariosFiltrados.map((usuario) => (
                    <div
                      key={usuario.id}
                      className="p-4 hover:bg-white/5 transition-colors"
                    >
                      {/* Mobile */}
                      <div className="md:hidden">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-white font-medium">
                              {usuario.nome}
                            </p>
                            <p className="text-white/60 text-sm">
                              {usuario.telefone}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-medium">
                            ⏱️ {usuario.minutos_disponiveis} min
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-white/50 text-xs">
                            Cadastro:{" "}
                            {new Date(usuario.created_at).toLocaleDateString(
                              "pt-BR",
                            )}
                          </span>
                          <button
                            onClick={() => setModalCreditos(usuario)}
                            className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg text-sm"
                          >
                            💎 Dar Créditos
                          </button>
                        </div>
                      </div>

                      {/* Desktop */}
                      <div className="hidden md:grid grid-cols-5 gap-4 items-center">
                        <div className="text-white font-medium">
                          {usuario.nome}
                        </div>
                        <div className="text-white/70">{usuario.telefone}</div>
                        <div>
                          <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-medium">
                            ⏱️ {usuario.minutos_disponiveis} min
                          </span>
                        </div>
                        <div className="text-white/50 text-sm">
                          {new Date(usuario.created_at).toLocaleDateString(
                            "pt-BR",
                          )}
                        </div>
                        <div className="text-right">
                          <button
                            onClick={() => setModalCreditos(usuario)}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-lg text-sm transition-all"
                          >
                            💎 Dar Créditos
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal dar créditos */}
      {modalCreditos && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl p-6 border border-white/20 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>💎</span> Adicionar Créditos
            </h3>

            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <p className="text-white/60 text-sm">Cliente</p>
              <p className="text-white font-bold text-lg">
                {modalCreditos.nome}
              </p>
              <p className="text-purple-300 text-sm">
                Saldo atual: {modalCreditos.minutos_disponiveis} minutos
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-white/80 text-sm mb-2">
                Minutos a adicionar
              </label>
              <div className="flex gap-2 mb-3">
                {[5, 10, 20, 30, 60].map((min) => (
                  <button
                    key={min}
                    onClick={() => setMinutosAdicionar(min)}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
                      minutosAdicionar === min
                        ? "bg-purple-600 text-white"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {min}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={minutosAdicionar}
                onChange={(e) =>
                  setMinutosAdicionar(parseInt(e.target.value) || 0)
                }
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                min={1}
              />
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
              <p className="text-green-400 text-sm">
                Novo saldo:{" "}
                <span className="font-bold text-lg">
                  {modalCreditos.minutos_disponiveis + minutosAdicionar} minutos
                </span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModalCreditos(null)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={adicionarCreditos}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-500/20"
              >
                ✅ Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

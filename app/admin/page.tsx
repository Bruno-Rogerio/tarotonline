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

// ============ NOTIFICAÇÕES ============
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
  const shouldNotify = document.visibilityState !== "visible";
  if (!shouldNotify) return;

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
  const [adminId, setAdminId] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalCreditos, setModalCreditos] = useState<Usuario | null>(null);
  const [minutosAdicionar, setMinutosAdicionar] = useState(10);
  const [novaAtividade, setNovaAtividade] = useState(false);
  const [notifStatus, setNotifStatus] = useState<
    "unknown" | "unsupported" | "default" | "granted" | "denied"
  >("unknown");
  const router = useRouter();

  const totalPendentes = sessoesPendentes.length + comprasPendentes.length;

  // Verificar suporte a notificações
  useEffect(() => {
    if (!canUseNotifications()) {
      setNotifStatus("unsupported");
      return;
    }
    setNotifStatus(Notification.permission as any);
  }, []);

  // Inicialização e realtime
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
      await ensureNotificationPermission();

      channel = supabase
        .channel("admin-updates")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sessoes" },
          (payload) => {
            const novaSessao = payload.new as any;
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
            const novaCompra = payload.new as any;
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
        .subscribe();

      setLoading(false);
    };

    init();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  // Filtro de busca
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

  // Título da página com contador
  useEffect(() => {
    const total = sessoesPendentes.length + comprasPendentes.length;
    document.title =
      total > 0 ? `(${total}) Admin - Viaa Tarot` : "Admin - Viaa Tarot";
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
        });
        playSound();
      } catch {}
    } else if (permission === "denied") {
      alert(
        "As notificações estão bloqueadas. Libere nas configurações do site (ícone de cadeado).",
      );
    }
  }

  async function carregarDados() {
    await Promise.all([
      carregarComprasPendentes(),
      carregarSessoesPendentes(),
      carregarEstatisticas(),
      carregarUsuarios(),
    ]);
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
      .select("*, usuarios (nome, telefone)")
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
        `id, usuario_id, tarologo_id, minutos_comprados, created_at,
        usuario:usuarios!sessoes_usuario_id_fkey(nome, telefone, minutos_disponiveis),
        tarologo:tarologos(nome)`,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">⚡</div>
          <div className="text-white/70">Carregando painel...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
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
      <header className="bg-gray-900/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <img src="/logo.png" alt="Viaa Tarot" className="w-8 h-8" />
                <span className="text-lg font-bold text-white hidden sm:block">
                  Viaa Tarot
                </span>
              </Link>
              <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                Admin
              </span>
              {totalPendentes > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                  {totalPendentes} pendente{totalPendentes > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Ações do Header */}
            <div className="flex items-center gap-2">
              {/* Notificações */}
              {notifStatus !== "unsupported" && (
                <button
                  onClick={ativarNotificacoes}
                  className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${
                    notifStatus === "granted"
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : notifStatus === "denied"
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                  }`}
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
                      ? "Ativo"
                      : notifStatus === "denied"
                        ? "Bloqueado"
                        : "Ativar"}
                  </span>
                </button>
              )}

              {/* Link Cupons */}
              <Link
                href="/admin/cupons"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-lg text-sm hover:bg-pink-500/20 transition-all"
              >
                <span>🎟️</span>
                <span>Cupons</span>
              </Link>
              <Link
                href="/admin/banners"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                🖼️ Gerenciar Banners
              </Link>
              {/* Link Promoções */}
              <Link
                href="/admin/promocoes"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/20 transition-all"
              >
                <span>🎁</span>
                <span>Promoções</span>
              </Link>

              <Link
                href="/"
                className="text-white/50 hover:text-white text-sm px-3 py-1.5"
              >
                Home
              </Link>
              <button
                onClick={handleSair}
                className="text-white/50 hover:text-white text-sm px-3 py-1.5"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Container principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Navegação por abas */}
        <nav className="mb-8">
          <div className="flex gap-1 p-1 bg-gray-900/50 rounded-2xl w-fit">
            {[
              { id: "dashboard", label: "Dashboard", icon: "📊" },
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
              { id: "usuarios", label: "Usuários", icon: "👥" },
            ].map((aba) => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id as any)}
                className={`relative flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                  abaAtiva === aba.id
                    ? "bg-white text-gray-900 shadow-lg"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{aba.icon}</span>
                <span className="hidden sm:inline">{aba.label}</span>
                {aba.count !== undefined && aba.count > 0 && (
                  <span className="min-w-[22px] h-[22px] flex items-center justify-center px-1.5 rounded-full text-xs font-bold bg-red-500 text-white">
                    {aba.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* ==================== DASHBOARD ==================== */}
        {abaAtiva === "dashboard" && (
          <div className="space-y-8">
            {/* Alerta de pendências */}
            {totalPendentes > 0 && (
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">⚠️</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">
                        Atenção necessária
                      </h3>
                      <p className="text-white/60">
                        {sessoesPendentes.length > 0 &&
                          `${sessoesPendentes.length} consulta(s)`}
                        {sessoesPendentes.length > 0 &&
                          comprasPendentes.length > 0 &&
                          " e "}
                        {comprasPendentes.length > 0 &&
                          `${comprasPendentes.length} pagamento(s)`}{" "}
                        aguardando
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setAbaAtiva(
                        sessoesPendentes.length > 0
                          ? "consultas"
                          : "pagamentos",
                      )
                    }
                    className="px-5 py-2.5 bg-white text-gray-900 font-medium rounded-xl hover:bg-white/90 transition-colors"
                  >
                    Ver agora
                  </button>
                </div>
              </div>
            )}

            {/* Seção: Acesso Rápido */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-6 bg-purple-500 rounded-full" />
                <h2 className="text-xl font-semibold text-white">
                  Acesso Rápido
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card Cupons */}
                <Link
                  href="/admin/cupons"
                  className="group bg-gray-900/50 rounded-2xl p-6 border border-white/5 hover:border-pink-500/30 transition-all hover:shadow-lg hover:shadow-pink-500/5"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-lg">
                      🎟️
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg">
                        Cupons de Desconto
                      </h4>
                      <p className="text-white/50 text-sm">
                        Criar e gerenciar cupons
                      </p>
                    </div>
                  </div>
                  <p className="text-pink-400/70 text-sm">
                    Crie cupons de % OFF, R$ OFF ou minutos extras para
                    campanhas
                  </p>
                </Link>

                {/* Card Promoções */}
                <Link
                  href="/admin/promocoes"
                  className="group bg-gray-900/50 rounded-2xl p-6 border border-white/5 hover:border-yellow-500/30 transition-all hover:shadow-lg hover:shadow-yellow-500/5"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-lg">
                      🎁
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg">
                        Promoções & Fidelidade
                      </h4>
                      <p className="text-white/50 text-sm">
                        Configure bônus automáticos
                      </p>
                    </div>
                  </div>
                  <p className="text-yellow-400/70 text-sm">
                    Recompense clientes fiéis com minutos de bônus
                    automaticamente
                  </p>
                </Link>

                {/* Card Relatórios (placeholder) */}
                <div className="bg-gray-900/30 rounded-2xl p-6 border border-white/5 opacity-50">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">
                      📊
                    </div>
                    <div>
                      <h4 className="text-white/70 font-bold text-lg">
                        Relatórios
                      </h4>
                      <p className="text-white/40 text-sm">Em breve</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Seção: Estatísticas */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-6 bg-blue-500 rounded-full" />
                <h2 className="text-xl font-semibold text-white">
                  Estatísticas do Negócio
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-gray-900/50 rounded-2xl p-5 border border-white/5">
                  <div className="text-2xl mb-3">👥</div>
                  <div className="text-2xl font-bold text-white">
                    {estatisticas.totalUsuarios}
                  </div>
                  <div className="text-white/50 text-sm">Total usuários</div>
                </div>

                <div className="bg-gray-900/50 rounded-2xl p-5 border border-white/5">
                  <div className="text-2xl mb-3">✅</div>
                  <div className="text-2xl font-bold text-white">
                    {estatisticas.usuariosAtivos}
                  </div>
                  <div className="text-white/50 text-sm">Com créditos</div>
                </div>

                <div className="bg-gray-900/50 rounded-2xl p-5 border border-white/5">
                  <div className="text-2xl mb-3">🔮</div>
                  <div className="text-2xl font-bold text-white">
                    {estatisticas.totalConsultas}
                  </div>
                  <div className="text-white/50 text-sm">Total consultas</div>
                </div>

                <div className="bg-gray-900/50 rounded-2xl p-5 border border-white/5">
                  <div className="text-2xl mb-3">📅</div>
                  <div className="text-2xl font-bold text-white">
                    {estatisticas.consultasHoje}
                  </div>
                  <div className="text-white/50 text-sm">Consultas hoje</div>
                </div>

                <div className="bg-gray-900/50 rounded-2xl p-5 border border-white/5">
                  <div className="text-2xl mb-3">💰</div>
                  <div className="text-2xl font-bold text-green-400">
                    R$ {estatisticas.receitaMes.toFixed(0)}
                  </div>
                  <div className="text-white/50 text-sm">Receita mês</div>
                </div>

                <div className="bg-gray-900/50 rounded-2xl p-5 border border-white/5">
                  <div className="text-2xl mb-3">💎</div>
                  <div className="text-2xl font-bold text-white">
                    R$ {estatisticas.receitaTotal.toFixed(0)}
                  </div>
                  <div className="text-white/50 text-sm">Receita total</div>
                </div>
              </div>
            </section>

            {/* Seção: Pendências Rápidas */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-6 bg-yellow-500 rounded-full" />
                <h2 className="text-xl font-semibold text-white">Pendências</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Consultas pendentes */}
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <span>💬</span> Consultas Pendentes
                    </h3>
                    {sessoesPendentes.length > 0 && (
                      <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                        {sessoesPendentes.length}
                      </span>
                    )}
                  </div>

                  {sessoesPendentes.length === 0 ? (
                    <p className="text-white/40 text-sm">
                      ✅ Nenhuma consulta aguardando
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {sessoesPendentes.slice(0, 3).map((sessao) => (
                        <div
                          key={sessao.id}
                          className="bg-white/5 rounded-xl p-4 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-white font-medium">
                              {sessao.usuario.nome}
                            </p>
                            <p className="text-purple-400 text-sm">
                              → {sessao.tarologo.nome}
                            </p>
                          </div>
                          <button
                            onClick={() => aceitarConsulta(sessao)}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-all"
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
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <span>💳</span> Pagamentos Pendentes
                    </h3>
                    {comprasPendentes.length > 0 && (
                      <span className="bg-green-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                        {comprasPendentes.length}
                      </span>
                    )}
                  </div>

                  {comprasPendentes.length === 0 ? (
                    <p className="text-white/40 text-sm">
                      ✅ Nenhum pagamento aguardando
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {comprasPendentes.slice(0, 3).map((compra) => (
                        <div
                          key={compra.id}
                          className="bg-white/5 rounded-xl p-4 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-white font-medium">
                              {compra.usuarios.nome}
                            </p>
                            <p className="text-green-400 text-sm font-medium">
                              R$ {compra.valor.toFixed(2)} • {compra.minutos}{" "}
                              min
                            </p>
                          </div>
                          <button
                            onClick={() => aprovarCompra(compra)}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-all"
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
            </section>
          </div>
        )}

        {/* ==================== CONSULTAS ==================== */}
        {abaAtiva === "consultas" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-purple-500 rounded-full" />
              <h2 className="text-xl font-semibold text-white">
                Consultas Pendentes
              </h2>
              {sessoesPendentes.length > 0 && (
                <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm font-medium rounded-full">
                  {sessoesPendentes.length}
                </span>
              )}
            </div>

            {sessoesPendentes.length === 0 ? (
              <div className="bg-gray-900/50 rounded-2xl p-12 border border-white/5 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">✅</span>
                </div>
                <h3 className="text-white font-medium text-lg mb-2">
                  Nenhuma consulta pendente
                </h3>
                <p className="text-white/50">
                  Novas solicitações aparecerão aqui automaticamente
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessoesPendentes.map((sessao) => (
                  <div
                    key={sessao.id}
                    className="bg-gray-900/50 rounded-2xl p-6 border border-white/5 hover:border-purple-500/30 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex-1 grid sm:grid-cols-3 gap-6">
                        <div>
                          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">
                            Cliente
                          </div>
                          <div className="text-white font-medium">
                            {sessao.usuario.nome}
                          </div>
                          <div className="text-white/50 text-sm">
                            {sessao.usuario.telefone}
                          </div>
                          <div className="text-green-400 text-sm">
                            {sessao.usuario.minutos_disponiveis} min disponíveis
                          </div>
                        </div>

                        <div>
                          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">
                            Tarólogo
                          </div>
                          <div className="text-purple-400 font-medium">
                            {sessao.tarologo.nome}
                          </div>
                          <div className="text-white/50 text-sm">
                            {sessao.minutos_comprados} minutos
                          </div>
                        </div>

                        <div>
                          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">
                            Solicitado
                          </div>
                          <div className="text-white/70">
                            {new Date(sessao.created_at).toLocaleDateString(
                              "pt-BR",
                            )}
                          </div>
                          <div className="text-white/50 text-sm">
                            {new Date(sessao.created_at).toLocaleTimeString(
                              "pt-BR",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => recusarConsulta(sessao)}
                          className="px-5 py-2.5 bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-400 font-medium rounded-xl transition-colors border border-white/10 hover:border-red-500/30"
                        >
                          Recusar
                        </button>
                        <button
                          onClick={() => aceitarConsulta(sessao)}
                          className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors"
                        >
                          Aceitar e Iniciar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== PAGAMENTOS ==================== */}
        {abaAtiva === "pagamentos" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-green-500 rounded-full" />
              <h2 className="text-xl font-semibold text-white">
                Pagamentos Pendentes
              </h2>
              {comprasPendentes.length > 0 && (
                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-full">
                  {comprasPendentes.length}
                </span>
              )}
            </div>

            {comprasPendentes.length === 0 ? (
              <div className="bg-gray-900/50 rounded-2xl p-12 border border-white/5 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">✅</span>
                </div>
                <h3 className="text-white font-medium text-lg mb-2">
                  Nenhum pagamento pendente
                </h3>
                <p className="text-white/50">
                  Novos pagamentos aparecerão aqui automaticamente
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {comprasPendentes.map((compra) => (
                  <div
                    key={compra.id}
                    className="bg-gray-900/50 rounded-2xl p-6 border border-white/5 hover:border-green-500/30 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex-1 grid sm:grid-cols-4 gap-6">
                        <div>
                          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">
                            Cliente
                          </div>
                          <div className="text-white font-medium">
                            {compra.usuarios.nome}
                          </div>
                          <div className="text-white/50 text-sm">
                            {compra.usuarios.telefone}
                          </div>
                        </div>

                        <div>
                          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">
                            Valor
                          </div>
                          <div className="text-green-400 font-bold text-xl">
                            R$ {compra.valor.toFixed(2)}
                          </div>
                        </div>

                        <div>
                          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">
                            Minutos
                          </div>
                          <div className="text-white font-medium">
                            {compra.minutos} min
                          </div>
                        </div>

                        <div>
                          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">
                            Data
                          </div>
                          <div className="text-white/70">
                            {new Date(compra.created_at).toLocaleDateString(
                              "pt-BR",
                            )}
                          </div>
                          <div className="text-white/50 text-sm">
                            {new Date(compra.created_at).toLocaleTimeString(
                              "pt-BR",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => recusarCompra(compra)}
                          className="px-5 py-2.5 bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-400 font-medium rounded-xl transition-colors border border-white/10 hover:border-red-500/30"
                        >
                          Recusar
                        </button>
                        <button
                          onClick={() => aprovarCompra(compra)}
                          className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors"
                        >
                          Aprovar Pagamento
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== USUÁRIOS ==================== */}
        {abaAtiva === "usuarios" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-blue-500 rounded-full" />
                <h2 className="text-xl font-semibold text-white">Usuários</h2>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-full">
                  {usuarios.length}
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nome ou telefone..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full sm:w-80 px-4 py-2.5 pl-10 bg-gray-900/50 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                  🔍
                </span>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-2xl border border-white/5 overflow-hidden">
              <div className="hidden md:grid grid-cols-5 gap-4 px-6 py-4 bg-gray-900/50 border-b border-white/5">
                <div className="text-white/40 text-xs uppercase tracking-wider">
                  Nome
                </div>
                <div className="text-white/40 text-xs uppercase tracking-wider">
                  Telefone
                </div>
                <div className="text-white/40 text-xs uppercase tracking-wider">
                  Créditos
                </div>
                <div className="text-white/40 text-xs uppercase tracking-wider">
                  Cadastro
                </div>
                <div className="text-white/40 text-xs uppercase tracking-wider text-right">
                  Ações
                </div>
              </div>

              {usuariosFiltrados.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-white/40">Nenhum usuário encontrado</div>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {usuariosFiltrados.map((usuario) => (
                    <div
                      key={usuario.id}
                      className="grid grid-cols-1 md:grid-cols-5 gap-4 px-6 py-4 hover:bg-white/5 transition-colors"
                    >
                      <div>
                        <div className="text-white font-medium">
                          {usuario.nome}
                        </div>
                        <div className="text-white/40 text-sm md:hidden">
                          {usuario.telefone}
                        </div>
                      </div>
                      <div className="hidden md:block text-white/70">
                        {usuario.telefone}
                      </div>
                      <div>
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                            usuario.minutos_disponiveis > 0
                              ? "bg-green-500/20 text-green-400"
                              : "bg-white/10 text-white/50"
                          }`}
                        >
                          {usuario.minutos_disponiveis} min
                        </span>
                      </div>
                      <div className="hidden md:block text-white/50">
                        {new Date(usuario.created_at).toLocaleDateString(
                          "pt-BR",
                        )}
                      </div>
                      <div className="flex justify-start md:justify-end">
                        <button
                          onClick={() => setModalCreditos(usuario)}
                          className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-sm font-medium rounded-lg transition-colors"
                        >
                          + Créditos
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==================== MODAL DE CRÉDITOS ==================== */}
      {modalCreditos && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl p-6 border border-white/10 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <span>💎</span> Adicionar Créditos
            </h3>

            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <div className="text-white font-medium">{modalCreditos.nome}</div>
              <div className="text-white/50 text-sm">
                {modalCreditos.telefone}
              </div>
              <div className="text-purple-400 text-sm mt-2">
                Saldo atual: {modalCreditos.minutos_disponiveis} minutos
              </div>
            </div>

            <div className="mb-6">
              <label className="text-white/60 text-sm mb-3 block">
                Minutos a adicionar
              </label>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {[5, 10, 20, 30, 60].map((min) => (
                  <button
                    key={min}
                    onClick={() => setMinutosAdicionar(min)}
                    className={`py-3 rounded-xl font-medium transition-all ${
                      minutosAdicionar === min
                        ? "bg-purple-500 text-white"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
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
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-center text-xl font-bold focus:outline-none focus:border-purple-500"
                min={1}
              />
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
              <div className="text-center">
                <div className="text-white/60 text-sm">Novo saldo será</div>
                <div className="text-2xl font-bold text-green-400">
                  {modalCreditos.minutos_disponiveis + minutosAdicionar} minutos
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalCreditos(null);
                  setMinutosAdicionar(10);
                }}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={adicionarCreditos}
                className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

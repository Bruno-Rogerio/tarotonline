"use client";

import { useState, useEffect, useRef } from "react";
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

type Notificacao = {
  id: string;
  tipo: "consulta" | "pagamento";
  mensagem: string;
  data: Date;
  lida: boolean;
};

export default function AdminPage() {
  const [abaAtiva, setAbaAtiva] = useState<
    "dashboard" | "consultas" | "pagamentos" | "usuarios"
  >("dashboard");
  const [comprasPendentes, setComprasPendentes] = useState<Compra[]>([]);
  const [sessoesPendentes, setSessoesPendentes] = useState<SessaoPendente[]>(
    []
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
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalCreditos, setModalCreditos] = useState<Usuario | null>(null);
  const [minutosAdicionar, setMinutosAdicionar] = useState(10);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Criar elemento de áudio para notificações
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/notification.mp3");
    }
    verificarAdmin();
  }, []);

  useEffect(() => {
    if (busca) {
      const filtrados = usuarios.filter(
        (u) =>
          u.nome.toLowerCase().includes(busca.toLowerCase()) ||
          u.telefone?.includes(busca)
      );
      setUsuariosFiltrados(filtrados);
    } else {
      setUsuariosFiltrados(usuarios);
    }
  }, [busca, usuarios]);

  async function verificarAdmin() {
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

    setAdminId(user.id);
    await carregarDados();

    // Realtime para novas solicitações
    const channel = supabase
      .channel("admin-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sessoes",
        },
        (payload) => {
          carregarSessoesPendentes();
          adicionarNotificacao("consulta", "Nova solicitação de consulta!");
          tocarSom();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "compras",
        },
        (payload) => {
          carregarComprasPendentes();
          adicionarNotificacao("pagamento", "Novo pagamento pendente!");
          tocarSom();
        }
      )
      .subscribe();

    setLoading(false);

    return () => {
      supabase.removeChannel(channel);
    };
  }

  function tocarSom() {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }

  function adicionarNotificacao(
    tipo: "consulta" | "pagamento",
    mensagem: string
  ) {
    const nova: Notificacao = {
      id: Date.now().toString(),
      tipo,
      mensagem,
      data: new Date(),
      lida: false,
    };
    setNotificacoes((prev) => [nova, ...prev].slice(0, 20));
  }

  function marcarTodasLidas() {
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
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
    // Total de usuários
    const { count: totalUsuarios } = await supabase
      .from("usuarios")
      .select("*", { count: "exact", head: true })
      .eq("tipo", "cliente");

    // Total de consultas finalizadas
    const { count: totalConsultas } = await supabase
      .from("sessoes")
      .select("*", { count: "exact", head: true })
      .eq("status", "finalizada");

    // Consultas hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const { count: consultasHoje } = await supabase
      .from("sessoes")
      .select("*", { count: "exact", head: true })
      .eq("status", "finalizada")
      .gte("created_at", hoje.toISOString());

    // Receita total
    const { data: comprasAprovadas } = await supabase
      .from("compras")
      .select("valor")
      .eq("status", "aprovado");

    const receitaTotal =
      comprasAprovadas?.reduce((acc, c) => acc + c.valor, 0) || 0;

    // Receita do mês
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const { data: comprasMes } = await supabase
      .from("compras")
      .select("valor")
      .eq("status", "aprovado")
      .gte("created_at", inicioMes.toISOString());

    const receitaMes = comprasMes?.reduce((acc, c) => acc + c.valor, 0) || 0;

    // Usuários ativos (com minutos > 0)
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
      `
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
    `
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
        `✅ ${minutosAdicionar} minutos adicionados para ${modalCreditos.nome}!`
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

  const notificacoesNaoLidas = notificacoes.filter((n) => !n.lida).length;

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
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🔮</span>
              <span className="text-lg font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent hidden sm:inline">
                Viaa Tarot
              </span>
              <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full ml-2">
                Admin
              </span>
            </Link>

            {/* Ações */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Notificações */}
              <div className="relative">
                <button
                  onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}
                  className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <span className="text-xl">🔔</span>
                  {notificacoesNaoLidas > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {notificacoesNaoLidas}
                    </span>
                  )}
                </button>

                {/* Dropdown notificações */}
                {mostrarNotificacoes && (
                  <div className="absolute right-0 mt-2 w-80 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl overflow-hidden z-50">
                    <div className="flex items-center justify-between p-3 border-b border-white/10">
                      <span className="text-white font-semibold">
                        Notificações
                      </span>
                      {notificacoesNaoLidas > 0 && (
                        <button
                          onClick={marcarTodasLidas}
                          className="text-purple-400 text-xs hover:text-purple-300"
                        >
                          Marcar todas lidas
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificacoes.length === 0 ? (
                        <div className="p-4 text-center text-white/50 text-sm">
                          Nenhuma notificação
                        </div>
                      ) : (
                        notificacoes.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 border-b border-white/5 ${
                              !n.lida ? "bg-purple-500/10" : ""
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-lg">
                                {n.tipo === "consulta" ? "💬" : "💳"}
                              </span>
                              <div className="flex-1">
                                <p className="text-white text-sm">
                                  {n.mensagem}
                                </p>
                                <p className="text-white/40 text-xs mt-1">
                                  {n.data.toLocaleTimeString("pt-BR")}
                                </p>
                              </div>
                              {!n.lida && (
                                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                abaAtiva === aba.id
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              <span>{aba.icon}</span>
              <span className="hidden sm:inline">{aba.label}</span>
              {aba.count !== undefined && aba.count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    abaAtiva === aba.id
                      ? "bg-white/20"
                      : "bg-red-500 text-white"
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
            {/* Cards de estatísticas */}
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

            {/* Ações rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Consultas pendentes */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span>💬</span> Consultas Pendentes
                  </h3>
                  <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                    {sessoesPendentes.length}
                  </span>
                </div>

                {sessoesPendentes.length === 0 ? (
                  <p className="text-white/50 text-sm">
                    Nenhuma consulta aguardando
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
                          <p className="text-white/50 text-xs">
                            {sessao.usuario.minutos_disponiveis} min disponíveis
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
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span>💳</span> Pagamentos Pendentes
                  </h3>
                  <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                    {comprasPendentes.length}
                  </span>
                </div>

                {comprasPendentes.length === 0 ? (
                  <p className="text-white/50 text-sm">
                    Nenhum pagamento aguardando
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
                  Nenhuma solicitação pendente
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
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:border-purple-500/30 transition-all"
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
                        <div className="mt-2 inline-flex items-center gap-1.5 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                          <span>⏱️</span>
                          <span className="font-bold">
                            {sessao.usuario.minutos_disponiveis} min
                          </span>
                          <span className="text-green-400/70">disponíveis</span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-purple-300 text-sm font-medium mb-2">
                          Consulta
                        </h3>
                        <p className="text-white">
                          Tarólogo:{" "}
                          <span className="font-bold text-purple-300">
                            {sessao.tarologo.nome}
                          </span>
                        </p>
                        <p className="text-white/50 text-sm mt-1">
                          Solicitado em{" "}
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
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:border-green-500/30 transition-all"
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
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-green-400">
                            R$ {compra.valor.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-white/70 text-sm mt-1">
                          {compra.minutos} minutos •{" "}
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

              {/* Busca */}
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
              {/* Header da tabela */}
              <div className="hidden md:grid grid-cols-5 gap-4 p-4 bg-white/5 border-b border-white/10 text-white/60 text-sm font-medium">
                <div>Nome</div>
                <div>Telefone</div>
                <div>Créditos</div>
                <div>Cadastro</div>
                <div className="text-right">Ações</div>
              </div>

              {/* Lista de usuários */}
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
                      <div className="md:hidden space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">
                              {usuario.nome}
                            </p>
                            <p className="text-white/50 text-sm">
                              {usuario.telefone}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-medium">
                              ⏱️ {usuario.minutos_disponiveis} min
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setModalCreditos(usuario)}
                          className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg text-sm"
                        >
                          💎 Dar Créditos
                        </button>
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
                            "pt-BR"
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

      {/* Click outside para fechar notificações */}
      {mostrarNotificacoes && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMostrarNotificacoes(false)}
        />
      )}
    </div>
  );
}

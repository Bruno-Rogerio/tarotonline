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
  const router = useRouter();

  const totalPendentes = sessoesPendentes.length + comprasPendentes.length;

  useEffect(() => {
    verificarAdmin();
  }, []);

  useEffect(() => {
    if (busca.trim() === "") {
      setUsuariosFiltrados(usuarios);
    } else {
      const termo = busca.toLowerCase();
      setUsuariosFiltrados(
        usuarios.filter(
          (u) =>
            u.nome.toLowerCase().includes(termo) || u.telefone.includes(termo),
        ),
      );
    }
  }, [busca, usuarios]);

  // Realtime para novas consultas e pagamentos
  useEffect(() => {
    const channel = supabase
      .channel("admin-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sessoes" },
        () => {
          setNovaAtividade(true);
          carregarDados();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "compras" },
        () => {
          setNovaAtividade(true);
          carregarDados();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

    if (userData?.tipo !== "admin") {
      alert("Acesso negado!");
      router.push("/");
      return;
    }

    setAdminId(user.id);
    carregarDados();
  }

  async function carregarDados() {
    await Promise.all([
      carregarComprasPendentes(),
      carregarSessoesPendentes(),
      carregarUsuarios(),
      carregarEstatisticas(),
    ]);
    setLoading(false);
  }

  async function carregarComprasPendentes() {
    const { data } = await supabase
      .from("compras")
      .select("*, usuarios(nome, telefone)")
      .eq("status", "pendente")
      .order("created_at", { ascending: false });

    if (data) setComprasPendentes(data);
  }

  async function carregarSessoesPendentes() {
    const { data } = await supabase
      .from("sessoes")
      .select(
        "id, usuario_id, tarologo_id, minutos_comprados, created_at, usuario:usuarios!sessoes_usuario_id_fkey(nome, telefone, minutos_disponiveis), tarologo:tarologos!sessoes_tarologo_id_fkey(nome)",
      )
      .eq("status", "pendente")
      .order("created_at", { ascending: false });

    if (data) {
      const sessoes = data.map((s: any) => ({
        ...s,
        usuario: s.usuario,
        tarologo: s.tarologo,
      }));
      setSessoesPendentes(sessoes);
    }
  }

  async function carregarUsuarios() {
    const { data } = await supabase
      .from("usuarios")
      .select("id, nome, telefone, minutos_disponiveis, created_at")
      .eq("tipo", "cliente")
      .order("created_at", { ascending: false });

    if (data) {
      setUsuarios(data);
      setUsuariosFiltrados(data);
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
      .eq("status", "finalizada");

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

  async function aprovarCompra(compra: Compra) {
    const { error: updateError } = await supabase
      .from("compras")
      .update({ status: "aprovado" })
      .eq("id", compra.id);

    if (updateError) {
      alert("Erro ao aprovar compra");
      return;
    }

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("minutos_disponiveis")
      .eq("id", compra.usuario_id)
      .single();

    if (usuario) {
      await supabase
        .from("usuarios")
        .update({
          minutos_disponiveis: usuario.minutos_disponiveis + compra.minutos,
        })
        .eq("id", compra.usuario_id);
    }

    alert("✅ Compra aprovada! Minutos creditados.");
    carregarDados();
  }

  async function recusarCompra(compraId: string) {
    if (!confirm("Tem certeza que deseja recusar esta compra?")) return;

    await supabase
      .from("compras")
      .update({ status: "recusado" })
      .eq("id", compraId);

    alert("Compra recusada.");
    carregarDados();
  }

  async function aceitarConsulta(sessao: SessaoPendente) {
    const { error } = await supabase
      .from("sessoes")
      .update({
        status: "ativa",
        admin_id: adminId,
        inicio: new Date().toISOString(),
      })
      .eq("id", sessao.id);

    if (error) {
      alert("Erro ao aceitar consulta");
      return;
    }

    router.push(`/chat/${sessao.id}`);
  }

  async function recusarConsulta(sessao: SessaoPendente) {
    if (!confirm("Tem certeza que deseja recusar esta consulta?")) return;

    await supabase.from("sessoes").delete().eq("id", sessao.id);

    alert("Consulta recusada.");
    carregarDados();
  }

  async function adicionarCreditos() {
    if (!modalCreditos) return;

    const { error } = await supabase
      .from("usuarios")
      .update({
        minutos_disponiveis:
          modalCreditos.minutos_disponiveis + minutosAdicionar,
      })
      .eq("id", modalCreditos.id);

    if (error) {
      alert("Erro ao adicionar créditos");
      return;
    }

    alert(
      `✅ ${minutosAdicionar} minutos adicionados para ${modalCreditos.nome}!`,
    );
    setModalCreditos(null);
    setMinutosAdicionar(10);
    carregarDados();
  }

  async function handleSair() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🔮</div>
          <div className="text-white/70">Carregando painel...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header fixo */}
      <header className="bg-gray-900/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo e título */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl">🔮</span>
                <span className="text-xl font-bold text-white hidden sm:block">
                  Viaa Tarot
                </span>
              </Link>
              <span className="text-white/30">|</span>
              <span className="text-purple-400 font-medium">Admin</span>
            </div>

            {/* Notificação de pendências */}
            {totalPendentes > 0 && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-full">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-sm font-medium">
                  {totalPendentes} pendente{totalPendentes > 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-white/60 hover:text-white text-sm transition-colors"
              >
                Ver site
              </Link>
              <button
                onClick={handleSair}
                className="text-white/60 hover:text-white text-sm transition-colors"
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
                  <span
                    className={`min-w-[22px] h-[22px] flex items-center justify-center px-1.5 rounded-full text-xs font-bold ${
                      abaAtiva === aba.id
                        ? "bg-red-500 text-white"
                        : "bg-red-500 text-white"
                    }`}
                  >
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
                        Você tem{" "}
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

            {/* Seção: Visão Geral */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-6 bg-purple-500 rounded-full" />
                <h2 className="text-xl font-semibold text-white">
                  Visão Geral
                </h2>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card: Total de Usuários */}
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <span className="text-xl">👥</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {estatisticas.totalUsuarios}
                  </div>
                  <div className="text-white/50 text-sm">Total de usuários</div>
                </div>

                {/* Card: Usuários com créditos */}
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <span className="text-xl">✅</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {estatisticas.usuariosAtivos}
                  </div>
                  <div className="text-white/50 text-sm">
                    Com créditos ativos
                  </div>
                </div>

                {/* Card: Total de Consultas */}
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <span className="text-xl">🔮</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {estatisticas.totalConsultas}
                  </div>
                  <div className="text-white/50 text-sm">
                    Consultas realizadas
                  </div>
                </div>

                {/* Card: Consultas Hoje */}
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                      <span className="text-xl">📅</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {estatisticas.consultasHoje}
                  </div>
                  <div className="text-white/50 text-sm">Consultas hoje</div>
                </div>
              </div>
            </section>

            {/* Seção: Financeiro */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-6 bg-green-500 rounded-full" />
                <h2 className="text-xl font-semibold text-white">Financeiro</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card: Receita do Mês */}
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center">
                      <span className="text-3xl">💰</span>
                    </div>
                    <div>
                      <div className="text-white/50 text-sm mb-1">
                        Receita este mês
                      </div>
                      <div className="text-3xl font-bold text-green-400">
                        R$ {estatisticas.receitaMes.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card: Receita Total */}
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                      <span className="text-3xl">💎</span>
                    </div>
                    <div>
                      <div className="text-white/50 text-sm mb-1">
                        Receita total
                      </div>
                      <div className="text-3xl font-bold text-white">
                        R$ {estatisticas.receitaTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ==================== CONSULTAS ==================== */}
        {abaAtiva === "consultas" && (
          <div className="space-y-6">
            {/* Header da seção */}
            <div className="flex items-center justify-between">
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
                      {/* Informações */}
                      <div className="flex-1 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Cliente */}
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
                        </div>

                        {/* Tarólogo */}
                        <div>
                          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">
                            Tarólogo solicitado
                          </div>
                          <div className="text-purple-400 font-medium">
                            {sessao.tarologo.nome}
                          </div>
                          <div className="text-white/50 text-sm">
                            {sessao.minutos_comprados} minutos
                          </div>
                        </div>

                        {/* Data */}
                        <div>
                          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">
                            Solicitado em
                          </div>
                          <div className="text-white/70">
                            {new Date(sessao.created_at).toLocaleDateString(
                              "pt-BR",
                            )}
                          </div>
                          <div className="text-white/50 text-sm">
                            {new Date(sessao.created_at).toLocaleTimeString(
                              "pt-BR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
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
            {/* Header da seção */}
            <div className="flex items-center justify-between">
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
                      {/* Informações */}
                      <div className="flex-1 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Cliente */}
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

                        {/* Valor */}
                        <div>
                          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">
                            Valor
                          </div>
                          <div className="text-green-400 font-bold text-xl">
                            R$ {compra.valor.toFixed(2)}
                          </div>
                        </div>

                        {/* Minutos */}
                        <div>
                          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">
                            Minutos
                          </div>
                          <div className="text-white font-medium">
                            {compra.minutos} min
                          </div>
                        </div>

                        {/* Data */}
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
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => recusarCompra(compra.id)}
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
            {/* Header da seção */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-blue-500 rounded-full" />
                <h2 className="text-xl font-semibold text-white">Usuários</h2>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-full">
                  {usuarios.length}
                </span>
              </div>

              {/* Busca */}
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

            {/* Lista de usuários */}
            <div className="bg-gray-900/50 rounded-2xl border border-white/5 overflow-hidden">
              {/* Header da tabela */}
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

              {/* Linhas */}
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
            <h3 className="text-xl font-semibold text-white mb-6">
              Adicionar Créditos
            </h3>

            {/* Info do usuário */}
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <div className="text-white font-medium">{modalCreditos.nome}</div>
              <div className="text-white/50 text-sm">
                {modalCreditos.telefone}
              </div>
              <div className="text-purple-400 text-sm mt-2">
                Saldo atual: {modalCreditos.minutos_disponiveis} minutos
              </div>
            </div>

            {/* Opções de minutos */}
            <div className="mb-6">
              <label className="text-white/60 text-sm mb-3 block">
                Minutos a adicionar
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 20, 30, 60, 90, 120, 180].map((min) => (
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
            </div>

            {/* Preview */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
              <div className="text-center">
                <div className="text-white/60 text-sm">Novo saldo será</div>
                <div className="text-2xl font-bold text-green-400">
                  {modalCreditos.minutos_disponiveis + minutosAdicionar} minutos
                </div>
              </div>
            </div>

            {/* Botões */}
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

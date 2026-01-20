// app/admin/cupons/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type TipoDesconto = "porcentagem" | "valor_fixo" | "minutos_extras";
type StatusCupom = "ativo" | "inativo" | "expirado";
type OrigemCupom =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "google"
  | "influencer"
  | "indicacao"
  | null;

type Cupom = {
  id: string;
  codigo: string;
  descricao: string | null;
  tipo_desconto: TipoDesconto;
  valor_desconto: number;
  valor_minimo: number;
  limite_total_usos: number | null;
  limite_por_usuario: number;
  apenas_novos_usuarios: boolean;
  data_inicio: string;
  data_fim: string | null;
  origem: OrigemCupom;
  influencer_nome: string | null;
  status: StatusCupom;
  total_usos: number;
  total_desconto_concedido: number;
  total_minutos_extras_dados: number;
  created_at: string;
};

type Estatisticas = {
  cupons: {
    ativos: number;
    inativos: number;
    expirados: number;
    total: number;
  };
  usos: { total: number; hoje: number; semana: number; mes: number };
  descontos: { total: number; minutosExtras: number };
  maisUsados: Cupom[];
  porOrigem: Record<string, number>;
  ultimosUsos: any[];
};

const ORIGENS = [
  {
    value: "instagram",
    label: "Instagram",
    icon: "📸",
    cor: "from-purple-500 to-pink-500",
  },
  {
    value: "tiktok",
    label: "TikTok",
    icon: "🎵",
    cor: "from-gray-800 to-black",
  },
  {
    value: "facebook",
    label: "Facebook",
    icon: "👍",
    cor: "from-blue-500 to-blue-600",
  },
  {
    value: "google",
    label: "Google",
    icon: "🔍",
    cor: "from-red-500 to-yellow-500",
  },
  {
    value: "influencer",
    label: "Influencer",
    icon: "⭐",
    cor: "from-yellow-400 to-orange-500",
  },
  {
    value: "indicacao",
    label: "Indicação",
    icon: "🤝",
    cor: "from-green-500 to-emerald-500",
  },
];

export default function AdminCuponsPage() {
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [cupomEditando, setCupomEditando] = useState<Cupom | null>(null);
  const [modalDetalhes, setModalDetalhes] = useState<Cupom | null>(null);

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroOrigem, setFiltroOrigem] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  // Form
  const [formData, setFormData] = useState({
    codigo: "",
    descricao: "",
    tipo_desconto: "porcentagem" as TipoDesconto,
    valor_desconto: 10,
    valor_minimo: 0,
    limite_total_usos: "",
    limite_por_usuario: 1,
    apenas_novos_usuarios: false,
    data_inicio: new Date().toISOString().slice(0, 16),
    data_fim: "",
    origem: "" as string,
    influencer_nome: "",
    status: "ativo" as StatusCupom,
  });

  const [salvando, setSalvando] = useState(false);
  const router = useRouter();

  useEffect(() => {
    verificarAdmin();
  }, []);

  useEffect(() => {
    if (!loading) {
      carregarCupons();
    }
  }, [filtroStatus, filtroOrigem, busca]);

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
      alert("Acesso negado");
      router.push("/");
      return;
    }

    await Promise.all([carregarCupons(), carregarEstatisticas()]);
    setLoading(false);
  }

  async function carregarCupons() {
    try {
      let url = "/api/cupons?";
      if (filtroStatus !== "todos") url += `status=${filtroStatus}&`;
      if (filtroOrigem !== "todos") url += `origem=${filtroOrigem}&`;
      if (busca) url += `busca=${encodeURIComponent(busca)}&`;

      const res = await fetch(url);
      const data = await res.json();

      if (Array.isArray(data)) {
        setCupons(data);
      }
    } catch (error) {
      console.error("Erro ao carregar cupons:", error);
    }
  }

  async function carregarEstatisticas() {
    try {
      const res = await fetch("/api/cupons/estatisticas");
      const data = await res.json();
      setEstatisticas(data);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  }

  function abrirModalNovo() {
    setCupomEditando(null);
    setFormData({
      codigo: "",
      descricao: "",
      tipo_desconto: "porcentagem",
      valor_desconto: 10,
      valor_minimo: 0,
      limite_total_usos: "",
      limite_por_usuario: 1,
      apenas_novos_usuarios: false,
      data_inicio: new Date().toISOString().slice(0, 16),
      data_fim: "",
      origem: "",
      influencer_nome: "",
      status: "ativo",
    });
    setModalAberto(true);
  }

  function abrirModalEditar(cupom: Cupom) {
    setCupomEditando(cupom);
    setFormData({
      codigo: cupom.codigo,
      descricao: cupom.descricao || "",
      tipo_desconto: cupom.tipo_desconto,
      valor_desconto: cupom.valor_desconto,
      valor_minimo: cupom.valor_minimo,
      limite_total_usos: cupom.limite_total_usos?.toString() || "",
      limite_por_usuario: cupom.limite_por_usuario,
      apenas_novos_usuarios: cupom.apenas_novos_usuarios,
      data_inicio: cupom.data_inicio.slice(0, 16),
      data_fim: cupom.data_fim?.slice(0, 16) || "",
      origem: cupom.origem || "",
      influencer_nome: cupom.influencer_nome || "",
      status: cupom.status,
    });
    setModalAberto(true);
  }

  async function salvarCupom() {
    if (!formData.codigo.trim()) {
      alert("Digite o código do cupom");
      return;
    }

    setSalvando(true);

    try {
      const payload = {
        ...formData,
        limite_total_usos: formData.limite_total_usos
          ? parseInt(formData.limite_total_usos)
          : null,
        data_fim: formData.data_fim || null,
        origem: formData.origem || null,
        influencer_nome: formData.influencer_nome || null,
      };

      const url = cupomEditando
        ? `/api/cupons/${cupomEditando.id}`
        : "/api/cupons";
      const method = cupomEditando ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erro ao salvar cupom");
        setSalvando(false);
        return;
      }

      alert(cupomEditando ? "Cupom atualizado!" : "Cupom criado!");
      setModalAberto(false);
      carregarCupons();
      carregarEstatisticas();
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao salvar cupom");
    }

    setSalvando(false);
  }

  async function alternarStatus(cupom: Cupom) {
    const novoStatus = cupom.status === "ativo" ? "inativo" : "ativo";

    try {
      const res = await fetch(`/api/cupons/${cupom.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (res.ok) {
        carregarCupons();
        carregarEstatisticas();
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  }

  async function excluirCupom(cupom: Cupom) {
    if (cupom.total_usos > 0) {
      alert(
        "Não é possível excluir um cupom já utilizado. Desative-o em vez disso."
      );
      return;
    }

    if (!confirm(`Excluir cupom ${cupom.codigo}?`)) return;

    try {
      const res = await fetch(`/api/cupons/${cupom.id}`, { method: "DELETE" });

      if (res.ok) {
        carregarCupons();
        carregarEstatisticas();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir");
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  }

  function formatarDesconto(tipo: TipoDesconto, valor: number) {
    switch (tipo) {
      case "porcentagem":
        return `${valor}% OFF`;
      case "valor_fixo":
        return `R$ ${valor.toFixed(2)} OFF`;
      case "minutos_extras":
        return `+${valor} min`;
    }
  }

  function getCorStatus(status: StatusCupom) {
    switch (status) {
      case "ativo":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "inativo":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "expirado":
        return "bg-red-500/20 text-red-400 border-red-500/30";
    }
  }

  function copiarLink(codigo: string) {
    const link = `${window.location.origin}/cupom/${codigo}`;
    navigator.clipboard.writeText(link);
    alert("Link copiado!");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🎟️</div>
          <div className="text-white/80">Carregando cupons...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 group">
              <span className="text-2xl">←</span>
              <span className="text-white/70 group-hover:text-white">
                Admin
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-2xl">🎟️</span>
              <h1 className="text-xl font-bold text-white">Cupons</h1>
            </div>
          </div>

          <button
            onClick={abrirModalNovo}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium transition-all"
          >
            <span>➕</span>
            <span className="hidden sm:inline">Novo Cupom</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Cards de Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/30">
              <div className="text-3xl mb-2">🎟️</div>
              <div className="text-2xl font-bold text-white">
                {estatisticas.cupons.total}
              </div>
              <div className="text-white/60 text-sm">Total Cupons</div>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl p-4 border border-green-500/30">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-2xl font-bold text-white">
                {estatisticas.cupons.ativos}
              </div>
              <div className="text-white/60 text-sm">Ativos</div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/30">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-2xl font-bold text-white">
                {estatisticas.usos.total}
              </div>
              <div className="text-white/60 text-sm">Total Usos</div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl p-4 border border-yellow-500/30">
              <div className="text-3xl mb-2">📅</div>
              <div className="text-2xl font-bold text-white">
                {estatisticas.usos.hoje}
              </div>
              <div className="text-white/60 text-sm">Usos Hoje</div>
            </div>

            <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 backdrop-blur-sm rounded-2xl p-4 border border-pink-500/30">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-2xl font-bold text-white">
                R$ {estatisticas.descontos.total.toFixed(0)}
              </div>
              <div className="text-white/60 text-sm">Descontos Dados</div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500/20 to-violet-500/20 backdrop-blur-sm rounded-2xl p-4 border border-indigo-500/30">
              <div className="text-3xl mb-2">⏱️</div>
              <div className="text-2xl font-bold text-white">
                {estatisticas.descontos.minutosExtras}
              </div>
              <div className="text-white/60 text-sm">Min. Extras</div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/10">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Buscar por código ou descrição..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
              />
            </div>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500"
            >
              <option value="todos">Todos Status</option>
              <option value="ativo">✅ Ativos</option>
              <option value="inativo">⏸️ Inativos</option>
              <option value="expirado">❌ Expirados</option>
            </select>

            <select
              value={filtroOrigem}
              onChange={(e) => setFiltroOrigem(e.target.value)}
              className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500"
            >
              <option value="todos">Todas Origens</option>
              {ORIGENS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.icon} {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Cupons */}
        <div className="space-y-4">
          {cupons.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/10">
              <div className="text-5xl mb-4">🎟️</div>
              <h3 className="text-xl font-bold text-white mb-2">
                Nenhum cupom encontrado
              </h3>
              <p className="text-white/60 mb-6">
                Crie seu primeiro cupom para começar!
              </p>
              <button
                onClick={abrirModalNovo}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium transition-all"
              >
                ➕ Criar Cupom
              </button>
            </div>
          ) : (
            cupons.map((cupom) => (
              <div
                key={cupom.id}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Info Principal */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-lg text-sm font-bold border ${getCorStatus(
                          cupom.status
                        )}`}
                      >
                        {cupom.status.toUpperCase()}
                      </span>
                      <code className="px-3 py-1 bg-purple-600/30 text-purple-300 rounded-lg font-mono font-bold">
                        {cupom.codigo}
                      </code>
                      {cupom.origem && (
                        <span className="text-lg">
                          {ORIGENS.find((o) => o.value === cupom.origem)?.icon}
                        </span>
                      )}
                    </div>

                    <div className="text-2xl font-bold text-white mb-1">
                      {formatarDesconto(
                        cupom.tipo_desconto,
                        cupom.valor_desconto
                      )}
                    </div>

                    {cupom.descricao && (
                      <p className="text-white/60 text-sm mb-2">
                        {cupom.descricao}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 text-xs text-white/50">
                      {cupom.valor_minimo > 0 && (
                        <span>Min: R$ {cupom.valor_minimo}</span>
                      )}
                      {cupom.limite_total_usos && (
                        <span>
                          • Limite: {cupom.total_usos}/{cupom.limite_total_usos}
                        </span>
                      )}
                      {cupom.apenas_novos_usuarios && (
                        <span className="text-yellow-400">• Só novos</span>
                      )}
                      {cupom.data_fim && (
                        <span>
                          • Até:{" "}
                          {new Date(cupom.data_fim).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Estatísticas */}
                  <div className="flex items-center gap-6 text-center">
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {cupom.total_usos}
                      </div>
                      <div className="text-white/50 text-xs">usos</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-400">
                        R$ {cupom.total_desconto_concedido.toFixed(0)}
                      </div>
                      <div className="text-white/50 text-xs">desconto</div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copiarLink(cupom.codigo)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                      title="Copiar link"
                    >
                      🔗
                    </button>
                    <button
                      onClick={() => alternarStatus(cupom)}
                      className={`p-2 rounded-lg transition-colors ${
                        cupom.status === "ativo"
                          ? "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400"
                          : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                      }`}
                      title={cupom.status === "ativo" ? "Desativar" : "Ativar"}
                    >
                      {cupom.status === "ativo" ? "⏸️" : "▶️"}
                    </button>
                    <button
                      onClick={() => abrirModalEditar(cupom)}
                      className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => excluirCupom(cupom)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Criar/Editar */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {cupomEditando ? "✏️ Editar Cupom" : "➕ Novo Cupom"}
              </h2>
              <button
                onClick={() => setModalAberto(false)}
                className="p-2 text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Código e Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm mb-1">
                    Código do Cupom *
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        codigo: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Ex: TAROT20"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500 font-mono"
                    disabled={!!(cupomEditando && cupomEditando.total_usos > 0)}
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as StatusCupom,
                      })
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="ativo">✅ Ativo</option>
                    <option value="inativo">⏸️ Inativo</option>
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-white/80 text-sm mb-1">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  placeholder="Ex: Desconto especial de verão"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Tipo e Valor do Desconto */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm mb-1">
                    Tipo de Desconto *
                  </label>
                  <select
                    value={formData.tipo_desconto}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipo_desconto: e.target.value as TipoDesconto,
                      })
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="porcentagem">📊 Porcentagem (%)</option>
                    <option value="valor_fixo">💵 Valor Fixo (R$)</option>
                    <option value="minutos_extras">⏱️ Minutos Extras</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1">
                    {formData.tipo_desconto === "porcentagem"
                      ? "Porcentagem *"
                      : formData.tipo_desconto === "valor_fixo"
                      ? "Valor (R$) *"
                      : "Minutos *"}
                  </label>
                  <input
                    type="number"
                    value={formData.valor_desconto}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        valor_desconto: parseFloat(e.target.value) || 0,
                      })
                    }
                    min="0"
                    step={
                      formData.tipo_desconto === "valor_fixo" ? "0.01" : "1"
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Regras */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-white/80 text-sm mb-1">
                    Valor Mínimo (R$)
                  </label>
                  <input
                    type="number"
                    value={formData.valor_minimo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        valor_minimo: parseFloat(e.target.value) || 0,
                      })
                    }
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1">
                    Limite Total
                  </label>
                  <input
                    type="number"
                    value={formData.limite_total_usos}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limite_total_usos: e.target.value,
                      })
                    }
                    placeholder="Ilimitado"
                    min="1"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1">
                    Por Usuário
                  </label>
                  <input
                    type="number"
                    value={formData.limite_por_usuario}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limite_por_usuario: parseInt(e.target.value) || 1,
                      })
                    }
                    min="1"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Checkbox novos usuários */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.apenas_novos_usuarios}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      apenas_novos_usuarios: e.target.checked,
                    })
                  }
                  className="w-5 h-5 rounded bg-white/10 border-white/20 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-white">
                  Apenas para novos usuários (primeira compra)
                </span>
              </label>

              {/* Validade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm mb-1">
                    Data Início
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.data_inicio}
                    onChange={(e) =>
                      setFormData({ ...formData, data_inicio: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1">
                    Data Fim (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.data_fim}
                    onChange={(e) =>
                      setFormData({ ...formData, data_fim: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Origem/Marketing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm mb-1">
                    Origem (Marketing)
                  </label>
                  <select
                    value={formData.origem}
                    onChange={(e) =>
                      setFormData({ ...formData, origem: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Nenhuma</option>
                    {ORIGENS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.icon} {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.origem === "influencer" && (
                  <div>
                    <label className="block text-white/80 text-sm mb-1">
                      Nome do Influencer
                    </label>
                    <input
                      type="text"
                      value={formData.influencer_nome}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          influencer_nome: e.target.value,
                        })
                      }
                      placeholder="@usuario"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-white/60 text-sm mb-2">Preview:</div>
                <div className="flex items-center gap-3">
                  <code className="px-3 py-1 bg-purple-600/30 text-purple-300 rounded-lg font-mono font-bold">
                    {formData.codigo || "CODIGO"}
                  </code>
                  <span className="text-2xl font-bold text-white">
                    {formatarDesconto(
                      formData.tipo_desconto,
                      formData.valor_desconto
                    )}
                  </span>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setModalAberto(false)}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarCupom}
                  disabled={salvando}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                >
                  {salvando
                    ? "Salvando..."
                    : cupomEditando
                    ? "Salvar"
                    : "Criar Cupom"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

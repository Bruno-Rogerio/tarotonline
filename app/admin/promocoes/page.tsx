"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ConfiguracaoFidelidade = {
  id: string;
  nome: string;
  descricao: string | null;
  minutos_necessarios: number;
  minutos_bonus: number;
  ativo: boolean;
  data_inicio: string | null;
  data_fim: string | null;
  created_at: string;
  totalBonusDistribuidos?: number;
  minutosDistribuidos?: number;
};

export default function PromocoesPage() {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoFidelidade[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<ConfiguracaoFidelidade | null>(null);
  const [salvando, setSalvando] = useState(false);
  const router = useRouter();

  // Form state
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    minutos_necessarios: 60,
    minutos_bonus: 5,
    ativo: true,
    data_inicio: "",
    data_fim: "",
  });

  useEffect(() => {
    verificarAdmin();
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

    if (!userData || userData.tipo !== "admin") {
      alert("Apenas admins podem acessar.");
      router.push("/");
      return;
    }

    carregarConfiguracoes();
  }

  async function carregarConfiguracoes() {
    try {
      const response = await fetch("/api/admin/fidelidade");
      const data = await response.json();
      setConfiguracoes(data);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
    setLoading(false);
  }

  function abrirModal(config?: ConfiguracaoFidelidade) {
    if (config) {
      setEditando(config);
      setForm({
        nome: config.nome,
        descricao: config.descricao || "",
        minutos_necessarios: config.minutos_necessarios,
        minutos_bonus: config.minutos_bonus,
        ativo: config.ativo,
        data_inicio: config.data_inicio
          ? new Date(config.data_inicio).toISOString().slice(0, 16)
          : "",
        data_fim: config.data_fim
          ? new Date(config.data_fim).toISOString().slice(0, 16)
          : "",
      });
    } else {
      setEditando(null);
      setForm({
        nome: "",
        descricao: "",
        minutos_necessarios: 60,
        minutos_bonus: 5,
        ativo: true,
        data_inicio: "",
        data_fim: "",
      });
    }
    setModalAberto(true);
  }

  async function salvarConfiguracao() {
    if (!form.nome || !form.minutos_necessarios || !form.minutos_bonus) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    setSalvando(true);

    try {
      const payload = {
        ...form,
        id: editando?.id,
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
      };

      const response = await fetch("/api/admin/fidelidade", {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Erro ao salvar");

      alert(editando ? "✅ Promoção atualizada!" : "✅ Promoção criada!");
      setModalAberto(false);
      carregarConfiguracoes();
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao salvar promoção");
    }

    setSalvando(false);
  }

  async function deletarConfiguracao(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta promoção?")) return;

    try {
      const response = await fetch(`/api/admin/fidelidade?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao deletar");

      alert("✅ Promoção excluída!");
      carregarConfiguracoes();
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao excluir promoção");
    }
  }

  async function toggleAtivo(config: ConfiguracaoFidelidade) {
    try {
      const response = await fetch("/api/admin/fidelidade", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: config.id,
          nome: config.nome,
          descricao: config.descricao,
          minutos_necessarios: config.minutos_necessarios,
          minutos_bonus: config.minutos_bonus,
          ativo: !config.ativo,
          data_inicio: config.data_inicio,
          data_fim: config.data_fim,
        }),
      });

      if (!response.ok) throw new Error("Erro ao atualizar");

      carregarConfiguracoes();
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao atualizar status");
    }
  }

  function formatarData(dataString: string | null) {
    if (!dataString) return "-";
    return new Date(dataString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🎁</div>
          <div className="text-white/80">Carregando promoções...</div>
        </div>
      </div>
    );
  }

  // Estatísticas
  const totalAtivas = configuracoes.filter((c) => c.ativo).length;
  const totalMinutosDistribuidos = configuracoes.reduce(
    (acc, c) => acc + (c.minutosDistribuidos || 0),
    0
  );
  const totalBonusDistribuidos = configuracoes.reduce(
    (acc, c) => acc + (c.totalBonusDistribuidos || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 group">
              <span className="text-white/60 group-hover:text-white">←</span>
              <span className="text-white/60 group-hover:text-white text-sm">
                Voltar
              </span>
            </Link>
            <div className="h-6 w-px bg-white/20" />
            <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <span>🎁</span>
              <span>Promoções & Fidelidade</span>
            </h1>
          </div>

          <button
            onClick={() => abrirModal()}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-medium rounded-xl transition-all flex items-center gap-2"
          >
            <span>+</span>
            <span className="hidden sm:inline">Nova Promoção</span>
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-2xl font-bold text-white">
              {configuracoes.length}
            </div>
            <div className="text-white/60 text-sm">Total de promoções</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-4 border border-green-500/30">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-green-400">
              {totalAtivas}
            </div>
            <div className="text-white/60 text-sm">Ativas</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-4 border border-purple-500/30">
            <div className="text-3xl mb-2">🎉</div>
            <div className="text-2xl font-bold text-purple-300">
              {totalBonusDistribuidos}
            </div>
            <div className="text-white/60 text-sm">Bônus distribuídos</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl p-4 border border-yellow-500/30">
            <div className="text-3xl mb-2">⏱️</div>
            <div className="text-2xl font-bold text-yellow-400">
              {totalMinutosDistribuidos}
            </div>
            <div className="text-white/60 text-sm">Minutos dados</div>
          </div>
        </div>

        {/* Como funciona */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-8">
          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
            <span>💡</span> Como funciona o sistema de fidelidade
          </h3>
          <p className="text-white/70 text-sm">
            O sistema automaticamente verifica quando um usuário finaliza uma
            consulta. Se ele atingiu a meta de minutos configurada, ganha o
            bônus automaticamente! Por exemplo: "A cada 60 minutos usados, ganha
            5 minutos de bônus".
          </p>
        </div>

        {/* Lista de Promoções */}
        {configuracoes.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 text-center">
            <div className="text-6xl mb-4">🎁</div>
            <h3 className="text-xl font-bold text-white mb-2">
              Nenhuma promoção cadastrada
            </h3>
            <p className="text-purple-200/70 mb-6">
              Crie sua primeira promoção de fidelidade para recompensar seus
              clientes!
            </p>
            <button
              onClick={() => abrirModal()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl transition-all hover:scale-105"
            >
              <span>+</span>
              <span>Criar Promoção</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {configuracoes.map((config) => (
              <div
                key={config.id}
                className={`bg-white/10 backdrop-blur-sm rounded-2xl border overflow-hidden transition-all ${
                  config.ativo
                    ? "border-green-500/30"
                    : "border-white/20 opacity-60"
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-bold text-lg">
                          {config.nome}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            config.ativo
                              ? "bg-green-500/20 text-green-300 border border-green-500/30"
                              : "bg-red-500/20 text-red-300 border border-red-500/30"
                          }`}
                        >
                          {config.ativo ? "Ativa" : "Inativa"}
                        </span>
                      </div>
                      {config.descricao && (
                        <p className="text-white/60 text-sm mb-3">
                          {config.descricao}
                        </p>
                      )}

                      {/* Regra */}
                      <div className="flex items-center gap-2 bg-purple-500/20 rounded-xl p-3 mb-3">
                        <span className="text-2xl">🎯</span>
                        <div>
                          <p className="text-white font-medium">
                            A cada{" "}
                            <span className="text-purple-300 font-bold">
                              {config.minutos_necessarios} minutos
                            </span>{" "}
                            usados
                          </p>
                          <p className="text-green-400 font-bold">
                            → Ganha {config.minutos_bonus} minutos de bônus! 🎁
                          </p>
                        </div>
                      </div>

                      {/* Datas */}
                      {(config.data_inicio || config.data_fim) && (
                        <div className="flex items-center gap-4 text-sm text-white/50">
                          {config.data_inicio && (
                            <span>
                              📅 Início: {formatarData(config.data_inicio)}
                            </span>
                          )}
                          {config.data_fim && (
                            <span>🏁 Fim: {formatarData(config.data_fim)}</span>
                          )}
                        </div>
                      )}

                      {/* Estatísticas */}
                      <div className="flex items-center gap-6 mt-3 text-sm">
                        <div className="text-white/60">
                          <span className="text-white font-medium">
                            {config.totalBonusDistribuidos || 0}
                          </span>{" "}
                          bônus dados
                        </div>
                        <div className="text-white/60">
                          <span className="text-yellow-400 font-medium">
                            {config.minutosDistribuidos || 0}
                          </span>{" "}
                          minutos distribuídos
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => toggleAtivo(config)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          config.ativo
                            ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                            : "bg-green-500/20 text-green-300 hover:bg-green-500/30"
                        }`}
                      >
                        {config.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => abrirModal(config)}
                        className="px-3 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-all"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deletarConfiguracao(config.id)}
                        className="px-3 py-2 bg-red-500/10 text-red-300 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-all"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Criar/Editar */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl border border-white/20 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🎁</span>
                  <span>{editando ? "Editar Promoção" : "Nova Promoção"}</span>
                </h2>
                <button
                  onClick={() => setModalAberto(false)}
                  className="p-2 text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-white/80 text-sm mb-2">
                    Nome da Promoção *
                  </label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Ex: Bônus Fidelidade Bronze"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-white/80 text-sm mb-2">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={form.descricao}
                    onChange={(e) =>
                      setForm({ ...form, descricao: e.target.value })
                    }
                    placeholder="Descreva a promoção..."
                    rows={2}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>

                {/* Regra */}
                <div className="bg-purple-500/20 rounded-xl p-4 border border-purple-500/30">
                  <p className="text-white/80 text-sm mb-3 font-medium">
                    ⚙️ Configuração da Regra
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/60 text-xs mb-1">
                        A cada X minutos usados *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.minutos_necessarios}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            minutos_necessarios: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">
                        Ganha X minutos de bônus *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.minutos_bonus}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            minutos_bonus: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <p className="text-green-400 text-sm mt-3 font-medium">
                    → A cada {form.minutos_necessarios || "?"} min usados, ganha{" "}
                    {form.minutos_bonus || "?"} min de bônus! 🎁
                  </p>
                </div>

                {/* Período */}
                <div>
                  <p className="text-white/80 text-sm mb-3 font-medium">
                    📅 Período da Promoção (opcional)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/60 text-xs mb-1">
                        Data/Hora Início
                      </label>
                      <input
                        type="datetime-local"
                        value={form.data_inicio}
                        onChange={(e) =>
                          setForm({ ...form, data_inicio: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">
                        Data/Hora Fim
                      </label>
                      <input
                        type="datetime-local"
                        value={form.data_fim}
                        onChange={(e) =>
                          setForm({ ...form, data_fim: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <p className="text-white/50 text-xs mt-2">
                    Deixe em branco para promoção sem prazo definido.
                  </p>
                </div>

                {/* Ativo */}
                <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
                  <div>
                    <p className="text-white font-medium">Status da Promoção</p>
                    <p className="text-white/60 text-sm">
                      {form.ativo
                        ? "Promoção ativa e funcionando"
                        : "Promoção desativada"}
                    </p>
                  </div>
                  <button
                    onClick={() => setForm({ ...form, ativo: !form.ativo })}
                    className={`relative w-14 h-8 rounded-full transition-colors ${
                      form.ativo ? "bg-green-500" : "bg-white/20"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${
                        form.ativo ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setModalAberto(false)}
                  className="flex-1 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarConfiguracao}
                  disabled={salvando}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : editando ? "Salvar" : "Criar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

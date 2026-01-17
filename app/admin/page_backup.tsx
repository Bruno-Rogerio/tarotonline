"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

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

export default function AdminPage() {
  const [comprasPendentes, setComprasPendentes] = useState<Compra[]>([]);
  const [sessoesPendentes, setSessoesPendentes] = useState<SessaoPendente[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string>("");
  const [abaAtiva, setAbaAtiva] = useState<"pagamentos" | "consultas">(
    "consultas"
  );
  const router = useRouter();

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

    if (userData?.tipo !== "admin") {
      alert("Acesso negado! Apenas admins podem acessar.");
      router.push("/");
      return;
    }

    setAdminId(user.id);
    carregarDados();

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
        () => {
          carregarSessoesPendentes();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "compras",
        },
        () => {
          carregarComprasPendentes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function carregarDados() {
    await Promise.all([carregarComprasPendentes(), carregarSessoesPendentes()]);
    setLoading(false);
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
    console.log("🔍 Carregando sessões pendentes...");

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

    console.log("📊 Sessões encontradas:", data);
    console.log("❌ Erro:", error);

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
  }

  async function aceitarConsulta(sessao: SessaoPendente) {
    setLoading(true);

    // Pega o ID do admin na hora (garante que está atualizado)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Erro: Usuário não autenticado");
      setLoading(false);
      return;
    }

    console.log("👤 Aceitando consulta com admin_id:", user.id);

    const { error } = await supabase
      .from("sessoes")
      .update({
        status: "em_andamento",
        admin_id: user.id, // Usa direto do user
        inicio: new Date().toISOString(),
      })
      .eq("id", sessao.id);

    console.log("✅ Update resultado:", { error });

    if (error) {
      alert("Erro ao aceitar consulta: " + error.message);
      setLoading(false);
      return;
    }

    // Redirecionar para o chat
    router.push(`/chat/${sessao.id}`);
  }

  async function recusarConsulta(sessao: SessaoPendente) {
    if (!confirm("Tem certeza que deseja recusar esta consulta?")) return;

    setLoading(true);

    await supabase.from("sessoes").delete().eq("id", sessao.id);

    alert("❌ Consulta recusada!");
    carregarDados();
  }

  async function handleSair() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 p-4">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 mb-8">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">🔮 Painel Admin</h1>
          <div className="flex gap-4">
            <button
              onClick={() => router.push("/")}
              className="text-purple-300 hover:text-purple-200"
            >
              Home
            </button>
            <button
              onClick={handleSair}
              className="text-purple-300 hover:text-purple-200"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl">
        {/* Abas */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setAbaAtiva("consultas")}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              abaAtiva === "consultas"
                ? "bg-purple-600 text-white"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
          >
            Consultas Pendentes ({sessoesPendentes.length})
          </button>
          <button
            onClick={() => setAbaAtiva("pagamentos")}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              abaAtiva === "pagamentos"
                ? "bg-purple-600 text-white"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
          >
            Pagamentos Pendentes ({comprasPendentes.length})
          </button>
        </div>

        {/* Conteúdo */}
        {abaAtiva === "consultas" && (
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">
              Solicitações de Consulta ({sessoesPendentes.length})
            </h2>

            {sessoesPendentes.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
                <div className="text-6xl mb-4">✅</div>
                <div className="text-white text-xl">
                  Nenhuma solicitação pendente
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {sessoesPendentes.map((sessao) => (
                  <div
                    key={sessao.id}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
                  >
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Informações do Cliente */}
                      <div>
                        <h3 className="text-white font-bold text-lg mb-3">
                          Cliente
                        </h3>
                        <div className="space-y-2 text-white/80">
                          <div>
                            <span className="text-white/60">Nome: </span>
                            {sessao.usuario.nome}
                          </div>
                          <div>
                            <span className="text-white/60">Telefone: </span>
                            {sessao.usuario.telefone}
                          </div>
                          <div>
                            <span className="text-white/60">
                              Minutos disponíveis:{" "}
                            </span>
                            <span className="text-green-400 font-bold">
                              {sessao.usuario.minutos_disponiveis} min
                            </span>
                          </div>
                          <div>
                            <span className="text-white/60">Solicitado: </span>
                            {new Date(sessao.created_at).toLocaleString(
                              "pt-BR"
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Informações da Consulta */}
                      <div>
                        <h3 className="text-white font-bold text-lg mb-3">
                          Consulta
                        </h3>
                        <div className="space-y-2 text-white/80">
                          <div>
                            <span className="text-white/60">
                              Tarólogo solicitado:{" "}
                            </span>
                            <span className="text-purple-300 font-bold">
                              {sessao.tarologo.nome}
                            </span>
                          </div>
                          <div>
                            <span className="text-white/60">Duração: </span>
                            <span className="text-white font-bold">
                              {sessao.minutos_comprados} minutos
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => aceitarConsulta(sessao)}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                      >
                        ✅ Aceitar e Iniciar Chat
                      </button>
                      <button
                        onClick={() => recusarConsulta(sessao)}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
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

        {abaAtiva === "pagamentos" && (
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">
              Pagamentos Pendentes ({comprasPendentes.length})
            </h2>

            {comprasPendentes.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
                <div className="text-6xl mb-4">✅</div>
                <div className="text-white text-xl">
                  Nenhum pagamento pendente
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {comprasPendentes.map((compra) => (
                  <div
                    key={compra.id}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
                  >
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-white font-bold text-lg mb-3">
                          Cliente
                        </h3>
                        <div className="space-y-2 text-white/80">
                          <div>
                            <span className="text-white/60">Nome: </span>
                            {compra.usuarios.nome}
                          </div>
                          <div>
                            <span className="text-white/60">Telefone: </span>
                            {compra.usuarios.telefone}
                          </div>
                          <div>
                            <span className="text-white/60">Data: </span>
                            {new Date(compra.created_at).toLocaleString(
                              "pt-BR"
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-white font-bold text-lg mb-3">
                          Compra
                        </h3>
                        <div className="space-y-2 text-white/80">
                          <div>
                            <span className="text-white/60">Minutos: </span>
                            <span className="text-white font-bold">
                              {compra.minutos} min
                            </span>
                          </div>
                          <div>
                            <span className="text-white/60">Valor: </span>
                            <span className="text-green-400 font-bold">
                              R$ {compra.valor.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => aprovarCompra(compra)}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                      >
                        ✅ Aprovar Pagamento
                      </button>
                      <button
                        onClick={() => recusarCompra(compra)}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
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
      </div>
    </div>
  );
}

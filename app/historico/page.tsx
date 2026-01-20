"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Consulta = {
  id: string;
  minutos_comprados: number;
  minutos_usados: number;
  status: "aguardando" | "em_andamento" | "finalizada";
  inicio: string | null;
  fim: string | null;
  created_at: string;
  tarologo: {
    id: string;
    nome: string;
    avatar_url: string | null;
    especialidade: string | null;
  };
  avaliacao?: {
    estrelas: number;
    comentario: string | null;
  } | null;
};

export default function HistoricoPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todas" | "finalizadas" | "pendentes">(
    "todas"
  );
  const [usuario, setUsuario] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Buscar dados do usuário
    const { data: userData } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", user.id)
      .single();

    setUsuario(userData);

    // Buscar consultas do usuário
    const { data: sessoes, error } = await supabase
      .from("sessoes")
      .select(
        `
        id,
        minutos_comprados,
        minutos_usados,
        status,
        inicio,
        fim,
        created_at,
        tarologo:tarologos(id, nome, avatar_url, especialidade)
      `
      )
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar consultas:", error);
      setLoading(false);
      return;
    }

    // Buscar avaliações para cada sessão
    const consultasComAvaliacao = await Promise.all(
      (sessoes || []).map(async (sessao: any) => {
        const { data: avaliacao } = await supabase
          .from("avaliacoes")
          .select("estrelas, comentario")
          .eq("sessao_id", sessao.id)
          .single();

        return {
          ...sessao,
          avaliacao: avaliacao || null,
        };
      })
    );

    setConsultas(consultasComAvaliacao);
    setLoading(false);
  }

  function formatarData(dataString: string) {
    const data = new Date(dataString);
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatarHora(dataString: string) {
    const data = new Date(dataString);
    return data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function calcularDuracao(inicio: string | null, fim: string | null): string {
    if (!inicio || !fim) return "-";
    const diff = new Date(fim).getTime() - new Date(inicio).getTime();
    const minutos = Math.floor(diff / 60000);
    return `${minutos} min`;
  }

  const consultasFiltradas = consultas.filter((c) => {
    if (filtro === "todas") return true;
    if (filtro === "finalizadas") return c.status === "finalizada";
    if (filtro === "pendentes") return c.status !== "finalizada";
    return true;
  });

  const estatisticas = {
    total: consultas.length,
    finalizadas: consultas.filter((c) => c.status === "finalizada").length,
    minutosUsados: consultas.reduce(
      (acc, c) => acc + (c.minutos_usados || 0),
      0
    ),
    mediaEstrelas:
      consultas.filter((c) => c.avaliacao).length > 0
        ? (
            consultas
              .filter((c) => c.avaliacao)
              .reduce((acc, c) => acc + (c.avaliacao?.estrelas || 0), 0) /
            consultas.filter((c) => c.avaliacao).length
          ).toFixed(1)
        : "-",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">📜</div>
          <div className="text-white/80">Carregando histórico...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 md:gap-3 group">
            <img
              src="/logo.png"
              alt="Viaa Tarot"
              className="w-8 h-8 md:w-10 md:h-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
            />
            <span className="text-lg md:text-2xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
              Viaa Tarot
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {usuario && (
              <div className="hidden sm:flex items-center gap-2 bg-purple-600/50 px-3 py-1.5 rounded-full">
                <span className="text-yellow-300">⏱️</span>
                <span className="text-white font-bold">
                  {usuario.minutos_disponiveis || 0} min
                </span>
              </div>
            )}
            <Link
              href="/"
              className="px-4 py-2 md:px-6 md:py-2.5 text-sm md:text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-full transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105"
            >
              Voltar
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg shadow-purple-500/30">
            <span className="text-3xl">📜</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Histórico de Consultas
          </h1>
          <p className="text-purple-200/70">
            Veja todas as suas consultas realizadas
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 text-center">
            <div className="text-2xl md:text-3xl font-bold text-white mb-1">
              {estatisticas.total}
            </div>
            <div className="text-purple-200/70 text-xs md:text-sm">
              Total de consultas
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 text-center">
            <div className="text-2xl md:text-3xl font-bold text-green-400 mb-1">
              {estatisticas.finalizadas}
            </div>
            <div className="text-purple-200/70 text-xs md:text-sm">
              Finalizadas
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 text-center">
            <div className="text-2xl md:text-3xl font-bold text-purple-300 mb-1">
              {estatisticas.minutosUsados}
            </div>
            <div className="text-purple-200/70 text-xs md:text-sm">
              Minutos usados
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 text-center">
            <div className="text-2xl md:text-3xl font-bold text-yellow-400 mb-1 flex items-center justify-center gap-1">
              <span>⭐</span>
              <span>{estatisticas.mediaEstrelas}</span>
            </div>
            <div className="text-purple-200/70 text-xs md:text-sm">
              Média de avaliações
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "todas", label: "Todas", count: consultas.length },
            {
              id: "finalizadas",
              label: "Finalizadas",
              count: consultas.filter((c) => c.status === "finalizada").length,
            },
            {
              id: "pendentes",
              label: "Pendentes",
              count: consultas.filter((c) => c.status !== "finalizada").length,
            },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id as any)}
              className={`px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
                filtro === f.id
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Lista de Consultas */}
        {consultasFiltradas.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 text-center">
            <div className="text-6xl mb-4">🔮</div>
            <h3 className="text-xl font-bold text-white mb-2">
              Nenhuma consulta encontrada
            </h3>
            <p className="text-purple-200/70 mb-6">
              {filtro === "todas"
                ? "Você ainda não realizou nenhuma consulta."
                : `Nenhuma consulta ${
                    filtro === "finalizadas" ? "finalizada" : "pendente"
                  }.`}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl transition-all hover:scale-105"
            >
              <span>✨</span>
              <span>Iniciar uma consulta</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {consultasFiltradas.map((consulta) => (
              <ConsultaCard
                key={consulta.id}
                consulta={consulta}
                formatarData={formatarData}
                formatarHora={formatarHora}
                calcularDuracao={calcularDuracao}
              />
            ))}
          </div>
        )}

        {/* Voltar */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
          >
            <span>←</span>
            <span>Voltar para home</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black/40 backdrop-blur-sm border-t border-purple-500/20 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-purple-300/50 text-sm">
          <p>© 2025 Viaa Tarot. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

// Componente do Card de Consulta
function ConsultaCard({
  consulta,
  formatarData,
  formatarHora,
  calcularDuracao,
}: {
  consulta: Consulta;
  formatarData: (data: string) => string;
  formatarHora: (data: string) => string;
  calcularDuracao: (inicio: string | null, fim: string | null) => string;
}) {
  const [expandido, setExpandido] = useState(false);

  const statusConfig = {
    aguardando: {
      bg: "bg-yellow-500/20",
      border: "border-yellow-500/30",
      text: "text-yellow-300",
      label: "Aguardando",
      icon: "⏳",
    },
    em_andamento: {
      bg: "bg-blue-500/20",
      border: "border-blue-500/30",
      text: "text-blue-300",
      label: "Em andamento",
      icon: "💬",
    },
    finalizada: {
      bg: "bg-green-500/20",
      border: "border-green-500/30",
      text: "text-green-300",
      label: "Finalizada",
      icon: "✅",
    },
  };

  const status = statusConfig[consulta.status];

  return (
    <div
      className={`bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden transition-all ${
        expandido ? "ring-2 ring-purple-500/50" : ""
      }`}
    >
      {/* Cabeçalho do Card */}
      <div
        className="p-4 md:p-5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpandido(!expandido)}
      >
        <div className="flex items-center gap-4">
          {/* Avatar do Tarólogo */}
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold overflow-hidden flex-shrink-0">
            {consulta.tarologo?.avatar_url ? (
              <img
                src={consulta.tarologo.avatar_url}
                alt={consulta.tarologo.nome}
                className="w-full h-full object-cover"
              />
            ) : (
              consulta.tarologo?.nome?.charAt(0) || "?"
            )}
          </div>

          {/* Informações */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-bold text-lg truncate">
                {consulta.tarologo?.nome || "Tarólogo"}
              </h3>
              {consulta.avaliacao && (
                <div className="flex items-center gap-1 text-yellow-400 text-sm">
                  <span>⭐</span>
                  <span>{consulta.avaliacao.estrelas}</span>
                </div>
              )}
            </div>
            <p className="text-purple-300/80 text-sm">
              {consulta.tarologo?.especialidade || "Tarot Geral"}
            </p>
            <div className="flex items-center gap-3 mt-2 text-sm text-white/60">
              <span>📅 {formatarData(consulta.created_at)}</span>
              {consulta.inicio && (
                <span>🕐 {formatarHora(consulta.inicio)}</span>
              )}
            </div>
          </div>

          {/* Status e Seta */}
          <div className="flex flex-col items-end gap-2">
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.border} ${status.text} border flex items-center gap-1`}
            >
              <span>{status.icon}</span>
              <span className="hidden sm:inline">{status.label}</span>
            </div>
            <div
              className={`text-white/40 transition-transform ${
                expandido ? "rotate-180" : ""
              }`}
            >
              ▼
            </div>
          </div>
        </div>
      </div>

      {/* Detalhes Expandidos */}
      {expandido && (
        <div className="border-t border-white/10 p-4 md:p-5 bg-black/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-white/50 text-xs mb-1">Minutos Usados</div>
              <div className="text-white font-medium">
                {consulta.minutos_usados || 0} min
              </div>
            </div>
            <div>
              <div className="text-white/50 text-xs mb-1">Duração Real</div>
              <div className="text-white font-medium">
                {calcularDuracao(consulta.inicio, consulta.fim)}
              </div>
            </div>
            <div>
              <div className="text-white/50 text-xs mb-1">Início</div>
              <div className="text-white font-medium">
                {consulta.inicio ? formatarHora(consulta.inicio) : "-"}
              </div>
            </div>
            <div>
              <div className="text-white/50 text-xs mb-1">Fim</div>
              <div className="text-white font-medium">
                {consulta.fim ? formatarHora(consulta.fim) : "-"}
              </div>
            </div>
          </div>

          {/* Avaliação */}
          {consulta.avaliacao ? (
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-white/70 text-sm">Sua avaliação:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((estrela) => (
                    <span
                      key={estrela}
                      className={
                        estrela <= consulta.avaliacao!.estrelas
                          ? "text-yellow-400"
                          : "text-white/20"
                      }
                    >
                      ⭐
                    </span>
                  ))}
                </div>
              </div>
              {consulta.avaliacao.comentario && (
                <p className="text-white/70 text-sm italic">
                  "{consulta.avaliacao.comentario}"
                </p>
              )}
            </div>
          ) : consulta.status === "finalizada" ? (
            <Link
              href={`/avaliar/${consulta.id}`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-xl transition-all"
            >
              <span>⭐</span>
              <span>Avaliar consulta</span>
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}

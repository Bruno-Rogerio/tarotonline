"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Tarologo = {
  id: string;
  nome: string;
  avatar_url: string | null;
  biografia: string | null;
  especialidade: string | null;
  total_consultas: number;
  avaliacao_media: number;
  status: "disponivel" | "ocupado" | "indisponivel";
  minutosRestantes?: number;
};

type Avaliacao = {
  usuario_nome: string;
  estrelas: number;
  comentario: string | null;
};

export default function TarologoCard({
  tarologo,
  usuarioLogado = false,
  temMinutos = false,
  isAdmin = false,
  onChangeStatus,
}: {
  tarologo: Tarologo;
  usuarioLogado?: boolean;
  temMinutos?: boolean;
  isAdmin?: boolean;
  onChangeStatus?: (status: "disponivel" | "ocupado" | "indisponivel") => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(false);

  const statusConfig = {
    disponivel: {
      bg: "bg-green-500",
      glow: "shadow-green-500/50",
      text: "text-green-300",
      bgLight: "bg-green-500/20",
      label: "Disponível",
      icon: "✓",
    },
    ocupado: {
      bg: "bg-yellow-500",
      glow: "shadow-yellow-500/50",
      text: "text-yellow-300",
      bgLight: "bg-yellow-500/20",
      label: "Em atendimento",
      icon: "⏱",
    },
    indisponivel: {
      bg: "bg-red-500",
      glow: "shadow-red-500/50",
      text: "text-red-300",
      bgLight: "bg-red-500/20",
      label: "Indisponível",
      icon: "✕",
    },
  };

  const status = statusConfig[tarologo.status];

  useEffect(() => {
    if (flipped && avaliacoes.length === 0) {
      buscarAvaliacoes();
    }
  }, [flipped]);

  async function buscarAvaliacoes() {
    setLoading(true);
    const { data, error } = await supabase
      .from("avaliacoes")
      .select("usuario_nome, estrelas, comentario")
      .eq("tarologo_id", tarologo.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAvaliacoes(data);
    }
    setLoading(false);
  }

  return (
    <div className="perspective-1000 h-[420px] md:h-[460px]">
      <div
        className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${
          flipped ? "rotate-y-180" : ""
        }`}
      >
        {/* FRENTE DO CARD */}
        <div className="absolute w-full h-full backface-hidden">
          <div className="group relative bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all duration-300 h-full flex flex-col overflow-hidden">
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300 rounded-2xl" />

            {/* Status indicator bar */}
            <div
              className={`h-1 w-full ${status.bg} ${status.glow} shadow-lg`}
            />

            <div className="relative flex flex-col items-center flex-1 p-5 md:p-6">
              {/* Avatar com glow */}
              <div className="relative mb-4">
                {/* Glow ring */}
                <div
                  className={`absolute inset-0 ${status.bg} rounded-full blur-md opacity-30 scale-110`}
                />

                {/* Avatar */}
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full border-3 border-purple-400/50 bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 flex items-center justify-center text-white text-2xl md:text-3xl font-bold shadow-xl">
                  {tarologo.avatar_url ? (
                    <img
                      src={tarologo.avatar_url}
                      alt={tarologo.nome}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    tarologo.nome.charAt(0)
                  )}
                </div>

                {/* Status badge */}
                <div
                  className={`absolute -bottom-1 -right-1 w-6 h-6 ${status.bg} rounded-full border-3 border-purple-950 flex items-center justify-center text-xs shadow-lg ${status.glow}`}
                >
                  <span className="text-white text-[10px]">{status.icon}</span>
                </div>
              </div>

              {/* Nome */}
              <h3 className="text-lg md:text-xl font-bold text-white mb-1 text-center">
                {tarologo.nome}
              </h3>

              {/* Especialidade */}
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-purple-400 text-sm">✦</span>
                <p className="text-purple-300/80 text-sm">
                  {tarologo.especialidade || "Tarot Geral"}
                </p>
              </div>

              {/* Biografia */}
              <p className="text-white/60 text-xs md:text-sm text-center mb-4 line-clamp-2 px-2">
                {tarologo.biografia || "Especialista em leituras de tarot"}
              </p>

              {/* Estatísticas */}
              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm md:text-base">
                    <span>⭐</span>
                    <span>{tarologo.avaliacao_media}</span>
                  </div>
                  <div className="text-white/50 text-[10px] md:text-xs">
                    Avaliação
                  </div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <div className="text-purple-300 font-bold text-sm md:text-base">
                    {tarologo.total_consultas}
                  </div>
                  <div className="text-white/50 text-[10px] md:text-xs">
                    Consultas
                  </div>
                </div>
              </div>

              {/* Status badge */}
              <div
                className={`px-4 py-1.5 rounded-full text-xs font-medium ${status.bgLight} ${status.text} border border-current/20 mb-4`}
              >
                {tarologo.status === "ocupado" && tarologo.minutosRestantes
                  ? `⏱ ${tarologo.minutosRestantes} min restantes`
                  : status.label}
              </div>

              {/* Botões */}
              <div className="mt-auto w-full space-y-2">
                {/* Admin controls */}
                {isAdmin && (
                  <div className="flex gap-1.5 mb-2">
                    <button
                      onClick={() => onChangeStatus?.("disponivel")}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-all ${
                        tarologo.status === "disponivel"
                          ? "bg-green-500 text-white"
                          : "bg-green-500/20 text-green-300 hover:bg-green-500/30"
                      }`}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => onChangeStatus?.("ocupado")}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-all ${
                        tarologo.status === "ocupado"
                          ? "bg-yellow-500 text-white"
                          : "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
                      }`}
                    >
                      ⏱
                    </button>
                    <button
                      onClick={() => onChangeStatus?.("indisponivel")}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-all ${
                        tarologo.status === "indisponivel"
                          ? "bg-red-500 text-white"
                          : "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                      }`}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Ver Avaliações */}
                <button
                  onClick={() => setFlipped(true)}
                  className="w-full py-2.5 rounded-xl font-medium text-center transition-all bg-white/10 hover:bg-white/20 text-white text-sm border border-white/10 hover:border-white/20"
                >
                  <span className="flex items-center justify-center gap-2">
                    <span>💬</span>
                    <span>Ver Avaliações</span>
                  </span>
                </button>

                {/* Consultar */}
                <Link
                  href={
                    !usuarioLogado
                      ? "/login"
                      : !temMinutos
                      ? "/comprar-minutos"
                      : tarologo.status === "disponivel"
                      ? `/solicitar-consulta?tarologo=${tarologo.id}`
                      : "#"
                  }
                  className={`block w-full py-2.5 rounded-xl font-medium text-center transition-all text-sm ${
                    tarologo.status === "disponivel" &&
                    usuarioLogado &&
                    temMinutos
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02]"
                      : !usuarioLogado || !temMinutos
                      ? "bg-purple-600/50 hover:bg-purple-600/70 text-white/90"
                      : "bg-white/5 text-white/40 cursor-not-allowed"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {!usuarioLogado ? (
                      <>
                        <span>🔐</span>
                        <span>Fazer login</span>
                      </>
                    ) : !temMinutos ? (
                      <>
                        <span>💎</span>
                        <span>Comprar minutos</span>
                      </>
                    ) : tarologo.status === "disponivel" ? (
                      <>
                        <span>🔮</span>
                        <span>Consultar agora</span>
                      </>
                    ) : (
                      <>
                        <span>⏳</span>
                        <span>Indisponível</span>
                      </>
                    )}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* VERSO DO CARD (Avaliações) */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180">
          <div className="relative bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/10 h-full flex flex-col overflow-hidden">
            {/* Header bar */}
            <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-pink-500" />

            <div className="p-5 md:p-6 flex flex-col h-full">
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                  <span>⭐</span>
                  <span>Avaliações</span>
                </h3>
                <button
                  onClick={() => setFlipped(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Rating summary */}
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-4 mb-4 border border-yellow-500/20">
                <div className="flex items-center justify-center gap-3">
                  <div className="text-4xl font-bold text-yellow-400">
                    {tarologo.avaliacao_media}
                  </div>
                  <div>
                    <div className="text-yellow-400 text-lg">
                      {"★".repeat(Math.round(tarologo.avaliacao_media))}
                      {"☆".repeat(5 - Math.round(tarologo.avaliacao_media))}
                    </div>
                    <div className="text-white/60 text-xs">
                      {avaliacoes.length} avaliações
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de avaliações */}
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl mb-2 animate-pulse">🔮</div>
                    <div className="text-white/60 text-sm">Carregando...</div>
                  </div>
                </div>
              ) : avaliacoes.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-white/50">
                    <div className="text-3xl mb-2">💭</div>
                    <p className="text-sm">Nenhuma avaliação ainda</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                  {avaliacoes.map((avaliacao, index) => (
                    <div
                      key={index}
                      className="bg-white/5 hover:bg-white/10 rounded-xl p-3 border border-white/5 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-white font-medium text-sm flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px]">
                            {avaliacao.usuario_nome.charAt(0)}
                          </span>
                          {avaliacao.usuario_nome}
                        </span>
                        <div className="text-yellow-400 text-xs">
                          {"★".repeat(avaliacao.estrelas)}
                        </div>
                      </div>
                      {avaliacao.comentario && (
                        <p className="text-white/60 text-xs italic pl-8">
                          &quot;{avaliacao.comentario}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Botão voltar */}
              <button
                onClick={() => setFlipped(false)}
                className="mt-4 w-full py-2.5 rounded-xl font-medium text-center transition-all bg-white/10 hover:bg-white/20 text-white text-sm border border-white/10"
              >
                ← Voltar ao perfil
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .border-3 {
          border-width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #a855f7, #ec4899);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #9333ea, #db2777);
        }
      `}</style>
    </div>
  );
}

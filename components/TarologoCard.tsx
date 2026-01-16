"use client";

import { useState, useEffect, useMemo } from "react";
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
}: {
  tarologo: Tarologo;
  usuarioLogado?: boolean;
  temMinutos?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(false);

  const statusColor = {
    disponivel: "bg-green-500",
    ocupado: "bg-yellow-500",
    indisponivel: "bg-red-500",
  };

  const statusText = {
    disponivel: "Disponível",
    ocupado: "Em atendimento",
    indisponivel: "Indisponível",
  };

  // Buscar avaliações do banco quando virar o card
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
    <div className="perspective-1000 h-[480px]">
      <div
        className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${
          flipped ? "rotate-y-180" : ""
        }`}
      >
        {/* FRENTE DO CARD */}
        <div className="absolute w-full h-full backface-hidden">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all h-full flex flex-col">
            <div className="flex flex-col items-center flex-1">
              {/* Avatar */}
              <div className="relative mb-4">
                <div className="w-[100px] h-[100px] rounded-full border-4 border-purple-400 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-3xl font-bold">
                  {tarologo.nome.charAt(0)}
                </div>
                <div
                  className={`absolute bottom-0 right-0 w-5 h-5 ${
                    statusColor[tarologo.status]
                  } rounded-full border-2 border-white`}
                ></div>
              </div>

              {/* Nome */}
              <h3 className="text-xl font-bold text-white mb-2">
                {tarologo.nome}
              </h3>

              {/* Especialidade */}
              <p className="text-purple-200 text-sm mb-3">
                {tarologo.especialidade}
              </p>

              {/* Biografia */}
              <p className="text-white/70 text-sm text-center mb-4 line-clamp-2">
                {tarologo.biografia}
              </p>

              {/* Estatísticas */}
              <div className="flex gap-4 mb-4 text-sm">
                <div className="text-center">
                  <div className="text-yellow-400 font-bold">
                    ⭐ {tarologo.avaliacao_media}
                  </div>
                  <div className="text-white/60 text-xs">Avaliação</div>
                </div>
                <div className="text-center">
                  <div className="text-purple-300 font-bold">
                    {tarologo.total_consultas}
                  </div>
                  <div className="text-white/60 text-xs">Consultas</div>
                </div>
              </div>

              {/* Status */}
              <div className="mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    tarologo.status === "disponivel"
                      ? "bg-green-500/20 text-green-300"
                      : tarologo.status === "ocupado"
                      ? "bg-yellow-500/20 text-yellow-300"
                      : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {tarologo.status === "ocupado" && tarologo.minutosRestantes
                    ? `Em atendimento (${tarologo.minutosRestantes} min restantes)`
                    : statusText[tarologo.status]}
                </span>
              </div>

              <div className="mt-auto w-full space-y-2">
                {/* Botão Ver Avaliações */}
                <button
                  onClick={() => setFlipped(true)}
                  className="w-full py-2 rounded-lg font-medium text-center transition-colors bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Ver Avaliações
                </button>

                {/* Botão Consultar */}
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
                  className={`block w-full py-2 rounded-lg font-medium text-center transition-colors ${
                    tarologo.status === "disponivel" &&
                    usuarioLogado &&
                    temMinutos
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {!usuarioLogado
                    ? "Fazer login"
                    : !temMinutos
                    ? "Comprar minutos"
                    : tarologo.status === "disponivel"
                    ? "Consultar"
                    : "Indisponível"}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* VERSO DO CARD (Avaliações) */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Avaliações</h3>
              <button
                onClick={() => setFlipped(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-yellow-400">
                ⭐ {tarologo.avaliacao_media}
              </div>
              <div className="text-white/60 text-sm">
                {avaliacoes.length} avaliações
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-white/60">Carregando...</div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {avaliacoes.map((avaliacao, index) => (
                  <div
                    key={index}
                    className="bg-white/5 rounded-lg p-3 border border-white/10"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-white font-medium text-sm">
                        {avaliacao.usuario_nome}
                      </span>
                      <div className="text-yellow-400 text-sm">
                        {"⭐".repeat(avaliacao.estrelas)}
                      </div>
                    </div>
                    {avaliacao.comentario && (
                      <p className="text-white/70 text-sm italic">
                        &quot;{avaliacao.comentario}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
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
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(147, 51, 234, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(147, 51, 234, 0.7);
        }
      `}</style>
    </div>
  );
}

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
  onChangeStatus?: (
    status: "disponivel" | "ocupado" | "indisponivel",
    minutos?: number,
  ) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal para escolher tempo quando status = ocupado
  const [mostrarModalTempo, setMostrarModalTempo] = useState(false);
  const [tempoSelecionado, setTempoSelecionado] = useState(30);
  const [tempoCustomizado, setTempoCustomizado] = useState("");

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

  // Quando admin clica em "ocupado", abre modal para escolher tempo
  function handleOcupadoClick() {
    setMostrarModalTempo(true);
  }

  // Confirmar tempo e mudar status
  function confirmarTempo() {
    const minutos =
      tempoCustomizado !== "" ? parseInt(tempoCustomizado) : tempoSelecionado;

    if (minutos > 0) {
      onChangeStatus?.("ocupado", minutos);
    }
    setMostrarModalTempo(false);
    setTempoSelecionado(30);
    setTempoCustomizado("");
  }

  // Opções de tempo pré-definidas
  const opcoesTempoRapido = [15, 30, 45, 60, 90, 120];

  return (
    <div className="h-[420px] md:h-[460px]" style={{ perspective: "1000px" }}>
      <div
        className="relative w-full h-full transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* FRENTE DO CARD */}
        <div
          className="absolute w-full h-full"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div
            className={`bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/20 h-full flex flex-col shadow-xl ${status.glow} shadow-lg`}
          >
            {/* Avatar e Status */}
            <div className="relative mb-4">
              <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-3 border-white/30 shadow-lg">
                {tarologo.avatar_url ? (
                  <img
                    src={tarologo.avatar_url}
                    alt={tarologo.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl">
                    🔮
                  </div>
                )}
              </div>
              {/* Status indicator */}
              <div
                className={`absolute bottom-0 right-1/2 transform translate-x-8 translate-y-1 w-5 h-5 ${status.bg} rounded-full border-2 border-gray-900 shadow-lg ${status.glow}`}
              />
            </div>

            {/* Nome e Info */}
            <h3 className="text-lg font-bold text-white text-center mb-1 truncate">
              {tarologo.nome}
            </h3>

            {tarologo.especialidade && (
              <p className="text-purple-300/80 text-xs text-center mb-2 truncate">
                {tarologo.especialidade}
              </p>
            )}

            {/* Stats */}
            <div className="flex justify-center gap-4 mb-3 text-xs">
              <div className="text-center">
                <span className="text-yellow-400">⭐</span>
                <span className="text-white/80 ml-1">
                  {tarologo.avaliacao_media}
                </span>
              </div>
              <div className="text-center">
                <span className="text-purple-400">📖</span>
                <span className="text-white/80 ml-1">
                  {tarologo.total_consultas}
                </span>
              </div>
            </div>

            {/* Bio resumida */}
            {tarologo.biografia && (
              <p className="text-white/60 text-xs text-center line-clamp-2 mb-3 px-2">
                {tarologo.biografia}
              </p>
            )}

            {/* Status badge com timer */}
            <div
              className={`${status.bgLight} ${status.text} px-3 py-1.5 rounded-full text-xs font-medium text-center mb-3 mx-auto`}
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
                    onClick={handleOcupadoClick}
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
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/25"
                    : "bg-white/5 text-white/40 cursor-not-allowed"
                }`}
              >
                {!usuarioLogado
                  ? "Fazer login"
                  : !temMinutos
                    ? "Comprar minutos"
                    : tarologo.status === "disponivel"
                      ? "✨ Consultar"
                      : "Indisponível"}
              </Link>
            </div>
          </div>
        </div>

        {/* VERSO DO CARD (Avaliações) */}
        <div
          className="absolute w-full h-full"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/20 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">
                Avaliações de {tarologo.nome}
              </h3>
              <button
                onClick={() => setFlipped(false)}
                className="text-white/60 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="text-center mb-4 pb-3 border-b border-white/10">
              <div className="text-2xl font-bold text-yellow-400">
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
            ) : avaliacoes.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-white/60 text-center">
                  <div className="text-3xl mb-2">📝</div>
                  <div>Nenhuma avaliação ainda</div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {avaliacoes.map((av, i) => (
                  <div
                    key={i}
                    className="bg-white/5 rounded-xl p-3 border border-white/10"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-white text-sm">
                        {av.usuario_nome}
                      </span>
                      <span className="text-yellow-400 text-sm">
                        {"⭐".repeat(av.estrelas)}
                      </span>
                    </div>
                    {av.comentario && (
                      <p className="text-white/70 text-xs leading-relaxed">
                        {av.comentario}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setFlipped(false)}
              className="mt-4 w-full py-2.5 rounded-xl font-medium text-center transition-all bg-white/10 hover:bg-white/20 text-white text-sm border border-white/10"
            >
              ← Voltar
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE SELEÇÃO DE TEMPO */}
      {mostrarModalTempo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl p-6 border border-white/20 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <span>⏱</span> Definir Tempo de Atendimento
            </h3>
            <p className="text-white/60 text-sm mb-4">
              Escolha quanto tempo{" "}
              <strong className="text-yellow-300">{tarologo.nome}</strong>{" "}
              ficará em atendimento. Após esse tempo, o status mudará
              automaticamente para{" "}
              <span className="text-red-400">indisponível</span>.
            </p>

            {/* Opções rápidas */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {opcoesTempoRapido.map((min) => (
                <button
                  key={min}
                  onClick={() => {
                    setTempoSelecionado(min);
                    setTempoCustomizado("");
                  }}
                  className={`py-3 rounded-lg font-medium text-sm transition-all ${
                    tempoSelecionado === min && tempoCustomizado === ""
                      ? "bg-yellow-500 text-black"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>

            {/* Tempo customizado */}
            <div className="mb-4">
              <label className="text-white/70 text-sm mb-1 block">
                Ou digite um tempo personalizado:
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={tempoCustomizado}
                  onChange={(e) => {
                    setTempoCustomizado(e.target.value);
                  }}
                  placeholder="Ex: 45"
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-yellow-500"
                />
                <span className="flex items-center text-white/60">minutos</span>
              </div>
            </div>

            {/* Preview do tempo */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
              <div className="text-center">
                <span className="text-white/60 text-sm">
                  Tempo selecionado:
                </span>
                <div className="text-2xl font-bold text-yellow-400">
                  {tempoCustomizado !== ""
                    ? parseInt(tempoCustomizado) || 0
                    : tempoSelecionado}{" "}
                  minutos
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMostrarModalTempo(false);
                  setTempoSelecionado(30);
                  setTempoCustomizado("");
                }}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarTempo}
                disabled={
                  (tempoCustomizado !== "" &&
                    parseInt(tempoCustomizado) <= 0) ||
                  (tempoCustomizado === "" && tempoSelecionado <= 0)
                }
                className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar ⏱
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

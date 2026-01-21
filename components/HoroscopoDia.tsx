"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Horoscopo = {
  id: string;
  signo: string;
  texto: string;
  data: string;
  updated_at: string;
};

const SIGNOS = [
  {
    nome: "Áries",
    simbolo: "♈",
    periodo: "21/03 a 19/04",
    cor: "from-red-500 to-orange-500",
  },
  {
    nome: "Touro",
    simbolo: "♉",
    periodo: "20/04 a 20/05",
    cor: "from-green-500 to-emerald-500",
  },
  {
    nome: "Gêmeos",
    simbolo: "♊",
    periodo: "21/05 a 20/06",
    cor: "from-yellow-400 to-amber-500",
  },
  {
    nome: "Câncer",
    simbolo: "♋",
    periodo: "21/06 a 22/07",
    cor: "from-gray-300 to-gray-400",
  },
  {
    nome: "Leão",
    simbolo: "♌",
    periodo: "23/07 a 22/08",
    cor: "from-orange-400 to-yellow-500",
  },
  {
    nome: "Virgem",
    simbolo: "♍",
    periodo: "23/08 a 22/09",
    cor: "from-amber-600 to-yellow-700",
  },
  {
    nome: "Libra",
    simbolo: "♎",
    periodo: "23/09 a 22/10",
    cor: "from-pink-400 to-rose-500",
  },
  {
    nome: "Escorpião",
    simbolo: "♏",
    periodo: "23/10 a 21/11",
    cor: "from-red-600 to-red-800",
  },
  {
    nome: "Sagitário",
    simbolo: "♐",
    periodo: "22/11 a 21/12",
    cor: "from-purple-500 to-indigo-600",
  },
  {
    nome: "Capricórnio",
    simbolo: "♑",
    periodo: "22/12 a 19/01",
    cor: "from-gray-600 to-gray-800",
  },
  {
    nome: "Aquário",
    simbolo: "♒",
    periodo: "20/01 a 18/02",
    cor: "from-cyan-400 to-blue-500",
  },
  {
    nome: "Peixes",
    simbolo: "♓",
    periodo: "19/02 a 20/03",
    cor: "from-indigo-400 to-purple-500",
  },
];

export default function HoroscopoDia() {
  const [horoscopos, setHoroscopos] = useState<Horoscopo[]>([]);
  const [signoSelecionado, setSignoSelecionado] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Data de hoje formatada
  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });

  useEffect(() => {
    carregarHoroscopos();
  }, []);

  async function carregarHoroscopos() {
    const dataHoje = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("horoscopos")
      .select("*")
      .eq("data", dataHoje);

    if (!error && data) {
      setHoroscopos(data);
    }
    setLoading(false);
  }

  function getHoroscopo(signo: string): Horoscopo | undefined {
    return horoscopos.find(
      (h) => h.signo.toLowerCase() === signo.toLowerCase(),
    );
  }

  function abrirModal(signo: string) {
    setSignoSelecionado(signo);
    document.body.style.overflow = "hidden";
  }

  function fecharModal() {
    setSignoSelecionado(null);
    document.body.style.overflow = "auto";
  }

  const signoAtual = SIGNOS.find((s) => s.nome === signoSelecionado);
  const horoscopoAtual = signoSelecionado
    ? getHoroscopo(signoSelecionado)
    : null;

  if (loading) {
    return (
      <div className="w-full py-6 md:py-8">
        <div className="container mx-auto px-4">
          <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Se não há horoscopos cadastrados para hoje, não exibe a seção
  if (horoscopos.length === 0) {
    return null;
  }

  return (
    <>
      <section className="w-full py-6 md:py-8">
        <div className="container mx-auto px-4">
          {/* Header da seção */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 md:mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <span className="text-xl md:text-2xl">🔮</span>
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white">
                  Horóscopo do Dia
                </h2>
                <p className="text-purple-300/70 text-xs md:text-sm">
                  Veja a previsão para seu signo
                </p>
              </div>
            </div>

            {/* Badge da data */}
            <div className="self-start sm:self-auto px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-full">
              <span className="text-purple-200 text-xs md:text-sm font-medium capitalize">
                {dataFormatada}
              </span>
            </div>
          </div>

          {/* Carrossel de signos */}
          <div className="relative">
            {/* Lista de signos */}
            <div
              className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {SIGNOS.map((signo) => {
                const temHoroscopo = !!getHoroscopo(signo.nome);

                return (
                  <button
                    key={signo.nome}
                    onClick={() => temHoroscopo && abrirModal(signo.nome)}
                    disabled={!temHoroscopo}
                    className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 md:p-4 rounded-2xl transition-all duration-300 group
                      ${
                        temHoroscopo
                          ? "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 cursor-pointer hover:scale-105 active:scale-95"
                          : "bg-white/5 border border-white/5 opacity-40 cursor-not-allowed"
                      }`}
                  >
                    {/* Círculo com símbolo */}
                    <div
                      className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br ${signo.cor} flex items-center justify-center shadow-lg transition-transform group-hover:shadow-xl`}
                    >
                      <span className="text-2xl md:text-3xl text-white drop-shadow-lg">
                        {signo.simbolo}
                      </span>
                    </div>

                    {/* Nome do signo */}
                    <span className="text-white text-xs md:text-sm font-medium">
                      {signo.nome}
                    </span>

                    {/* Período */}
                    <span className="text-purple-300/50 text-[10px] md:text-xs">
                      {signo.periodo}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dica mobile */}
          <p className="md:hidden text-center text-purple-300/40 text-xs mt-3">
            ← Arraste para ver mais signos →
          </p>
        </div>
      </section>

      {/* Modal do Horóscopo */}
      {signoSelecionado && signoAtual && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={fecharModal}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-lg bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900 rounded-3xl border border-white/20 shadow-2xl overflow-hidden animate-modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do modal */}
            <div
              className={`relative bg-gradient-to-r ${signoAtual.cor} p-6 pb-12`}
            >
              {/* Botão fechar (X) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fecharModal();
                }}
                className="absolute top-4 right-4 w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-all z-10"
                aria-label="Fechar"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Decoração */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl" />
            </div>

            {/* Símbolo do signo (sobreposto) */}
            <div className="relative -mt-10 flex justify-center">
              <div
                className={`w-20 h-20 bg-gradient-to-br ${signoAtual.cor} rounded-full flex items-center justify-center shadow-xl border-4 border-purple-900`}
              >
                <span className="text-4xl text-white drop-shadow-lg">
                  {signoAtual.simbolo}
                </span>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6 pt-4">
              {/* Nome e período */}
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-white mb-1">
                  {signoAtual.nome}
                </h3>
                <p className="text-purple-300/70 text-sm">
                  {signoAtual.periodo}
                </p>
              </div>

              {/* Data */}
              <div className="flex justify-center mb-4">
                <div className="px-4 py-1.5 bg-white/10 rounded-full">
                  <span className="text-purple-200 text-sm capitalize">
                    {dataFormatada}
                  </span>
                </div>
              </div>

              {/* Texto do horóscopo */}
              <div className="bg-white/5 rounded-2xl p-4 max-h-60 overflow-y-auto">
                {horoscopoAtual?.texto ? (
                  <p className="text-purple-100/90 text-sm md:text-base leading-relaxed whitespace-pre-line">
                    {horoscopoAtual.texto}
                  </p>
                ) : (
                  <p className="text-purple-300/50 text-sm text-center italic">
                    Horóscopo não disponível para hoje.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estilos da animação do modal */}
      <style jsx global>{`
        @keyframes modal-enter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-modal-enter {
          animation: modal-enter 0.2s ease-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}

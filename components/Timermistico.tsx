"use client";

import { useEffect, useState } from "react";

type TimerMisticoProps = {
  tempoDecorrido: number; // em segundos
  saldoTotal: number; // em minutos
  onTempoEsgotado?: () => void;
};

export default function TimerMistico({
  tempoDecorrido,
  saldoTotal,
  onTempoEsgotado,
}: TimerMisticoProps) {
  const [pulsando, setPulsando] = useState(false);

  // Converter tempo decorrido para minutos
  const minutosDecorridos = tempoDecorrido / 60;
  const percentualUsado = (minutosDecorridos / saldoTotal) * 100;
  const minutosRestantes = Math.max(0, saldoTotal - minutosDecorridos);

  // Formatar tempo decorrido
  const horas = Math.floor(tempoDecorrido / 3600);
  const minutos = Math.floor((tempoDecorrido % 3600) / 60);
  const segundos = tempoDecorrido % 60;

  const tempoFormatado =
    horas > 0
      ? `${horas.toString().padStart(2, "0")}:${minutos
          .toString()
          .padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`
      : `${minutos.toString().padStart(2, "0")}:${segundos
          .toString()
          .padStart(2, "0")}`;

  // Determinar cor baseado no percentual usado
  const getCor = () => {
    if (percentualUsado >= 95) return "vermelho";
    if (percentualUsado >= 85) return "laranja";
    if (percentualUsado >= 70) return "amarelo";
    return "verde";
  };

  const cor = getCor();

  // Configurar cores baseado no estado
  const cores = {
    verde: {
      anel: "stroke-emerald-400",
      fundo: "from-emerald-500/30 to-green-600/30",
      texto: "text-emerald-300",
      brilho: "shadow-emerald-500/50",
    },
    amarelo: {
      anel: "stroke-yellow-400",
      fundo: "from-yellow-500/30 to-amber-600/30",
      texto: "text-yellow-300",
      brilho: "shadow-yellow-500/50",
    },
    laranja: {
      anel: "stroke-orange-500",
      fundo: "from-orange-500/30 to-red-600/30",
      texto: "text-orange-300",
      brilho: "shadow-orange-500/50",
    },
    vermelho: {
      anel: "stroke-red-500",
      fundo: "from-red-500/30 to-rose-600/30",
      texto: "text-red-300",
      brilho: "shadow-red-500/50",
    },
  };

  const estilo = cores[cor];

  // Pulsar quando crítico
  useEffect(() => {
    if (cor === "vermelho" || cor === "laranja") {
      setPulsando(true);
    } else {
      setPulsando(false);
    }
  }, [cor]);

  // Verificar tempo esgotado
  useEffect(() => {
    if (minutosRestantes <= 0 && onTempoEsgotado) {
      onTempoEsgotado();
    }
  }, [minutosRestantes, onTempoEsgotado]);

  // REDUZIDO: 120px → 80px
  const tamanho = 80;
  const raio = 32;
  const circunferencia = 2 * Math.PI * raio;
  const progresso = Math.min(percentualUsado, 100);
  const offset = circunferencia - (progresso / 100) * circunferencia;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Timer Circular - 80px */}
      <div className="relative">
        {/* Brilho de fundo */}
        <div
          className={`absolute inset-0 rounded-full blur-lg ${estilo.brilho} ${
            pulsando ? "animate-pulse" : ""
          }`}
          style={{ opacity: 0.3 }}
        />

        {/* Container do círculo */}
        <div
          className={`relative rounded-full bg-gradient-to-br ${
            estilo.fundo
          } border-2 border-white/20 ${
            pulsando ? "animate-pulse" : ""
          } shadow-lg`}
          style={{ width: `${tamanho}px`, height: `${tamanho}px` }}
        >
          {/* SVG do progresso */}
          <svg
            className="absolute inset-0 -rotate-90"
            width={tamanho}
            height={tamanho}
          >
            {/* Círculo de fundo */}
            <circle
              cx={tamanho / 2}
              cy={tamanho / 2}
              r={raio}
              fill="none"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="5"
            />

            {/* Círculo de progresso */}
            <circle
              cx={tamanho / 2}
              cy={tamanho / 2}
              r={raio}
              fill="none"
              className={estilo.anel}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circunferencia}
              strokeDashoffset={offset}
              style={{
                transition: "stroke-dashoffset 1s ease-in-out",
                filter: "drop-shadow(0 0 4px currentColor)",
              }}
            />
          </svg>

          {/* Conteúdo central - COMPACTO */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px",
            }}
          >
            {/* Tempo decorrido */}
            <div
              className={`font-bold ${estilo.texto}`}
              style={{
                fontSize: "16px",
                lineHeight: "1",
                marginBottom: "2px",
                textShadow: "0 2px 8px rgba(0,0,0,0.5)",
              }}
            >
              {tempoFormatado}
            </div>

            {/* Tempo restante */}
            <div
              className="text-white/70"
              style={{
                fontSize: "8px",
                marginTop: "1px",
                whiteSpace: "nowrap",
              }}
            >
              {Math.floor(minutosRestantes)}min
            </div>

            {/* Percentual */}
            <div
              className={`${estilo.texto}`}
              style={{
                fontSize: "7px",
                marginTop: "1px",
              }}
            >
              {progresso.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Avisos compactos */}
      {cor === "vermelho" && (
        <div
          className="bg-red-900/50 border border-red-500/60 rounded px-1.5 py-0.5 text-red-200 font-medium animate-pulse"
          style={{ fontSize: "8px" }}
        >
          ⏰ Urgente!
        </div>
      )}
    </div>
  );
}

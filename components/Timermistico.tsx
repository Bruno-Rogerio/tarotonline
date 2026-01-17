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
      anel: "#10b981",
      fundo: "from-emerald-500/30 to-green-600/30",
      texto: "#34d399",
      brilho: "0 0 20px rgba(16, 185, 129, 0.5)",
    },
    amarelo: {
      anel: "#fbbf24",
      fundo: "from-yellow-500/30 to-amber-600/30",
      texto: "#fbbf24",
      brilho: "0 0 20px rgba(251, 191, 36, 0.5)",
    },
    laranja: {
      anel: "#f97316",
      fundo: "from-orange-500/30 to-red-600/30",
      texto: "#fb923c",
      brilho: "0 0 20px rgba(249, 115, 22, 0.5)",
    },
    vermelho: {
      anel: "#ef4444",
      fundo: "from-red-500/30 to-rose-600/30",
      texto: "#f87171",
      brilho: "0 0 20px rgba(239, 68, 68, 0.5)",
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

  // Calcular valores para o círculo SVG
  const tamanho = 120;
  const raio = 50;
  const circunferencia = 2 * Math.PI * raio;
  const progresso = Math.min(percentualUsado, 100);
  const offset = circunferencia - (progresso / 100) * circunferencia;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
      }}
    >
      {/* Timer Circular */}
      <div style={{ position: "relative" }}>
        {/* Brilho de fundo */}
        <div
          className={pulsando ? "animate-pulse" : ""}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "9999px",
            filter: "blur(16px)",
            boxShadow: estilo.brilho,
            opacity: 0.4,
          }}
        />

        {/* Container do círculo */}
        <div
          className={`bg-gradient-to-br ${estilo.fundo} ${
            pulsando ? "animate-pulse" : ""
          }`}
          style={{
            position: "relative",
            width: `${tamanho}px`,
            height: `${tamanho}px`,
            borderRadius: "9999px",
            border: "2px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* SVG do progresso */}
          <svg
            style={{
              position: "absolute",
              inset: 0,
              transform: "rotate(-90deg)",
            }}
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
              strokeWidth="6"
            />

            {/* Círculo de progresso */}
            <circle
              cx={tamanho / 2}
              cy={tamanho / 2}
              r={raio}
              fill="none"
              stroke={estilo.anel}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circunferencia}
              strokeDashoffset={offset}
              style={{
                transition: "stroke-dashoffset 1s ease-in-out",
                filter: `drop-shadow(0 0 8px ${estilo.anel})`,
              }}
            />
          </svg>

          {/* Conteúdo central - LAYOUT MELHORADO */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}
          >
            {/* Tempo decorrido - DESTAQUE */}
            <div
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                lineHeight: "1",
                color: estilo.texto,
                textShadow: `0 0 10px ${estilo.anel}`,
                marginBottom: "4px",
              }}
            >
              {tempoFormatado}
            </div>

            {/* Tempo restante - BEM ESPAÇADO */}
            <div
              style={{
                fontSize: "11px",
                fontWeight: "500",
                color: "rgba(255, 255, 255, 0.95)",
                marginTop: "2px",
                whiteSpace: "nowrap",
              }}
            >
              {Math.floor(minutosRestantes)}min restantes
            </div>

            {/* Percentual - SEPARADO */}
            <div
              style={{
                fontSize: "10px",
                fontWeight: "600",
                color: estilo.texto,
                marginTop: "2px",
              }}
            >
              {progresso.toFixed(0)}% usado
            </div>
          </div>
        </div>
      </div>

      {/* Avisos */}
      {cor === "vermelho" && (
        <div
          className="animate-pulse"
          style={{
            borderRadius: "4px",
            padding: "6px 12px",
            fontSize: "11px",
            fontWeight: "bold",
            backgroundColor: "rgba(220, 38, 38, 0.3)",
            border: "1px solid rgba(239, 68, 68, 0.6)",
            color: "#fca5a5",
            whiteSpace: "nowrap",
          }}
        >
          ⚠️ Tempo quase esgotado!
        </div>
      )}

      {cor === "laranja" && (
        <div
          style={{
            borderRadius: "4px",
            padding: "6px 12px",
            fontSize: "11px",
            fontWeight: "600",
            backgroundColor: "rgba(249, 115, 22, 0.3)",
            border: "1px solid rgba(249, 115, 22, 0.6)",
            color: "#fdba74",
            whiteSpace: "nowrap",
          }}
        >
          ⏰ Poucos minutos
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { buscarProgressoFidelidade } from "@/lib/fidelidade";

type Progresso = {
  id: string;
  nome: string;
  descricao: string | null;
  minutosNecessarios: number;
  minutosBonus: number;
  minutosAtuais: number;
  progresso: number;
  faltam: number;
};

type HistoricoBonus = {
  id: string;
  minutos_ganhos: number;
  motivo: string;
  created_at: string;
  configuracao?: { nome: string };
};

export default function ProgressoFidelidade({
  usuarioId,
  compacto = false,
}: {
  usuarioId: string;
  compacto?: boolean;
}) {
  const [dados, setDados] = useState<{
    minutosAcumuladosTotal: number;
    progressos: Progresso[];
    historico: HistoricoBonus[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [usuarioId]);

  async function carregarDados() {
    const resultado = await buscarProgressoFidelidade(usuarioId);
    setDados(resultado);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 animate-pulse">
        <div className="h-4 bg-white/20 rounded w-1/3 mb-3"></div>
        <div className="h-8 bg-white/20 rounded mb-2"></div>
        <div className="h-3 bg-white/20 rounded w-1/2"></div>
      </div>
    );
  }

  if (!dados || dados.progressos.length === 0) {
    return null; // Não mostrar se não há promoções ativas
  }

  // Versão compacta (para header ou sidebar)
  if (compacto) {
    const maiorProgresso = dados.progressos.reduce(
      (max, p) => (p.progresso > max.progresso ? p : max),
      dados.progressos[0]
    );

    return (
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-3 border border-purple-500/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/80 text-xs font-medium flex items-center gap-1">
            <span>🎁</span> Fidelidade
          </span>
          <span className="text-purple-300 text-xs font-bold">
            {maiorProgresso.progresso}%
          </span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${maiorProgresso.progresso}%` }}
          />
        </div>
        <p className="text-white/50 text-[10px] mt-1">
          Faltam {maiorProgresso.faltam} min para +{maiorProgresso.minutosBonus}{" "}
          bônus
        </p>
      </div>
    );
  }

  // Versão completa
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-xl">🎁</span>
            </div>
            <div>
              <h3 className="text-white font-bold">Programa de Fidelidade</h3>
              <p className="text-white/60 text-sm">
                {dados.minutosAcumuladosTotal} minutos acumulados
              </p>
            </div>
          </div>
          {dados.historico.length > 0 && (
            <button
              onClick={() => setMostrarHistorico(!mostrarHistorico)}
              className="text-purple-300 text-sm hover:text-white transition-colors"
            >
              {mostrarHistorico ? "Ocultar" : "Ver histórico"}
            </button>
          )}
        </div>
      </div>

      {/* Progressos */}
      <div className="p-4 space-y-4">
        {dados.progressos.map((prog) => (
          <div key={prog.id}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-white font-medium text-sm">{prog.nome}</p>
                {prog.descricao && (
                  <p className="text-white/50 text-xs">{prog.descricao}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-green-400 font-bold text-sm">
                  +{prog.minutosBonus} min
                </span>
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="relative">
              <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    prog.progresso >= 100
                      ? "bg-gradient-to-r from-green-500 to-emerald-500"
                      : "bg-gradient-to-r from-purple-500 to-pink-500"
                  }`}
                  style={{ width: `${Math.min(prog.progresso, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-white/50 text-xs">
                  {prog.minutosAtuais} / {prog.minutosNecessarios} min
                </span>
                <span
                  className={`text-xs font-medium ${
                    prog.progresso >= 100 ? "text-green-400" : "text-purple-300"
                  }`}
                >
                  {prog.progresso >= 100
                    ? "🎉 Meta atingida!"
                    : `Faltam ${prog.faltam} min`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Histórico */}
      {mostrarHistorico && dados.historico.length > 0 && (
        <div className="border-t border-white/10 p-4">
          <h4 className="text-white/80 text-sm font-medium mb-3">
            📜 Últimos bônus recebidos
          </h4>
          <div className="space-y-2">
            {dados.historico.slice(0, 5).map((bonus) => (
              <div
                key={bonus.id}
                className="flex items-center justify-between bg-white/5 rounded-lg p-2"
              >
                <div>
                  <p className="text-white text-sm">{bonus.motivo}</p>
                  <p className="text-white/50 text-xs">
                    {new Date(bonus.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className="text-green-400 font-bold">
                  +{bonus.minutos_ganhos} min
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

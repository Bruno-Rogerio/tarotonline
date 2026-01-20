// components/CupomInput.tsx
"use client";

import { useState, useEffect } from "react";

type CupomAplicado = {
  codigo: string;
  id: string;
  tipo_desconto: "porcentagem" | "valor_fixo" | "minutos_extras";
  valor_desconto: number;
};

type Props = {
  usuarioId: string;
  valorCompra: number;
  onCupomAplicado: (cupom: CupomAplicado | null, desconto: number, minutosExtras: number) => void;
};

export default function CupomInput({ usuarioId, valorCompra, onCupomAplicado }: Props) {
  const [codigo, setCodigo] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<CupomAplicado | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState(false);

  // Verificar se há cupom salvo no localStorage (vindo do link direto)
  useEffect(() => {
    const cupomSalvo = localStorage.getItem("cupom_aplicado");
    if (cupomSalvo) {
      try {
        const cupom = JSON.parse(cupomSalvo);
        setCodigo(cupom.codigo);
        setAberto(true);
        // Validar novamente para garantir que ainda está válido
        setTimeout(() => validarCupom(cupom.codigo), 500);
        localStorage.removeItem("cupom_aplicado");
      } catch (e) {
        localStorage.removeItem("cupom_aplicado");
      }
    }
  }, []);

  // Recalcular desconto quando valor da compra mudar
  useEffect(() => {
    if (cupomAplicado) {
      const { desconto, minutosExtras } = calcularDesconto(cupomAplicado, valorCompra);
      onCupomAplicado(cupomAplicado, desconto, minutosExtras);
    }
  }, [valorCompra, cupomAplicado]);

  function calcularDesconto(cupom: CupomAplicado, valor: number) {
    switch (cupom.tipo_desconto) {
      case "porcentagem":
        return { 
          desconto: (valor * cupom.valor_desconto) / 100, 
          minutosExtras: 0 
        };
      case "valor_fixo":
        return { 
          desconto: Math.min(cupom.valor_desconto, valor), 
          minutosExtras: 0 
        };
      case "minutos_extras":
        return { 
          desconto: 0, 
          minutosExtras: cupom.valor_desconto 
        };
      default:
        return { desconto: 0, minutosExtras: 0 };
    }
  }

  async function validarCupom(codigoParaValidar?: string) {
    const codigoFinal = codigoParaValidar || codigo;
    
    if (!codigoFinal.trim()) {
      setErro("Digite o código do cupom");
      return;
    }

    setLoading(true);
    setErro("");

    try {
      const res = await fetch("/api/cupons/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: codigoFinal,
          usuarioId,
          valorCompra,
        }),
      });

      const data = await res.json();

      if (data.valido) {
        const cupom: CupomAplicado = {
          codigo: data.cupom.codigo,
          id: data.cupom.id,
          tipo_desconto: data.cupom.tipo_desconto,
          valor_desconto: data.cupom.valor_desconto,
        };
        
        setCupomAplicado(cupom);
        const { desconto, minutosExtras } = calcularDesconto(cupom, valorCompra);
        onCupomAplicado(cupom, desconto, minutosExtras);
        setAberto(false);
      } else {
        setErro(data.mensagem || "Cupom inválido");
        setCupomAplicado(null);
        onCupomAplicado(null, 0, 0);
      }
    } catch (error) {
      console.error("Erro:", error);
      setErro("Erro ao validar cupom");
    }

    setLoading(false);
  }

  function removerCupom() {
    setCupomAplicado(null);
    setCodigo("");
    setErro("");
    onCupomAplicado(null, 0, 0);
  }

  function formatarDesconto(tipo: string, valor: number) {
    switch (tipo) {
      case "porcentagem": return `${valor}% OFF`;
      case "valor_fixo": return `R$ ${valor.toFixed(2)} OFF`;
      case "minutos_extras": return `+${valor} minutos extras`;
      default: return "";
    }
  }

  // Cupom aplicado com sucesso
  if (cupomAplicado) {
    return (
      <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎟️</span>
            <div>
              <div className="flex items-center gap-2">
                <code className="px-2 py-0.5 bg-green-500/30 text-green-300 rounded font-mono font-bold text-sm">
                  {cupomAplicado.codigo}
                </code>
                <span className="text-green-400 font-bold">
                  {formatarDesconto(cupomAplicado.tipo_desconto, cupomAplicado.valor_desconto)}
                </span>
              </div>
              <div className="text-green-300/70 text-sm">Cupom aplicado!</div>
            </div>
          </div>
          <button
            onClick={removerCupom}
            className="p-2 text-white/60 hover:text-red-400 transition-colors"
            title="Remover cupom"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Input para adicionar cupom
  return (
    <div className="space-y-3">
      {!aberto ? (
        <button
          onClick={() => setAberto(true)}
          className="w-full py-3 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 hover:border-purple-500/50 rounded-xl text-white/70 hover:text-white transition-all flex items-center justify-center gap-2"
        >
          <span>🎟️</span>
          <span>Tem um cupom de desconto?</span>
        </button>
      ) : (
        <div className="bg-white/5 border border-white/20 rounded-xl p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value.toUpperCase());
                setErro("");
              }}
              placeholder="Digite o código"
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500 font-mono uppercase"
              onKeyDown={(e) => e.key === "Enter" && validarCupom()}
            />
            <button
              onClick={() => validarCupom()}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-medium rounded-xl transition-colors"
            >
              {loading ? "..." : "Aplicar"}
            </button>
          </div>
          
          {erro && (
            <div className="mt-2 text-red-400 text-sm flex items-center gap-2">
              <span>❌</span>
              {erro}
            </div>
          )}
          
          <button
            onClick={() => {
              setAberto(false);
              setCodigo("");
              setErro("");
            }}
            className="mt-2 text-white/50 hover:text-white text-sm"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

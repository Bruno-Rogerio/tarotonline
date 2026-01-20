// app/cupom/[codigo]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type Cupom = {
  id: string;
  codigo: string;
  descricao: string | null;
  tipo_desconto: "porcentagem" | "valor_fixo" | "minutos_extras";
  valor_desconto: number;
  valor_minimo: number;
  data_fim: string | null;
  status: string;
};

export default function CupomPage() {
  const [cupom, setCupom] = useState<Cupom | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const router = useRouter();
  const params = useParams();
  const codigo = params.codigo as string;

  useEffect(() => {
    validarCupom();
  }, [codigo]);

  async function validarCupom() {
    try {
      const res = await fetch("/api/cupons/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, valorCompra: 0 }),
      });

      const data = await res.json();

      if (data.valido) {
        setCupom(data.cupom);
        // Salvar no localStorage para usar na compra
        localStorage.setItem(
          "cupom_aplicado",
          JSON.stringify({
            codigo: data.cupom.codigo,
            id: data.cupom.id,
            tipo_desconto: data.cupom.tipo_desconto,
            valor_desconto: data.cupom.valor_desconto,
          })
        );
      } else {
        setErro(data.mensagem || "Cupom inválido");
      }
    } catch (error) {
      console.error("Erro:", error);
      setErro("Erro ao validar cupom");
    }
    setLoading(false);
  }

  function formatarDesconto(tipo: string, valor: number) {
    switch (tipo) {
      case "porcentagem":
        return `${valor}% OFF`;
      case "valor_fixo":
        return `R$ ${valor.toFixed(2)} OFF`;
      case "minutos_extras":
        return `+${valor} minutos extras`;
      default:
        return "";
    }
  }

  function irParaCompra() {
    router.push("/comprar-minutos");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎟️</div>
          <div className="text-white/80 text-lg">Validando cupom...</div>
        </div>
      </div>
    );
  }

  // Cupom inválido
  if (erro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 max-w-md w-full text-center border border-white/20">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-white mb-2">Ops!</h1>
          <p className="text-white/70 mb-6">{erro}</p>

          <div className="space-y-3">
            <Link
              href="/comprar-minutos"
              className="block w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium transition-all"
            >
              Comprar Minutos →
            </Link>
            <Link
              href="/"
              className="block w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
            >
              Voltar para Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Cupom válido
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-8 max-w-md w-full text-center border border-white/20 shadow-2xl">
        {/* Confetti effect */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="text-4xl animate-bounce">🎉</div>
        </div>

        {/* Cupom visual */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 mb-6 relative overflow-hidden">
          {/* Ticket holes */}
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-purple-950 rounded-full" />
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 w-8 h-8 bg-purple-950 rounded-full" />

          <div className="text-white/80 text-sm mb-1">CUPOM DE DESCONTO</div>
          <code className="text-3xl font-bold text-white tracking-wider">
            {cupom?.codigo}
          </code>

          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="text-4xl font-black text-white">
              {cupom &&
                formatarDesconto(cupom.tipo_desconto, cupom.valor_desconto)}
            </div>
          </div>
        </div>

        {/* Descrição */}
        {cupom?.descricao && (
          <p className="text-white/80 mb-4">{cupom.descricao}</p>
        )}

        {/* Info */}
        <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
          <div className="text-white/60 text-sm mb-2">✅ Cupom válido!</div>

          {cupom?.valor_minimo && cupom.valor_minimo > 0 && (
            <div className="text-white/60 text-sm">
              • Valor mínimo: R$ {cupom.valor_minimo.toFixed(2)}
            </div>
          )}

          {cupom?.data_fim && (
            <div className="text-white/60 text-sm">
              • Válido até:{" "}
              {new Date(cupom.data_fim).toLocaleDateString("pt-BR")}
            </div>
          )}

          <div className="text-yellow-400/80 text-sm mt-2">
            ⚠️ Não acumula com programa de fidelidade
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={irParaCompra}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-green-500/30"
        >
          🛒 Usar Cupom Agora
        </button>

        <p className="text-white/50 text-xs mt-4">
          O cupom será aplicado automaticamente na sua compra
        </p>

        <Link
          href="/"
          className="inline-block mt-4 text-purple-300 hover:text-purple-200 text-sm"
        >
          ← Voltar para Home
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ComprarMinutosPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [minutosEscolhidos, setMinutosEscolhidos] = useState(40);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const router = useRouter();

  const PRECO_POR_MINUTO = 1.99;

  // Pacotes com desconto
  const pacotes = [
    { minutos: 20, desconto: 0, popular: false },
    { minutos: 30, desconto: 5, popular: false },
    { minutos: 40, desconto: 10, popular: true },
    { minutos: 50, desconto: 12, popular: false },
    { minutos: 60, desconto: 15, popular: false },
  ];

  // Calcular valor com desconto aplicado
  const pacoteSelecionado = pacotes.find(
    (p) => p.minutos === minutosEscolhidos
  );
  const descontoAtual = pacoteSelecionado?.desconto || 0;
  const valorOriginal = minutosEscolhidos * PRECO_POR_MINUTO;
  const valorComDesconto =
    valorOriginal - (valorOriginal * descontoAtual) / 100;
  const valorTotal = valorComDesconto.toFixed(2);

  useEffect(() => {
    verificarUsuario();
  }, []);

  async function verificarUsuario() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: userData } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", user.id)
      .single();

    setUsuario(userData);
    setLoading(false);
  }

  // Função para redirecionar ao Stripe Checkout
  async function handleCheckout() {
    if (!usuario) return;

    setProcessando(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minutos: minutosEscolhidos,
          usuarioId: usuario.id,
          email: usuario.email || "",
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(
          "Erro ao iniciar pagamento: " + (data.error || "Tente novamente")
        );
        setProcessando(false);
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao processar pagamento. Tente novamente.");
      setProcessando(false);
    }
  }

  async function handleSair() {
    await supabase.auth.signOut();
    router.push("/");
  }

  // Calcular valor com desconto (para exibição nos cards)
  function calcularValor(minutos: number, desconto: number) {
    const valorOrig = minutos * PRECO_POR_MINUTO;
    return valorOrig - (valorOrig * desconto) / 100;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">💎</div>
          <div className="text-white/80">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 p-4 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-60 h-60 bg-pink-500/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative bg-black/30 backdrop-blur-md border-b border-white/10 -mx-4 -mt-4 mb-6 px-4 py-3 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🔮</span>
            <span className="text-lg font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
              Viaa Tarot
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-purple-600/50 px-3 py-1.5 rounded-full">
              <span className="text-yellow-300">⏱️</span>
              <span className="text-white font-bold">
                {usuario?.minutos_disponiveis || 0} min
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-lg mx-auto">
        {/* Título */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg shadow-purple-500/30">
            <span className="text-3xl">💎</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Comprar Minutos
          </h1>
          <p className="text-purple-200/70 text-sm md:text-base">
            Escolha o pacote ideal para você
          </p>
        </div>

        {/* Grid de pacotes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
          {pacotes.map((pacote) => {
            const selecionado = minutosEscolhidos === pacote.minutos;
            const valorPacote = calcularValor(pacote.minutos, pacote.desconto);
            const valorOrigPacote = pacote.minutos * PRECO_POR_MINUTO;

            return (
              <button
                key={pacote.minutos}
                onClick={() => setMinutosEscolhidos(pacote.minutos)}
                className={`relative p-4 md:p-5 rounded-2xl border-2 transition-all duration-300 ${
                  selecionado
                    ? "bg-gradient-to-br from-purple-600 to-pink-600 border-purple-400 scale-105 shadow-xl shadow-purple-500/30"
                    : "bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30"
                }`}
              >
                {/* Badge popular */}
                {pacote.popular && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-[10px] font-bold text-black rounded-full whitespace-nowrap">
                    ⭐ POPULAR
                  </div>
                )}

                {/* Badge desconto */}
                {pacote.desconto > 0 && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-[10px] font-bold text-white rounded-full">
                    -{pacote.desconto}%
                  </div>
                )}

                <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                  {pacote.minutos}
                </div>
                <div className="text-white/60 text-xs mb-2">minutos</div>

                {pacote.desconto > 0 ? (
                  <div>
                    <div className="text-white/40 text-xs line-through">
                      R$ {valorOrigPacote.toFixed(2)}
                    </div>
                    <div className="text-lg md:text-xl font-bold text-white">
                      R$ {valorPacote.toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <div className="text-lg md:text-xl font-bold text-white">
                    R$ {valorOrigPacote.toFixed(2)}
                  </div>
                )}

                {/* Indicador selecionado */}
                {selecionado && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Resumo */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-5 md:p-6 border border-white/20 mb-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/70">Minutos selecionados</span>
              <span className="text-white font-bold text-lg">
                {minutosEscolhidos} min
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Preço por minuto</span>
              <span className="text-white font-medium">
                R$ {PRECO_POR_MINUTO.toFixed(2)}
              </span>
            </div>

            {descontoAtual > 0 && (
              <div className="flex justify-between items-center text-green-400">
                <span>Desconto aplicado</span>
                <span className="font-medium">-{descontoAtual}%</span>
              </div>
            )}

            <div className="border-t border-white/20 pt-3 flex justify-between items-center">
              <span className="text-white font-medium">Total</span>
              <div className="text-right">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  R$ {valorTotal}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botão pagar com Stripe */}
        <button
          onClick={handleCheckout}
          disabled={processando}
          className="relative w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg rounded-xl transition-all duration-300 shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="relative flex items-center justify-center gap-2">
            <span>💳</span>
            <span>
              {processando ? "Redirecionando..." : "Continuar para pagamento"}
            </span>
            <span>→</span>
          </span>
        </button>

        {/* Métodos de pagamento */}
        <div className="flex flex-col items-center gap-2 mt-6">
          <span className="text-white/40 text-sm">Pagamento seguro via</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full">
              <span>💳</span>
              <span className="text-white/80 text-sm">Cartão</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full">
              <span>💠</span>
              <span className="text-white/80 text-sm">PIX</span>
            </div>
          </div>
        </div>

        {/* Voltar */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
          >
            <span>←</span>
            <span>Voltar para home</span>
          </Link>
        </div>

        {/* Garantias */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl mb-1">🔒</div>
            <p className="text-white/50 text-[10px] md:text-xs">
              Pagamento seguro
            </p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">⚡</div>
            <p className="text-white/50 text-[10px] md:text-xs">
              Liberação instantânea
            </p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">💬</div>
            <p className="text-white/50 text-[10px] md:text-xs">Suporte 24h</p>
          </div>
        </div>
      </div>
    </div>
  );
}

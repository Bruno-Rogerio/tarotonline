"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ComprarMinutosPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [minutosEscolhidos, setMinutosEscolhidos] = useState(20);
  const [loading, setLoading] = useState(true);
  const [mostrarPix, setMostrarPix] = useState(false);
  const router = useRouter();

  const PRECO_POR_MINUTO = 1.99;
  const valorTotal = (minutosEscolhidos * PRECO_POR_MINUTO).toFixed(2);

  // Dados PIX mockup (estáticos por enquanto)
  const pixData = {
    chavePix: "11999999999", // Coloque sua chave PIX aqui
    beneficiario: "Tarot Místico",
    cidade: "São Paulo",
    codigoPix:
      "00020126580014br.gov.bcb.pix0136your-pix-key-here52040000530398654041.005802BR5913Tarot Mistico6009Sao Paulo62070503***63041D3D",
  };

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

  async function handleJaPaguei() {
    if (!usuario) return;

    setLoading(true);

    // Registrar a compra como PENDENTE (aguardando aprovação)
    const { error } = await supabase.from("compras").insert({
      usuario_id: usuario.id,
      minutos: minutosEscolhidos,
      valor: parseFloat(valorTotal),
      status: "pendente", // Aguardando aprovação do admin
      pix_codigo: pixData.codigoPix,
    });

    if (error) {
      alert("Erro ao registrar compra");
      setLoading(false);
      return;
    }

    alert(
      "✅ Compra registrada! Aguarde a aprovação do pagamento. Você receberá os minutos em breve."
    );
    router.push("/");
  }

  async function handleSair() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  if (mostrarPix) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 p-4">
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 mb-8">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">🔮 Tarot Místico</h1>
            <div className="flex items-center gap-4">
              <span className="text-white">Olá, {usuario?.nome}</span>
              <button
                onClick={handleSair}
                className="text-purple-300 hover:text-purple-200"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        <div className="container mx-auto max-w-2xl">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Pagamento via PIX
            </h2>

            <div className="bg-white/5 rounded-xl p-6 mb-6">
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-white mb-2">
                  R$ {valorTotal}
                </div>
                <div className="text-purple-200">
                  {minutosEscolhidos} minutos de consulta
                </div>
              </div>
            </div>

            {/* QR Code Mockup */}
            <div className="bg-white rounded-xl p-6 mb-6">
              <div className="text-center">
                <div className="text-gray-600 mb-4">Escaneie o QR Code:</div>
                <div className="w-64 h-64 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-gray-400 text-center">
                    <div className="text-6xl mb-2">📱</div>
                    <div className="text-sm">QR Code PIX</div>
                    <div className="text-xs">(Mockup)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Código PIX */}
            <div className="bg-white/5 rounded-xl p-6 mb-6">
              <div className="text-white text-sm mb-2">
                Ou copie o código PIX:
              </div>
              <div className="bg-black/30 rounded-lg p-4 break-all text-white text-sm font-mono">
                {pixData.codigoPix}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(pixData.codigoPix);
                  alert("Código PIX copiado!");
                }}
                className="w-full mt-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                📋 Copiar código PIX
              </button>
            </div>

            {/* Dados do beneficiário */}
            <div className="bg-white/5 rounded-xl p-6 mb-6 text-white text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-white/60">Beneficiário:</div>
                  <div>{pixData.beneficiario}</div>
                </div>
                <div>
                  <div className="text-white/60">Chave PIX:</div>
                  <div>{pixData.chavePix}</div>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="space-y-3">
              <button
                onClick={handleJaPaguei}
                disabled={loading}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-medium rounded-lg transition-colors"
              >
                ✅ Já realizei o pagamento
              </button>
              <button
                onClick={() => setMostrarPix(false)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
              >
                ← Voltar
              </button>
            </div>

            <div className="mt-6 text-center text-white/60 text-sm">
              💡 Após confirmar, aguarde a aprovação do pagamento por nossa
              equipe
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 p-4">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 mb-8">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">🔮 Tarot Místico</h1>
          <div className="flex items-center gap-4">
            <div className="text-white">
              <span className="text-white/60">Olá, </span>
              <span className="font-medium">{usuario?.nome}</span>
            </div>
            <div className="bg-purple-600 px-4 py-2 rounded-full text-white font-medium">
              {usuario?.minutos_disponiveis || 0} min
            </div>
            <button
              onClick={handleSair}
              className="text-purple-300 hover:text-purple-200 text-sm"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-2xl">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">
            Comprar Minutos
          </h2>
          <p className="text-purple-200 text-center mb-8">
            Escolha quantos minutos deseja adicionar à sua conta
          </p>

          {/* Seletor de Minutos */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {[20, 30, 40, 50, 60].map((minutos) => {
              const valor = (minutos * PRECO_POR_MINUTO).toFixed(2);
              const selecionado = minutosEscolhidos === minutos;

              return (
                <button
                  key={minutos}
                  onClick={() => setMinutosEscolhidos(minutos)}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    selecionado
                      ? "bg-purple-600 border-purple-400 scale-105"
                      : "bg-white/5 border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="text-3xl font-bold text-white mb-2">
                    {minutos}
                  </div>
                  <div className="text-sm text-white/80 mb-1">minutos</div>
                  <div className="text-xl font-bold text-white">R$ {valor}</div>
                </button>
              );
            })}
          </div>

          {/* Resumo */}
          <div className="bg-white/5 rounded-xl p-6 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/80">Minutos selecionados:</span>
              <span className="text-white font-bold text-xl">
                {minutosEscolhidos} min
              </span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-white/80">Preço por minuto:</span>
              <span className="text-white font-bold">
                R$ {PRECO_POR_MINUTO.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-white/20 pt-4 flex justify-between items-center">
              <span className="text-white text-lg">Total a pagar:</span>
              <span className="text-white font-bold text-3xl">
                R$ {valorTotal}
              </span>
            </div>
          </div>

          {/* Botão Continuar */}
          <button
            onClick={() => setMostrarPix(true)}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg rounded-xl transition-colors"
          >
            Continuar para pagamento →
          </button>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-purple-300 hover:text-purple-200 text-sm"
            >
              ← Voltar para home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

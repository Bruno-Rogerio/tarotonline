// app/comprar-minutos/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CupomInput from "@/components/CupomInput";

export default function ComprarMinutosPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [minutosEscolhidos, setMinutosEscolhidos] = useState(40);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [mostrarPix, setMostrarPix] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copiado, setCopiado] = useState(false);
  const router = useRouter();

  // Estados do Cupom
  const [cupomAplicado, setCupomAplicado] = useState<any>(null);
  const [descontoCupom, setDescontoCupom] = useState(0);
  const [minutosExtrasCupom, setMinutosExtrasCupom] = useState(0);

  const PRECO_POR_MINUTO = 1.99;

  // Dados PIX
  const CHAVE_PIX_CNPJ = "57129530000151";
  const BENEFICIARIO = "57.129.530 RAIZA MARTINS CONVENTO";
  const CIDADE = "SAO PAULO";

  // Pacotes com desconto
  const pacotes = [
    { minutos: 20, desconto: 0, popular: false },
    { minutos: 30, desconto: 5, popular: false },
    { minutos: 40, desconto: 10, popular: true },
    { minutos: 50, desconto: 12, popular: false },
    { minutos: 60, desconto: 15, popular: false },
  ];

  // Calcular valor com desconto do pacote
  const pacoteSelecionado = pacotes.find(
    (p) => p.minutos === minutosEscolhidos
  );
  const descontoAtual = pacoteSelecionado?.desconto || 0;
  const valorOriginal = minutosEscolhidos * PRECO_POR_MINUTO;
  const valorComDescontoPacote =
    valorOriginal - (valorOriginal * descontoAtual) / 100;

  // Valor final com desconto do cupom
  const valorFinal = Math.max(0, valorComDescontoPacote - descontoCupom);
  const valorTotal = valorFinal.toFixed(2);

  useEffect(() => {
    verificarUsuario();
  }, []);

  useEffect(() => {
    if (mostrarPix) {
      gerarQRCode();
    }
  }, [mostrarPix, minutosEscolhidos, descontoCupom]);

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

  // Callback do cupom
  function handleCupomAplicado(
    cupom: any,
    desconto: number,
    minutosExtras: number
  ) {
    setCupomAplicado(cupom);
    setDescontoCupom(desconto);
    setMinutosExtrasCupom(minutosExtras);
  }

  // Função para Stripe Checkout
  async function handleCheckoutStripe() {
    if (!usuario) return;

    setProcessando(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minutos: minutosEscolhidos + minutosExtrasCupom,
          usuarioId: usuario.id,
          email: usuario.email || "",
          cupomId: cupomAplicado?.id || null,
          descontoCupom: descontoCupom,
          minutosExtrasCupom: minutosExtrasCupom,
          valorOriginal: valorComDescontoPacote,
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

  // Funções PIX
  function gerarCodigoPix(): string {
    const valor = parseFloat(valorTotal);

    let payload = "000201";
    payload += "010212";

    let merchantInfo = "";
    merchantInfo += "0014br.gov.bcb.pix";
    merchantInfo +=
      "01" + CHAVE_PIX_CNPJ.length.toString().padStart(2, "0") + CHAVE_PIX_CNPJ;

    payload +=
      "26" + merchantInfo.length.toString().padStart(2, "0") + merchantInfo;

    payload += "52040000";
    payload += "5303986";

    const valorStr = valor.toFixed(2);
    payload += "54" + valorStr.length.toString().padStart(2, "0") + valorStr;

    payload += "5802BR";

    const nomeFormatado = BENEFICIARIO.substring(0, 25);
    payload +=
      "59" + nomeFormatado.length.toString().padStart(2, "0") + nomeFormatado;

    const cidadeFormatada = CIDADE.substring(0, 15);
    payload +=
      "60" +
      cidadeFormatada.length.toString().padStart(2, "0") +
      cidadeFormatada;

    let additionalData = "";
    additionalData += "05" + "03***";
    payload +=
      "62" + additionalData.length.toString().padStart(2, "0") + additionalData;

    payload += "6304";
    const crc = calcularCRC16(payload);
    payload += crc;

    return payload;
  }

  function calcularCRC16(str: string): string {
    let crc = 0xffff;

    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;

      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
      }
    }

    crc = crc & 0xffff;
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  async function gerarQRCode() {
    const codigoPix = gerarCodigoPix();
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      codigoPix
    )}`;
    setQrCodeUrl(qrUrl);
  }

  async function handleJaPaguei() {
    if (!usuario) return;

    setProcessando(true);

    // Criar compra com dados do cupom
    const { data: compra, error } = await supabase
      .from("compras")
      .insert({
        usuario_id: usuario.id,
        minutos: minutosEscolhidos + minutosExtrasCupom,
        valor: parseFloat(valorTotal),
        status: "pendente",
        pix_codigo: gerarCodigoPix(),
        cupom_id: cupomAplicado?.id || null,
        desconto_aplicado: descontoCupom,
        minutos_bonus: minutosExtrasCupom,
      })
      .select()
      .single();

    if (error) {
      alert("Erro ao registrar compra");
      setProcessando(false);
      return;
    }

    // Se tem cupom, registrar uso
    if (cupomAplicado && compra) {
      await supabase.from("cupons_uso").insert({
        cupom_id: cupomAplicado.id,
        usuario_id: usuario.id,
        compra_id: compra.id,
        valor_original: valorComDescontoPacote,
        valor_desconto: descontoCupom,
        valor_final: parseFloat(valorTotal),
        minutos_extras: minutosExtrasCupom,
      });

      // Atualizar estatísticas do cupom
      await supabase.rpc("aplicar_cupom", {
        p_cupom_id: cupomAplicado.id,
        p_usuario_id: usuario.id,
        p_compra_id: compra.id,
        p_valor_original: valorComDescontoPacote,
        p_valor_desconto: descontoCupom,
        p_valor_final: parseFloat(valorTotal),
        p_minutos_extras: minutosExtrasCupom,
      });
    }

    alert(
      "✅ Compra registrada! Aguarde a aprovação do pagamento. Você receberá os minutos em breve."
    );
    router.push("/");
  }

  function copiarCodigo() {
    navigator.clipboard.writeText(gerarCodigoPix());
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
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

  // TELA DE PIX
  if (mostrarPix) {
    const codigoPix = gerarCodigoPix();

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 p-4 relative overflow-hidden">
        {/* Background decorativo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-20 w-60 h-60 bg-green-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 -right-20 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <header className="relative bg-black/30 backdrop-blur-md border-b border-white/10 -mx-4 -mt-4 mb-6 px-4 py-3 sticky top-0 z-50">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <img
                src="/logo.png"
                alt="Viaa Tarot"
                className="w-8 h-8 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
              />
              <span className="text-lg font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                Viaa Tarot
              </span>
            </Link>
            <button
              onClick={() => setMostrarPix(false)}
              className="p-2 text-white/70 hover:text-white"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="relative max-w-lg mx-auto space-y-4">
          {/* Card Valor */}
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl p-6 border border-green-500/30">
            <div className="text-center">
              <p className="text-green-300/80 text-sm mb-1">Total a pagar</p>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                R$ {valorTotal}
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full">
                <span className="text-purple-300">⏱️</span>
                <span className="text-white/80 text-sm">
                  {minutosEscolhidos + minutosExtrasCupom} minutos de consulta
                  {minutosExtrasCupom > 0 && (
                    <span className="text-green-400 ml-1">
                      (+{minutosExtrasCupom} bônus)
                    </span>
                  )}
                </span>
              </div>

              {/* Info do cupom aplicado */}
              {cupomAplicado && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                  <span>🎟️</span>
                  <span className="text-green-300 text-sm font-medium">
                    Cupom {cupomAplicado.codigo} aplicado!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <p className="text-gray-600 text-center font-medium mb-4">
              📱 Escaneie o QR Code com seu banco
            </p>
            <div className="flex justify-center">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code PIX"
                  className="w-64 h-64 rounded-lg"
                />
              ) : (
                <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">Gerando QR Code...</span>
                </div>
              )}
            </div>
          </div>

          {/* Código Copia e Cola */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <p className="text-white/70 text-sm mb-2">Ou copie o código PIX:</p>
            <div className="bg-black/30 rounded-lg p-3 mb-3">
              <p className="text-white/80 text-xs font-mono break-all">
                {codigoPix.substring(0, 50)}...
              </p>
            </div>
            <button
              onClick={copiarCodigo}
              className={`w-full py-2.5 rounded-lg font-medium transition-all ${
                copiado
                  ? "bg-green-500 text-white"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {copiado ? "✅ Copiado!" : "📋 Copiar código"}
            </button>
          </div>

          {/* Botões */}
          <div className="space-y-3">
            <button
              onClick={handleJaPaguei}
              disabled={processando}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold text-lg rounded-xl transition-all shadow-lg disabled:opacity-50"
            >
              {processando ? "Registrando..." : "✅ Já realizei o pagamento"}
            </button>
            <button
              onClick={() => setMostrarPix(false)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all"
            >
              ← Voltar
            </button>
          </div>

          {/* Aviso */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <p className="text-yellow-200/80 text-sm text-center">
              💡 Após o pagamento, aguarde a aprovação da nossa equipe. Seus
              minutos serão liberados em até 10 minutos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // TELA PRINCIPAL
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
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/logo.png"
              alt="Viaa Tarot"
              className="w-8 h-8 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
            />
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

        {/* Cupom de Desconto */}
        <div className="mb-6">
          <CupomInput
            usuarioId={usuario?.id || ""}
            valorCompra={valorComDescontoPacote}
            onCupomAplicado={handleCupomAplicado}
          />
        </div>

        {/* Aviso sobre fidelidade */}
        {cupomAplicado && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-6">
            <p className="text-yellow-200/80 text-sm text-center">
              ⚠️ Cupom não acumula com programa de fidelidade
            </p>
          </div>
        )}

        {/* Resumo */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-5 md:p-6 border border-white/20 mb-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/70">Minutos selecionados</span>
              <span className="text-white font-bold text-lg">
                {minutosEscolhidos} min
                {minutosExtrasCupom > 0 && (
                  <span className="text-green-400 text-sm ml-1">
                    +{minutosExtrasCupom}
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Preço por minuto</span>
              <span className="text-white font-medium">
                R$ {PRECO_POR_MINUTO.toFixed(2)}
              </span>
            </div>

            {/* Desconto do pacote */}
            {descontoAtual > 0 && (
              <div className="flex justify-between items-center text-purple-300">
                <span>Desconto pacote ({descontoAtual}%)</span>
                <span className="font-medium">
                  - R$ {((valorOriginal * descontoAtual) / 100).toFixed(2)}
                </span>
              </div>
            )}

            {/* Desconto do cupom (valor) */}
            {cupomAplicado && descontoCupom > 0 && (
              <div className="flex justify-between items-center text-green-400">
                <span>🎟️ Cupom {cupomAplicado.codigo}</span>
                <span className="font-bold">
                  - R$ {descontoCupom.toFixed(2)}
                </span>
              </div>
            )}

            {/* Cupom de minutos extras */}
            {cupomAplicado && minutosExtrasCupom > 0 && (
              <div className="flex justify-between items-center text-green-400">
                <span>🎟️ Cupom {cupomAplicado.codigo}</span>
                <span className="font-bold">+{minutosExtrasCupom} minutos</span>
              </div>
            )}

            <div className="border-t border-white/20 pt-3 flex justify-between items-center">
              <span className="text-white font-medium">Total</span>
              <div className="text-right">
                {(descontoCupom > 0 || descontoAtual > 0) && (
                  <div className="text-white/40 text-sm line-through">
                    R$ {valorOriginal.toFixed(2)}
                  </div>
                )}
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  R$ {valorTotal}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botões de pagamento */}
        <div className="space-y-3">
          {/* Botão Cartão (Stripe) */}
          <button
            onClick={handleCheckoutStripe}
            disabled={processando}
            className="relative w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg rounded-xl transition-all duration-300 shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative flex items-center justify-center gap-2">
              <span>💳</span>
              <span>
                {processando ? "Redirecionando..." : "Pagar com Cartão"}
              </span>
            </span>
          </button>

          {/* Botão PIX */}
          <button
            onClick={() => setMostrarPix(true)}
            className="relative w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-lg rounded-xl transition-all duration-300 shadow-xl shadow-green-500/30 hover:shadow-green-500/50 hover:scale-[1.02] overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative flex items-center justify-center gap-2">
              <span>💠</span>
              <span>Pagar com PIX</span>
            </span>
          </button>
        </div>

        {/* Info dos métodos */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <span className="text-2xl mb-1 block">💳</span>
            <p className="text-white/80 text-sm font-medium">Cartão</p>
            <p className="text-white/50 text-xs">Liberação imediata</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <span className="text-2xl mb-1 block">💠</span>
            <p className="text-white/80 text-sm font-medium">PIX</p>
            <p className="text-white/50 text-xs">Aprovação em até 10min</p>
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
              Liberação rápida
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

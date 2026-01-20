"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ComprarMinutosPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [minutosEscolhidos, setMinutosEscolhidos] = useState(20);
  const [loading, setLoading] = useState(true);
  const [mostrarPix, setMostrarPix] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copiado, setCopiado] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  const PRECO_POR_MINUTO = 1.99;

  // Dados PIX - do certificado MEI
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

  useEffect(() => {
    if (mostrarPix && canvasRef.current) {
      gerarQRCode();
    }
  }, [mostrarPix, minutosEscolhidos]);

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

    setLoading(true);

    const { error } = await supabase.from("compras").insert({
      usuario_id: usuario.id,
      minutos: minutosEscolhidos,
      valor: parseFloat(valorTotal),
      status: "pendente",
      pix_codigo: gerarCodigoPix(),
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

  function copiarCodigo() {
    navigator.clipboard.writeText(gerarCodigoPix());
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function handleSair() {
    await supabase.auth.signOut();
    router.push("/");
  }

  // Calcular valor com desconto
  function calcularValor(minutos: number, desconto: number) {
    const valorOriginal = minutos * PRECO_POR_MINUTO;
    return valorOriginal - (valorOriginal * desconto) / 100;
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

        {/* Header Mobile */}
        <header className="relative bg-black/30 backdrop-blur-md border-b border-white/10 -mx-4 -mt-4 mb-6 px-4 py-3 sticky top-0 z-50">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🔮</span>
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
                  {minutosEscolhidos} minutos de consulta
                </span>
              </div>
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
                  className="w-48 h-48 md:w-56 md:h-56 rounded-xl border-4 border-purple-100"
                />
              ) : (
                <div className="w-48 h-48 md:w-56 md:h-56 bg-gray-100 rounded-xl flex items-center justify-center">
                  <div className="text-4xl animate-pulse">🔮</div>
                </div>
              )}
            </div>
          </div>

          {/* Código PIX */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
            <p className="text-white/80 text-sm font-medium mb-3">
              Ou copie o código PIX:
            </p>
            <div className="bg-black/30 rounded-xl p-3 mb-3 max-h-20 overflow-y-auto">
              <code className="text-white/70 text-xs break-all font-mono">
                {codigoPix}
              </code>
            </div>
            <button
              onClick={copiarCodigo}
              className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                copiado
                  ? "bg-green-500 text-white"
                  : "bg-purple-600 hover:bg-purple-500 text-white"
              }`}
            >
              {copiado ? (
                <>
                  <span>✓</span>
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>Copiar código PIX</span>
                </>
              )}
            </button>
          </div>

          {/* Dados do beneficiário */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            <p className="text-purple-300 text-sm font-medium mb-3">
              Dados do beneficiário
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Nome</span>
                <span className="text-white font-medium text-right text-xs">
                  {BENEFICIARIO}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">CNPJ</span>
                <span className="text-white font-medium">
                  57.129.530/0001-51
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Cidade</span>
                <span className="text-white font-medium">São Paulo - SP</span>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleJaPaguei}
              disabled={loading}
              className="relative w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 disabled:from-green-800 disabled:to-emerald-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-[1.02] overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative flex items-center justify-center gap-2">
                <span>✅</span>
                <span>Já realizei o pagamento</span>
              </span>
            </button>

            <button
              onClick={() => setMostrarPix(false)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all border border-white/20"
            >
              ← Voltar e alterar valor
            </button>
          </div>

          {/* Aviso */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
            <p className="text-purple-200/80 text-sm">
              💡 Após o pagamento, clique em{" "}
              <span className="font-semibold text-white">
                "Já realizei o pagamento"
              </span>
              . A aprovação é feita em poucos minutos.
            </p>
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    );
  }

  // TELA PRINCIPAL - Escolher minutos
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 p-4 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-60 h-60 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header Mobile */}
      <header className="relative bg-black/30 backdrop-blur-md border-b border-white/10 -mx-4 -mt-4 mb-6 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Viaa Tarot" className="w-8 h-8" />
            <span className="text-lg font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
              Viaa Tarot
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Badge de minutos atual */}
            <div className="flex items-center gap-1.5 bg-purple-600/80 px-3 py-1.5 rounded-full">
              <span className="text-yellow-300 text-sm">⏱️</span>
              <span className="text-white font-bold text-sm">
                {usuario?.minutos_disponiveis || 0}
              </span>
            </div>

            <button
              onClick={handleSair}
              className="text-white/60 hover:text-white text-sm"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="relative max-w-2xl mx-auto">
        {/* Título */}
        <div className="text-center mb-8">
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
            const valorComDesconto = calcularValor(
              pacote.minutos,
              pacote.desconto
            );
            const valorOriginal = pacote.minutos * PRECO_POR_MINUTO;

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
                      R$ {valorOriginal.toFixed(2)}
                    </div>
                    <div className="text-lg md:text-xl font-bold text-white">
                      R$ {valorComDesconto.toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <div className="text-lg md:text-xl font-bold text-white">
                    R$ {valorOriginal.toFixed(2)}
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

            {pacotes.find((p) => p.minutos === minutosEscolhidos)?.desconto! >
              0 && (
              <div className="flex justify-between items-center text-green-400">
                <span>Desconto aplicado</span>
                <span className="font-medium">
                  -
                  {
                    pacotes.find((p) => p.minutos === minutosEscolhidos)
                      ?.desconto
                  }
                  %
                </span>
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

        {/* Botão continuar */}
        <button
          onClick={() => setMostrarPix(true)}
          className="relative w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg rounded-xl transition-all duration-300 shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="relative flex items-center justify-center gap-2">
            <span>💳</span>
            <span>Continuar para pagamento</span>
            <span>→</span>
          </span>
        </button>

        {/* Métodos de pagamento */}
        <div className="flex items-center justify-center gap-4 mt-6 text-white/40 text-sm">
          <span>Pagamento via</span>
          <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full">
            <span className="text-green-400">💠</span>
            <span className="text-white font-medium">PIX</span>
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

"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContatoPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");

  const numeroWhatsApp = "5511995391337";

  function abrirWhatsApp() {
    const texto = `Olá! Meu nome é ${nome || "[seu nome]"}.\n\nAssunto: ${
      assunto || "[assunto]"
    }\n\n${mensagem || "[sua mensagem]"}`;
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(
      texto
    )}`;
    window.open(url, "_blank");
  }

  function enviarEmail() {
    const emailDestino = "contato@viaa.app.br";
    const assuntoEmail = encodeURIComponent(assunto || "Contato via site");
    const corpoEmail = encodeURIComponent(
      `Nome: ${nome}\nE-mail: ${email}\n\nMensagem:\n${mensagem}`
    );
    window.location.href = `mailto:${emailDestino}?subject=${assuntoEmail}&body=${corpoEmail}`;
  }

  function abrirWhatsAppDireto() {
    window.open(`https://wa.me/${numeroWhatsApp}`, "_blank");
  }

  function abrirInstagram() {
    window.open("https://instagram.com/viaa.tarot", "_blank");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 md:gap-3 group">
            <img
              src="/logo.png"
              alt="Viaa Tarot"
              className="w-8 h-8 md:w-10 md:h-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
            />
            <span className="text-lg md:text-2xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
              Viaa Tarot
            </span>
          </Link>

          <Link
            href="/"
            className="px-4 py-2 md:px-6 md:py-2.5 text-sm md:text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-full transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105"
          >
            Voltar
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">💬</div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Entre em Contato
          </h1>
          <p className="text-purple-200/70">Estamos aqui para ajudar você</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Formulário */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span>✉️</span> Envie uma mensagem
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-purple-200 text-sm mb-2">
                  Seu nome
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite seu nome"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm mb-2">
                  Seu e-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm mb-2">
                  Assunto
                </label>
                <select
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value="" className="bg-purple-900">
                    Selecione um assunto
                  </option>
                  <option
                    value="Dúvidas sobre consultas"
                    className="bg-purple-900"
                  >
                    Dúvidas sobre consultas
                  </option>
                  <option
                    value="Problemas com pagamento"
                    className="bg-purple-900"
                  >
                    Problemas com pagamento
                  </option>
                  <option value="Suporte técnico" className="bg-purple-900">
                    Suporte técnico
                  </option>
                  <option value="Quero ser taróloga" className="bg-purple-900">
                    Quero ser taróloga
                  </option>
                  <option value="Parcerias" className="bg-purple-900">
                    Parcerias
                  </option>
                  <option value="Outros" className="bg-purple-900">
                    Outros
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-purple-200 text-sm mb-2">
                  Mensagem
                </label>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={abrirWhatsApp}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <span>📱</span> WhatsApp
                </button>
                <button
                  onClick={enviarEmail}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <span>✉️</span> E-mail
                </button>
              </div>
            </div>
          </div>

          {/* Informações de contato */}
          <div className="space-y-6">
            {/* Card WhatsApp */}
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-3xl p-6 border border-green-500/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-green-500/30 rounded-2xl flex items-center justify-center text-2xl">
                  📱
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">WhatsApp</h3>
                  <p className="text-green-300/80 text-sm">Resposta rápida</p>
                </div>
              </div>
              <p className="text-white/80 mb-4">
                Atendimento de segunda a sábado, das 9h às 22h.
              </p>
              <button
                onClick={abrirWhatsAppDireto}
                className="block w-full py-3 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl transition-all text-center cursor-pointer"
              >
                Iniciar conversa
              </button>
            </div>

            {/* Card E-mail */}
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-3xl p-6 border border-purple-500/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-purple-500/30 rounded-2xl flex items-center justify-center text-2xl">
                  ✉️
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">E-mail</h3>
                  <p className="text-purple-300/80 text-sm">
                    Para assuntos formais
                  </p>
                </div>
              </div>
              <p className="text-white/80 mb-2">contato@viaa.app.br</p>
              <p className="text-white/60 text-sm">
                Responderemos em até 24 horas úteis.
              </p>
            </div>

            {/* Card Redes Sociais */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <span>🌟</span> Siga-nos
              </h3>
              <button
                onClick={abrirInstagram}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white font-medium rounded-xl transition-all text-center cursor-pointer"
              >
                Instagram
              </button>
            </div>
          </div>
        </div>

        {/* FAQ rápido */}
        <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span>❓</span> Perguntas Frequentes
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-white font-medium mb-2">
                Como funciona a consulta?
              </h4>
              <p className="text-white/60 text-sm">
                Você escolhe um tarólogo disponível, compra minutos e inicia uma
                consulta em tempo real via chat.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-white font-medium mb-2">
                Os minutos expiram?
              </h4>
              <p className="text-white/60 text-sm">
                Não! Seus minutos não expiram e podem ser usados quando você
                quiser.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-white font-medium mb-2">
                Posso cancelar uma consulta?
              </h4>
              <p className="text-white/60 text-sm">
                Sim, você pode cancelar antes do tarólogo aceitar. Após o
                início, será cobrado pelo tempo utilizado.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-white font-medium mb-2">
                Como me torno taróloga?
              </h4>
              <p className="text-white/60 text-sm">
                Entre em contato conosco pelo WhatsApp informando sua
                experiência e interesse em fazer parte da equipe.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black/40 backdrop-blur-sm border-t border-purple-500/20 py-8">
        <div className="container mx-auto px-4 text-center text-purple-300/50 text-sm">
          <p>© 2025 Viaa Tarot. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

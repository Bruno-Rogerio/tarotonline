"use client";

import Link from "next/link";

export default function SobrePage() {
  const valores = [
    { icon: "⚖️", texto: "Ética e respeito em cada atendimento" },
    { icon: "🔒", texto: "Confidencialidade e segurança" },
    { icon: "💜", texto: "Empatia e escuta verdadeira" },
    { icon: "✨", texto: "Responsabilidade espiritual" },
    { icon: "🪷", texto: "Valorização do autoconhecimento" },
    { icon: "🕊️", texto: "Respeito ao livre-arbítrio" },
  ];

  // Número do WhatsApp para tarólogas
  const numeroWhatsApp = "5511995391337"; // ALTERE PARA O NÚMERO REAL
  const mensagemTarologa =
    "Olá! Sou tarólogo e gostaria de saber mais sobre como fazer parte da plataforma Viaa Tarot.";
  const linkWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(
    mensagemTarologa
  )}`;

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

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 md:w-64 md:h-64 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-10 w-40 h-40 md:w-80 md:h-80 bg-pink-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-12 md:py-20 text-center relative z-10">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-white">Sobre </span>
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Nós
            </span>
          </h1>
          <p className="text-purple-200/80 text-base md:text-xl max-w-2xl mx-auto">
            Conheça nossa história, propósito e valores
          </p>
        </div>
      </section>

      {/* Quem Somos */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-6 md:p-10 border border-white/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-purple-500/30">
                🔮
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                Quem Somos
              </h2>
            </div>

            <div className="space-y-4 text-purple-100/80 text-base md:text-lg leading-relaxed">
              <p>
                Somos uma plataforma de atendimentos online dedicada ao tarot
                como ferramenta de{" "}
                <span className="text-purple-300 font-medium">
                  autoconhecimento, orientação e acolhimento emocional
                </span>
                . Acreditamos no tarot como um instrumento de escuta, reflexão e
                clareza, respeitando sempre o livre-arbítrio e o momento de cada
                pessoa.
              </p>
              <p>
                Reunimos tarólogos sensíveis, éticos e comprometidos, oferecendo
                um{" "}
                <span className="text-purple-300 font-medium">
                  espaço seguro, confidencial e humanizado
                </span>{" "}
                para quem busca respostas, direcionamento ou simplesmente
                compreender melhor seus próprios caminhos.
              </p>
              <p>
                Nosso propósito é conectar pessoas a leituras responsáveis,
                feitas com{" "}
                <span className="text-purple-300 font-medium">
                  verdade, respeito e empatia
                </span>
                , promovendo consciência e equilíbrio emocional.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Missão e Visão */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          {/* Missão */}
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-purple-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/30 rounded-xl flex items-center justify-center text-xl">
                🎯
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Missão
              </h2>
            </div>
            <p className="text-purple-100/80 leading-relaxed">
              Levar orientação, clareza e acolhimento por meio do tarot,
              oferecendo atendimentos online acessíveis, éticos e humanizados,
              que auxiliem no autoconhecimento e nas escolhas conscientes.
            </p>
          </div>

          {/* Visão */}
          <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-pink-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-pink-500/30 rounded-xl flex items-center justify-center text-xl">
                👁️
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Visão
              </h2>
            </div>
            <p className="text-purple-100/80 leading-relaxed">
              Ser uma referência em atendimentos online com tarot, reconhecida
              pela seriedade, confiança e qualidade das leituras, criando uma
              comunidade onde espiritualidade e responsabilidade caminham
              juntas.
            </p>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
              Nossos{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Valores
              </span>
            </h2>
            <p className="text-purple-200/70">
              Os pilares que guiam cada atendimento
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {valores.map((valor, index) => (
              <div
                key={index}
                className="group bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-purple-500/30 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">
                    {valor.icon}
                  </span>
                  <span className="text-white font-medium">{valor.texto}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para Tarólogas */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-purple-500/20 overflow-hidden">
            {/* Decoração */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-purple-500/30">
                  🌟
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">
                  Para Tarólogos
                </h2>
              </div>

              <p className="text-purple-100/80 text-base md:text-lg leading-relaxed mb-8">
                Se você é tarólogo e deseja fazer parte da nossa plataforma,
                acreditando em uma atuação ética, responsável e comprometida com
                o cuidado emocional das pessoas, entre em contato conosco para
                saber mais sobre o cadastro.
              </p>

              <a
                href={linkWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105"
              >
                <svg
                  viewBox="0 0 32 32"
                  className="w-6 h-6 fill-white"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M16.004 0C7.166 0 0 7.166 0 16.004c0 2.816.736 5.584 2.14 8.024L0 32l8.188-2.088A15.95 15.95 0 0 0 16.004 32C24.838 32 32 24.838 32 16.004 32 7.166 24.838 0 16.004 0Zm0 29.332a13.29 13.29 0 0 1-6.788-1.86l-.488-.288-5.052 1.288 1.348-4.916-.32-.508a13.29 13.29 0 0 1-2.036-7.044c0-7.352 5.98-13.332 13.336-13.332 7.352 0 13.332 5.98 13.332 13.332 0 7.356-5.98 13.328-13.332 13.328Zm7.3-9.992c-.4-.2-2.368-1.168-2.736-1.3-.368-.136-.636-.2-.904.2-.268.4-1.036 1.3-1.268 1.568-.232.268-.468.3-.868.1-.4-.2-1.688-.62-3.216-1.98-1.188-1.06-1.992-2.368-2.224-2.768-.232-.4-.024-.616.176-.816.18-.18.4-.468.6-.7.2-.232.268-.4.4-.668.136-.268.068-.5-.032-.7-.1-.2-.904-2.18-1.24-2.984-.324-.784-.656-.676-.904-.688-.232-.012-.5-.012-.768-.012s-.7.1-1.068.5c-.368.4-1.4 1.368-1.4 3.336 0 1.968 1.432 3.868 1.632 4.136.2.268 2.82 4.304 6.832 6.032.956.412 1.7.656 2.28.84.96.304 1.832.26 2.524.16.768-.116 2.368-.968 2.7-1.904.336-.936.336-1.736.236-1.904-.1-.168-.368-.268-.768-.468Z" />
                </svg>
                <span>Fale conosco pelo WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/40 backdrop-blur-sm border-t border-purple-500/20 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Viaa Tarot" className="w-8 h-8" />
              <span className="text-lg font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                Viaa Tarot
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <Link
                href="/"
                className="text-purple-300/70 hover:text-white transition-colors"
              >
                Home
              </Link>
              <Link
                href="/sobre"
                className="text-purple-300/70 hover:text-white transition-colors"
              >
                Sobre
              </Link>
              <a
                href="#"
                className="text-purple-300/70 hover:text-white transition-colors"
              >
                Termos
              </a>
              <a
                href="#"
                className="text-purple-300/70 hover:text-white transition-colors"
              >
                Privacidade
              </a>
            </div>

            <p className="text-purple-300/50 text-sm">
              © 2025 Viaa Tarot. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

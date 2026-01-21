import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre a Viaa Tarot | Tarot Online com Ética e Privacidade",
  description:
    "Conheça a Viaa Tarot, uma plataforma de tarot online focada em ética, confidencialidade e acolhimento emocional. Missão, visão e valores.",
  alternates: {
    canonical: "https://SEU-DOMINIO.com/sobre",
  },
  openGraph: {
    title: "Sobre a Viaa Tarot",
    description:
      "Plataforma de tarot online com foco em ética, privacidade e responsabilidade espiritual.",
    url: "https://SEU-DOMINIO.com/sobre",
    siteName: "Viaa Tarot",
    images: [
      {
        url: "https://SEU-DOMINIO.com/og-sobre.png",
        width: 1200,
        height: 630,
        alt: "Viaa Tarot - Sobre",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SobrePage() {
  const valores = [
    { icon: "⚖️", texto: "Ética e respeito em cada atendimento" },
    { icon: "🔒", texto: "Confidencialidade e segurança" },
    { icon: "💜", texto: "Empatia e escuta verdadeira" },
    { icon: "✨", texto: "Responsabilidade espiritual" },
    { icon: "🪷", texto: "Valorização do autoconhecimento" },
    { icon: "🕊️", texto: "Respeito ao livre-arbítrio" },
  ];

  const numeroWhatsApp = "5511995391337";
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
            className="px-4 py-2 md:px-6 md:py-2.5 text-sm md:text-base bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full transition-all shadow-lg hover:scale-105"
          >
            Voltar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-12 md:py-20 text-center">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 text-white">
          Sobre a{" "}
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Viaa Tarot
          </span>
        </h1>
        <p className="text-purple-200/80 text-base md:text-xl max-w-2xl mx-auto">
          Conheça nossa história, propósito e valores como plataforma de tarot
          online
        </p>
      </section>

      {/* Quem Somos */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto bg-white/10 rounded-3xl p-6 md:p-10 border border-white/20">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Quem Somos
          </h2>
          <div className="space-y-4 text-purple-100/80 text-base md:text-lg">
            <p>
              Somos uma plataforma de{" "}
              <strong className="text-purple-300">tarot online</strong> dedicada
              ao autoconhecimento, orientação e acolhimento emocional.
            </p>
            <p>
              Reunimos tarólogos éticos e comprometidos, oferecendo um espaço
              seguro, confidencial e humanizado para quem busca clareza e
              direcionamento.
            </p>
            <p>
              Nosso propósito é promover leituras responsáveis, feitas com
              verdade, respeito e empatia.
            </p>
          </div>
        </div>
      </section>

      {/* Missão e Visão */}
      <section className="container mx-auto px-4 py-12 md:py-16 grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-purple-500/20 rounded-3xl p-6 border border-purple-500/30">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
            Missão
          </h2>
          <p className="text-purple-100/80">
            Levar orientação e clareza por meio do tarot online, com ética,
            responsabilidade e acolhimento.
          </p>
        </div>

        <div className="bg-pink-500/20 rounded-3xl p-6 border border-pink-500/30">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
            Visão
          </h2>
          <p className="text-purple-100/80">
            Ser referência em tarot online pela confiança, seriedade e qualidade
            das leituras.
          </p>
        </div>
      </section>

      {/* Valores */}
      <section className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
        <h2 className="text-2xl md:text-4xl font-bold text-white text-center mb-8">
          Nossos{" "}
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Valores
          </span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {valores.map((valor, index) => (
            <div
              key={index}
              className="bg-white/10 rounded-2xl p-5 border border-white/10 text-white"
            >
              <span className="text-2xl mr-2">{valor.icon}</span>
              {valor.texto}
            </div>
          ))}
        </div>
      </section>

      {/* Para Tarólogos */}
      <section className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
        <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-3xl p-8 border border-purple-500/20">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Para Tarólogos
          </h2>
          <p className="text-purple-100/80 mb-6">
            Se você é tarólogo e deseja fazer parte da Viaa Tarot, entre em
            contato conosco para saber mais.
          </p>

          <a
            href={linkWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-all"
          >
            Falar pelo WhatsApp
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/40 border-t border-purple-500/20 py-8 text-center text-purple-300/60 text-sm">
        © 2025 Viaa Tarot. Todos os direitos reservados.
      </footer>
    </div>
  );
}

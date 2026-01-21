import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso | Viaa Tarot",
  description:
    "Leia os Termos de Uso da Viaa Tarot: regras de cadastro, pagamentos, natureza das consultas, conduta do usuário e demais condições.",
  alternates: {
    canonical: "https://SEU-DOMINIO.com/termos",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Termos de Uso | Viaa Tarot",
    description:
      "Confira as condições de uso da plataforma Viaa Tarot, incluindo regras de cadastro, pagamentos e conduta.",
    url: "https://SEU-DOMINIO.com/termos",
    siteName: "Viaa Tarot",
    locale: "pt_BR",
    type: "website",
  },
};

export default function TermosPage() {
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
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 md:p-10 border border-white/20">
          <div className="text-center mb-10">
            <div className="text-5xl mb-4">📜</div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Termos de Uso
            </h1>
            <p className="text-purple-200/70">
              Última atualização: Janeiro de 2025
            </p>
          </div>

          <div className="space-y-8 text-purple-100/80">
            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">1.</span> Aceitação dos Termos
              </h2>
              <p className="leading-relaxed">
                Ao acessar e utilizar a plataforma Viaa Tarot, você concorda em
                cumprir e estar vinculado a estes Termos de Uso. Se você não
                concordar com qualquer parte destes termos, não deverá utilizar
                nossos serviços.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">2.</span> Descrição dos
                Serviços
              </h2>
              <p className="leading-relaxed">
                A Viaa Tarot é uma plataforma de consultas de tarot online que
                conecta usuários a tarólogos profissionais. Nossos serviços
                incluem consultas individuais em tempo real através de chat,
                leitura de cartas e orientação espiritual.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">3.</span> Cadastro e Conta
              </h2>
              <p className="leading-relaxed mb-3">
                Para utilizar nossos serviços, você deve:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Ter pelo menos 18 anos de idade</li>
                <li>Fornecer informações verdadeiras e completas</li>
                <li>Manter a segurança de sua senha e conta</li>
                <li>
                  Notificar-nos imediatamente sobre qualquer uso não autorizado
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">4.</span> Pagamentos e
                Reembolsos
              </h2>
              <p className="leading-relaxed">
                Os pagamentos são realizados através de cartão de crédito ou
                PIX. Os minutos adquiridos não são reembolsáveis após o início
                de uma consulta. Em caso de problemas técnicos comprovados da
                plataforma, os minutos serão restituídos à sua conta.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">5.</span> Natureza das
                Consultas
              </h2>
              <p className="leading-relaxed">
                As consultas de tarot são oferecidas para fins de
                entretenimento, autoconhecimento e reflexão pessoal. Não
                substituem aconselhamento profissional médico, psicológico,
                jurídico ou financeiro. As decisões tomadas com base nas
                consultas são de responsabilidade exclusiva do usuário.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">6.</span> Conduta do Usuário
              </h2>
              <p className="leading-relaxed mb-3">
                Ao utilizar a plataforma, você concorda em não:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Usar linguagem ofensiva ou desrespeitosa</li>
                <li>Assediar ou intimidar tarólogos ou outros usuários</li>
                <li>Compartilhar conteúdo ilegal ou inadequado</li>
                <li>Tentar burlar o sistema de pagamentos</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">7.</span> Propriedade
                Intelectual
              </h2>
              <p className="leading-relaxed">
                Todo o conteúdo da plataforma, incluindo textos, gráficos,
                logos, ícones e software, é propriedade da Viaa Tarot e está
                protegido por leis de direitos autorais.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">8.</span> Alterações nos
                Termos
              </h2>
              <p className="leading-relaxed">
                Reservamo-nos o direito de modificar estes termos a qualquer
                momento. As alterações entram em vigor imediatamente após a
                publicação. O uso continuado da plataforma após alterações
                constitui aceitação dos novos termos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">9.</span> Contato
              </h2>
              <p className="leading-relaxed">
                Para dúvidas sobre estes Termos de Uso, entre em contato conosco
                através da nossa{" "}
                <Link
                  href="/contato"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  página de contato
                </Link>
                .
              </p>
            </section>
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

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade | Viaa Tarot",
  description:
    "Entenda como a Viaa Tarot coleta, usa, armazena e protege dados pessoais. Informações sobre LGPD, cookies, retenção de dados e seus direitos.",
  alternates: {
    canonical: "https://viaa.app.br/privacidade",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Política de Privacidade | Viaa Tarot",
    description:
      "Veja como a Viaa Tarot protege seus dados, quais informações são coletadas e quais são seus direitos pela LGPD.",
    url: "https://viaa.app.br/privacidade",
    siteName: "Viaa Tarot",
    locale: "pt_BR",
    type: "website",
  },
};

export default function PrivacidadePage() {
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
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Política de Privacidade
            </h1>
            <p className="text-purple-200/70">
              Última atualização: Janeiro de 2025
            </p>
          </div>

          <div className="space-y-8 text-purple-100/80">
            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">1.</span> Introdução
              </h2>
              <p className="leading-relaxed">
                A Viaa Tarot está comprometida em proteger sua privacidade. Esta
                política descreve como coletamos, usamos, armazenamos e
                protegemos suas informações pessoais quando você utiliza nossa
                plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">2.</span> Informações
                Coletadas
              </h2>
              <p className="leading-relaxed mb-3">
                Coletamos as seguintes informações:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong className="text-white">Dados de cadastro:</strong>{" "}
                  nome, e-mail, telefone e data de nascimento
                </li>
                <li>
                  <strong className="text-white">Dados de pagamento:</strong>{" "}
                  processados de forma segura através do Stripe
                </li>
                <li>
                  <strong className="text-white">
                    Histórico de consultas:
                  </strong>{" "}
                  registros das sessões realizadas
                </li>
                <li>
                  <strong className="text-white">Dados de acesso:</strong>{" "}
                  endereço IP, localização aproximada e dispositivo utilizado
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">3.</span> Uso das Informações
              </h2>
              <p className="leading-relaxed mb-3">
                Utilizamos suas informações para:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Fornecer e melhorar nossos serviços</li>
                <li>Processar pagamentos e gerenciar sua conta</li>
                <li>Enviar comunicações sobre sua conta e serviços</li>
                <li>Garantir a segurança da plataforma</li>
                <li>Cumprir obrigações legais</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">4.</span> Compartilhamento de
                Dados
              </h2>
              <p className="leading-relaxed">
                Não vendemos suas informações pessoais. Compartilhamos dados
                apenas com: processadores de pagamento (Stripe), serviços de
                hospedagem (Vercel/Supabase), e quando exigido por lei. Todos os
                parceiros estão sujeitos a acordos de confidencialidade.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">5.</span> Segurança dos Dados
              </h2>
              <p className="leading-relaxed">
                Implementamos medidas de segurança técnicas e organizacionais
                para proteger suas informações, incluindo criptografia SSL/TLS,
                armazenamento seguro em servidores protegidos e controle de
                acesso restrito aos dados.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">6.</span> Confidencialidade
                das Consultas
              </h2>
              <p className="leading-relaxed">
                O conteúdo das suas consultas de tarot é tratado com total
                confidencialidade. As mensagens trocadas durante as sessões não
                são compartilhadas com terceiros e são armazenadas de forma
                segura para referência futura do usuário.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">7.</span> Seus Direitos
              </h2>
              <p className="leading-relaxed mb-3">
                De acordo com a LGPD, você tem direito a:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incompletos ou desatualizados</li>
                <li>Solicitar a exclusão dos seus dados</li>
                <li>Revogar consentimento a qualquer momento</li>
                <li>Solicitar portabilidade dos dados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">8.</span> Cookies
              </h2>
              <p className="leading-relaxed">
                Utilizamos cookies essenciais para o funcionamento da
                plataforma, como manutenção da sessão de login. Não utilizamos
                cookies de rastreamento ou publicidade de terceiros.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">9.</span> Retenção de Dados
              </h2>
              <p className="leading-relaxed">
                Mantemos seus dados enquanto sua conta estiver ativa ou conforme
                necessário para fornecer nossos serviços. Você pode solicitar a
                exclusão da sua conta a qualquer momento através da página de
                contato.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-purple-400">10.</span> Contato
              </h2>
              <p className="leading-relaxed">
                Para exercer seus direitos ou esclarecer dúvidas sobre esta
                política, entre em contato através da nossa{" "}
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

"use client";
//
import { useState } from "react";
import { trackWhatsAppClick } from "@/lib/analytics";

export default function WhatsAppButton() {
  const [mostrarTooltip, setMostrarTooltip] = useState(false);

  // COLOQUE SEU NÚMERO AQUI (com código do país, sem espaços ou símbolos)
  const numeroWhatsApp = "5511915194173"; // Ex: 5511999999999
  const mensagemPadrao = "Olá! Preciso de ajuda com o Viaa Tarot.";

  const linkWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(
    mensagemPadrao,
  )}`;

  const handleClick = () => {
    // Dispara evento no GA4
    trackWhatsAppClick();
    // O link continua abrindo normalmente (target=_blank)
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Tooltip */}
      {mostrarTooltip && (
        <div className="absolute bottom-16 right-0 bg-white text-gray-800 px-4 py-2 rounded-xl shadow-lg text-sm font-medium whitespace-nowrap animate-fade-in">
          Precisa de ajuda? 💬
          <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-white rotate-45" />
        </div>
      )}

      {/* Botão */}
      <a
        href={linkWhatsApp}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        onMouseEnter={() => setMostrarTooltip(true)}
        onMouseLeave={() => setMostrarTooltip(false)}
        className="group flex items-center justify-center w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-110 transition-all duration-300"
      >
        {/* Ícone do WhatsApp */}
        <svg
          viewBox="0 0 32 32"
          className="w-7 h-7 fill-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M16.004 0C7.166 0 0 7.166 0 16.004c0 2.816.736 5.584 2.14 8.024L0 32l8.188-2.088A15.95 15.95 0 0 0 16.004 32C24.838 32 32 24.838 32 16.004 32 7.166 24.838 0 16.004 0Zm0 29.332a13.29 13.29 0 0 1-6.788-1.86l-.488-.288-5.052 1.288 1.348-4.916-.32-.508a13.29 13.29 0 0 1-2.036-7.044c0-7.352 5.98-13.332 13.336-13.332 7.352 0 13.332 5.98 13.332 13.332 0 7.356-5.98 13.328-13.332 13.328Zm7.3-9.992c-.4-.2-2.368-1.168-2.736-1.3-.368-.136-.636-.2-.904.2-.268.4-1.036 1.3-1.268 1.568-.232.268-.468.3-.868.1-.4-.2-1.688-.62-3.216-1.98-1.188-1.06-1.992-2.368-2.224-2.768-.232-.4-.024-.616.176-.816.18-.18.4-.468.6-.7.2-.232.268-.4.4-.668.136-.268.068-.5-.032-.7-.1-.2-.904-2.18-1.24-2.984-.324-.784-.656-.676-.904-.688-.232-.012-.5-.012-.768-.012s-.7.1-1.068.5c-.368.4-1.4 1.368-1.4 3.336 0 1.968 1.432 3.868 1.632 4.136.2.268 2.82 4.304 6.832 6.032.956.412 1.7.656 2.28.84.96.304 1.832.26 2.524.16.768-.116 2.368-.968 2.7-1.904.336-.936.336-1.736.236-1.904-.1-.168-.368-.268-.768-.468Z" />
        </svg>

        {/* Pulso animado */}
        <span className="absolute w-14 h-14 bg-green-500 rounded-full animate-ping opacity-20" />
      </a>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

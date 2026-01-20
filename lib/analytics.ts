export const trackWhatsAppClick = () => {
  if (typeof window === "undefined") return;

  window.gtag?.("event", "whatsapp_click", {
    event_category: "engagement",
    event_label: "whatsapp_button",
  });
};

// app/page.tsx
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import HomeContent from "@/components/HomeContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tarot Online com Tarólogos Experientes | Viaa Tarot",
  description:
    "Consulta de tarot online com tarólogos experientes. Leituras claras e personalizadas, com privacidade e transparência. Comece agora na Viaa Tarot.",
  alternates: {
    canonical: "https://viaa.app.br/",
  },
  openGraph: {
    title: "Tarot Online com Tarólogos Experientes | Viaa Tarot",
    description:
      "Consulta de tarot online com tarólogos experientes. Leituras claras e personalizadas, com privacidade e transparência.",
    url: "https://viaa.app.br/",
    siteName: "Viaa Tarot",
    images: [
      {
        url: "https://viaa.app.br/og-home.png",
        width: 1200,
        height: 630,
        alt: "Viaa Tarot - Tarot Online",
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

async function getTarologos() {
  const { data, error } = await supabase
    .from("tarologos")
    .select("*")
    .order("ordem", { ascending: true });

  if (error) {
    console.error("Erro ao buscar tarólogos:", error);
    return [];
  }

  return data ?? [];
}

export default async function Home() {
  const tarologos = await getTarologos();
  return <HomeContent tarologos={tarologos} />;
}

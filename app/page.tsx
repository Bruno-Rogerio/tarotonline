import { supabase } from "@/lib/supabase";
import HomeContent from "@/components/HomeContent";

export const dynamic = "force-dynamic";

async function getTarologos() {
  const { data, error } = await supabase
    .from("tarologos")
    .select("*")
    .order("ordem", { ascending: true });

  if (error) {
    console.error("Erro ao buscar tarológos:", error);
    return [];
  }

  return data;
}

export default async function Home() {
  const tarologos = await getTarologos();

  return <HomeContent tarologos={tarologos} />;
}

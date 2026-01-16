"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Usuario = {
  nome: string;
  minutos_disponiveis: number;
  tipo: "cliente" | "admin";
};

export default function HeaderLogado({ usuario }: { usuario: Usuario }) {
  const router = useRouter();

  async function handleSair() {
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 cursor-pointer hover:text-purple-200 transition-colors">
            🔮 Tarot Místico
          </h1>
        </Link>

        <div className="flex items-center gap-4">
          <div className="text-white">
            <span className="text-white/60">Olá, </span>
            <span className="font-medium">{usuario.nome}</span>
          </div>

          <div className="bg-purple-600 px-4 py-2 rounded-full text-white font-medium">
            {usuario.minutos_disponiveis} min
          </div>

          {usuario.minutos_disponiveis === 0 && (
            <Link
              href="/comprar-minutos"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors text-sm"
            >
              Comprar minutos
            </Link>
          )}

          {usuario.tipo === "admin" && (
            <Link
              href="/admin"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors text-sm"
            >
              Painel Admin
            </Link>
          )}

          <button
            onClick={handleSair}
            className="text-purple-300 hover:text-purple-200 text-sm"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}

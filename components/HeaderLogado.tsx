"use client";

import { useState } from "react";
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
  const [menuAberto, setMenuAberto] = useState(false);

  async function handleSair() {
    await supabase.auth.signOut();
    router.refresh();
  }

  // Pegar primeiro nome
  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <>
      <header className="bg-black/30 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          {/* Mobile */}
          <div className="flex items-center justify-between md:hidden">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <img
                src="/logo.png"
                alt="Viaa Tarot"
                className="w-8 h-8 group-hover:scale-110 transition-transform"
              />
              <span className="text-lg font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                Tarot Místico
              </span>
            </Link>

            {/* Direita: Minutos + Menu */}
            <div className="flex items-center gap-2">
              {/* Badge de minutos */}
              <Link
                href="/comprar-minutos"
                className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 rounded-full shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all"
              >
                <span className="text-yellow-300 text-sm">⏱️</span>
                <span className="text-white font-bold text-sm">
                  {usuario.minutos_disponiveis}
                </span>
              </Link>

              {/* Botão hamburguer */}
              <button
                onClick={() => setMenuAberto(!menuAberto)}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <div className="w-5 h-4 flex flex-col justify-between">
                  <span
                    className={`block h-0.5 bg-white transition-all duration-300 ${
                      menuAberto ? "rotate-45 translate-y-1.5" : ""
                    }`}
                  />
                  <span
                    className={`block h-0.5 bg-white transition-all duration-300 ${
                      menuAberto ? "opacity-0" : ""
                    }`}
                  />
                  <span
                    className={`block h-0.5 bg-white transition-all duration-300 ${
                      menuAberto ? "-rotate-45 -translate-y-2" : ""
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden md:flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="Viaa Tarot"
                className="w-10 h-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent group-hover:from-pink-300 group-hover:to-purple-300 transition-all">
                Tarot Místico
              </span>
            </Link>

            {/* Centro/Direita */}
            <div className="flex items-center gap-6">
              {/* Saudação */}
              <div className="text-right">
                <p className="text-purple-300/80 text-sm">Bem-vindo(a)</p>
                <p className="text-white font-semibold">{primeiroNome} ✨</p>
              </div>

              {/* Badge de minutos com efeito glow */}
              <Link
                href="/comprar-minutos"
                className="group relative flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 rounded-full shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-md opacity-0 group-hover:opacity-50 transition-opacity" />
                <span className="relative text-yellow-300 text-lg">⏱️</span>
                <span className="relative text-white font-bold text-lg">
                  {usuario.minutos_disponiveis}
                </span>
                <span className="relative text-white/80 text-sm">min</span>
              </Link>

              {/* Botão comprar (se não tiver minutos) */}
              {usuario.minutos_disponiveis === 0 && (
                <Link
                  href="/comprar-minutos"
                  className="relative overflow-hidden px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-full hover:scale-105 transition-all duration-300 shadow-lg shadow-green-500/30 hover:shadow-green-500/50"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <span>💎</span> Comprar
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 hover:opacity-100 transition-opacity" />
                </Link>
              )}

              {/* Botão Admin */}
              {usuario.tipo === "admin" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-full transition-all hover:scale-105"
                >
                  <span>⚡</span>
                  <span className="font-medium">Admin</span>
                </Link>
              )}

              {/* Botão Sair */}
              <button
                onClick={handleSair}
                className="flex items-center gap-2 px-4 py-2 text-purple-300 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                <span>🚪</span>
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>

        {/* Menu Mobile Dropdown */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            menuAberto ? "max-h-80 border-t border-purple-500/20" : "max-h-0"
          }`}
        >
          <div className="container mx-auto px-4 py-4 space-y-3">
            {/* Info do usuário */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-purple-300/80 text-sm">Logado como</p>
              <p className="text-white font-semibold text-lg">
                {usuario.nome} ✨
              </p>
            </div>

            {/* Botão comprar minutos */}
            {usuario.minutos_disponiveis === 0 && (
              <Link
                href="/comprar-minutos"
                onClick={() => setMenuAberto(false)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl shadow-lg"
              >
                <span>💎</span> Comprar Minutos
              </Link>
            )}

            {/* Botão Admin */}
            {usuario.tipo === "admin" && (
              <Link
                href="/admin"
                onClick={() => setMenuAberto(false)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl"
              >
                <span>⚡</span> Painel Admin
              </Link>
            )}

            {/* Botão Sair */}
            <button
              onClick={() => {
                setMenuAberto(false);
                handleSair();
              }}
              className="flex items-center justify-center gap-2 w-full py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
            >
              <span>🚪</span> Sair da conta
            </button>
          </div>
        </div>
      </header>

      {/* Overlay quando menu está aberto */}
      {menuAberto && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}
    </>
  );
}

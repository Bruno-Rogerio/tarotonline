"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  function formatarData(value: string) {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4)
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(
      4,
      8
    )}`;
  }

  async function handleValidar(e: React.FormEvent) {
    e.preventDefault();

    if (dataNascimento.length !== 10) {
      setErro("Data de nascimento inválida");
      return;
    }

    // Redirecionar direto pro WhatsApp com os dados
    const mensagem = `Olá! Preciso redefinir minha senha.%0AEmail: ${email}%0AData de Nascimento: ${dataNascimento}`;
    window.open(`https://wa.me/5511963027847?text=${mensagem}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🔮 Recuperar Senha
          </h1>
          <p className="text-purple-200">
            Informe seus dados para recuperar o acesso
          </p>
        </div>

        <form onSubmit={handleValidar} className="space-y-4">
          {erro && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Data de Nascimento
            </label>
            <input
              type="text"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(formatarData(e.target.value))}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              required
            />
          </div>

          <div className="bg-purple-500/20 border border-purple-500/50 text-purple-200 px-4 py-3 rounded-lg text-sm">
            Ao clicar em continuar, você será direcionado para o WhatsApp para
            validarmos seus dados e redefinir sua senha.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-medium rounded-lg transition-colors"
          >
            💬 Continuar no WhatsApp
          </button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-white/60 hover:text-white text-sm"
            >
              ← Voltar para login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

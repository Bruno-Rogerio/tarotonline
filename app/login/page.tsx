"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });

      if (error) {
        console.error("Erro de login:", error);
        setErro(error.message || "Email ou senha inválidos");
        setLoading(false);
        return;
      }

      if (!data.user) {
        setErro("Erro ao fazer login");
        setLoading(false);
        return;
      }

      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .select("tipo")
        .eq("id", data.user.id)
        .single();

      if (userError) {
        console.error("Erro ao buscar usuário:", userError);
        setErro("Erro ao buscar dados do usuário");
        setLoading(false);
        return;
      }

      if (usuario?.tipo === "admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error("Erro geral:", err);
      setErro("Erro inesperado ao fazer login");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-60 h-60 md:w-80 md:h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-60 h-60 md:w-80 md:h-80 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Card de Login */}
      <div className="relative w-full max-w-md">
        {/* Glow effect atrás do card */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl blur-xl opacity-20" />

        <div className="relative bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            {/* Logo com animação */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-4 group"
            >
              <img
                src="/logo.png"
                alt="Viaa Tarot"
                className="w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
              />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent mb-2">
              Viaa Tarot
            </h1>
            <p className="text-purple-200/80 text-sm md:text-base">
              Entre na sua conta
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Erro */}
            {erro && (
              <div className="flex items-center gap-3 bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm">
                <span className="text-lg">⚠️</span>
                <span>{erro}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400">
                  ✉️
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">
                Senha
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400">
                  🔒
                </div>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {mostrarSenha ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Esqueceu a senha */}
            <div className="text-right">
              <Link
                href="/recuperar-senha"
                className="text-purple-300/80 hover:text-purple-200 text-sm transition-colors"
              >
                Esqueceu a senha?
              </Link>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-purple-800 disabled:to-pink-800 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] disabled:hover:scale-100 overflow-hidden group"
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="animate-spin">🔮</span>
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Entrar</span>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Divisor */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <span className="text-white/40 text-sm">ou</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          {/* Link para cadastro */}
          <div className="text-center">
            <p className="text-white/60 text-sm mb-4">Não tem uma conta?</p>
            <Link
              href="/cadastro"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all border border-white/20 hover:border-white/30"
            >
              <span>📝</span>
              <span>Criar conta gratuita</span>
            </Link>
          </div>

          {/* Voltar para home */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
            >
              <span>←</span>
              <span>Voltar para home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CadastroPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  function formatarTelefone(value: string) {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return telefone;
  }

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

  function validarIdade(data: string) {
    const [dia, mes, ano] = data.split("/").map(Number);
    const nascimento = new Date(ano, mes - 1, dia);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade >= 18;
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");

    if (nome.length < 3) {
      setErro("Nome deve ter pelo menos 3 caracteres");
      setLoading(false);
      return;
    }

    if (dataNascimento.length !== 10) {
      setErro("Data de nascimento inválida");
      setLoading(false);
      return;
    }

    if (!validarIdade(dataNascimento)) {
      setErro("Você precisa ter pelo menos 18 anos");
      setLoading(false);
      return;
    }

    if (senha.length < 6) {
      setErro("Senha deve ter pelo menos 6 caracteres");
      setLoading(false);
      return;
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem");
      setLoading(false);
      return;
    }

    const [dia, mes, ano] = dataNascimento.split("/");
    const dataISO = `${ano}-${mes}-${dia}`;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: senha,
    });

    if (authError) {
      setErro(
        authError.message === "User already registered"
          ? "Este email já está cadastrado"
          : "Erro ao criar conta"
      );
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setErro("Erro ao criar conta");
      setLoading(false);
      return;
    }

    const { error: dbError } = await supabase.from("usuarios").insert({
      id: authData.user.id,
      nome,
      telefone: telefone.replace(/\D/g, ""),
      data_nascimento: dataISO,
      tipo: "cliente",
      minutos_disponiveis: 0,
    });

    if (dbError) {
      setErro("Erro ao salvar dados do usuário");
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 -left-20 w-60 h-60 md:w-80 md:h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 -right-20 w-60 h-60 md:w-80 md:h-80 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Card de Cadastro */}
      <div className="relative w-full max-w-md my-8">
        {/* Glow effect atrás do card */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl blur-xl opacity-20" />

        <div className="relative bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            {/* Logo com animação */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-3 group"
            >
              <span className="text-4xl md:text-5xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                🔮
              </span>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent mb-2">
              Viaa Tarot
            </h1>
            <p className="text-purple-200/80 text-sm md:text-base">
              Crie sua conta gratuita
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleCadastro} className="space-y-4">
            {/* Erro */}
            {erro && (
              <div className="flex items-center gap-3 bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm">
                <span className="text-lg">⚠️</span>
                <span>{erro}</span>
              </div>
            )}

            {/* Nome */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">
                Nome Completo
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400">
                  👤
                </div>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Seu nome completo"
                  required
                />
              </div>
            </div>

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
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            {/* Grid 2 colunas para Telefone e Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Telefone */}
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">
                  Telefone
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400">
                    📱
                  </div>
                  <input
                    type="tel"
                    value={telefone}
                    onChange={(e) =>
                      setTelefone(formatarTelefone(e.target.value))
                    }
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
              </div>

              {/* Data de Nascimento */}
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">
                  Nascimento
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400">
                    🎂
                  </div>
                  <input
                    type="text"
                    value={dataNascimento}
                    onChange={(e) =>
                      setDataNascimento(formatarData(e.target.value))
                    }
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Aviso idade */}
            <p className="text-white/40 text-xs flex items-center gap-1.5 -mt-2">
              <span>ℹ️</span>
              <span>Você precisa ter pelo menos 18 anos</span>
            </p>

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
                  className="w-full pl-12 pr-12 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Mínimo 6 caracteres"
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

            {/* Confirmar Senha */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">
                Confirmar Senha
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400">
                  🔐
                </div>
                <input
                  type={mostrarConfirmarSenha ? "text" : "password"}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Digite a senha novamente"
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setMostrarConfirmarSenha(!mostrarConfirmarSenha)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {mostrarConfirmarSenha ? "🙈" : "👁️"}
                </button>
              </div>
              {/* Indicador de senhas iguais */}
              {confirmarSenha && (
                <p
                  className={`text-xs mt-1.5 flex items-center gap-1.5 ${
                    senha === confirmarSenha ? "text-green-400" : "text-red-400"
                  }`}
                >
                  <span>{senha === confirmarSenha ? "✓" : "✕"}</span>
                  <span>
                    {senha === confirmarSenha
                      ? "Senhas coincidem"
                      : "Senhas não coincidem"}
                  </span>
                </p>
              )}
            </div>

            {/* Botão Criar conta */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-purple-800 disabled:to-pink-800 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] disabled:hover:scale-100 overflow-hidden group mt-2"
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="animate-spin">🔮</span>
                    <span>Criando conta...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Criar minha conta</span>
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

          {/* Link para login */}
          <div className="text-center">
            <p className="text-white/60 text-sm mb-4">Já tem uma conta?</p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all border border-white/20 hover:border-white/30"
            >
              <span>🔐</span>
              <span>Fazer login</span>
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

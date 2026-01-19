"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AvaliarPage() {
  const [tarologo, setTarologo] = useState<any>(null);
  const [estrelas, setEstrelas] = useState(5);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [usuarioNome, setUsuarioNome] = useState("");
  const [jaAvaliou, setJaAvaliou] = useState(false);
  const router = useRouter();
  const params = useParams();
  const sessaoId = params.sessaoId as string;

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Buscar nome do usuário
    const { data: userData } = await supabase
      .from("usuarios")
      .select("nome")
      .eq("id", user.id)
      .single();

    if (userData) {
      setUsuarioNome(userData.nome);
    }

    // Buscar sessão
    const { data: sessao } = await supabase
      .from("sessoes")
      .select("*, tarologo:tarologos(id, nome, avatar_url, especialidade)")
      .eq("id", sessaoId)
      .single();

    if (!sessao || sessao.usuario_id !== user.id) {
      alert("Sessão não encontrada!");
      router.push("/");
      return;
    }

    setTarologo(sessao.tarologo);

    // Verificar se já avaliou
    const { data: avaliacaoExistente } = await supabase
      .from("avaliacoes")
      .select("id")
      .eq("sessao_id", sessaoId)
      .single();

    if (avaliacaoExistente) {
      setJaAvaliou(true);
    }

    setLoading(false);
  }

  async function enviarAvaliacao() {
    if (estrelas < 1 || estrelas > 5) {
      alert("Selecione de 1 a 5 estrelas");
      return;
    }

    setEnviando(true);

    // Inserir avaliação
    const { error } = await supabase.from("avaliacoes").insert({
      sessao_id: sessaoId,
      tarologo_id: tarologo.id,
      usuario_nome: usuarioNome,
      estrelas,
      comentario: comentario.trim() || null,
    });

    if (error) {
      console.error("Erro ao enviar avaliação:", error);
      alert("Erro ao enviar avaliação");
      setEnviando(false);
      return;
    }

    // Atualizar média do tarólogo
    const { data: todasAvaliacoes } = await supabase
      .from("avaliacoes")
      .select("estrelas")
      .eq("tarologo_id", tarologo.id);

    if (todasAvaliacoes && todasAvaliacoes.length > 0) {
      const media =
        todasAvaliacoes.reduce((acc, a) => acc + a.estrelas, 0) /
        todasAvaliacoes.length;

      await supabase
        .from("tarologos")
        .update({ avaliacao_media: Math.round(media * 10) / 10 })
        .eq("id", tarologo.id);
    }

    alert("✨ Obrigado pela sua avaliação!");
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  if (jaAvaliou) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-white mb-4">
            Você já avaliou esta consulta!
          </h1>
          <p className="text-purple-200 mb-6">Obrigado pelo seu feedback.</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">⭐</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Avalie sua consulta
          </h1>
          <p className="text-purple-200">
            Como foi sua experiência com{" "}
            <span className="font-bold text-purple-300">{tarologo?.nome}</span>?
          </p>
        </div>

        {/* Card do Tarólogo */}
        <div className="bg-white/5 rounded-xl p-4 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
            {tarologo?.avatar_url ? (
              <img
                src={tarologo.avatar_url}
                alt={tarologo.nome}
                className="w-full h-full object-cover"
              />
            ) : (
              tarologo?.nome?.charAt(0)
            )}
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">{tarologo?.nome}</h3>
            <p className="text-purple-300 text-sm">
              {tarologo?.especialidade || "Tarot Geral"}
            </p>
          </div>
        </div>

        {/* Estrelas */}
        <div className="mb-6">
          <label className="block text-white font-medium mb-3 text-center">
            Quantas estrelas você dá?
          </label>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setEstrelas(n)}
                className={`text-4xl transition-all hover:scale-110 ${
                  n <= estrelas ? "text-yellow-400" : "text-white/30"
                }`}
              >
                ★
              </button>
            ))}
          </div>
          <p className="text-center text-purple-300 mt-2 text-sm">
            {estrelas === 1 && "😞 Muito ruim"}
            {estrelas === 2 && "😕 Ruim"}
            {estrelas === 3 && "😐 Regular"}
            {estrelas === 4 && "😊 Bom"}
            {estrelas === 5 && "🤩 Excelente!"}
          </p>
        </div>

        {/* Comentário */}
        <div className="mb-6">
          <label className="block text-white font-medium mb-2">
            Deixe um comentário (opcional)
          </label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Conte como foi sua experiência..."
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-500 resize-none"
            rows={4}
            maxLength={500}
          />
          <p className="text-right text-white/50 text-xs mt-1">
            {comentario.length}/500
          </p>
        </div>

        {/* Botões */}
        <div className="space-y-3">
          <button
            onClick={enviarAvaliacao}
            disabled={enviando}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? "Enviando..." : "✨ Enviar Avaliação"}
          </button>
          <Link
            href="/"
            className="block w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors text-center"
          >
            Pular avaliação
          </Link>
        </div>
      </div>
    </div>
  );
}

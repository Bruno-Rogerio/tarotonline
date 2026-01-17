"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

function SolicitarConsultaContent() {
  const [tarologo, setTarologo] = useState<any>(null);
  const [usuario, setUsuario] = useState<any>(null);
  const [minutosEscolhidos, setMinutosEscolhidos] = useState(20); // NOVO
  const [loading, setLoading] = useState(true);
  const [aguardando, setAguardando] = useState(false);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tarologoId = searchParams.get("tarologo");

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (sessaoId) {
      const channel = supabase
        .channel(`sessao-${sessaoId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "sessoes",
            filter: `id=eq.${sessaoId}`,
          },
          (payload) => {
            if (payload.new.status === "em_andamento") {
              router.push(`/chat/${sessaoId}`);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [sessaoId, router]);

  async function carregarDados() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: userData } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!userData || userData.minutos_disponiveis < 20) {
      alert("Você precisa de pelo menos 20 minutos para iniciar uma consulta!");
      router.push("/comprar-minutos");
      return;
    }

    const { data: tarologoData } = await supabase
      .from("tarologos")
      .select("*")
      .eq("id", tarologoId)
      .single();

    if (!tarologoData) {
      alert("Tarólogo não encontrado!");
      router.push("/");
      return;
    }

    setUsuario(userData);
    setTarologo(tarologoData);

    // Definir minutos escolhidos como o menor entre disponível e 60
    setMinutosEscolhidos(Math.min(userData.minutos_disponiveis, 60));

    setLoading(false);
  }

  async function handleSolicitar() {
    if (minutosEscolhidos < 20) {
      alert("Mínimo de 20 minutos por consulta!");
      return;
    }

    if (minutosEscolhidos > usuario.minutos_disponiveis) {
      alert("Você não tem minutos suficientes!");
      return;
    }

    setAguardando(true);

    // Criar sessão aguardando aprovação
    const { data: sessao, error } = await supabase
      .from("sessoes")
      .insert({
        usuario_id: usuario.id,
        tarologo_id: tarologo.id,
        minutos_comprados: minutosEscolhidos, // USAR OS MINUTOS ESCOLHIDOS
        status: "aguardando",
      })
      .select()
      .single();

    if (error) {
      alert("Erro ao criar sessão: " + error.message);
      setAguardando(false);
      return;
    }

    setSessaoId(sessao.id);
  }

  async function handleCancelar() {
    if (!sessaoId) {
      router.push("/");
      return;
    }

    await supabase.from("sessoes").delete().eq("id", sessaoId);

    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  if (aguardando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 max-w-md w-full text-center">
          <div className="animate-spin text-6xl mb-6">🔮</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Aguardando Tarólogo...
          </h2>
          <p className="text-purple-200 mb-2">
            Solicitação enviada para{" "}
            <span className="font-bold">{tarologo.nome}</span>
          </p>
          <p className="text-purple-200 mb-6">
            Você será redirecionado assim que um tarólogo aceitar sua consulta
          </p>

          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <div className="flex justify-between text-white/80 text-sm mb-2">
              <span>Minutos desta consulta:</span>
              <span className="font-bold text-white">
                {minutosEscolhidos} min
              </span>
            </div>
            <div className="flex justify-between text-white/80 text-sm">
              <span>Seus minutos totais:</span>
              <span className="font-bold text-white">
                {usuario.minutos_disponiveis} min
              </span>
            </div>
          </div>

          <button
            onClick={handleCancelar}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
          >
            Cancelar solicitação
          </button>
        </div>
      </div>
    );
  }

  // Opções de minutos disponíveis (múltiplos de 10, mínimo 20)
  const opcoesMinutos = [];
  for (let i = 20; i <= Math.min(usuario.minutos_disponiveis, 60); i += 10) {
    opcoesMinutos.push(i);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 p-4">
      <div className="container mx-auto max-w-2xl py-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">
            Solicitar Consulta
          </h1>

          {/* Card do Tarólogo */}
          <div className="bg-white/5 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 rounded-full border-4 border-purple-400 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-2xl font-bold">
                {tarologo.nome.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {tarologo.nome}
                </h2>
                <p className="text-purple-200">{tarologo.especialidade}</p>
              </div>
            </div>
            <p className="text-white/70 text-sm">{tarologo.biografia}</p>
          </div>

          {/* Seletor de Minutos */}
          <div className="bg-white/5 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4">
              Quantos minutos deseja usar?
            </h3>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {opcoesMinutos.map((min) => (
                <button
                  key={min}
                  onClick={() => setMinutosEscolhidos(min)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    minutosEscolhidos === min
                      ? "bg-purple-600 border-purple-400 scale-105"
                      : "bg-white/5 border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="text-2xl font-bold text-white">{min}</div>
                  <div className="text-xs text-white/80">minutos</div>
                </button>
              ))}
            </div>

            <div className="bg-white/10 rounded-lg p-3 text-sm text-white/70">
              💡 Você tem {usuario.minutos_disponiveis} minutos disponíveis.
              Pode usar o resto em outra consulta!
            </div>
          </div>

          {/* Informações da consulta */}
          <div className="bg-white/5 rounded-xl p-6 mb-6 space-y-3">
            <h3 className="text-lg font-bold text-white mb-4">Resumo</h3>

            <div className="flex justify-between text-white/80">
              <span>Minutos desta consulta:</span>
              <span className="font-bold text-white">
                {minutosEscolhidos} min
              </span>
            </div>

            <div className="flex justify-between text-white/80">
              <span>Seus minutos totais:</span>
              <span className="font-bold text-white">
                {usuario.minutos_disponiveis} min
              </span>
            </div>

            <div className="flex justify-between text-white/80">
              <span>Restará após esta consulta:</span>
              <span className="font-bold text-green-400">
                {usuario.minutos_disponiveis - minutosEscolhidos} min
              </span>
            </div>

            <div className="border-t border-white/20 pt-3 mt-3">
              <p className="text-white/60 text-sm">
                ⏱️ O cronômetro começará quando o tarólogo aceitar
              </p>
              <p className="text-white/60 text-sm mt-2">
                ✨ Você pode receber +5 minutos de bônus durante a consulta
              </p>
            </div>
          </div>

          {/* Botões */}
          <div className="space-y-3">
            <button
              onClick={handleSolicitar}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg rounded-xl transition-colors"
            >
              🔮 Solicitar Consulta ({minutosEscolhidos} min)
            </button>

            <Link
              href="/"
              className="block w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg text-center transition-colors"
            >
              ← Voltar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SolicitarConsultaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 flex items-center justify-center">
          <div className="text-white text-xl">Carregando...</div>
        </div>
      }
    >
      <SolicitarConsultaContent />
    </Suspense>
  );
}

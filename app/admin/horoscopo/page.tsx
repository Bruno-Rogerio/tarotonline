"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Horoscopo = {
  id?: string;
  signo: string;
  texto: string;
  data: string;
};

const SIGNOS = [
  { nome: "Áries", simbolo: "♈", cor: "from-red-500 to-orange-500" },
  { nome: "Touro", simbolo: "♉", cor: "from-green-500 to-emerald-500" },
  { nome: "Gêmeos", simbolo: "♊", cor: "from-yellow-400 to-amber-500" },
  { nome: "Câncer", simbolo: "♋", cor: "from-gray-300 to-gray-400" },
  { nome: "Leão", simbolo: "♌", cor: "from-orange-400 to-yellow-500" },
  { nome: "Virgem", simbolo: "♍", cor: "from-amber-600 to-yellow-700" },
  { nome: "Libra", simbolo: "♎", cor: "from-pink-400 to-rose-500" },
  { nome: "Escorpião", simbolo: "♏", cor: "from-red-600 to-red-800" },
  { nome: "Sagitário", simbolo: "♐", cor: "from-purple-500 to-indigo-600" },
  { nome: "Capricórnio", simbolo: "♑", cor: "from-gray-600 to-gray-800" },
  { nome: "Aquário", simbolo: "♒", cor: "from-cyan-400 to-blue-500" },
  { nome: "Peixes", simbolo: "♓", cor: "from-indigo-400 to-purple-500" },
];

export default function AdminHoroscopoPage() {
  const [horoscopos, setHoroscopos] = useState<Record<string, string>>({});
  const [dataSelecionada, setDataSelecionada] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [signoExpandido, setSignoExpandido] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    verificarAdmin();
  }, []);

  useEffect(() => {
    if (!loading) {
      carregarHoroscopos();
    }
  }, [dataSelecionada]);

  async function verificarAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("tipo")
      .eq("id", user.id)
      .single();

    if (usuario?.tipo !== "admin") {
      alert("Acesso negado. Apenas admins podem acessar.");
      router.push("/");
      return;
    }

    await carregarHoroscopos();
    setLoading(false);
  }

  async function carregarHoroscopos() {
    const { data, error } = await supabase
      .from("horoscopos")
      .select("*")
      .eq("data", dataSelecionada);

    if (!error && data) {
      const map: Record<string, string> = {};
      data.forEach((h) => {
        map[h.signo] = h.texto;
      });
      setHoroscopos(map);
    } else {
      setHoroscopos({});
    }
  }

  function handleTextoChange(signo: string, texto: string) {
    setHoroscopos((prev) => ({
      ...prev,
      [signo]: texto,
    }));
  }

  async function salvarTodos() {
    setSalvando(true);

    try {
      // Para cada signo com texto, faz upsert
      for (const signo of SIGNOS) {
        const texto = horoscopos[signo.nome]?.trim() || "";

        if (texto) {
          // Verifica se já existe
          const { data: existente } = await supabase
            .from("horoscopos")
            .select("id")
            .eq("signo", signo.nome)
            .eq("data", dataSelecionada)
            .single();

          if (existente) {
            // Update
            await supabase
              .from("horoscopos")
              .update({ texto, updated_at: new Date().toISOString() })
              .eq("id", existente.id);
          } else {
            // Insert
            await supabase.from("horoscopos").insert({
              signo: signo.nome,
              texto,
              data: dataSelecionada,
            });
          }
        } else {
          // Se texto vazio, remove se existir
          await supabase
            .from("horoscopos")
            .delete()
            .eq("signo", signo.nome)
            .eq("data", dataSelecionada);
        }
      }

      alert("✅ Horóscopos salvos com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar horóscopos.");
    }

    setSalvando(false);
  }

  async function copiarDiaAnterior() {
    const dataAnterior = new Date(dataSelecionada);
    dataAnterior.setDate(dataAnterior.getDate() - 1);
    const dataAnteriorStr = dataAnterior.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("horoscopos")
      .select("signo, texto")
      .eq("data", dataAnteriorStr);

    if (!error && data && data.length > 0) {
      const map: Record<string, string> = {};
      data.forEach((h) => {
        map[h.signo] = h.texto;
      });
      setHoroscopos(map);
      alert(`✅ Copiados ${data.length} horóscopos do dia anterior!`);
    } else {
      alert("Não há horóscopos do dia anterior para copiar.");
    }
  }

  function limparTodos() {
    if (!confirm("Tem certeza que deseja limpar todos os textos?")) return;
    setHoroscopos({});
  }

  // Contagem de preenchidos
  const totalPreenchidos = SIGNOS.filter((s) =>
    horoscopos[s.nome]?.trim(),
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 group">
            <span className="text-2xl">←</span>
            <span className="text-lg font-bold text-white">
              Voltar ao Admin
            </span>
          </Link>
          <h1 className="text-xl font-bold text-white hidden sm:block">
            Horóscopo do Dia
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Controles superiores */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Seletor de data */}
            <div className="flex items-center gap-3">
              <label className="text-white font-medium">Data:</label>
              <input
                type="date"
                value={dataSelecionada}
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500 [color-scheme:dark]"
              />
            </div>

            {/* Contador */}
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  totalPreenchidos === 12
                    ? "bg-green-500/20 text-green-300 border border-green-500/30"
                    : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                }`}
              >
                {totalPreenchidos}/12 preenchidos
              </span>
            </div>
          </div>

          {/* Ações rápidas */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
            <button
              onClick={copiarDiaAnterior}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            >
              <span>📋</span>
              <span>Copiar do dia anterior</span>
            </button>
            <button
              onClick={limparTodos}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            >
              <span>🗑️</span>
              <span>Limpar todos</span>
            </button>
          </div>
        </div>

        {/* Grid de signos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {SIGNOS.map((signo) => {
            const texto = horoscopos[signo.nome] || "";
            const preenchido = texto.trim().length > 0;
            const expandido = signoExpandido === signo.nome;

            return (
              <div
                key={signo.nome}
                className={`bg-white/10 backdrop-blur-sm rounded-2xl border overflow-hidden transition-all ${
                  preenchido ? "border-green-500/30" : "border-white/20"
                }`}
              >
                {/* Header do card */}
                <button
                  onClick={() =>
                    setSignoExpandido(expandido ? null : signo.nome)
                  }
                  className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-all"
                >
                  {/* Símbolo */}
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${signo.cor} rounded-full flex items-center justify-center shadow-lg flex-shrink-0`}
                  >
                    <span className="text-xl text-white">{signo.simbolo}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left">
                    <h3 className="text-white font-bold">{signo.nome}</h3>
                    <p className="text-purple-300/50 text-xs">
                      {preenchido
                        ? `${texto.length} caracteres`
                        : "Não preenchido"}
                    </p>
                  </div>

                  {/* Indicador */}
                  <div className="flex items-center gap-2">
                    {preenchido && (
                      <span className="text-green-400 text-lg">✓</span>
                    )}
                    <svg
                      className={`w-5 h-5 text-white/50 transition-transform ${
                        expandido ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Área de texto (expandível) */}
                {expandido && (
                  <div className="p-4 pt-0">
                    <textarea
                      value={texto}
                      onChange={(e) =>
                        handleTextoChange(signo.nome, e.target.value)
                      }
                      placeholder={`Digite o horóscopo de ${signo.nome} para hoje...`}
                      rows={5}
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 resize-none text-sm"
                    />
                    <p className="text-purple-300/40 text-xs mt-2 text-right">
                      {texto.length} caracteres
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Botão salvar fixo */}
        <div className="sticky bottom-4 flex justify-center">
          <button
            onClick={salvarTodos}
            disabled={salvando}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold text-lg rounded-2xl transition-all shadow-xl shadow-purple-500/30 flex items-center gap-3"
          >
            {salvando ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Salvar Todos os Horóscopos</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Mensagem = {
  id: string;
  sessao_id: string;
  remetente_id: string;
  mensagem: string;
  created_at: string;
};

type CartaMesa = {
  id: string;
  ordem: number;
  nome_carta: string;
};

type Sessao = {
  id: string;
  usuario_id: string;
  admin_id: string;
  minutos_comprados: number;
  minutos_usados: number;
  bonus_usado: boolean;
  status: string;
  inicio: string;
  usuario: { nome: string };
  tarologo: { nome: string };
};

const CARTAS_TAROT = [
  "O Louco",
  "O Mago",
  "A Sacerdotisa",
  "A Imperatriz",
  "O Imperador",
  "O Hierofante",
  "Os Enamorados",
  "O Carro",
  "A Força",
  "O Eremita",
  "A Roda da Fortuna",
  "A Justiça",
  "O Enforcado",
  "A Morte",
  "A Temperança",
  "O Diabo",
  "A Torre",
  "A Estrela",
  "A Lua",
  "O Sol",
  "O Julgamento",
  "O Mundo",
  "Ás de Copas",
  "Dois de Copas",
  "Três de Copas",
  "Quatro de Copas",
  "Cinco de Copas",
  "Seis de Copas",
  "Sete de Copas",
  "Oito de Copas",
  "Nove de Copas",
  "Dez de Copas",
  "Valete de Copas",
  "Cavaleiro de Copas",
  "Rainha de Copas",
  "Rei de Copas",
  "Ás de Paus",
  "Dois de Paus",
  "Três de Paus",
  "Quatro de Paus",
  "Cinco de Paus",
  "Seis de Paus",
  "Sete de Paus",
  "Oito de Paus",
  "Nove de Paus",
  "Dez de Paus",
  "Valete de Paus",
  "Cavaleiro de Paus",
  "Rainha de Paus",
  "Rei de Paus",
  "Ás de Espadas",
  "Dois de Espadas",
  "Três de Espadas",
  "Quatro de Espadas",
  "Cinco de Espadas",
  "Seis de Espadas",
  "Sete de Espadas",
  "Oito de Espadas",
  "Nove de Espadas",
  "Dez de Espadas",
  "Valete de Espadas",
  "Cavaleiro de Espadas",
  "Rainha de Espadas",
  "Rei de Espadas",
  "Ás de Ouros",
  "Dois de Ouros",
  "Três de Ouros",
  "Quatro de Ouros",
  "Cinco de Ouros",
  "Seis de Ouros",
  "Sete de Ouros",
  "Oito de Ouros",
  "Nove de Ouros",
  "Dez de Ouros",
  "Valete de Ouros",
  "Cavaleiro de Ouros",
  "Rainha de Ouros",
  "Rei de Ouros",
];

export default function ChatPage() {
  const params = useParams();
  const sessaoId = params.sessaoId as string;
  const router = useRouter();

  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [usuarioId, setUsuarioId] = useState("");
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [cartas, setCartas] = useState<CartaMesa[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [novaCarta, setNovaCarta] = useState("");
  const [buscarCarta, setBuscarCarta] = useState("");
  const [tempoRestante, setTempoRestante] = useState(0);
  const [chatAtivo, setChatAtivo] = useState(true);
  const [loading, setLoading] = useState(true);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cartasFiltradas = buscarCarta
    ? CARTAS_TAROT.filter((c) =>
        c.toLowerCase().includes(buscarCarta.toLowerCase())
      )
    : CARTAS_TAROT;

  useEffect(() => {
    carregarDados();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (sessao?.status === "em_andamento") iniciarTimer();
  }, [sessao]);

  // Scroll automático quando mensagens mudam
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [mensagens]);

  async function carregarDados() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setUsuarioId(user.id);

    const { data: userData } = await supabase
      .from("usuarios")
      .select("nome")
      .eq("id", user.id)
      .single();

    if (userData) setNomeUsuario(userData.nome);

    const { data: sessaoData } = await supabase
      .from("sessoes")
      .select(
        `*, usuario:usuarios!sessoes_usuario_id_fkey(nome), tarologo:tarologos(nome)`
      )
      .eq("id", sessaoId)
      .single();

    if (
      !sessaoData ||
      (sessaoData.usuario_id !== user.id && sessaoData.admin_id !== user.id)
    ) {
      alert("Sessão não encontrada!");
      router.push("/");
      return;
    }

    setIsAdmin(sessaoData.admin_id === user.id);
    setSessao(sessaoData as any);

    if (sessaoData.status === "finalizada") {
      setChatAtivo(false);
      setTimeout(() => router.push("/"), 3000);
    }

    await carregarMensagens();
    await carregarCartas();

    // REALTIME - Mensagens
    const canalMensagens = supabase
      .channel(`msg-${sessaoId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens",
          filter: `sessao_id=eq.${sessaoId}`,
        },
        (payload) => {
          setMensagens((prev) => [...prev, payload.new as Mensagem]);
        }
      )
      .subscribe();

    // REALTIME - Cartas
    const canalCartas = supabase
      .channel(`cartas-${sessaoId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cartas_mesa",
          filter: `sessao_id=eq.${sessaoId}`,
        },
        (payload) => {
          setCartas((prev) => [...prev, payload.new as CartaMesa]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "cartas_mesa",
          filter: `sessao_id=eq.${sessaoId}`,
        },
        (payload) => {
          setCartas((prev) =>
            prev.filter((c) => c.id !== (payload.old as any).id)
          );
        }
      )
      .subscribe();

    // REALTIME - Sessão
    const canalSessao = supabase
      .channel(`sess-${sessaoId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessoes",
          filter: `id=eq.${sessaoId}`,
        },
        (payload) => {
          const nova = payload.new as any;
          setSessao((prev) => (prev ? { ...prev, ...nova } : null));
          if (nova.status === "finalizada") {
            setChatAtivo(false);
            if (timerRef.current) clearInterval(timerRef.current);
            alert("⏰ Tempo esgotado!");
            setTimeout(() => router.push("/"), 3000);
          }
        }
      )
      .subscribe();

    setLoading(false);

    return () => {
      supabase.removeChannel(canalMensagens);
      supabase.removeChannel(canalCartas);
      supabase.removeChannel(canalSessao);
    };
  }

  function iniciarTimer() {
    if (!sessao) return;
    const inicio = new Date(sessao.inicio).getTime();
    const totalSeg = sessao.minutos_comprados * 60;

    const atualizar = () => {
      const decorrido = Math.floor((Date.now() - inicio) / 1000);
      const restante = totalSeg - decorrido;
      setTempoRestante(restante / 60);
      if (restante <= 0) finalizarSessao();
    };

    atualizar();
    timerRef.current = setInterval(atualizar, 1000);
  }

  async function carregarMensagens() {
    const { data } = await supabase
      .from("mensagens")
      .select("*")
      .eq("sessao_id", sessaoId)
      .order("created_at");
    if (data) setMensagens(data);
  }

  async function carregarCartas() {
    const { data } = await supabase
      .from("cartas_mesa")
      .select("*")
      .eq("sessao_id", sessaoId)
      .order("ordem");
    if (data) setCartas(data);
  }

  async function finalizarSessao() {
    if (timerRef.current) clearInterval(timerRef.current);
    setChatAtivo(false);
    await supabase
      .from("sessoes")
      .update({ status: "finalizada", fim: new Date().toISOString() })
      .eq("id", sessaoId);
    if (sessao) {
      const { data: u } = await supabase
        .from("usuarios")
        .select("minutos_disponiveis")
        .eq("id", sessao.usuario_id)
        .single();
      if (u) {
        await supabase
          .from("usuarios")
          .update({
            minutos_disponiveis: Math.max(
              0,
              u.minutos_disponiveis - sessao.minutos_comprados
            ),
          })
          .eq("id", sessao.usuario_id);
      }
    }
    alert("⏰ Tempo esgotado!");
    setTimeout(() => router.push("/"), 3000);
  }

  async function enviarMensagem(e: React.FormEvent) {
    e.preventDefault();
    if (!novaMensagem.trim() || !chatAtivo) return;
    await supabase.from("mensagens").insert({
      sessao_id: sessaoId,
      remetente_id: usuarioId,
      mensagem: novaMensagem.trim(),
    });
    setNovaMensagem("");
  }

  async function adicionarCarta(e: React.FormEvent) {
    e.preventDefault();
    if (!novaCarta || !isAdmin || cartas.length >= 10) return;
    await supabase.from("cartas_mesa").insert({
      sessao_id: sessaoId,
      ordem: cartas.length + 1,
      nome_carta: novaCarta,
    });
    setNovaCarta("");
    setBuscarCarta("");
  }

  async function limparCartas() {
    if (!isAdmin || !confirm("Limpar todas as cartas?")) return;
    await supabase.from("cartas_mesa").delete().eq("sessao_id", sessaoId);
  }

  async function darBonus() {
    if (!isAdmin || !sessao || sessao.bonus_usado || !confirm("Dar +5min?"))
      return;
    await supabase
      .from("sessoes")
      .update({
        minutos_comprados: sessao.minutos_comprados + 5,
        bonus_usado: true,
      })
      .eq("id", sessaoId);
    await supabase.from("mensagens").insert({
      sessao_id: sessaoId,
      remetente_id: usuarioId,
      mensagem: "🎁 Você ganhou +5 minutos de bônus!",
    });
  }

  function formatarTempo(min: number) {
    const m = Math.floor(min);
    const s = Math.floor((min - m) * 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function getNome(id: string) {
    if (id === usuarioId) return nomeUsuario;
    return isAdmin
      ? sessao?.usuario.nome || "Cliente"
      : sessao?.tarologo.nome || "Tarólogo";
  }

  function getInicialCarta(nome: string) {
    return nome.charAt(0).toUpperCase();
  }

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4 shrink-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">
              🔮 Consulta com{" "}
              {isAdmin ? sessao?.usuario.nome : sessao?.tarologo.nome}
            </h1>
            <p className="text-purple-200 text-sm">
              {isAdmin ? "Você está atendendo" : "Seu tarólogo"}
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div
              className={`px-6 py-3 rounded-full font-bold text-2xl text-white ${
                tempoRestante <= 5
                  ? "bg-red-600 animate-pulse"
                  : tempoRestante <= 10
                  ? "bg-yellow-600"
                  : "bg-green-600"
              }`}
            >
              ⏱️ {formatarTempo(tempoRestante)}
            </div>
            {isAdmin && !sessao?.bonus_usado && chatAtivo && (
              <button
                onClick={darBonus}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                🎁 Dar +5min
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo - LAYOUT 50/50 CENTRALIZADO */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto p-4 flex gap-4">
          {/* Mesa - 50% */}
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/20 flex justify-between items-center shrink-0">
              <h2 className="text-white font-bold text-lg">🎴 Mesa de Tarot</h2>
              {isAdmin && cartas.length > 0 && chatAtivo && (
                <button
                  onClick={limparCartas}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Cartas com scroll - GRID FIXO 3 COLUNAS */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-3 gap-3 auto-rows-min">
                {cartas.map((carta) => (
                  <div
                    key={carta.id}
                    className="w-full"
                    style={{ aspectRatio: "2/3", maxHeight: "280px" }}
                  >
                    <div className="w-full h-full bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-xl border-4 border-yellow-900 shadow-2xl p-2 flex flex-col relative">
                      {/* Inicial */}
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-white text-5xl font-bold drop-shadow-2xl">
                          {getInicialCarta(carta.nome_carta)}
                        </div>
                      </div>
                      {/* Nome */}
                      <div className="bg-black/80 p-1.5 rounded mt-1">
                        <p className="text-white font-bold text-center text-[11px] leading-tight">
                          {carta.nome_carta}
                        </p>
                      </div>
                      {/* Número */}
                      <div className="absolute top-2 left-2 bg-black/80 px-1.5 py-0.5 rounded text-yellow-300 text-[9px] font-bold">
                        #{carta.ordem}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {cartas.length === 0 && (
                <div className="h-full flex items-center justify-center text-white/40 text-sm">
                  Nenhuma carta na mesa
                </div>
              )}
            </div>

            {/* Adicionar carta */}
            {isAdmin && cartas.length < 10 && chatAtivo && (
              <div className="p-4 border-t border-white/20 shrink-0">
                <input
                  type="text"
                  value={buscarCarta}
                  onChange={(e) => setBuscarCarta(e.target.value)}
                  placeholder="Buscar carta..."
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 mb-2 text-sm"
                />
                {buscarCarta && cartasFiltradas.length > 0 && (
                  <div className="max-h-32 overflow-y-auto bg-slate-900/90 rounded-lg mb-2">
                    {cartasFiltradas.slice(0, 6).map((c, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setNovaCarta(c);
                          setBuscarCarta("");
                        }}
                        className="w-full text-left px-3 py-2 text-white hover:bg-white/10 text-sm border-b border-white/5 last:border-b-0"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                {novaCarta && (
                  <div className="mb-2 p-2 bg-white/10 rounded text-white text-sm">
                    {novaCarta}
                  </div>
                )}
                <button
                  onClick={adicionarCarta}
                  disabled={!novaCarta}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm"
                >
                  + Adicionar Carta
                </button>
              </div>
            )}
          </div>

          {/* Chat - 50% */}
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex flex-col overflow-hidden">
            {/* Mensagens */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4"
            >
              <div className="space-y-3">
                {mensagens.map((msg) => {
                  const isMinha = msg.remetente_id === usuarioId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isMinha ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-sm px-4 py-2 rounded-lg ${
                          isMinha
                            ? "bg-purple-600 text-white"
                            : "bg-white/20 text-white"
                        }`}
                      >
                        {!isMinha && (
                          <p className="text-xs font-semibold mb-1 text-purple-300">
                            {getNome(msg.remetente_id)}
                          </p>
                        )}
                        <p className="break-words">{msg.mensagem}</p>
                        <p className="text-xs opacity-60 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString(
                            "pt-BR",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Input */}
            <form
              onSubmit={enviarMensagem}
              className="p-4 border-t border-white/20 shrink-0"
            >
              {chatAtivo ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    autoFocus
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
                  >
                    Enviar
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-red-300 font-medium">
                    ⏰ Consulta finalizada
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

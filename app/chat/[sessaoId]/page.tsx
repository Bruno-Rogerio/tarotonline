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

    console.log("🔍 Verificando acesso à sessão:", {
      sessaoData,
      userId: user.id,
      isUsuario: sessaoData?.usuario_id === user.id,
      isAdmin: sessaoData?.admin_id === user.id,
    });

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
          console.log("🗑️ DELETE recebido:", payload);
          setMensagens((prev) => [...prev, payload.new as Mensagem]);
        }
      )
      .subscribe();

    // REALTIME - Cartas (com debug completo)
    console.log("🔧 Criando canal de cartas para sessão:", sessaoId);

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
          console.log("✅ INSERT recebido:", payload);
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
          console.log("🗑️ DELETE recebido:", payload);
          setCartas((prev) =>
            prev.filter((c) => c.id !== (payload.old as any).id)
          );
        }
      )
      .subscribe((status, err) => {
        console.log("📡 Status do canal cartas:", status, err);
        if (status === "SUBSCRIBED") {
          console.log("✅ Canal de cartas CONECTADO!");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Erro no canal de cartas:", err);
        }
      });

    console.log("🔧 Canal criado:", canalCartas);

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
          console.log("🔄 UPDATE sessão recebido:", payload);
          const nova = payload.new as any;
          setSessao((prev) => (prev ? { ...prev, ...nova } : null));
          if (nova.status === "finalizada") {
            console.log("⏰ Sessão finalizada detectada!");
            setChatAtivo(false);
            if (timerRef.current) clearInterval(timerRef.current);
            alert("⏰ Tempo esgotado!");
            setTimeout(() => router.push("/"), 3000);
          }
        }
      )
      .subscribe((status, err) => {
        console.log("📡 Status do canal sessão:", status, err);
        if (status === "SUBSCRIBED") {
          console.log("✅ Canal de sessão CONECTADO!");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Erro no canal de sessão:", err);
        }
      });
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
    console.log("🛑 Finalizando sessão...", sessaoId);
    if (timerRef.current) clearInterval(timerRef.current);
    setChatAtivo(false);

    const { error, data } = await supabase
      .from("sessoes")
      .update({ status: "finalizada", fim: new Date().toISOString() })
      .eq("id", sessaoId)
      .select(); // TUDO NA MESMA CADEIA

    console.log("🛑 Update executado:", { error, data });

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

    console.log("🧹 Limpando cartas uma por uma...");

    // Deleta cada carta individualmente para disparar evento DELETE
    for (const carta of cartas) {
      const { error } = await supabase
        .from("cartas_mesa")
        .delete()
        .eq("id", carta.id);

      if (error) {
        console.error("Erro ao deletar carta:", error);
      } else {
        console.log("🗑️ Carta deletada:", carta.id);
      }
    }

    console.log("✅ Todas as cartas foram deletadas!");
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
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(to bottom right, rgb(88, 28, 135), rgb(49, 46, 129), rgb(88, 28, 135))",
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          padding: "1rem",
          backgroundColor: "rgba(0,0,0,0.2)",
          backdropFilter: "blur(4px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: "bold",
                color: "white",
              }}
            >
              🔮 Consulta com{" "}
              {isAdmin ? sessao?.usuario.nome : sessao?.tarologo.nome}
            </h1>
            <p style={{ fontSize: "0.875rem", color: "rgb(216, 180, 254)" }}>
              {isAdmin ? "Você está atendendo" : "Seu tarólogo"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <div
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "9999px",
                fontWeight: "bold",
                fontSize: "1.5rem",
                color: "white",
                backgroundColor:
                  tempoRestante <= 5
                    ? "rgb(220, 38, 38)"
                    : tempoRestante <= 10
                    ? "rgb(202, 138, 4)"
                    : "rgb(22, 163, 74)",
                animation:
                  tempoRestante <= 5
                    ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                    : "none",
              }}
            >
              ⏱️ {formatarTempo(tempoRestante)}
            </div>
            {isAdmin && !sessao?.bonus_usado && chatAtivo && (
              <button
                onClick={darBonus}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "rgb(147, 51, 234)",
                  color: "white",
                  borderRadius: "0.5rem",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                🎁 Dar +5min
              </button>
            )}
            {!isAdmin && chatAtivo && (
              <button
                onClick={async () => {
                  if (
                    confirm(
                      "⚠️ Tem certeza que deseja encerrar a consulta? Você perderá os minutos restantes."
                    )
                  ) {
                    await finalizarSessao();
                  }
                }}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "rgb(220, 38, 38)",
                  color: "white",
                  borderRadius: "0.5rem",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                ❌ Encerrar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, minHeight: 0, padding: "1rem" }}>
        <div
          style={{
            height: "100%",
            maxWidth: "1280px",
            margin: "0 auto",
            display: "flex",
            gap: "1rem",
          }}
        >
          {/* Mesa */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(4px)",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "0.75rem",
                borderBottom: "1px solid rgba(255,255,255,0.2)",
                flexShrink: 0,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2
                style={{
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "1.125rem",
                }}
              >
                🎴 Mesa de Tarot
              </h2>
              {isAdmin && cartas.length > 0 && chatAtivo && (
                <button
                  onClick={limparCartas}
                  style={{
                    padding: "0.25rem 0.75rem",
                    backgroundColor: "rgb(220, 38, 38)",
                    color: "white",
                    borderRadius: "0.25rem",
                    fontSize: "0.875rem",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Cartas - FLEX WRAP */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                padding: "0.75rem",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {cartas.map((carta) => (
                  <div
                    key={carta.id}
                    style={{ width: "calc(33.333% - 0.35rem)" }}
                  >
                    <div
                      style={{
                        background:
                          "linear-gradient(to bottom right, rgb(202, 138, 4), rgb(161, 98, 7))",
                        borderRadius: "0.5rem",
                        border: "2px solid rgb(113, 63, 18)",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                        padding: "0.5rem",
                        display: "flex",
                        flexDirection: "column",
                        position: "relative",
                        aspectRatio: "2/3",
                        maxHeight: "180px",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "0.25rem",
                          left: "0.25rem",
                          backgroundColor: "rgba(0,0,0,0.8)",
                          padding: "0.125rem 0.375rem",
                          borderRadius: "0.25rem",
                          color: "rgb(253, 224, 71)",
                          fontSize: "10px",
                          fontWeight: "bold",
                        }}
                      >
                        #{carta.ordem}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            color: "white",
                            fontSize: "2.25rem",
                            fontWeight: "bold",
                            filter:
                              "drop-shadow(0 25px 25px rgb(0 0 0 / 0.15))",
                          }}
                        >
                          {getInicialCarta(carta.nome_carta)}
                        </div>
                      </div>
                      <div
                        style={{
                          backgroundColor: "rgba(0,0,0,0.8)",
                          padding: "0.25rem",
                          borderRadius: "0.25rem",
                        }}
                      >
                        <p
                          style={{
                            color: "white",
                            fontWeight: "bold",
                            textAlign: "center",
                            fontSize: "10px",
                            lineHeight: "1.25",
                          }}
                        >
                          {carta.nome_carta}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {cartas.length === 0 && (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.4)",
                    fontSize: "0.875rem",
                  }}
                >
                  Nenhuma carta na mesa
                </div>
              )}
            </div>

            {/* Footer */}
            {isAdmin && cartas.length < 10 && chatAtivo && (
              <div
                style={{
                  padding: "0.75rem",
                  borderTop: "1px solid rgba(255,255,255,0.2)",
                  flexShrink: 0,
                }}
              >
                <input
                  type="text"
                  value={buscarCarta}
                  onChange={(e) => setBuscarCarta(e.target.value)}
                  placeholder="Buscar carta..."
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    backgroundColor: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "0.5rem",
                    color: "white",
                    fontSize: "0.875rem",
                    marginBottom: "0.5rem",
                  }}
                />
                {buscarCarta && cartasFiltradas.length > 0 && (
                  <div
                    style={{
                      maxHeight: "8rem",
                      overflowY: "auto",
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      borderRadius: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {cartasFiltradas.slice(0, 6).map((c, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setNovaCarta(c);
                          setBuscarCarta("");
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "0.5rem 0.75rem",
                          color: "white",
                          fontSize: "0.875rem",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                {novaCarta && (
                  <div
                    style={{
                      marginBottom: "0.5rem",
                      padding: "0.5rem",
                      backgroundColor: "rgba(255,255,255,0.1)",
                      borderRadius: "0.25rem",
                      color: "white",
                      fontSize: "0.875rem",
                    }}
                  >
                    {novaCarta}
                  </div>
                )}
                <button
                  onClick={adicionarCarta}
                  disabled={!novaCarta}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    backgroundColor: novaCarta
                      ? "rgb(147, 51, 234)"
                      : "rgb(75, 85, 99)",
                    color: "white",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                    border: "none",
                    cursor: novaCarta ? "pointer" : "not-allowed",
                  }}
                >
                  + Adicionar Carta
                </button>
              </div>
            )}
          </div>

          {/* Chat */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(4px)",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              ref={messagesContainerRef}
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                padding: "0.75rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {mensagens.map((msg) => {
                  const isMinha = msg.remetente_id === usuarioId;
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        justifyContent: isMinha ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "70%",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "0.5rem",
                          backgroundColor: isMinha
                            ? "rgb(147, 51, 234)"
                            : "rgba(255,255,255,0.2)",
                          color: "white",
                        }}
                      >
                        {!isMinha && (
                          <p
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              marginBottom: "0.25rem",
                              color: "rgb(216, 180, 254)",
                            }}
                          >
                            {getNome(msg.remetente_id)}
                          </p>
                        )}
                        <p
                          style={{
                            wordBreak: "break-word",
                            fontSize: "0.875rem",
                          }}
                        >
                          {msg.mensagem}
                        </p>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            opacity: 0.6,
                            marginTop: "0.25rem",
                          }}
                        >
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

            <form
              onSubmit={enviarMensagem}
              style={{
                padding: "0.75rem",
                borderTop: "1px solid rgba(255,255,255,0.2)",
                flexShrink: 0,
              }}
            >
              {chatAtivo ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    autoFocus
                    style={{
                      flex: 1,
                      padding: "0.5rem 1rem",
                      backgroundColor: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "0.5rem",
                      color: "white",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: "0.5rem 1.5rem",
                      backgroundColor: "rgb(147, 51, 234)",
                      color: "white",
                      borderRadius: "0.5rem",
                      fontWeight: "500",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Enviar
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "0.5rem" }}>
                  <p style={{ color: "rgb(252, 165, 165)", fontWeight: "500" }}>
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

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TimerMistico from "@/components/Timermistico";
import { getImagemCarta } from "@/lib/getImagemCarta";

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
  usuario: { nome: string; minutos_disponiveis: number };
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
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [chatAtivo, setChatAtivo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cartasFiltradas = buscarCarta
    ? CARTAS_TAROT.filter((c) =>
        c.toLowerCase().includes(buscarCarta.toLowerCase())
      )
    : CARTAS_TAROT;

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
    if (messagesContainerRef.current && mensagens.length > 0) {
      const container = messagesContainerRef.current;

      // Usar requestAnimationFrame para garantir que o DOM atualizou
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const targetScroll = container.scrollHeight - container.clientHeight;

          console.log("📊 Debug scroll:", {
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight,
            targetScroll: targetScroll,
            currentScroll: container.scrollTop,
            mensagensCount: mensagens.length,
          });

          container.scrollTop = targetScroll;
        });
      });
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
        `*, usuario:usuarios!sessoes_usuario_id_fkey(nome, minutos_disponiveis), tarologo:tarologos(nome)`
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
      alert("⏰ Consulta já foi finalizada!");
      setTimeout(() => router.push("/"), 2000);
      return;
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
          console.log("💬 Nova mensagem:", payload);
          setMensagens((prev) => [...prev, payload.new as Mensagem]);
        }
      )
      .subscribe();

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
          console.log("🎴 Nova carta:", payload);
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
          console.log("🗑️ Carta removida:", payload);
          setCartas((prev) =>
            prev.filter((c) => c.id !== (payload.old as any).id)
          );
        }
      )
      .subscribe();

    // CORRIGIDO: Listener de sessão mais robusto
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
          console.log("🔄 Sessão atualizada:", payload);
          const nova = payload.new as any;

          setSessao((prev) => (prev ? { ...prev, ...nova } : null));

          if (nova.status === "finalizada") {
            console.log("⏰ SESSÃO FINALIZADA - Encerrando...");
            setChatAtivo(false);
            if (timerRef.current) clearInterval(timerRef.current);

            alert("⏰ Consulta finalizada!");

            // Redirecionar ambos os usuários
            setTimeout(() => {
              router.push("/");
              router.refresh();
            }, 2000);
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Canal sessão status:", status);
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

    const atualizar = () => {
      const decorrido = Math.floor((Date.now() - inicio) / 1000);
      setTempoDecorrido(decorrido);

      const saldoSegundos = sessao.minutos_comprados * 60;
      if (decorrido >= saldoSegundos) {
        finalizarSessao();
      }
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

    if (!sessao) return;

    const minutosUsados = Math.ceil(tempoDecorrido / 60);

    const { error } = await supabase
      .from("sessoes")
      .update({
        status: "finalizada",
        fim: new Date().toISOString(),
        minutos_usados: minutosUsados,
      })
      .eq("id", sessaoId);

    if (error) {
      console.error("❌ Erro ao finalizar:", error);
    }

    const { data: u } = await supabase
      .from("usuarios")
      .select("minutos_disponiveis")
      .eq("id", sessao.usuario_id)
      .single();

    if (u) {
      const novoSaldo = Math.max(0, u.minutos_disponiveis - minutosUsados);
      await supabase
        .from("usuarios")
        .update({ minutos_disponiveis: novoSaldo })
        .eq("id", sessao.usuario_id);
    }

    alert(`⏰ Consulta finalizada! Tempo utilizado: ${minutosUsados} minutos`);

    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 2000);
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

    for (const carta of cartas) {
      await supabase.from("cartas_mesa").delete().eq("id", carta.id);
    }
  }

  async function darBonus() {
    if (!isAdmin || !sessao || sessao.bonus_usado || !confirm("Dar +5min?"))
      return;

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("minutos_disponiveis")
      .eq("id", sessao.usuario_id)
      .single();

    if (usuario) {
      await supabase
        .from("usuarios")
        .update({
          minutos_disponiveis: usuario.minutos_disponiveis + 5,
        })
        .eq("id", sessao.usuario_id);

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

  // ========== COMPONENTE MESA ==========
  const MesaCartas = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      style={{
        flex: mobile ? "none" : 1,
        height: mobile ? "240px" : "auto", // AUMENTADO: 200px → 220px
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
            fontSize: mobile ? "0.9rem" : "1.125rem",
          }}
        >
          🎴 Mesa de Tarot
        </h2>
        {isAdmin && cartas.length > 0 && chatAtivo && !mobile && (
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

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowX: mobile ? "auto" : "hidden",
          overflowY: mobile ? "hidden" : "auto",
          padding: "0.75rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: mobile ? "nowrap" : "wrap",
            gap: "0.5rem",
          }}
        >
          {cartas.map((carta) => {
            const imagemUrl = getImagemCarta(carta.nome_carta);

            return (
              <div
                key={carta.id}
                style={{
                  width: mobile ? "135px" : "calc(33.333% - 0.35rem)", // AUMENTADO
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    background:
                      "linear-gradient(to bottom right, rgb(202, 138, 4), rgb(161, 98, 7))",
                    borderRadius: "0.5rem",
                    border: "2px solid rgb(113, 63, 18)",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    padding: "0.4rem", // REDUZIDO: 0.5rem → 0.4rem
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    aspectRatio: "2/3",
                    maxHeight: mobile ? "215px" : "180px", // MESMO valor!
                    overflow: "hidden",
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
                      zIndex: 10,
                    }}
                  >
                    #{carta.ordem}
                  </div>

                  {/* IMAGEM - mais espaço */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      borderRadius: "0.25rem",
                      marginBottom: "0.3rem", // Espaço pro nome
                    }}
                  >
                    {imagemUrl ? (
                      <img
                        src={imagemUrl}
                        alt={carta.nome_carta}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          color: "white",
                          fontSize: "2.25rem",
                          fontWeight: "bold",
                          filter: "drop-shadow(0 25px 25px rgb(0 0 0 / 0.15))",
                        }}
                      >
                        {getInicialCarta(carta.nome_carta)}
                      </div>
                    )}
                  </div>

                  {/* NOME - fixo embaixo */}
                  <div
                    style={{
                      backgroundColor: "rgba(0,0,0,0.9)",
                      padding: "0.5rem 0.4rem", // Mais espaço vertical
                      borderRadius: "0.25rem",
                      flexShrink: 0,
                      minHeight: "24px", // ADICIONADO - garante espaço mínimo
                    }}
                  >
                    <p
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                        fontSize: "10px",
                        lineHeight: "1.2",
                        margin: 0,
                      }}
                    >
                      {carta.nome_carta}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
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

      {isAdmin && cartas.length < 10 && chatAtivo && !mobile && (
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
  );

  // ========== COMPONENTE CHAT ==========
  const ChatMensagens = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
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
          //display: "flex",
          //flexDirection: "column", // IMPORTANTE
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            minHeight: "100%",
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
                    {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
  );

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
            flexWrap: isMobile ? "wrap" : "nowrap",
            gap: "0.5rem",
          }}
        >
          <div style={{ flex: isMobile ? "1 1 100%" : "none" }}>
            <h1
              style={{
                fontSize: isMobile ? "1rem" : "1.25rem",
                fontWeight: "bold",
                color: "white",
              }}
            >
              🔮 {isAdmin ? sessao?.usuario.nome : sessao?.tarologo.nome}
            </h1>
            <p
              style={{
                fontSize: "0.75rem",
                color: "rgb(216, 180, 254)",
              }}
            >
              {isAdmin ? "Cliente" : "Seu tarólogo"}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: isMobile ? "0.4rem" : "1rem",
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: isMobile ? "flex-end" : "flex-start",
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {isAdmin && !sessao?.bonus_usado && chatAtivo && (
                <button
                  onClick={darBonus}
                  style={{
                    padding: isMobile ? "0.4rem 0.8rem" : "0.5rem 1rem",
                    backgroundColor: "rgb(147, 51, 234)",
                    color: "white",
                    borderRadius: "0.5rem",
                    border: "none",
                    cursor: "pointer",
                    fontSize: isMobile ? "0.75rem" : "0.875rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  🎁 {isMobile ? "+5" : "+5min"}
                </button>
              )}

              {isAdmin && chatAtivo && (
                <button
                  onClick={async () => {
                    if (confirm("Finalizar consulta?")) {
                      await finalizarSessao();
                    }
                  }}
                  style={{
                    padding: isMobile ? "0.4rem 0.8rem" : "0.5rem 1rem",
                    backgroundColor: "rgb(220, 38, 38)",
                    color: "white",
                    borderRadius: "0.5rem",
                    border: "none",
                    cursor: "pointer",
                    fontSize: isMobile ? "0.75rem" : "0.875rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isMobile ? "⏹️ Fim" : "⏹️ Finalizar"}
                </button>
              )}

              {!isAdmin && chatAtivo && (
                <button
                  onClick={async () => {
                    if (
                      confirm(
                        "Encerrar consulta? Você será cobrado pelo tempo usado."
                      )
                    ) {
                      await finalizarSessao();
                    }
                  }}
                  style={{
                    padding: isMobile ? "0.4rem 0.8rem" : "0.5rem 1rem",
                    backgroundColor: "rgb(220, 38, 38)",
                    color: "white",
                    borderRadius: "0.5rem",
                    border: "none",
                    cursor: "pointer",
                    fontSize: isMobile ? "0.7rem" : "0.875rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isMobile ? "❌ Sair" : "❌ Encerrar"}
                </button>
              )}
            </div>

            {sessao && (
              <TimerMistico
                tempoDecorrido={tempoDecorrido}
                saldoTotal={sessao.minutos_comprados}
                onTempoEsgotado={finalizarSessao}
              />
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
            flexDirection: isMobile ? "column" : "row",
            gap: "1rem",
          }}
        >
          {isMobile && <MesaCartas mobile={true} />}
          {!isMobile && <MesaCartas mobile={false} />}
          <ChatMensagens mobile={isMobile} />
        </div>
      </div>
    </div>
  );
}

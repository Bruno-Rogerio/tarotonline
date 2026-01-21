"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import TarologoCard from "./TarologoCard";
import HeaderLogado from "./HeaderLogado";
import Link from "next/link";
import RegistrarAcesso from "./RegistrarAcesso";

type Tarologo = {
  id: string;
  nome: string;
  avatar_url: string | null;
  biografia: string | null;
  especialidade: string | null;
  total_consultas: number;
  avaliacao_media: number;
  status: "disponivel" | "ocupado" | "indisponivel";
  ordem: number | null;
  minutosRestantes?: number;
  proximaMudanca?: number;
  definidoManualmente?: boolean;
};

type Usuario = {
  id: string;
  nome: string;
  tipo: "cliente" | "admin";
  minutos_disponiveis: number;
};

const STORAGE_KEY = "tarot_tarologos_status";

// Gerar estado inicial realista dos tarológos
function gerarEstadoInicial(tarologos: Tarologo[]): Tarologo[] {
  const agora = Date.now();

  return tarologos.map((tarologo, index) => {
    const rand = Math.random();

    if (rand < 0.5) {
      return {
        ...tarologo,
        status: "disponivel",
        proximaMudanca: agora + (30000 + Math.random() * 270000),
      };
    } else if (rand < 0.85) {
      const minutos = Math.floor(Math.random() * 36) + 15;
      return {
        ...tarologo,
        status: "ocupado",
        minutosRestantes: minutos,
        proximaMudanca: agora + minutos * 60000,
      };
    } else {
      const minutos = Math.floor(Math.random() * 21) + 10;
      return {
        ...tarologo,
        status: "indisponivel",
        proximaMudanca: agora + minutos * 60000,
      };
    }
  });
}

// Carregar estado salvo ou gerar novo
function carregarEstadoSalvo(tarologos: Tarologo[]): Tarologo[] {
  if (typeof window === "undefined") return tarologos;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);

      if (parsed.length === tarologos.length) {
        return tarologos.map((t) => {
          const savedTarologo = parsed.find((s: Tarologo) => s.id === t.id);
          if (savedTarologo) {
            return {
              ...t,
              status: savedTarologo.status,
              minutosRestantes: savedTarologo.minutosRestantes,
              proximaMudanca: savedTarologo.proximaMudanca,
              definidoManualmente: savedTarologo.definidoManualmente,
            };
          }
          return t;
        });
      }
    }
  } catch (error) {
    console.error("Erro ao carregar estado salvo:", error);
  }

  return gerarEstadoInicial(tarologos);
}

// Salvar estado no localStorage
function salvarEstado(tarologos: Tarologo[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tarologos));
  } catch (error) {
    console.error("Erro ao salvar estado:", error);
  }
}

export default function HomeContent({
  tarologos: initialTarologos,
}: {
  tarologos: Tarologo[];
}) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [tarologos, setTarologos] = useState<Tarologo[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const estadoInicial = carregarEstadoSalvo(initialTarologos);
    setTarologos(estadoInicial);

    verificarUsuario();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        carregarUsuario(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setUsuario(null);
      }
    });

    // Atualizar status a cada 1 minuto (para contagem regressiva)
    intervalRef.current = setInterval(() => {
      atualizarStatusTarologos();
    }, 60000);

    return () => {
      subscription.unsubscribe();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Broadcast para sincronizar status entre todos os usuários
  useEffect(() => {
    const channel = supabase.channel("tarologos-status");

    channel
      .on("broadcast", { event: "status-change" }, (payload) => {
        const { tarologoId, status, minutos } = payload.payload;
        setTarologos((prev) =>
          prev.map((t) => {
            if (t.id === tarologoId) {
              const agora = Date.now();

              if (status === "ocupado") {
                // Usar os minutos recebidos no broadcast (ou default 30)
                const minutosAtendimento = minutos || 30;
                return {
                  ...t,
                  status,
                  minutosRestantes: minutosAtendimento,
                  proximaMudanca: agora + minutosAtendimento * 60000,
                  definidoManualmente: true,
                };
              } else {
                return {
                  ...t,
                  status,
                  minutosRestantes: undefined,
                  proximaMudanca: undefined,
                  definidoManualmente: true,
                };
              }
            }
            return t;
          }),
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Salvar sempre que o estado mudar
  useEffect(() => {
    if (tarologos.length > 0) {
      salvarEstado(tarologos);
    }
  }, [tarologos]);

  function atualizarStatusTarologos() {
    setTarologos((prev) => {
      const agora = Date.now();

      return prev.map((tarologo) => {
        // Se foi definido manualmente e NÃO está ocupado, não muda nada
        if (tarologo.definidoManualmente && tarologo.status !== "ocupado") {
          return tarologo;
        }

        // Se está ocupado e ainda tem tempo, só atualiza os minutos restantes
        if (tarologo.status === "ocupado" && tarologo.proximaMudanca) {
          const tempoRestante = tarologo.proximaMudanca - agora;

          if (tempoRestante > 0) {
            return {
              ...tarologo,
              minutosRestantes: Math.ceil(tempoRestante / 60000),
            };
          } else {
            // TEMPO ACABOU! Muda automaticamente para indisponível
            console.log(
              `⏰ Tempo esgotado para ${tarologo.nome} - Mudando para indisponível`,
            );
            return {
              ...tarologo,
              status: "indisponivel" as const,
              minutosRestantes: undefined,
              proximaMudanca: undefined,
              definidoManualmente: true, // Fica indisponível até admin mudar
            };
          }
        }

        // Para tarólogos não definidos manualmente (estado inicial aleatório)
        if (
          !tarologo.definidoManualmente &&
          tarologo.proximaMudanca &&
          agora >= tarologo.proximaMudanca
        ) {
          const rand = Math.random();

          if (tarologo.status === "disponivel") {
            if (rand < 0.7) {
              const minutos = Math.floor(Math.random() * 41) + 20;
              return {
                ...tarologo,
                status: "ocupado" as const,
                minutosRestantes: minutos,
                proximaMudanca: agora + minutos * 60000,
              };
            } else {
              const minutos = Math.floor(Math.random() * 31) + 15;
              return {
                ...tarologo,
                status: "indisponivel" as const,
                proximaMudanca: agora + minutos * 60000,
              };
            }
          } else if (tarologo.status === "ocupado") {
            if (rand < 0.85) {
              const minutos = Math.floor(Math.random() * 9) + 2;
              return {
                ...tarologo,
                status: "disponivel" as const,
                minutosRestantes: undefined,
                proximaMudanca: agora + minutos * 60000,
              };
            } else {
              const minutos = Math.floor(Math.random() * 21) + 20;
              return {
                ...tarologo,
                status: "indisponivel" as const,
                minutosRestantes: undefined,
                proximaMudanca: agora + minutos * 60000,
              };
            }
          } else if (tarologo.status === "indisponivel") {
            const minutos = Math.floor(Math.random() * 5) + 1;
            return {
              ...tarologo,
              status: "disponivel" as const,
              minutosRestantes: undefined,
              proximaMudanca: agora + minutos * 60000,
            };
          }
        }

        return tarologo;
      });
    });
  }

  async function verificarUsuario() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await carregarUsuario(user.id);
    }

    setLoading(false);
  }

  async function carregarUsuario(userId: string) {
    const { data: userData } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", userId)
      .single();

    if (userData) {
      setUsuario(userData);
    }
  }

  // Função atualizada para aceitar minutos opcionais
  function mudarStatusTarologo(
    tarologoId: string,
    novoStatus: "disponivel" | "ocupado" | "indisponivel",
    minutos?: number,
  ) {
    setTarologos((prev) =>
      prev.map((t) => {
        if (t.id === tarologoId) {
          const agora = Date.now();

          if (novoStatus === "ocupado") {
            // Usa os minutos passados ou default 30
            const minutosAtendimento = minutos || 30;
            return {
              ...t,
              status: novoStatus,
              minutosRestantes: minutosAtendimento,
              proximaMudanca: agora + minutosAtendimento * 60000,
              definidoManualmente: true,
            };
          } else {
            // Disponível ou Indisponível ficam fixos até admin mudar
            return {
              ...t,
              status: novoStatus,
              minutosRestantes: undefined,
              proximaMudanca: undefined,
              definidoManualmente: true,
            };
          }
        }
        return t;
      }),
    );

    // Broadcast para todos os clientes - inclui os minutos no payload
    supabase.channel("tarologos-status").send({
      type: "broadcast",
      event: "status-change",
      payload: { tarologoId, status: novoStatus, minutos },
    });
  }

  // Loading state com animação
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🔮</div>
          <div className="text-white/80 text-lg">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900">
      {/* Registrar acessos */}
      <RegistrarAcesso />

      {/* Header */}
      {usuario ? (
        <HeaderLogado usuario={usuario} />
      ) : (
        <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              🔮 Viaa Tarot
            </h1>
            <Link
              href="/login"
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-full transition-all shadow-lg"
            >
              Entrar
            </Link>
          </div>
        </header>
      )}

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Descubra seu destino através do Tarot
        </h2>
        <p className="text-xl text-purple-200 mb-8">
          Consulte nossos tarológos especializados online
        </p>
      </section>

      {/* Tarológos Grid */}
      <section className="container mx-auto px-4 pb-16">
        <h3 className="text-2xl font-bold text-white mb-8 text-center">
          Nossos Tarológos
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tarologos
            .sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999))
            .map((tarologo) => (
              <TarologoCard
                key={tarologo.id}
                tarologo={tarologo}
                usuarioLogado={!!usuario}
                temMinutos={(usuario?.minutos_disponiveis || 0) > 0}
                isAdmin={usuario?.tipo === "admin"}
                onChangeStatus={(status, minutos) =>
                  mudarStatusTarologo(tarologo.id, status, minutos)
                }
              />
            ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur-sm border-t border-white/10 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-purple-200">
          <p>© 2025 Viaa Tarot - Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
}

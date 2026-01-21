"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import TarologoCard from "./TarologoCard";
import HeaderLogado from "./HeaderLogado";
import Link from "next/link";
import RegistrarAcesso from "./RegistrarAcesso";
import ProgressoFidelidade from "./ProgressoFidelidade";

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
  proximaMudanca?: number; // usado apenas para contar quando está ocupado
  definidoManualmente?: boolean; // sempre true quando admin altera
};

type Usuario = {
  id: string;
  nome: string;
  tipo: "cliente" | "admin";
  minutos_disponiveis: number;
};

const STORAGE_KEY = "tarot_tarologos_status";

/**
 * Carrega estado salvo do localStorage (apenas para manter contador e status do admin entre refresh)
 * - NÃO gera status aleatório
 * - Se não tiver salvo, usa o que veio do servidor (initialTarologos)
 */
function carregarEstadoSalvo(tarologos: Tarologo[]): Tarologo[] {
  if (typeof window === "undefined") return tarologos;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return tarologos;

    const parsed: Tarologo[] = JSON.parse(saved);

    return tarologos.map((t) => {
      const savedTarologo = parsed.find((s) => s.id === t.id);
      if (!savedTarologo) return t;

      // Usa o status salvo (do admin) e mantém contador se existir
      return {
        ...t,
        status: savedTarologo.status ?? t.status,
        minutosRestantes: savedTarologo.minutosRestantes,
        proximaMudanca: savedTarologo.proximaMudanca,
        definidoManualmente: savedTarologo.definidoManualmente ?? true,
      };
    });
  } catch (error) {
    console.error("Erro ao carregar estado salvo:", error);
    return tarologos;
  }
}

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
    // Estado inicial: usa o que veio do servidor (banco)
    // e (opcional) sobrepõe com o que estava salvo, sem inventar status
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

    // Intervalo só para atualizar contador (ocupado) e finalizar quando expirar
    intervalRef.current = setInterval(() => {
      atualizarContadores();
    }, 60000);

    return () => {
      subscription.unsubscribe();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Broadcast para refletir mudança do admin em tempo real
  useEffect(() => {
    const channel = supabase.channel("tarologos-status");

    channel
      .on("broadcast", { event: "status-change" }, (payload) => {
        const { tarologoId, status } = payload.payload as {
          tarologoId: string;
          status: "disponivel" | "ocupado" | "indisponivel";
        };

        setTarologos((prev) =>
          prev.map((t) => {
            if (t.id !== tarologoId) return t;

            const agora = Date.now();

            if (status === "ocupado") {
              // Mantém regra atual: ocupado por 30 min e depois vira indisponível
              return {
                ...t,
                status,
                minutosRestantes: 30,
                proximaMudanca: agora + 30 * 60000,
                definidoManualmente: true,
              };
            }

            // Disponível / Indisponível ficam fixos (sem contador)
            return {
              ...t,
              status,
              minutosRestantes: undefined,
              proximaMudanca: undefined,
              definidoManualmente: true,
            };
          }),
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Persistir no localStorage (pra não perder contador em refresh)
  useEffect(() => {
    if (tarologos.length > 0) salvarEstado(tarologos);
  }, [tarologos]);

  /**
   * Atualiza SOMENTE contador de "ocupado"
   * - Sem aleatorização
   * - Quando expira, vira "indisponivel" (como você já tinha)
   */
  function atualizarContadores() {
    setTarologos((prev) => {
      const agora = Date.now();

      return prev.map((tarologo) => {
        if (tarologo.status !== "ocupado" || !tarologo.proximaMudanca) {
          return tarologo;
        }

        const tempoRestante = tarologo.proximaMudanca - agora;

        if (tempoRestante > 0) {
          return {
            ...tarologo,
            minutosRestantes: Math.ceil(tempoRestante / 60000),
          };
        }

        // Acabou: vira indisponível até admin mudar
        return {
          ...tarologo,
          status: "indisponivel",
          minutosRestantes: undefined,
          proximaMudanca: undefined,
          definidoManualmente: true,
        };
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

    if (userData) setUsuario(userData);
  }

  function mudarStatusTarologo(
    tarologoId: string,
    novoStatus: "disponivel" | "ocupado" | "indisponivel",
  ) {
    // Atualiza local
    setTarologos((prev) =>
      prev.map((t) => {
        if (t.id !== tarologoId) return t;

        const agora = Date.now();

        if (novoStatus === "ocupado") {
          return {
            ...t,
            status: novoStatus,
            minutosRestantes: 30,
            proximaMudanca: agora + 30 * 60000,
            definidoManualmente: true,
          };
        }

        return {
          ...t,
          status: novoStatus,
          minutosRestantes: undefined,
          proximaMudanca: undefined,
          definidoManualmente: true,
        };
      }),
    );

    // Broadcast pros outros clientes
    supabase.channel("tarologos-status").send({
      type: "broadcast",
      event: "status-change",
      payload: { tarologoId, status: novoStatus },
    });
  }

  // Loading
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
        <header className="bg-black/30 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 md:gap-3 group">
              <img
                src="/logo.png"
                alt="Viaa Tarot"
                className="w-8 h-8 md:w-10 md:h-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
              />
              <span className="text-lg md:text-2xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                Viaa Tarot
              </span>
            </Link>

            <div className="flex items-center gap-2 md:gap-3">
              <Link
                href="/sobre"
                className="px-4 py-2 md:px-6 md:py-2.5 text-sm md:text-base text-purple-300 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                Sobre
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 md:px-6 md:py-2.5 text-sm md:text-base text-purple-300 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="px-4 py-2 md:px-6 md:py-2.5 text-sm md:text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-full transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105"
              >
                Cadastrar
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 md:w-64 md:h-64 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-10 w-40 h-40 md:w-80 md:h-80 bg-pink-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-60 h-60 md:w-96 md:h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-12 md:py-20 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6 md:mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-purple-200 text-sm md:text-base">
              Tarológos online agora
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6">
            <span className="text-white">Tarot online para quem busca </span>
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              clareza
            </span>
            <br className="md:hidden" />
            <span className="text-white"> e </span>
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              direcionamento
            </span>
          </h1>

          <p className="text-purple-200/80 text-base md:text-xl max-w-2xl mx-auto mb-8 md:mb-10 px-4">
            A Viaa Tarot conecta você a tarólogos experientes, oferecendo
            consultas individuais, claras e personalizadas, com privacidade e
            transparência, no momento em que você precisar.
          </p>

          {!usuario && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
              <Link
                href="/cadastro"
                className="group relative w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-2xl transition-all duration-300 shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span>✨</span>
                  <span>Começar agora</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="#tarologos"
                className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl transition-all border border-white/20 hover:border-white/40"
              >
                <span className="flex items-center justify-center gap-2">
                  <span>👁️</span>
                  <span>Ver tarológos</span>
                </span>
              </Link>
            </div>
          )}

          {usuario && (
            <div className="container mx-auto px-4 py-4">
              <ProgressoFidelidade usuarioId={usuario.id} />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-lg mx-auto mt-12 md:mt-16">
            <div className="text-center">
              <div className="text-2xl md:text-4xl font-bold text-white mb-1">
                5000+
              </div>
              <div className="text-purple-300/70 text-xs md:text-sm">
                Consultas
              </div>
            </div>
            <div className="text-center border-x border-white/10">
              <div className="text-2xl md:text-4xl font-bold text-white mb-1">
                4.9
              </div>
              <div className="text-purple-300/70 text-xs md:text-sm">
                Avaliação ⭐
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-4xl font-bold text-white mb-1">
                Horários Flexíveis
              </div>
              <div className="text-purple-300/70 text-xs md:text-sm">
                Atendimento
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tarológos Section */}
      <section id="tarologos" className="container mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
            Nossos{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Tarológos
            </span>
          </h2>
          <p className="text-purple-200/70 text-sm md:text-base max-w-md mx-auto">
            Escolha um tarólogo disponível e inicie sua consulta agora mesmo
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 md:gap-6 mb-8">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></span>
            <span className="text-white/70 text-sm">Disponível</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/50"></span>
            <span className="text-white/70 text-sm">Ocupado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-lg shadow-red-500/50"></span>
            <span className="text-white/70 text-sm">Indisponível</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {tarologos.map((tarologo) => (
            <TarologoCard
              key={tarologo.id}
              tarologo={tarologo}
              usuarioLogado={!!usuario}
              temMinutos={(usuario?.minutos_disponiveis || 0) > 0}
              isAdmin={usuario?.tipo === "admin"}
              onChangeStatus={(status) =>
                mudarStatusTarologo(tarologo.id, status)
              }
            />
          ))}
        </div>
      </section>

      {/* resto do seu layout continua igual */}
      {/* ... */}
      <footer className="bg-black/40 backdrop-blur-sm border-t border-purple-500/20 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Viaa Tarot" className="w-8 h-8" />
              <span className="text-lg font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                Viaa Tarot
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <Link
                href="/sobre"
                className="text-purple-300/70 hover:text-white transition-colors"
              >
                Sobre
              </Link>
              <a
                href="/termos"
                className="text-purple-300/70 hover:text-white transition-colors"
              >
                Termos
              </a>
              <a
                href="/privacidade"
                className="text-purple-300/70 hover:text-white transition-colors"
              >
                Privacidade
              </a>
              <a
                href="/contato"
                className="text-purple-300/70 hover:text-white transition-colors"
              >
                Contato
              </a>
            </div>

            <p className="text-purple-300/50 text-sm">
              © 2025 Viaa Tarot. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

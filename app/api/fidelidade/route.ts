import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Usar service role para operações privilegiadas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { usuarioId, minutosUsados } = await request.json();

    if (!usuarioId || !minutosUsados) {
      return NextResponse.json(
        { error: "usuarioId e minutosUsados são obrigatórios" },
        { status: 400 }
      );
    }

    // Buscar minutos acumulados atuais do usuário
    const { data: usuario, error: userError } = await supabaseAdmin
      .from("usuarios")
      .select("minutos_acumulados, minutos_disponiveis")
      .eq("id", usuarioId)
      .single();

    if (userError || !usuario) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const minutosAcumuladosAntigos = usuario.minutos_acumulados || 0;
    const novosMinutosAcumulados = minutosAcumuladosAntigos + minutosUsados;

    // Atualizar minutos acumulados
    await supabaseAdmin
      .from("usuarios")
      .update({ minutos_acumulados: novosMinutosAcumulados })
      .eq("id", usuarioId);

    // Buscar configurações de fidelidade ativas
    const { data: configs, error: configError } = await supabaseAdmin
      .from("configuracoes_fidelidade")
      .select("*")
      .eq("ativo", true)
      .or(`data_inicio.is.null,data_inicio.lte.${new Date().toISOString()}`)
      .or(`data_fim.is.null,data_fim.gte.${new Date().toISOString()}`)
      .order("minutos_necessarios", { ascending: false });

    if (configError || !configs || configs.length === 0) {
      return NextResponse.json({
        success: true,
        bonusAplicado: false,
        minutosGanhos: 0,
        mensagem: "Nenhuma promoção ativa",
      });
    }

    let bonusTotalGanho = 0;
    const bonusAplicados: string[] = [];

    // Verificar cada configuração
    for (const config of configs) {
      // Buscar último bônus desta configuração para este usuário
      const { data: ultimoBonus } = await supabaseAdmin
        .from("bonus_fidelidade")
        .select("minutos_acumulados_momento")
        .eq("usuario_id", usuarioId)
        .eq("configuracao_id", config.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const minutosDesdeUltimoBonus = ultimoBonus
        ? novosMinutosAcumulados - ultimoBonus.minutos_acumulados_momento
        : novosMinutosAcumulados;

      // Calcular quantos bônus o usuário ganhou
      const quantidadeBonus = Math.floor(
        minutosDesdeUltimoBonus / config.minutos_necessarios
      );

      if (quantidadeBonus > 0) {
        const minutosGanhos = quantidadeBonus * config.minutos_bonus;
        bonusTotalGanho += minutosGanhos;

        // Registrar cada bônus ganho
        for (let i = 0; i < quantidadeBonus; i++) {
          const minutosNoMomento =
            (ultimoBonus?.minutos_acumulados_momento || 0) +
            (i + 1) * config.minutos_necessarios;

          await supabaseAdmin.from("bonus_fidelidade").insert({
            usuario_id: usuarioId,
            configuracao_id: config.id,
            minutos_ganhos: config.minutos_bonus,
            minutos_acumulados_momento: minutosNoMomento,
            motivo: `${config.nome}: ${config.minutos_necessarios} minutos usados`,
          });
        }

        bonusAplicados.push(
          `${config.nome}: +${minutosGanhos} min (${quantidadeBonus}x)`
        );
      }
    }

    // Se ganhou bônus, adicionar aos minutos disponíveis
    if (bonusTotalGanho > 0) {
      await supabaseAdmin
        .from("usuarios")
        .update({
          minutos_disponiveis: usuario.minutos_disponiveis + bonusTotalGanho,
        })
        .eq("id", usuarioId);

      console.log(
        `🎁 Bônus de fidelidade: +${bonusTotalGanho} min para usuário ${usuarioId}`
      );

      return NextResponse.json({
        success: true,
        bonusAplicado: true,
        minutosGanhos: bonusTotalGanho,
        detalhes: bonusAplicados,
        mensagem: `Parabéns! Você ganhou ${bonusTotalGanho} minutos de bônus! 🎉`,
      });
    }

    return NextResponse.json({
      success: true,
      bonusAplicado: false,
      minutosGanhos: 0,
      mensagem: "Nenhum bônus aplicado",
    });
  } catch (error) {
    console.error("Erro ao verificar bônus:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar bônus" },
      { status: 500 }
    );
  }
}

// Endpoint para buscar progresso do usuário
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get("usuarioId");

    if (!usuarioId) {
      return NextResponse.json(
        { error: "usuarioId é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar dados do usuário
    const { data: usuario } = await supabaseAdmin
      .from("usuarios")
      .select("minutos_acumulados")
      .eq("id", usuarioId)
      .single();

    // Buscar configurações ativas
    const { data: configs } = await supabaseAdmin
      .from("configuracoes_fidelidade")
      .select("*")
      .eq("ativo", true)
      .order("minutos_necessarios", { ascending: true });

    // Buscar histórico de bônus
    const { data: historico } = await supabaseAdmin
      .from("bonus_fidelidade")
      .select("*, configuracao:configuracoes_fidelidade(nome)")
      .eq("usuario_id", usuarioId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Calcular progresso para cada meta
    const progressos = await Promise.all(
      (configs || []).map(async (config) => {
        const { data: ultimoBonus } = await supabaseAdmin
          .from("bonus_fidelidade")
          .select("minutos_acumulados_momento")
          .eq("usuario_id", usuarioId)
          .eq("configuracao_id", config.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const minutosAcumulados = usuario?.minutos_acumulados || 0;
        const minutosDesdeUltimo = ultimoBonus
          ? minutosAcumulados - ultimoBonus.minutos_acumulados_momento
          : minutosAcumulados;

        const progresso = Math.min(
          (minutosDesdeUltimo / config.minutos_necessarios) * 100,
          100
        );

        return {
          id: config.id,
          nome: config.nome,
          descricao: config.descricao,
          minutosNecessarios: config.minutos_necessarios,
          minutosBonus: config.minutos_bonus,
          minutosAtuais: minutosDesdeUltimo,
          progresso: Math.round(progresso),
          faltam: Math.max(0, config.minutos_necessarios - minutosDesdeUltimo),
        };
      })
    );

    return NextResponse.json({
      minutosAcumuladosTotal: usuario?.minutos_acumulados || 0,
      progressos,
      historico: historico || [],
    });
  } catch (error) {
    console.error("Erro ao buscar progresso:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

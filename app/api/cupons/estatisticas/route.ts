// app/api/cupons/estatisticas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Total de cupons por status
    const { data: totalPorStatus } = await supabaseAdmin
      .from("cupons")
      .select("status");

    const statusCount = {
      ativos: 0,
      inativos: 0,
      expirados: 0,
      total: 0,
    };

    totalPorStatus?.forEach((c) => {
      statusCount.total++;
      if (c.status === "ativo") statusCount.ativos++;
      if (c.status === "inativo") statusCount.inativos++;
      if (c.status === "expirado") statusCount.expirados++;
    });

    // Total de usos e descontos
    const { data: totais } = await supabaseAdmin
      .from("cupons")
      .select("total_usos, total_desconto_concedido, total_minutos_extras_dados");

    let totalUsos = 0;
    let totalDesconto = 0;
    let totalMinutosExtras = 0;

    totais?.forEach((c) => {
      totalUsos += c.total_usos || 0;
      totalDesconto += c.total_desconto_concedido || 0;
      totalMinutosExtras += c.total_minutos_extras_dados || 0;
    });

    // Cupons mais usados
    const { data: maisUsados } = await supabaseAdmin
      .from("cupons")
      .select("id, codigo, tipo_desconto, valor_desconto, total_usos, origem")
      .gt("total_usos", 0)
      .order("total_usos", { ascending: false })
      .limit(5);

    // Usos por origem
    const { data: porOrigem } = await supabaseAdmin
      .from("cupons")
      .select("origem, total_usos");

    const usosPorOrigem: Record<string, number> = {};
    porOrigem?.forEach((c) => {
      const origem = c.origem || "sem_origem";
      usosPorOrigem[origem] = (usosPorOrigem[origem] || 0) + (c.total_usos || 0);
    });

    // Usos hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const { count: usosHoje } = await supabaseAdmin
      .from("cupons_uso")
      .select("*", { count: "exact", head: true })
      .gte("created_at", hoje.toISOString());

    // Usos esta semana
    const semanaAtras = new Date();
    semanaAtras.setDate(semanaAtras.getDate() - 7);

    const { count: usosSemana } = await supabaseAdmin
      .from("cupons_uso")
      .select("*", { count: "exact", head: true })
      .gte("created_at", semanaAtras.toISOString());

    // Usos este mês
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const { count: usosMes } = await supabaseAdmin
      .from("cupons_uso")
      .select("*", { count: "exact", head: true })
      .gte("created_at", inicioMes.toISOString());

    // Últimos usos (para timeline)
    const { data: ultimosUsos } = await supabaseAdmin
      .from("cupons_uso")
      .select(`
        *,
        cupom:cupons(codigo, tipo_desconto, valor_desconto),
        usuario:usuarios(nome, telefone)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      cupons: statusCount,
      usos: {
        total: totalUsos,
        hoje: usosHoje || 0,
        semana: usosSemana || 0,
        mes: usosMes || 0,
      },
      descontos: {
        total: totalDesconto,
        minutosExtras: totalMinutosExtras,
      },
      maisUsados: maisUsados || [],
      porOrigem: usosPorOrigem,
      ultimosUsos: ultimosUsos || [],
    });
  } catch (error: any) {
    console.error("Erro ao buscar estatísticas:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}

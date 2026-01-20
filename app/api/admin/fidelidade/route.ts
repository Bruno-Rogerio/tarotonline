import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Listar todas as configurações
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("configuracoes_fidelidade")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Buscar estatísticas de cada configuração
    const configsComStats = await Promise.all(
      (data || []).map(async (config) => {
        const { count: totalBonus } = await supabaseAdmin
          .from("bonus_fidelidade")
          .select("*", { count: "exact", head: true })
          .eq("configuracao_id", config.id);

        const { data: somaBonus } = await supabaseAdmin
          .from("bonus_fidelidade")
          .select("minutos_ganhos")
          .eq("configuracao_id", config.id);

        const minutosDistribuidos =
          somaBonus?.reduce((acc, b) => acc + b.minutos_ganhos, 0) || 0;

        return {
          ...config,
          totalBonusDistribuidos: totalBonus || 0,
          minutosDistribuidos,
        };
      })
    );

    return NextResponse.json(configsComStats);
  } catch (error) {
    console.error("Erro ao listar configurações:", error);
    return NextResponse.json(
      { error: "Erro ao listar configurações" },
      { status: 500 }
    );
  }
}

// POST - Criar nova configuração
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nome,
      descricao,
      minutos_necessarios,
      minutos_bonus,
      ativo,
      data_inicio,
      data_fim,
    } = body;

    if (!nome || !minutos_necessarios || !minutos_bonus) {
      return NextResponse.json(
        { error: "nome, minutos_necessarios e minutos_bonus são obrigatórios" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("configuracoes_fidelidade")
      .insert({
        nome,
        descricao,
        minutos_necessarios: parseInt(minutos_necessarios),
        minutos_bonus: parseInt(minutos_bonus),
        ativo: ativo ?? true,
        data_inicio: data_inicio || null,
        data_fim: data_fim || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao criar configuração:", error);
    return NextResponse.json(
      { error: "Erro ao criar configuração" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar configuração
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      nome,
      descricao,
      minutos_necessarios,
      minutos_bonus,
      ativo,
      data_inicio,
      data_fim,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("configuracoes_fidelidade")
      .update({
        nome,
        descricao,
        minutos_necessarios: parseInt(minutos_necessarios),
        minutos_bonus: parseInt(minutos_bonus),
        ativo,
        data_inicio: data_inicio || null,
        data_fim: data_fim || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao atualizar configuração:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar configuração" },
      { status: 500 }
    );
  }
}

// DELETE - Deletar configuração
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("configuracoes_fidelidade")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar configuração:", error);
    return NextResponse.json(
      { error: "Erro ao deletar configuração" },
      { status: 500 }
    );
  }
}

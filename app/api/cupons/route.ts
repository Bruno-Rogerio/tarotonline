// app/api/cupons/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Listar cupons
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const origem = searchParams.get("origem");
    const busca = searchParams.get("busca");

    let query = supabaseAdmin
      .from("cupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "todos") {
      query = query.eq("status", status);
    }

    if (origem && origem !== "todos") {
      query = query.eq("origem", origem);
    }

    if (busca) {
      query = query.or(`codigo.ilike.%${busca}%,descricao.ilike.%${busca}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar cupons:", error);
      return NextResponse.json(
        { error: "Erro ao buscar cupons" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erro na API:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}

// POST - Criar cupom
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validações básicas
    if (!body.codigo || !body.tipo_desconto || body.valor_desconto === undefined) {
      return NextResponse.json(
        { error: "Campos obrigatórios: codigo, tipo_desconto, valor_desconto" },
        { status: 400 }
      );
    }

    // Verificar se código já existe
    const { data: existente } = await supabaseAdmin
      .from("cupons")
      .select("id")
      .eq("codigo", body.codigo.toUpperCase().trim())
      .single();

    if (existente) {
      return NextResponse.json(
        { error: "Já existe um cupom com este código" },
        { status: 400 }
      );
    }

    // Criar cupom
    const { data, error } = await supabaseAdmin
      .from("cupons")
      .insert({
        codigo: body.codigo.toUpperCase().trim(),
        descricao: body.descricao || null,
        tipo_desconto: body.tipo_desconto,
        valor_desconto: body.valor_desconto,
        desconto_maximo: body.desconto_maximo || null,
        valor_minimo: body.valor_minimo || 0,
        limite_total_usos: body.limite_total_usos || null,
        limite_por_usuario: body.limite_por_usuario || 1,
        apenas_novos_usuarios: body.apenas_novos_usuarios || false,
        data_inicio: body.data_inicio || new Date().toISOString(),
        data_fim: body.data_fim || null,
        origem: body.origem || null,
        influencer_nome: body.influencer_nome || null,
        status: body.status || "ativo",
        criado_por: body.criado_por || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar cupom:", error);
      return NextResponse.json(
        { error: "Erro ao criar cupom: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("Erro na API:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}

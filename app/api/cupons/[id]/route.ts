// app/api/cupons/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Buscar cupom por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("cupons")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Cupom não encontrado" },
        { status: 404 }
      );
    }

    // Buscar histórico de uso
    const { data: usos } = await supabaseAdmin
      .from("cupons_uso")
      .select(`
        *,
        usuario:usuarios(id, nome, telefone)
      `)
      .eq("cupom_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      ...data,
      historico_uso: usos || [],
    });
  } catch (error: any) {
    console.error("Erro na API:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar cupom
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Não permitir alterar código se já tiver usos
    if (body.codigo) {
      const { data: cupomAtual } = await supabaseAdmin
        .from("cupons")
        .select("total_usos, codigo")
        .eq("id", id)
        .single();

      if (cupomAtual && cupomAtual.total_usos > 0 && body.codigo !== cupomAtual.codigo) {
        return NextResponse.json(
          { error: "Não é possível alterar o código de um cupom já utilizado" },
          { status: 400 }
        );
      }

      // Verificar se novo código já existe
      if (body.codigo !== cupomAtual?.codigo) {
        const { data: existente } = await supabaseAdmin
          .from("cupons")
          .select("id")
          .eq("codigo", body.codigo.toUpperCase().trim())
          .neq("id", id)
          .single();

        if (existente) {
          return NextResponse.json(
            { error: "Já existe um cupom com este código" },
            { status: 400 }
          );
        }
      }
    }

    const updateData: any = {};

    // Campos permitidos para atualização
    const camposPermitidos = [
      "codigo",
      "descricao",
      "tipo_desconto",
      "valor_desconto",
      "desconto_maximo",
      "valor_minimo",
      "limite_total_usos",
      "limite_por_usuario",
      "apenas_novos_usuarios",
      "data_inicio",
      "data_fim",
      "origem",
      "influencer_nome",
      "status",
    ];

    camposPermitidos.forEach((campo) => {
      if (body[campo] !== undefined) {
        if (campo === "codigo") {
          updateData[campo] = body[campo].toUpperCase().trim();
        } else {
          updateData[campo] = body[campo];
        }
      }
    });

    const { data, error } = await supabaseAdmin
      .from("cupons")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar cupom:", error);
      return NextResponse.json(
        { error: "Erro ao atualizar cupom: " + error.message },
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

// DELETE - Excluir cupom (apenas se não tiver usos)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar se cupom tem usos
    const { data: cupom } = await supabaseAdmin
      .from("cupons")
      .select("total_usos")
      .eq("id", id)
      .single();

    if (cupom && cupom.total_usos > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir um cupom já utilizado. Desative-o em vez disso." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("cupons")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao excluir cupom:", error);
      return NextResponse.json(
        { error: "Erro ao excluir cupom" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro na API:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}

// app/api/cupons/validar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { codigo, usuarioId, valorCompra } = await request.json();

    if (!codigo) {
      return NextResponse.json(
        { error: "Código do cupom é obrigatório" },
        { status: 400 }
      );
    }

    // Chamar função do banco para validar
    const { data, error } = await supabaseAdmin.rpc("validar_cupom", {
      p_codigo: codigo.toUpperCase().trim(),
      p_usuario_id: usuarioId || null,
      p_valor_compra: valorCompra || 0,
    });

    if (error) {
      console.error("Erro ao validar cupom:", error);
      return NextResponse.json(
        { error: "Erro ao validar cupom" },
        { status: 500 }
      );
    }

    const resultado = data?.[0];

    if (!resultado) {
      return NextResponse.json(
        { 
          valido: false, 
          mensagem: "Cupom não encontrado" 
        }
      );
    }

    // Se válido, buscar dados completos do cupom
    if (resultado.valido) {
      const { data: cupomData } = await supabaseAdmin
        .from("cupons")
        .select("*")
        .eq("id", resultado.cupom_id)
        .single();

      return NextResponse.json({
        valido: true,
        cupom: cupomData,
        tipo_desconto: resultado.tipo_desconto,
        valor_desconto: resultado.valor_desconto,
        mensagem: resultado.mensagem,
      });
    }

    return NextResponse.json({
      valido: false,
      mensagem: resultado.mensagem,
    });

  } catch (error: any) {
    console.error("Erro na API de validação:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}

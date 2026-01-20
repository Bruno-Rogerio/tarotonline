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

    console.log("📝 Validando cupom:", { codigo, usuarioId, valorCompra });

    if (!codigo) {
      return NextResponse.json(
        { valido: false, mensagem: "Código do cupom é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar cupom pelo código
    const { data: cupom, error: cupomError } = await supabaseAdmin
      .from("cupons")
      .select("*")
      .ilike("codigo", codigo.trim())
      .single();

    console.log("🔍 Cupom encontrado:", cupom, "Erro:", cupomError);

    if (cupomError || !cupom) {
      return NextResponse.json({
        valido: false,
        mensagem: "Cupom não encontrado",
      });
    }

    // Verificar status
    if (cupom.status !== "ativo") {
      return NextResponse.json({
        valido: false,
        mensagem:
          cupom.status === "expirado"
            ? "Cupom expirado"
            : "Cupom está desativado",
      });
    }

    // Verificar data de início
    if (cupom.data_inicio && new Date(cupom.data_inicio) > new Date()) {
      return NextResponse.json({
        valido: false,
        mensagem: "Cupom ainda não está válido",
      });
    }

    // Verificar data de fim
    if (cupom.data_fim && new Date(cupom.data_fim) < new Date()) {
      // Atualizar status para expirado
      await supabaseAdmin
        .from("cupons")
        .update({ status: "expirado" })
        .eq("id", cupom.id);

      return NextResponse.json({
        valido: false,
        mensagem: "Cupom expirado",
      });
    }

    // Verificar valor mínimo
    if (cupom.valor_minimo && valorCompra < cupom.valor_minimo) {
      return NextResponse.json({
        valido: false,
        mensagem: `Valor mínimo para este cupom: R$ ${cupom.valor_minimo.toFixed(
          2
        )}`,
      });
    }

    // Verificar limite total de usos
    if (
      cupom.limite_total_usos !== null &&
      cupom.total_usos >= cupom.limite_total_usos
    ) {
      return NextResponse.json({
        valido: false,
        mensagem: "Cupom esgotado",
      });
    }

    // Verificar limite por usuário (se usuário logado)
    if (usuarioId) {
      const { count: usosUsuario } = await supabaseAdmin
        .from("cupons_uso")
        .select("*", { count: "exact", head: true })
        .eq("cupom_id", cupom.id)
        .eq("usuario_id", usuarioId);

      console.log("👤 Usos do usuário:", usosUsuario);

      if (usosUsuario !== null && usosUsuario >= cupom.limite_por_usuario) {
        return NextResponse.json({
          valido: false,
          mensagem: "Você já utilizou este cupom",
        });
      }

      // Verificar se é apenas para novos usuários
      if (cupom.apenas_novos_usuarios) {
        const { count: comprasUsuario } = await supabaseAdmin
          .from("compras")
          .select("*", { count: "exact", head: true })
          .eq("usuario_id", usuarioId)
          .eq("status", "aprovado");

        console.log("🛒 Compras do usuário:", comprasUsuario);

        if (comprasUsuario !== null && comprasUsuario > 0) {
          return NextResponse.json({
            valido: false,
            mensagem: "Cupom válido apenas para primeira compra",
          });
        }
      }
    }

    // Cupom válido!
    console.log("✅ Cupom válido!");

    return NextResponse.json({
      valido: true,
      cupom: cupom,
      tipo_desconto: cupom.tipo_desconto,
      valor_desconto: cupom.valor_desconto,
      mensagem: "Cupom válido!",
    });
  } catch (error: any) {
    console.error("❌ Erro na API de validação:", error);
    return NextResponse.json(
      { valido: false, mensagem: "Erro ao validar cupom: " + error.message },
      { status: 500 }
    );
  }
}

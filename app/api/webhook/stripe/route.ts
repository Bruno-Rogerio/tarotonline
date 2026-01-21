// app/api/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // importante para Stripe webhook (evita edge)
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    console.error("❌ stripe-signature ausente");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    // Só processamos o evento que interessa
    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    const usuarioId = session.metadata?.usuarioId;
    const minutosStr = session.metadata?.minutos;
    const minutos = parseInt(minutosStr || "0", 10);

    console.log("🔔 checkout.session.completed", {
      sessionId: session.id,
      usuarioId,
      minutos,
      amount_total: session.amount_total,
      payment_status: session.payment_status,
      livemode: session.livemode,
    });

    if (!usuarioId || !minutos || minutos <= 0) {
      console.error("❌ Metadata inválida:", { usuarioId, minutosStr });
      return NextResponse.json(
        { error: "Missing or invalid metadata" },
        { status: 400 }
      );
    }

    // Segurança extra: só credita se estiver pago
    if (session.payment_status !== "paid") {
      console.warn(
        "⚠️ Sessão não está paga, ignorando:",
        session.payment_status
      );
      return NextResponse.json({ received: true });
    }

    // ✅ Idempotência: se já registrou essa sessão, não soma de novo
    const { data: existente, error: existenteError } = await supabaseAdmin
      .from("compras")
      .select("id, usuario_id, minutos, status, stripe_session_id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (existenteError) {
      console.error("❌ Erro ao checar compra existente:", existenteError);
      return NextResponse.json(
        { error: "Failed to check existing purchase" },
        { status: 500 }
      );
    }

    if (existente) {
      console.log("🟡 Evento já processado (compra existe). Ignorando:", {
        compraId: existente.id,
        stripe_session_id: session.id,
      });
      return NextResponse.json({ received: true });
    }

    // Buscar minutos atuais do usuário
    const { data: usuario, error: usuarioError } = await supabaseAdmin
      .from("usuarios")
      .select("minutos_disponiveis")
      .eq("id", usuarioId)
      .single();

    if (usuarioError) {
      console.error("❌ Erro ao buscar usuário:", usuarioError);
      return NextResponse.json(
        { error: "Failed to fetch user" },
        { status: 500 }
      );
    }

    const atuais = usuario?.minutos_disponiveis ?? 0;
    const novosMinutos = atuais + minutos;

    // Atualizar minutos
    const { error: updateError } = await supabaseAdmin
      .from("usuarios")
      .update({ minutos_disponiveis: novosMinutos })
      .eq("id", usuarioId);

    if (updateError) {
      console.error("❌ Erro ao atualizar minutos:", updateError);
      return NextResponse.json(
        { error: "Failed to update user minutes" },
        { status: 500 }
      );
    }

    // Registrar compra aprovada (agora com stripe_session_id existente no banco)
    const valor = session.amount_total ? session.amount_total / 100 : 0;

    const { error: compraError } = await supabaseAdmin.from("compras").insert({
      usuario_id: usuarioId,
      minutos,
      valor,
      status: "aprovado",
      stripe_session_id: session.id,
    });

    if (compraError) {
      console.error("❌ Erro ao inserir compra:", compraError);

      // Tentativa de rollback simples (opcional): remover os minutos adicionados
      // Se preferir NÃO tentar rollback, pode remover esse bloco.
      const { error: rollbackError } = await supabaseAdmin
        .from("usuarios")
        .update({ minutos_disponiveis: atuais })
        .eq("id", usuarioId);

      if (rollbackError) {
        console.error(
          "❌ Rollback falhou (minutos podem ter ficado somados):",
          {
            rollbackError,
            usuarioId,
            sessionId: session.id,
          }
        );
      }

      return NextResponse.json(
        { error: "Failed to register purchase" },
        { status: 500 }
      );
    }

    console.log(`✅ ${minutos} minutos adicionados para usuário ${usuarioId}`, {
      antes: atuais,
      depois: novosMinutos,
      stripe_session_id: session.id,
      valor,
    });

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("❌ Erro inesperado no webhook:", err?.message || err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const usuarioId = session.metadata?.usuarioId;
    const minutos = parseInt(session.metadata?.minutos || "0");

    if (usuarioId && minutos > 0) {
      // Buscar minutos atuais do usuário
      const { data: usuario } = await supabaseAdmin
        .from("usuarios")
        .select("minutos_disponiveis")
        .eq("id", usuarioId)
        .single();

      // Adicionar minutos
      const novosMinutos = (usuario?.minutos_disponiveis || 0) + minutos;

      await supabaseAdmin
        .from("usuarios")
        .update({ minutos_disponiveis: novosMinutos })
        .eq("id", usuarioId);

      // Registrar compra como aprovada
      await supabaseAdmin.from("compras").insert({
        usuario_id: usuarioId,
        minutos,
        valor: session.amount_total ? session.amount_total / 100 : 0,
        status: "aprovado",
        stripe_session_id: session.id,
      });

      console.log(
        `✅ ${minutos} minutos adicionados para usuário ${usuarioId}`
      );
    }
  }

  return NextResponse.json({ received: true });
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Mapeamento de minutos para Price IDs do Stripe
const PRICE_IDS: Record<number, string> = {
  20: "price_1SrSyNFFAjgAeuC1Ie10oYE5",
  30: "price_1SrSykFFAjgAeuC1DhP5nkcx",
  40: "price_1SrSyyFFAjgAeuC1YSN1aV0W",
  50: "price_1SrSzBFFAjgAeuC1WAgt1tK3",
  60: "price_1SrSzZFFAjgAeuC13WRR4qIi",
};

export async function POST(request: NextRequest) {
  console.log("🔵 Checkout API chamada");

  try {
    const body = await request.json();
    console.log("📦 Body recebido:", body);

    const { minutos, usuarioId, email } = body;

    const priceId = PRICE_IDS[minutos];
    console.log("💰 Price ID:", priceId);

    if (!priceId) {
      console.log("❌ Pacote inválido");
      return NextResponse.json({ error: "Pacote inválido" }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.log("❌ STRIPE_SECRET_KEY não configurada");
      return NextResponse.json(
        { error: "Stripe não configurado" },
        { status: 500 }
      );
    }

    const origin = request.headers.get("origin") || "https://viaa.app.br";
    console.log("🌐 Origin:", origin);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/comprar-minutos`,
      customer_email: email || undefined,
      metadata: {
        usuarioId: usuarioId || "",
        minutos: minutos.toString(),
      },
    });

    console.log("✅ Sessão criada:", session.id);
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Erro ao criar sessão:", error.message);
    return NextResponse.json(
      { error: error.message || "Erro ao criar sessão de pagamento" },
      { status: 500 }
    );
  }
}

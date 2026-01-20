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
  try {
    const { minutos, usuarioId, email } = await request.json();

    const priceId = PRICE_IDS[minutos];

    if (!priceId) {
      return NextResponse.json({ error: "Pacote inválido" }, { status: 400 });
    }

    // Usar a URL do request para construir as URLs de retorno
    const origin =
      request.headers.get("origin") || "https://viaa-tarot.vercel.app";

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
      customer_email: email,
      metadata: {
        usuarioId,
        minutos: minutos.toString(),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Erro ao criar sessão:", error);
    return NextResponse.json(
      { error: "Erro ao criar sessão de pagamento" },
      { status: 500 }
    );
  }
}

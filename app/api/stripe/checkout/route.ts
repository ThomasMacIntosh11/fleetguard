import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PLANS } from '@/lib/plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});

export async function POST(req: Request) {
  try {
    const { name, email, phone, company, plan } = await req.json();

    const priceId = PLANS[plan]?.stripePriceId;
    if (!priceId) {
      return NextResponse.json({ message: 'Invalid plan or Stripe price not set' }, { status: 400 });
    }

    const successUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/register/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${process.env.NEXT_PUBLIC_SITE_URL}/register?canceled=1`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        name, phone, company, plan,
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Stripe error' }, { status: 500 });
  }
}
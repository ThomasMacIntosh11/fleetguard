// app/api/register/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/hash';
import { signSession } from '@/lib/jwt';
import Stripe from 'stripe';
import { cookies } from 'next/headers';

const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2024-06-20' }) : null;

const PLAN_LIMITS: Record<string, number> = {
  Free: 5,
  Growth: 25,
  Scale: 50,
};

const PLAN_TO_PRICE: Record<string, string | undefined> = {
  Free: undefined,
  Growth: process.env.STRIPE_PRICE_GROWTH, // monthly price id in Stripe
  Scale: process.env.STRIPE_PRICE_SCALE,   // monthly price id in Stripe
};

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const name = (data.name || '').trim();
    const email = (data.email || '').toLowerCase().trim();
    const phone = (data.phone || '').trim();
    const company = (data.company || '').trim();
    const password = (data.password || '').trim();
    const pkg = data.package || 'Free';

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 });
    }
    if (!PLAN_LIMITS[pkg]) {
      return NextResponse.json({ error: 'Invalid package.' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email is already registered.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const vehicleLimit = PLAN_LIMITS[pkg];

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        company,
        password: passwordHash,
        package: pkg,
        vehicleLimit,
      },
    });

    // Free plan: set cookie session and send to /app
    if (pkg === 'Free') {
      const token = await signSession({ uid: user.id, email: user.email, pkg: user.package });

      cookies().set('fg_session', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return NextResponse.json({ ok: true, redirect: '/app' }, { status: 200 });
    }

    // Paid plan: create Stripe Checkout
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured but a paid plan was selected.' },
        { status: 500 }
      );
    }

    const priceId = PLAN_TO_PRICE[pkg];
    if (!priceId) {
      return NextResponse.json({ error: 'Missing Stripe price id for plan.' }, { status: 500 });
    }

    const customer = await stripe.customers.create({
      email,
      name: `${name} (${company || 'No Company'})`,
      metadata: { userId: user.id },
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/register/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/register`,
      metadata: { userId: user.id, plan: pkg },
    });

    return NextResponse.json({ ok: true, redirect: session.url }, { status: 200 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Registration failed.' }, { status: 500 });
  }
}
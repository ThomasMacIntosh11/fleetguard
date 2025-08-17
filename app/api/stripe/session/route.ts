import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('id');
  if (!sessionId) return NextResponse.json({ message: 'Missing session id' }, { status: 400 });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer'],
    });
    return NextResponse.json(session, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Not found' }, { status: 404 });
  }
}
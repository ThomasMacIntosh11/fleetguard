'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PLANS } from '@/lib/plans';

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (plan === 'free') {
      // Save user info locally for the free plan
      localStorage.setItem('fg_user', JSON.stringify({ id: 'local', name, email, password }));
      localStorage.setItem('fg_plan', JSON.stringify({ id: 'free', label: PLANS.free.label, maxVehicles: PLANS.free.maxVehicles, customerEmail: email }));
      setLoading(false);
      router.push('/app');
      return;
    }

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, company, plan, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create checkout session');
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      setError(e.message || 'An error occurred');
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold">Register</h1>

      <form onSubmit={onSubmit} className="mt-6 grid gap-6">
        <label className="text-sm">
          Name
          <input
            type="text"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={name} onChange={e => setName(e.target.value)} required
            placeholder="Your full name"
          />
        </label>

        <label className="text-sm">
          Email
          <input
            type="email"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="you@example.com"
          />
        </label>

        <label className="text-sm">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={password} onChange={e => setPassword(e.target.value)} required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </label>

        <label className="text-sm">
          Phone
          <input
            type="tel"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="Optional phone number"
          />
        </label>

        <label className="text-sm">
          Company
          <input
            type="text"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={company} onChange={e => setCompany(e.target.value)}
            placeholder="Optional company name"
          />
        </label>

        <label className="text-sm">
          Plan
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={plan} onChange={e => setPlan(e.target.value)}
          >
            {Object.entries(PLANS).map(([key, p]) => (
              <option key={key} value={key}>{p.label}</option>
            ))}
          </select>
        </label>

        {error && <p className="text-rose-600">{error}</p>}

        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-5 py-2 text-white disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Register'}
        </button>
      </form>
    </main>
  );
}

---

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

export async function POST(req: Request) {
  try {
    const { name, email, phone, company, plan, password } = await req.json();

    if (!email || !plan) {
      return new Response(JSON.stringify({ message: 'Missing required fields' }), { status: 400 });
    }

    const priceId = process.env[`STRIPE_PRICE_${plan.toUpperCase()}`];
    if (!priceId) {
      return new Response(JSON.stringify({ message: 'Invalid plan selected' }), { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { name, phone, company, plan, password },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/register/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/register`,
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ message: error.message || 'Internal server error' }), { status: 500 });
  }
}
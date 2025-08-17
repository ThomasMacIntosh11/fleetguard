'use client';

import { useState } from 'react';
import { PLANS, PlanId } from '@/lib/plans';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [plan, setPlan] = useState<PlanId>('free');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (!name.trim() || !email.trim() || !password.trim()) {
        throw new Error('Name, email, and password are required.');
      }

      // FREE plan: no Stripe — store plan & user locally and go straight to app
      if (plan === 'free') {
        const stored = {
          id: 'free',
          label: PLANS.free.label,
          maxVehicles: PLANS.free.maxVehicles,
          customerEmail: email.trim(),
        };
        localStorage.setItem('fg_plan', JSON.stringify(stored));
        // store a simple demo user locally (you can swap to real auth later)
        localStorage.setItem(
          'fg_user',
          JSON.stringify({ id: 'local', name: name.trim(), email: email.trim(), password: password.trim() })
        );
        window.location.href = '/app';
        return;
      }

      // Paid plans → create Stripe Checkout Session
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, company, plan, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to start checkout');

      window.location.href = json.url; // redirect to Stripe
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Create your FleetGuard account</h1>
      <p className="mt-2 text-slate-600">
        Tell us about you, then choose a package based on the number of vehicles.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Name
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="text-sm">
            Email
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Password
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </label>
          <label className="text-sm">
            Phone
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Company
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </label>
        </div>

        <fieldset className="mt-2">
          <legend className="text-sm font-medium">Choose a package</legend>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <PlanCard id="free" current={plan} onChange={setPlan} />
            <PlanCard id="growth" current={plan} onChange={setPlan} />
            <PlanCard id="scale" current={plan} onChange={setPlan} />
          </div>
        </fieldset>

        {error && <div className="text-rose-600 text-sm">{error}</div>}

        <div className="pt-2">
          <button
            disabled={submitting}
            className="rounded-xl bg-slate-900 px-5 py-2 text-white disabled:opacity-60"
          >
            {submitting ? 'Processing…' : 'Continue'}
          </button>
        </div>
      </form>

      <p className="mt-6 text-xs text-slate-500">
        Payments are processed by Stripe. You’ll be redirected to a secure checkout for paid plans.
      </p>
    </main>
  );
}

function PlanCard({
  id,
  current,
  onChange,
}: {
  id: keyof typeof PLANS;
  current: string;
  onChange: (p: keyof typeof PLANS) => void;
}) {
  const p = PLANS[id];
  return (
    <label
      className={`rounded-2xl border p-4 cursor-pointer ${
        current === id ? 'border-slate-900' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{p.label}</div>
          <div className="text-sm text-slate-600 mt-1">
            Up to <b>{p.maxVehicles}</b> vehicles
          </div>
        </div>
        <input
          type="radio"
          name="plan"
          value={id}
          checked={current === id}
          onChange={() => onChange(id)}
          className="mt-1"
        />
      </div>
      <div className="mt-3 text-sm">
        {p.priceMonthly === 0 ? (
          <span className="font-medium">Free</span>
        ) : (
          <span>
            <span className="text-xl font-semibold">${p.priceMonthly}</span>/mo
          </span>
        )}
      </div>
    </label>
  );
}
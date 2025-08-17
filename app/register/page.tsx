"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    plan: "free",
  });

  function onChange<K extends keyof typeof form>(k: K, v: string) {
    setForm({ ...form, [k]: v });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Stripe disabled for now—just redirect to success
    router.push(
      `/register/success?plan=${encodeURIComponent(form.plan)}&email=${encodeURIComponent(
        form.email
      )}`
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Create your FleetGuard account</h1>
      <p className="mt-2 text-slate-600">
        Payments are temporarily disabled. You can still complete registration and choose a plan;
        billing will be enabled later.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <label className="text-sm">
          Name
          <input
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
          <label className="text-sm">
            Phone
            <input
              value={form.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
        </div>

        <label className="text-sm">
          Company
          <input
            value={form.company}
            onChange={(e) => onChange("company", e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>

        <fieldset className="mt-2">
          <legend className="text-sm font-medium">Choose a package</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              { id: "free", title: "Free", caption: "Up to 5 vehicles" },
              { id: "growth", title: "Growth", caption: "Up to 25 vehicles" },
              { id: "scale", title: "Scale", caption: "Up to 50 vehicles" },
            ].map((p) => (
              <label
                key={p.id}
                className={`rounded-xl border p-4 ${
                  form.plan === p.id ? "border-slate-900" : "border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={p.id}
                  checked={form.plan === p.id}
                  onChange={() => onChange("plan", p.id)}
                  className="sr-only"
                />
                <div className="font-medium">{p.title}</div>
                <div className="text-sm text-slate-600">{p.caption}</div>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow hover:shadow-md"
          >
            Continue
          </button>
        </div>
      </form>
    </main>
  );
}
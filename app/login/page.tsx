'use client';

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function LoginPage() {
  const params = useSearchParams();
  const router = useRouter();
  const next = params.get("next") || "/app";

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");

  // If already logged in, go straight to /app (or ?next=...)
  useEffect(() => {
    if (document.cookie.includes("fg_session=1")) {
      router.replace(next);
    }
  }, [router, next]);

  function onLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !pwd) return alert("Enter email & password (demo accepts anything).");
    document.cookie = "fg_session=1; path=/; max-age=86400; samesite=lax";
    router.replace(next);
  }

  return (
    <main className="min-h-screen grid place-items-center">
      <form onSubmit={onLogin} className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6">
        <div className="text-xl font-semibold">Login</div>
        <div className="text-sm text-slate-600 mt-1">Demo: any email/password works.</div>
        <label className="block mt-4 text-sm">
          <div className="text-xs text-slate-600 mb-1">Email</div>
          <input className="w-full px-3 py-2 rounded-xl border border-slate-200"
                 value={email} onChange={(e)=>setEmail(e.target.value)} />
        </label>
        <label className="block mt-3 text-sm">
          <div className="text-xs text-slate-600 mb-1">Password</div>
          <input type="password" className="w-full px-3 py-2 rounded-xl border border-slate-200"
                 value={pwd} onChange={(e)=>setPwd(e.target.value)} />
        </label>
        <button type="submit" className="mt-5 w-full px-4 py-2 rounded-2xl bg-slate-900 text-white">Continue</button>
      </form>
    </main>
  );
}

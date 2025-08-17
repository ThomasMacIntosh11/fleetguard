import Link from "next/link";

export default function SuccessPage({
  searchParams,
}: {
  searchParams?: { plan?: string; email?: string };
}) {
  const plan = searchParams?.plan ?? "your selected plan";
  const email = searchParams?.email ?? "your email";

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">You're all set! 🎉</h1>
        <p className="mt-3 text-slate-700">
          Thanks for registering. You chose <span className="font-medium">{plan}</span>. We’ll enable
          billing shortly and email <span className="font-medium">{email}</span> when payment is available.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/app"
            className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow hover:shadow-md"
          >
            Go to the app
          </Link>
          <Link href="/" className="rounded-xl border border-slate-200 px-4 py-2">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
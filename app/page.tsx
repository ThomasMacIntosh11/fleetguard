// app/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import {
  BookOpen,
  RefreshCw,
  MapPin,
  ClipboardList,
  ShieldCheck,
  FileArchive,
} from 'lucide-react';

// Full‑bleed, looping reviews component (place at components/ReviewCarousel.tsx)
import ReviewCarousel from '@/components/ReviewCarousel';

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <div className="relative min-h-screen bg-[#F4F8FC] overflow-hidden">
      {/* Ambient animated background */}
      <AnimatedBackground />

      {/* Hero */}
      <section className="relative z-20 border-y border-[#E1EDF7]/60 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: copy + CTAs */}
          <div className="lg:col-span-7">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Stay compliant.
              <br />
              Avoid downtime.
            </h1>

            <p className="mt-5 max-w-2xl text-lg text-slate-600">
              FleetGuard is the easiest way to track registration and vehicle
              compliance for your Canadian fleet.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {/* Parallax tilt on primary CTA */}
              <ParallaxCTA>
                <Link
                  href="/register"
                  className="inline-flex items-center rounded-2xl bg-[#0C3A5B] px-5 py-3 text-white font-medium shadow-lg hover:shadow-xl transition will-change-transform"
                >
                  Try for Free
                </Link>
              </ParallaxCTA>

              <a
                href="#features"
                className="inline-flex items-center rounded-2xl border border-[#A5C6E5] bg-white px-5 py-3 text-slate-900 font-medium hover:bg-[#F4F8FC] transition"
              >
                See features
              </a>
            </div>
          </div>

          {/* Right: floating dashboard image */}
          <div className="lg:col-span-5 relative">
            {/* subtle glow behind the mock */}
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-white to-[#E9F3FB] blur-2xl" />

            <div
              className="
                relative rounded-[1.75rem] overflow-hidden
                ring-1 ring-[#E1EDF7]/70 shadow-2xl bg-white/60 backdrop-blur
                animate-float-slow
              "
              style={{ transformOrigin: 'center center' }}
            >
             {/* RIGHT: dashboard visual — full image, not clipped, stronger hover */}
<div className="relative group overflow-visible">
  {/* subtle ambient glow on hover (doesn’t affect layout) */}
  <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[28px] bg-gradient-to-tr from-slate-200/40 via-white to-slate-200/40 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

  <div className="relative mx-auto w-full max-w-[760px]">
    <img
      src="/dashboard-hero.png"             // ← keep your existing path
      alt="FleetGuard dashboard preview"
      className="
        block w-full h-auto object-contain   /* <-- ensures whole image shows */
        rounded-2xl ring-1 ring-[#0C3A5B]/5
        shadow-[0_20px_40px_-20px_rgba(15,23,42,0.25)]
        transition-transform duration-500 ease-out
        group-hover:-translate-y-1 group-hover:scale-[1.03]
        group-hover:shadow-[0_35px_65px_-25px_rgba(15,23,42,0.35)]
      "
    />
    {/* soft floor shadow to accent the hover lift */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-6 left-1/2 h-8 w-[70%] -translate-x-1/2 rounded-full bg-[#0C3A5B]/10 blur-xl transition-opacity duration-500 group-hover:opacity-70"
    />
  </div>
</div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent" />
            </div>

            {/* tiny floating dot for depth */}
            <div className="pointer-events-none absolute -right-4 -bottom-4 h-3 w-3 rounded-full bg-[#A5C6E5] animate-float-slower" />
          </div>
        </div>
      </section>

      {/* How it works (anchor only, content kept simple) */}
      <section id="how" className="relative z-20">
        <div className="mx-auto max-w-7xl px-4 pb-8">
          <div className="bg-[#F4F8FC] border border-[#A5C6E5] rounded-3xl p-6 md:p-10 shadow-md">
            <div className="grid gap-6 md:grid-cols-3">
              <Step step="1" title="Connect your fleet" desc="Add vehicles or import from CSV. Pick your provinces." />
              <Step step="2" title="Add documents" desc="Upload registrations, insurance, inspections, CVOR or Safety Fitness." />
              <Step step="3" title="Get proactive" desc="Automatic tasks & reminders before anything expires." />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-20">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Product</p>
              <h2 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight">Features</h2>
            </div>
            <div className="hidden md:block text-sm text-slate-500">
              Built for Canadian SMB fleets • {year}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<BookOpen className="h-5 w-5" />}
              title="One Click Audit File"
              desc="Download all compliance documents with one click."
            />
            <FeatureCard
              icon={<RefreshCw className="h-5 w-5" />}
              title="Renewal automation"
              desc="Tasks auto‑create for expiring/missing items."
            />
            <FeatureCard
              icon={<MapPin className="h-5 w-5" />}
              title="Province‑aware"
              desc="CVOR (ON), Safety Fitness (QC/AB), NSC Std. 11."
            />
            <FeatureCard
              icon={<ClipboardList className="h-5 w-5" />}
              title="IFTA support"
              desc="Track quarterly filings and reminders."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="DVIR (optional)"
              desc="Daily inspections & defect workflow."
            />
            <FeatureCard
              icon={<FileArchive className="h-5 w-5" />}
              title="Audit pack"
              desc="One‑click ZIP/PDF for roadside or auditors."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-20 bg-[#F4F8FC]">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Pricing</p>
              <h2 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight">
                Simple, transparent pricing
              </h2>
            </div>
            <div className="hidden md:block text-sm text-slate-500">
              Built for Canadian SMB fleets • {year}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Tier 1 */}
            <PricingCard
              name="Start"
              subtitle="Up to 5 vehicles"
              price="$49"
              features={['All compliance features', 'Alerts & reminders', 'Vehicle compliance binder']}
              cta="Get started"
            />

            {/* Tier 2 */}
            <PricingCard
              name="Growth"
              subtitle="Up to 25 vehicles"
              price="$199"
              features={['Everything in Free', 'Renewal automation', 'Priority email support']}
              cta="Start free trial"
            />

            {/* Tier 3 */}
            <PricingCard
              name="Scale"
              subtitle="Up to 50 vehicles"
              price="$500"
              features={['Everything in Growth', 'API access', 'Dedicated support']}
              cta="Start free trial"
              footer={
                <div className="mt-6 border-t border-[#E1EDF7] pt-4 text-sm text-slate-500">
                  More than 50 vehicles?{' '}
                  <a href="/contact" className="font-medium text-slate-900 hover:underline">
                    Contact us for special pricing
                  </a>
                </div>
              }
            />
          </div>
        </div>
      </section>

      {/* Reviews (full‑bleed) */}
      <section id="reviews" className="relative z-20 bg-[#F4F8FC] py-16">
        {/* Headings stay within content width */}
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-xs uppercase tracking-wider text-slate-500">Social proof</h2>
          <h3 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight">
            Trusted by fleets across Canada
          </h3>
        </div>

        {/* Carousel escapes container to screen edges */}
        <div className="relative w-screen left-1/2 right-1/2 -mx-[50vw] mt-8">
          <ReviewCarousel />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 border-t border-[#E1EDF7] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-slate-500 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" width={24} height={24} alt="FleetGuard" className="rounded-sm" />
            <span>© {year} FleetGuard. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <a href="#reviews" className="hover:text-slate-900">Reviews</a>
          </div>
        </div>
      </footer>

      {/* Local keyframes & utilities */}
      <StyleAnimations />
    </div>
  );
}

/* ------------------------------- UI bits ---------------------------------- */

function ParallaxCTA({ children }: { children: React.ReactNode }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useTransform(my, [-30, 30], [6, -6]);
  const rotY = useTransform(mx, [-30, 30], [-6, 6]);
  const trans = { type: 'spring', stiffness: 140, damping: 12 };

  return (
    <motion.div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - (r.left + r.width / 2)) / 8);
        my.set((e.clientY - (r.top + r.height / 2)) / 8);
      }}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      style={{ rotateX: rotX, rotateY: rotY }}
      transition={trans}
      className="will-change-transform"
    >
      {children}
    </motion.div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -6, boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)' }}
      className="relative overflow-hidden rounded-3xl border border-[#E1EDF7] bg-white p-5 transition"
    >
      {/* Animated corner blob */}
      <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-tr from-[#E1EDF7]/60 to-white blur-2xl animate-blob" />
      <div className="flex items-start gap-3 relative z-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E9F3FB] text-[#0C3A5B] ring-1 ring-[#E1EDF7]">
          {icon}
        </div>
        <div>
          <div className="font-semibold">{title}</div>
          <p className="mt-1 text-sm text-slate-600">{desc}</p>
        </div>
      </div>
    </motion.div>
  );
}

function Step({
  step,
  title,
  desc,
}: {
  step: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0C3A5B] text-white text-sm font-semibold shadow-sm">
        {step}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <p className="mt-1 text-sm text-slate-600">{desc}</p>
      </div>
    </div>
  );
}

function PricingCard({
  name,
  subtitle,
  price,
  features,
  cta,
  footer,
}: {
  name: string;
  subtitle: string;
  price: string;
  features: string[];
  cta: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#E1EDF7] bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition">
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
      <p className="mt-4 text-3xl font-extrabold">
        {price}<span className="text-lg font-medium">/mo</span>
      </p>
      <ul className="mt-6 space-y-2 text-sm text-slate-600">
        {features.map((f) => (
          <li key={f}>✔ {f}</li>
        ))}
      </ul>
      <Link
        href="/register"
        className="mt-8 block w-full rounded-xl bg-[#0C3A5B] text-white text-center py-2 font-medium hover:shadow-md transition hover:bg-[#0A2E4C]"
      >
        {cta}
      </Link>
      {footer}
    </div>
  );
}

/* ----------------------- Background decorations --------------------------- */

function AnimatedBackground() {
  return (
    <>
      {/* radial grid glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_120%_40%_at_50%_-10%,rgba(148,163,184,.25),transparent)]" />
      {/* soft orbs */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-white to-[#E9F3FB] blur-3xl" />
      <div className="pointer-events-none absolute -left-28 bottom-[-12rem] h-[26rem] w-[26rem] rounded-full bg-gradient-to-tr from-[#E9F3FB] to-white blur-3xl" />
      {/* floating dots */}
      <div className="pointer-events-none absolute left-10 top-32 z-10 hidden md:block">
        <div className="h-2 w-2 rounded-full bg-[#A5C6E5] animate-float-slow" />
      </div>
      <div className="pointer-events-none absolute right-24 top-56 z-10 hidden md:block">
        <div className="h-2 w-2 rounded-full bg-[#A5C6E5] animate-float-slower" />
      </div>
    </>
  );
}

/* ---------------------- Local keyframes (no Tailwind cfg) ----------------- */

function StyleAnimations() {
  return (
    <style jsx global>{`
      @keyframes float-slow {
        0%   { transform: translateY(0px); }
        50%  { transform: translateY(-8px); }
        100% { transform: translateY(0px); }
      }
      @keyframes float-slower {
        0%   { transform: translateY(0px);   opacity: .8; }
        50%  { transform: translateY(-12px); opacity: 1; }
        100% { transform: translateY(0px);   opacity: .8; }
      }
      .animate-float-slow   { animation: float-slow 8s ease-in-out infinite; }
      .animate-float-slower { animation: float-slower 10s ease-in-out infinite; }

      @keyframes blob {
        0%,100% { transform: translate(0,0) scale(1); }
        50%     { transform: translate(-8px,4px) scale(1.05); }
      }
      .animate-blob { animation: blob 12s ease-in-out infinite; }
    `}</style>
  );
}
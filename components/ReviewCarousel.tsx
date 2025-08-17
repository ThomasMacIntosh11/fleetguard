'use client';

import { useEffect, useRef } from 'react';

// You can swap this for data from an API/CMS later.
const reviews = [
  { name: 'Sarah T.', company: 'Ontario Logistics', text: 'FleetGuard makes compliance stress-free — it’s saved us hours every month!' },
  { name: 'Mike R.', company: 'Prairie Haulage', text: 'Renewal automation is a game-changer. We haven’t missed a single deadline.' },
  { name: 'Lisa P.', company: 'BC Freight', text: 'The compliance binder keeps everything in one place — auditors love it.' },
  { name: 'John D.', company: 'Northern Express', text: 'Worth every penny. We sleep better knowing everything is tracked.' },
  { name: 'Karen M.', company: 'East Coast Carriers', text: 'Super intuitive. Even our drivers can upload documents with ease.' },
];

export default function ReviewCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Duplicate reviews for a seamless loop
  const looped = [...reviews, ...reviews];

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    let raf = 0;
    let x = 0;

    const tick = () => {
      // Adjust speed here (px per frame)
      x += 0.35;
      const half = el.scrollWidth / 2;
      if (x >= half) x = 0;
      el.scrollLeft = x;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative w-full overflow-hidden">
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-slate-50 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-slate-50 to-transparent" />

      {/* The scrolling track */}
      <div
        ref={scrollerRef}
        className="
          flex gap-4 overflow-x-hidden
          [scrollbar-width:none] [-ms-overflow-style:none]
          [&::-webkit-scrollbar]:hidden
          px-4
        "
      >
        {looped.map((r, i) => (
          <article
            key={i}
            className="
              min-w-[78vw] sm:min-w-[45vw] md:min-w-[36vw] lg:min-w-[28vw]
              bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg transition
              border border-slate-200
            "
          >
            <p className="text-slate-800 italic leading-relaxed">“{r.text}”</p>
            <div className="mt-4">
              <div className="font-semibold text-slate-900">{r.name}</div>
              <div className="text-sm text-slate-500">{r.company}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
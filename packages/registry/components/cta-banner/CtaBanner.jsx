import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function CtaBanner({
  title = 'Ready when you are',
  subtitle = 'Start today. It takes a few minutes.',
  ctaLabel = 'Get in touch',
  ctaHref = 'mailto:hello@example.com',
}) {
  return (
    <section id="contact" className="mx-auto max-w-6xl px-6 py-24">
      <div className="flex flex-col items-start justify-between gap-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/0 p-10 md:flex-row md:items-center md:p-14">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{title}</h2>
          <p className="mt-3 text-lg text-zinc-400">{subtitle}</p>
        </div>
        <a href={ctaHref} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200">
          {ctaLabel}
          <ArrowRight size={16} />
        </a>
      </div>
    </section>
  );
}

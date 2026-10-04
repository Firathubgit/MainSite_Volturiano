import React from 'react';
import { ArrowRight } from 'lucide-react';

const DEFAULT_STATS = [
  { value: '12k+', label: 'Customers' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9/5', label: 'Average rating' },
];

export default function HeroSplit({
  eyebrow = 'New',
  title = 'A clear headline that says what you do',
  subtitle = 'One or two sentences that explain the value and who it is for.',
  primaryLabel = 'Get started',
  primaryHref = '#contact',
  secondaryLabel = 'See how it works',
  secondaryHref = '#features',
  stats = DEFAULT_STATS,
}) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-2 md:py-32">
      <div>
        {eyebrow && (
          <span className="inline-block rounded-full border border-white/15 px-3 py-1 text-xs font-medium uppercase tracking-widest text-zinc-400">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl">{title}</h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-400">{subtitle}</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <a href={primaryHref} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200">
            {primaryLabel}
            <ArrowRight size={16} />
          </a>
          <a href={secondaryHref} className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10">
            {secondaryLabel}
          </a>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/0 p-8">
        <dl className="grid gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-baseline justify-between border-b border-white/10 pb-6 last:border-0 last:pb-0">
              <dt className="text-sm text-zinc-400">{stat.label}</dt>
              <dd className="text-3xl font-semibold tracking-tight text-white">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

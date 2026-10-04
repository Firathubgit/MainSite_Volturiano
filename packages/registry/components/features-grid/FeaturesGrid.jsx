import React from 'react';
import { Gauge, Layers, Lock, Sparkles, Wrench, Zap } from 'lucide-react';

const DEFAULT_FEATURES = [
  { icon: Zap, title: 'Fast by default', text: 'Pages load quickly on any connection.' },
  { icon: Lock, title: 'Private and secure', text: 'Your data stays yours, with sensible defaults.' },
  { icon: Layers, title: 'Built to grow', text: 'Start small and add what you need later.' },
  { icon: Wrench, title: 'Easy to change', text: 'Clear structure that is simple to edit.' },
  { icon: Gauge, title: 'Measured', text: 'See what works with built-in numbers.' },
  { icon: Sparkles, title: 'Polished details', text: 'Small touches that make it feel finished.' },
];

export default function FeaturesGrid({
  eyebrow = 'Features',
  title = 'Everything you need to get going',
  subtitle = 'A short line that frames the list below.',
  features = DEFAULT_FEATURES,
}) {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="max-w-2xl">
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">{eyebrow}</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">{title}</h2>
        <p className="mt-4 text-lg text-zinc-400">{subtitle}</p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon || Sparkles;
          return (
            <article key={feature.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/25">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                <Icon size={18} />
              </span>
              <h3 className="mt-5 text-lg font-medium text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{feature.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

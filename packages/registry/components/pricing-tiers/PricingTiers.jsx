import React from 'react';
import { Check } from 'lucide-react';

const DEFAULT_PLANS = [
  { name: 'Starter', price: '$0', period: 'per month', features: ['One project', 'Community support', 'Basic analytics'], cta: 'Start free' },
  { name: 'Team', price: '$29', period: 'per month', features: ['Unlimited projects', 'Priority support', 'Advanced analytics', 'Custom domain'], cta: 'Choose Team', highlighted: true },
  { name: 'Business', price: '$99', period: 'per month', features: ['Everything in Team', 'Single sign-on', 'Dedicated contact'], cta: 'Talk to us' },
];

export default function PricingTiers({
  eyebrow = 'Pricing',
  title = 'Simple pricing',
  subtitle = 'Pick the plan that fits. Change it any time.',
  plans = DEFAULT_PLANS,
}) {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">{eyebrow}</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">{title}</h2>
        <p className="mt-4 text-lg text-zinc-400">{subtitle}</p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`flex flex-col rounded-3xl border p-8 ${plan.highlighted ? 'border-white bg-white text-black' : 'border-white/10 bg-white/[0.03] text-white'}`}
          >
            <h3 className="text-lg font-medium">{plan.name}</h3>
            <p className="mt-6 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
              <span className={plan.highlighted ? 'text-sm text-zinc-600' : 'text-sm text-zinc-400'}>{plan.period}</span>
            </p>
            <ul className="mt-8 flex-1 space-y-3 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check size={16} className="mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <a
              href="#contact"
              className={`mt-10 rounded-full px-5 py-3 text-center text-sm font-medium transition ${plan.highlighted ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}
            >
              {plan.cta}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

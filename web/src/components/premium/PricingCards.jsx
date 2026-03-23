import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';

const plans = [
    {
        name: "Free",
        price: "$0/mo",
        description: "Best for 1-5 users",
        features: [
            { name: "One workspace", included: true },
            { name: "Email support", included: true },
            { name: "1 day data retention", included: false },
            { name: "Custom roles", included: false },
            { name: "Priority support", included: false },
            { name: "SSO", included: false }
        ],
        cta: "Get started free",
        buttonVariant: "outline"
    },
    {
        name: "Pro",
        price: "$79/mo",
        description: "Best for 5-50 users",
        features: [
            { name: "Five workspaces", included: true },
            { name: "Email support", included: true },
            { name: "7 day data retention", included: true },
            { name: "Custom roles", included: true },
            { name: "Priority support", included: false },
            { name: "SSO", included: false }
        ],
        cta: "14-day free trial",
        buttonVariant: "default",
        highlighted: true
    },
    {
        name: "Enterprise",
        price: "Contact us",
        description: "Best for 50+ users",
        features: [
            { name: "Unlimited workspaces", included: true },
            { name: "Email support", included: true },
            { name: "30 day data retention", included: true },
            { name: "Custom roles", included: true },
            { name: "Priority support", included: true },
            { name: "SSO", included: true }
        ],
        cta: "Contact us",
        buttonVariant: "ghost"
    }
];

export default function PricingCards({
    title = "Pricing",
    subtitle = "Use it for free for yourself, upgrade when your team needs advanced control."
}) {
    return (
        <section className="py-24 px-6 bg-black text-white overflow-hidden">
            <div className="max-w-7xl mx-auto text-center mb-16">
                <h2
                    className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                >
                    {title}
                </h2>
                <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto">
                    {subtitle}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {plans.map((plan, index) => (
                    <Card
                        key={index}
                        className={cn(
                            "bg-zinc-950/50 border-zinc-800 flex flex-col transition-all duration-300 hover:border-zinc-700",
                            plan.highlighted && "border-zinc-700 ring-1 ring-zinc-700"
                        )}
                    >
                        <CardHeader className="text-center pt-10 pb-6 border-b border-zinc-900/50">
                            <CardDescription className="text-zinc-400 uppercase tracking-[0.15em] text-[10px] font-bold mb-4">
                                {plan.name}
                            </CardDescription>
                            <CardTitle className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
                                {plan.price}
                            </CardTitle>
                            <p className="text-sm text-zinc-500">
                                {plan.description}
                            </p>
                        </CardHeader>
                        <CardContent className="flex-1 px-8 py-10">
                            <ul className="space-y-4">
                                {plan.features.map((feature, fIndex) => (
                                    <li key={fIndex} className="flex items-center gap-3">
                                        <div className={cn(
                                            "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center",
                                            feature.included ? "bg-white" : "bg-zinc-800/50"
                                        )}>
                                            {feature.included ? (
                                                <Check className="w-3 h-3 text-black stroke-[3]" />
                                            ) : (
                                                <X className="w-3 h-3 text-zinc-600 stroke-[3]" />
                                            )}
                                        </div>
                                        <span className={cn(
                                            "text-sm font-medium",
                                            feature.included ? "text-zinc-200" : "text-zinc-500"
                                        )}>
                                            {feature.name}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter className="px-8 pb-10">
                            <Button
                                variant={plan.buttonVariant}
                                className={cn(
                                    "w-full rounded-xl py-6 font-bold transition-all duration-300",
                                    plan.buttonVariant === 'default' ? "bg-white text-black hover:bg-zinc-200" : "border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white"
                                )}
                            >
                                {plan.cta}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </section>
    );
}

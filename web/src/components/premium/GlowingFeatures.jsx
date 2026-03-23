import React from 'react';
import { GlowingEffect } from '../ui/glowing-effect';
import { Box, Lock, Search, Settings, Sparkles, Zap } from 'lucide-react';

const iconMap = { Box, Lock, Search, Settings, Sparkles, Zap };

const defaultFeatures = [
    {
        icon: 'Zap',
        title: 'Intelligent Automation',
        description: 'Streamline your workflow with AI-driven task orchestration that learns and adapts to your unique requirements.',
        span: 'md:col-span-1'
    },
    {
        icon: 'Lock',
        title: 'Secure by Design',
        description: 'Privacy-first architecture featuring military-grade end-to-end encryption and robust access control protocols.',
        span: 'md:col-span-1'
    },
    {
        icon: 'Sparkles',
        title: 'Premium Aesthetics',
        description: 'A visually stunning interface designed to captivate your users with fluid animations and harmonious design principles.',
        span: 'md:col-span-1'
    },
    {
        icon: 'Search',
        title: 'Advanced Discovery',
        description: 'Locate what you need instantly with our high-performance semantic search and filtering engine.',
        span: 'md:col-span-2'
    },
    {
        icon: 'Settings',
        title: 'Infinite Scalability',
        description: 'Built on a modular foundation that grows with your business, supporting millions of requests with ease.',
        span: 'md:col-span-1'
    }
];

export default function GlowingFeatures({
    headline = 'Precision Engineering',
    subheadline = 'Where sophisticated engineering meets visionary design to create elite digital experiences.',
    features = defaultFeatures
}) {
    return (
        <section className="relative py-24 sm:py-32 bg-black overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="max-w-3xl mb-20">
                    <h2
                        className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6"
                        style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                        {headline}
                    </h2>
                    <p className="text-lg sm:text-xl text-zinc-400 leading-relaxed">
                        {subheadline}
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                    {features.map((feature, i) => {
                        const Icon = iconMap[feature.icon] || Sparkles;
                        return (
                            <div
                                key={i}
                                className={`group relative h-full rounded-2xl border border-white/[0.08] bg-zinc-900/[0.4] p-8 transition-all duration-300 hover:bg-zinc-900/[0.6] ${feature.span}`}
                            >
                                {/* Glowing Effect Overlay */}
                                <GlowingEffect
                                    spread={40}
                                    proximity={64}
                                    inactiveZone={0.01}
                                    borderWidth={1.5}
                                />

                                <div className="relative z-10">
                                    <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center mb-6 border border-white/[0.1] group-hover:border-white/[0.2] transition-colors">
                                        <Icon className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" />
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                                        {feature.title}
                                    </h3>
                                    <p className="text-zinc-400 leading-relaxed text-sm lg:text-base">
                                        {feature.description}
                                    </p>
                                </div>

                                {/* Subtle Background Accent */}
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

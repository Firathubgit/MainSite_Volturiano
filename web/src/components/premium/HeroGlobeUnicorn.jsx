"use client";

import React, { useEffect, useState } from 'react';

export default function HeroGlobeUnicorn({
    headline = 'Global Innovation Reimagined',
    subheadline = 'Experience the future of digital connectivity through our interactive global network.',
    projectId = 'TisEHDDxsvsO8n0PqwON'
}) {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const initUnicorn = () => {
            const u = window.UnicornStudio;
            if (u && u.init) {
                u.init();
                setIsLoaded(true);
            }
        };

        if (!window.UnicornStudio) {
            window.UnicornStudio = { isInitialized: false };
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.5/dist/unicornStudio.umd.js';
            script.onload = () => {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', initUnicorn);
                } else {
                    initUnicorn();
                }
            };
            (document.head || document.body).appendChild(script);
        } else {
            initUnicorn();
        }
    }, []);

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black text-white">
            {/* Unicorn Studio Background */}
            <div
                className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                data-us-project={projectId}
                style={{ width: '100%', height: '100%' }}
            ></div>

            {/* Subtle Grain Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.1] mix-blend-overlay"
                style={{ backgroundImage: `url('https://grainy-gradients.vercel.app/noise.svg')` }}></div>

            {/* Content Overlay */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
                <h1
                    className="text-5xl md:text-7xl lg:text-9xl font-bold tracking-tight mb-8 leading-[0.9] uppercase italic"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                >
                    {headline}
                </h1>
                <p className="text-lg md:text-xl text-white/50 max-w-2xl leading-relaxed font-light tracking-wide">
                    {subheadline}
                </p>
            </div>

            {/* Bottom Interface Branding */}
            <div className="absolute bottom-12 left-12 right-12 flex flex-col md:flex-row items-end justify-between gap-8 pointer-events-none">
                <div className="flex flex-col gap-2 pointer-events-auto">
                    <span className="text-[10px] text-white/30 font-mono tracking-[0.4em] uppercase">Architecture</span>
                    <span className="text-xs font-bold tracking-widest text-zinc-400">GLOBAL_INTERACTIVE_V1</span>
                </div>

                <div className="flex items-center gap-8 pointer-events-auto">
                    <div className="h-px w-24 bg-white/10 hidden lg:block"></div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-white/30 font-mono tracking-[0.4em] uppercase mb-1">Status</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold tracking-widest text-emerald-500">SYSTEM_OPERATIONAL</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Side Label */}
            <div className="absolute right-8 top-1/2 -rotate-90 origin-right text-[10px] text-white/20 font-mono tracking-[0.6em] hidden lg:block uppercase whitespace-nowrap">
                Volturiano // Series 004 // Globe
            </div>
        </section>
    );
}

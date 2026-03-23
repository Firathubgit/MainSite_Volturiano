"use client";

import React, { useEffect, useState } from 'react';

export default function HeroVideoAbstractUnicorn({
    headline = 'Interactive Digital Experiences',
    subheadline = 'Crafting the next generation of visual storytelling through generative art and interactive motion design.',
    ctaPrimary = 'Explore Motion',
    ctaSecondary = 'Our Process',
    ctaPrimaryHref = '#',
    ctaSecondaryHref = '#',
    projectId = 'kwUrhoUqHLMoJr60Itfz'
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

            {/* Noise/Grain Overlay (to match the aesthetic in the screenshot) */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.15] mix-blend-overlay"
                style={{ backgroundImage: `url('https://grainy-gradients.vercel.app/noise.svg')` }}></div>

            {/* Content Overlay */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
                <h1
                    className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-tight max-w-4xl"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                >
                    {headline}
                </h1>
                <p className="text-lg md:text-xl text-white/60 max-w-2xl mb-12 leading-relaxed font-light">
                    {subheadline}
                </p>

                <div className="flex flex-wrap justify-center gap-6">
                    <a
                        href={ctaPrimaryHref}
                        className="group relative px-10 py-4 bg-white text-black font-bold rounded-full overflow-hidden transition-all hover:scale-105"
                    >
                        <span className="relative z-10">{ctaPrimary}</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </a>
                    <a
                        href={ctaSecondaryHref}
                        className="px-10 py-4 bg-white/5 border border-white/20 text-white font-bold rounded-full hover:bg-white/10 transition-all backdrop-blur-md"
                    >
                        {ctaSecondary}
                    </a>
                </div>
            </div>

            {/* Bottom Interface Elements */}
            <div className="absolute bottom-12 left-0 right-0 px-8 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-0 pointer-events-none">
                <div className="flex items-center gap-8 pointer-events-auto">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-white/30 font-mono tracking-widest uppercase mb-1">Status</span>
                        <span className="text-xs font-bold tracking-widest text-emerald-400 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            LIVE_RENDER_ACTIVE
                        </span>
                    </div>
                    <div className="w-px h-8 bg-white/10 hidden md:block"></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-white/30 font-mono tracking-widest uppercase mb-1">Concept</span>
                        <span className="text-xs font-bold tracking-widest">ABSTRACT_OBJECT_MOTION</span>
                    </div>
                </div>

                <div className="flex items-center gap-6 pointer-events-auto">
                    <div className="w-12 h-px bg-white/20 hidden md:block"></div>
                    <a
                        href="https://unicorn.studio"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 text-[10px] font-bold tracking-widest text-white/40 hover:text-white transition-colors"
                    >
                        POWERED BY UNICORN.STUDIO
                    </a>
                </div>
            </div>

            {/* Side Label */}
            <div className="absolute left-8 top-1/2 -rotate-90 origin-left text-[10px] text-white/20 font-mono tracking-[0.5em] hidden lg:block uppercase">
                Volturiano // Generative Series 002
            </div>
        </section>
    );
}

import React, { useEffect, useState } from 'react';

export default function HeroVideoUnicorn({
    headline = 'Volturiano Studios Website',
    subheadline = 'Bespoke high-performance digital experiences crafted with precision and premium design.',
    ctaPrimary = 'Start Journey',
    ctaSecondary = 'View Documentation',
    ctaPrimaryHref = '#',
    ctaSecondaryHref = '#',
    projectId = 'rd1lLEjpb6TM9yjWGVuc'
}) {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Unicorn Studio Embed Script
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
        <section className="relative h-screen flex items-center justify-center overflow-hidden bg-black text-white">
            {/* Unicorn Studio Background */}
            <div
                className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                data-us-project={projectId}
                style={{ width: '100%', height: '100%' }}
            ></div>

            {/* Content Overlay */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col items-center justify-center text-center">
                <div className="max-w-4xl">
                    <h1
                        className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-8 leading-[0.85] uppercase"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                        {headline.split(' ').map((word, i) => (
                            <React.Fragment key={i}>
                                {word} {(i === 1) && <br className="hidden md:block" />}
                            </React.Fragment>
                        ))}
                    </h1>
                    <p className="text-base md:text-lg text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
                        {subheadline}
                    </p>
                    <div className="flex flex-wrap justify-center gap-6">
                        <a
                            href={ctaPrimaryHref}
                            className="px-6 py-3 bg-indigo-600 text-white rounded transition-all duration-300 hover:bg-indigo-500"
                        >
                            {ctaPrimary}
                        </a>
                        <a
                            href={ctaSecondaryHref}
                            className="px-6 py-3 bg-gray-700 text-white rounded transition-all duration-300 hover:bg-gray-600"
                        >
                            {ctaSecondary}
                        </a>
                    </div>
                </div>
            </div>

            {/* Bottom Badge - Made with Unicorn.studio */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
                <a
                    href="https://unicorn.studio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-3 text-[11px] font-bold tracking-wider text-white/60 hover:bg-white/10 hover:text-white transition-all uppercase"
                >
                    <div className="w-5 h-5 rounded-lg bg-white/10 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current text-white">
                            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                        </svg>
                    </div>
                    Made with unicorn.studio
                </a>
            </div>

            {/* Side Links in corners like screenshot */}
            <div className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors cursor-pointer hidden md:block group">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3ZM6 21a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v12a3 3 0 0 0 3 3ZM21 9a3 3 0 0 0-3 3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V9ZM3 15a3 3 0 0 0 3-3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v6Z" />
                </svg>
            </div>

            <div className="absolute bottom-8 left-8 text-[10px] text-white/20 font-mono tracking-widest hidden md:block">
                © 2025 VOLTURIANO. ALL RIGHTS RESERVED.
            </div>
            <div className="absolute bottom-8 right-8 flex gap-6 text-[10px] text-white/20 font-mono tracking-widest hidden md:block">
                <a href="#" className="hover:text-white transition-colors">SOURCE</a>
                <a href="#" className="hover:text-white transition-colors">PRIVACY</a>
                <a href="#" className="hover:text-white transition-colors">TERMS</a>
            </div>
        </section>
    );
}

"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge tailwind classes safely.
 */
function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * HeroUnicorn - A premium hero component with a UnicornStudio background effect.
 * Features ultra-minimalist editorial typography and interactive background.
 */
export default function HeroUnicorn({
    headline = "The Future of Digital",
    subheadline = "Bespoke high-performance digital experiences crafted with precision and premium design.",
    ctaText = "Start Journey",
    ctaHref = "#",
    projectId = "yw2azRsPvBFvvhWKBdfG"
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
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.5/dist/unicornStudio.umd.js";
            script.onload = () => {
                if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", initUnicorn);
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
        <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-black text-white">
            {/* Unicorn Studio Background Overlay */}
            <div
                className={cn(
                    "absolute inset-0 w-full h-full transition-opacity duration-1000",
                    isLoaded ? "opacity-100" : "opacity-0"
                )}
                data-us-project={projectId}
                style={{ width: "100%", height: "100%" }}
            ></div>

            {/* Premium Editorial Content */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col items-center justify-center text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="max-w-4xl"
                >
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extralight tracking-[0.5em] mb-8 leading-tight uppercase">
                        {headline}
                    </h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 1.2 }}
                        className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto mb-12 leading-[2] font-light tracking-[0.2em] uppercase"
                    >
                        {subheadline}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 1 }}
                    >
                        <a
                            href={ctaHref}
                            className="inline-block px-10 py-4 border border-zinc-500/50 text-white text-[10px] tracking-[0.4em] uppercase hover:bg-white hover:text-black transition-all duration-500 rounded-none backdrop-blur-sm"
                        >
                            {ctaText}
                        </a>
                    </motion.div>
                </motion.div>
            </div>

            {/* Brand/Status Overlays */}
            <div className="absolute top-10 left-10 flex items-center gap-4 opacity-30 select-none pointer-events-none">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] tracking-[0.3em] font-light uppercase">System Online</span>
            </div>

            <div className="absolute bottom-10 right-10 flex items-center gap-10 opacity-20 text-[9px] tracking-[0.5em] uppercase pointer-events-none">
                <span>© 2026 Studio</span>
                <span>Volturiano</span>
            </div>
        </section>
    );
}

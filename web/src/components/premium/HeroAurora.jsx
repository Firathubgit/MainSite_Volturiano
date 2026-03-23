"use client";

import React from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * HeroAurora - A premium animated aurora background hero component.
 * Redesigned with editorial typography and high-contrast dark mode support.
 */
export default function HeroAurora({
    children,
    className,
    showRadialGradient = true,
    headline = "VOLTURIANO",
    subheadline = "The pinnacle of minimalist design systems.",
    ctaText = "EXPLORE COLLECTION",
    ...props
}) {
    return (
        <section className="relative h-screen w-full overflow-hidden bg-white dark:bg-zinc-950">
            <main>
                <div
                    className={cn(
                        "relative flex flex-col h-[100vh] items-center justify-center text-zinc-900 dark:text-zinc-100 transition-colors duration-500",
                        className
                    )}
                    {...props}
                >
                    {/* Aurora Background Layer */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div
                            className={cn(
                                `
                [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)]
                [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)]
                [--aurora:repeating-linear-gradient(100deg,#ebf4ff_10%,#eef2ff_15%,#e0e7ff_20%,#ede9fe_25%,#f5f3ff_30%)]
                [background-image:var(--white-gradient),var(--aurora)]
                dark:[background-image:var(--dark-gradient),var(--aurora)]
                [background-size:300%,_200%]
                [background-position:50%_50%,50%_50%]
                filter blur-[10px] invert dark:invert-0
                after:content-[""] after:absolute after:inset-0
                after:[background-image:var(--white-gradient),var(--aurora)]
                after:dark:[background-image:var(--dark-gradient),var(--aurora)]
                after:[background-size:200%,_100%] 
                after:animate-aurora
                after:[background-attachment:fixed] after:mix-blend-difference
                pointer-events-none
                absolute -inset-[10px] opacity-20 dark:opacity-30 will-change-transform`,
                                showRadialGradient &&
                                `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]`
                            )}
                        ></div>
                    </div>

                    {/* Abstract Corner Graphic (Bottom Left) */}
                    <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] opacity-10 dark:opacity-20 pointer-events-none z-0">
                        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-current pointer-events-none overflow-visible">
                            <path
                                d="M0,400 C150,300 100,200 400,0 M0,380 C160,280 110,180 380,0 M0,360 C170,260 120,160 360,0 M0,340 C180,240 130,140 340,0 M0,320 C190,220 140,120 320,0"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="0.5"
                                className="animate-pulse"
                            />
                        </svg>
                    </div>

                    {/* Content Layer */}
                    <div className="relative z-10 w-full max-w-6xl mx-auto px-6 text-center">
                        {children ? children : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                                className="flex flex-col items-center"
                            >
                                <span className="text-[10px] md:text-xs tracking-[0.5em] uppercase opacity-60 mb-8 font-medium">
                                    ESTABLISHED MMXXVI
                                </span>

                                <h1 className="text-4xl md:text-6xl font-light tracking-[0.3em] uppercase mb-10">
                                    {headline}
                                </h1>

                                <p className="text-sm md:text-base max-w-lg opacity-50 mb-12 font-light leading-relaxed">
                                    {subheadline}
                                </p>

                                <motion.button
                                    whileHover={{ scale: 1.05, opacity: 1 }}
                                    className="text-[10px] tracking-[0.4em] uppercase border-b border-current pb-2 opacity-80"
                                >
                                    {ctaText}
                                </motion.button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </main>
        </section>
    );
}

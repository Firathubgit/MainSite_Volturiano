"use client";
import React from "react";
import { DotScreenShader } from "../ui/dot-shader-background";

/**
 * HeroDotShader Component
 * A premium hero section with a dark, interactive dot-matrix shader background.
 * The background reacts to cursor movement with a flowing mercury-like effect.
 * 
 * @param {Object} props
 * @param {string} props.title - Primary headline text
 * @param {string} props.description - Supporting description text
 */
export default function HeroDotShader({
    title = "DIGITAL INNOVATION",
    description = "Where thoughts take shape and consciousness flows like liquid mercury through infinite dimensions."
}) {
    return (
        <section className="h-svh w-full flex flex-col gap-8 items-center justify-center relative bg-black overflow-hidden">
            {/* Interactive Shader Background */}
            <div className="absolute inset-0 z-0">
                <DotScreenShader />
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 flex flex-col items-center gap-6 px-6 max-w-4xl text-center pointer-events-none">
                <h1
                    className="text-5xl md:text-7xl lg:text-8xl font-light tracking-tight mix-blend-exclusion text-white whitespace-nowrap"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                >
                    {title}
                </h1>
                <p className="text-lg md:text-xl font-light text-white/80 mix-blend-exclusion leading-relaxed">
                    {description}
                </p>
            </div>

            {/* Subtle Bottom Vignette */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-1 pointer-events-none" />
        </section>
    );
}

import { useRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}
import "./FooterRetroGrid.css";

function RetroGrid({ className, angle = 65 }) {
    return (
        <div
            className={cn(
                "pointer-events-none absolute h-full w-full overflow-hidden [perspective:200px]",
                className
            )}
            style={{ "--grid-angle": `${angle}deg` }}
        >
            {/* Grid */}
            <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
                <div
                    className={cn(
                        "animate-grid",
                        "[background-repeat:repeat] [background-size:60px_60px] [height:300vh] [inset:0%_0px] [margin-left:-50%] [transform-origin:100%_0_0] [width:600vw]",
                        // Dark styles (Forced) - Increased opacity to 0.4 for better visibility
                        "[background-image:linear-gradient(to_right,rgba(255,255,255,0.4)_1px,transparent_0),linear-gradient(to_bottom,rgba(255,255,255,0.4)_1px,transparent_0)]"
                    )}
                />
            </div>

            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent to-90%" />
        </div>
    );
}

export default function FooterRetroGrid({ headline = "Retro Grid", subheadline = "The future, today." }) {
    return (
        <footer className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden bg-black md:shadow-xl border-t border-white/10">
            <div className="z-10 text-center">
                <h2 className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-white to-white/40 bg-clip-text text-center text-5xl md:text-7xl font-bold leading-none tracking-tighter text-transparent">
                    {headline}
                </h2>
                {subheadline && (
                    <p className="mt-4 text-zinc-400 max-w-lg mx-auto text-lg md:text-xl">
                        {subheadline}
                    </p>
                )}
            </div>

            <RetroGrid />
        </footer>
    );
}

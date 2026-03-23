"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge tailwind classes safely.
 */
function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export const PinPerspective = ({ title, href }) => {
    return (
        <motion.div className="pointer-events-none w-96 h-80 flex items-center justify-center opacity-0 group-hover/pin:opacity-100 z-[60] transition duration-500">
            <div className="w-full h-full -mt-7 flex-none inset-0">
                <div className="absolute top-0 inset-x-0 flex justify-center">
                    <a
                        href={href}
                        target={"_blank"}
                        rel="noopener noreferrer"
                        className="relative flex space-x-2 items-center z-10 rounded-full bg-zinc-950 py-0.5 px-4 ring-1 ring-white/10"
                    >
                        <span className="relative z-20 text-white text-xs font-bold inline-block py-0.5">
                            {title}
                        </span>
                        <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-emerald-400/90 to-emerald-400/0 transition-opacity duration-500 group-hover/btn:opacity-40"></span>
                    </a>
                </div>

                <div
                    style={{
                        perspective: "1000px",
                        transform: "rotateX(70deg) translateZ(0)",
                    }}
                    className="absolute left-1/2 top-1/2 ml-[0.09375rem] mt-4 -translate-x-1/2 -translate-y-1/2"
                >
                    <>
                        {[0, 2, 4].map((delay) => (
                            <motion.div
                                key={delay}
                                initial={{
                                    opacity: 0,
                                    scale: 0,
                                    x: "-50%",
                                    y: "-50%",
                                }}
                                animate={{
                                    opacity: [0, 1, 0.5, 0],
                                    scale: 1,
                                    z: 0,
                                }}
                                transition={{
                                    duration: 6,
                                    repeat: Infinity,
                                    delay: delay,
                                }}
                                className="absolute left-1/2 top-1/2 h-[11.25rem] w-[11.25rem] rounded-[50%] bg-sky-500/[0.08] shadow-[0_8px_16px_rgb(0_0_0/0.4)]"
                            ></motion.div>
                        ))}
                    </>
                </div>

                <>
                    <motion.div className="absolute right-1/2 bottom-1/2 bg-gradient-to-b from-transparent to-cyan-500 translate-y-[14px] w-px h-20 group-hover/pin:h-40 blur-[2px]" />
                    <motion.div className="absolute right-1/2 bottom-1/2 bg-gradient-to-b from-transparent to-cyan-500 translate-y-[14px] w-px h-20 group-hover/pin:h-40" />
                    <motion.div className="absolute right-1/2 translate-x-[1.5px] bottom-1/2 bg-cyan-600 translate-y-[14px] w-[4px] h-[4px] rounded-full z-40 blur-[3px]" />
                    <motion.div className="absolute right-1/2 translate-x-[0.5px] bottom-1/2 bg-cyan-300 translate-y-[14px] w-[2px] h-[2px] rounded-full z-40" />
                </>
            </div>
        </motion.div>
    );
};

/**
 * Pin3D - A premium 3D interactive card with a "pin" indicator.
 */
export default function Pin3D({
    title = "Explore Space",
    href = "#",
    className = "",
    containerClassName = "",
    children
}) {
    const [transform, setTransform] = useState("translate(-50%,-50%) rotateX(0deg)");

    const onMouseEnter = () => {
        setTransform("translate(-50%,-50%) rotateX(40deg) scale(0.8)");
    };
    const onMouseLeave = () => {
        setTransform("translate(-50%,-50%) rotateX(0deg) scale(1)");
    };

    // Default content if no children provided
    const defaultContent = (
        <div className="flex flex-col p-4 tracking-tight text-slate-100/50 w-[20rem] h-[20rem] bg-gradient-to-b from-slate-800/50 to-slate-800/0 backdrop-blur-sm border border-slate-700/50 rounded-2xl">
            <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-red-500 animate-pulse" />
                <div className="text-xs text-slate-400">Live Connection</div>
            </div>

            <div className="flex-1 mt-4 space-y-4">
                <div className="text-2xl font-bold text-slate-100">
                    Space Station Alpha
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="text-3xl font-bold text-sky-400">427</div>
                        <div className="text-xs text-slate-400">Days in Orbit</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-3xl font-bold text-emerald-400">98%</div>
                        <div className="text-xs text-slate-400">Systems Online</div>
                    </div>
                </div>

                <div className="relative h-20 overflow-hidden">
                    {[1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            className="absolute w-full h-20"
                            animate={{
                                translateY: [0, -10, 0]
                            }}
                            transition={{
                                duration: 2 + i * 0.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            style={{
                                background: `linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.1) 50%, transparent 100%)`,
                                opacity: 0.3 / i,
                                transform: `translateY(${i * 10}px)`,
                            }}
                        />
                    ))}
                </div>

                <div className="flex justify-between items-end">
                    <div className="text-xs text-slate-400">
                        Last ping: 3 seconds ago
                    </div>
                    <div className="text-sky-400 text-sm font-medium">
                        Connect →
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className={cn("h-[40rem] w-full flex items-center justify-center", containerClassName)}>
            <Link
                className="relative group/pin z-50 cursor-pointer"
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                to={href}
            >
                <div
                    style={{
                        perspective: "1000px",
                        transform: "rotateX(70deg) translateZ(0deg)",
                    }}
                    className="absolute left-1/2 top-1/2 ml-[0.09375rem] mt-4 -translate-x-1/2 -translate-y-1/2"
                >
                    <div
                        style={{
                            transform: transform,
                        }}
                        className="absolute left-1/2 p-4 top-1/2 flex justify-start items-start rounded-2xl shadow-[0_8px_16px_rgb(0_0_0/0.4)] bg-black border border-white/[0.1] group-hover/pin:border-white/[0.2] transition duration-700 overflow-hidden"
                    >
                        <div className={cn("relative z-50", className)}>
                            {children || defaultContent}
                        </div>
                    </div>
                </div>
                <PinPerspective title={title} href={href} />
            </Link>
        </div>
    );
}

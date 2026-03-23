"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Home, User, Briefcase, FileText } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge tailwind classes safely.
 */
function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * TubeLightNavBar - A premium navigation bar with a "lamp" light effect.
 * Responsive: Fixed bottom on mobile, fixed top on desktop.
 */
export default function TubeLightNavBar({
    items = [
        { name: "Home", url: "#", icon: Home },
        { name: "About", url: "#", icon: User },
        { name: "Projects", url: "#", icon: Briefcase },
        { name: "Resume", url: "#", icon: FileText }
    ],
    className = ""
}) {
    const [activeTab, setActiveTab] = useState(items[0].name);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <div
            className={cn(
                "fixed bottom-0 md:top-0 left-1/2 -translate-x-1/2 z-50 mb-6 md:pt-6 md:mb-0 h-fit",
                className
            )}
        >
            <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 backdrop-blur-lg py-1 px-1 rounded-full shadow-lg">
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.name;

                    return (
                        <Link
                            key={item.name}
                            to={item.url}
                            onClick={() => setActiveTab(item.name)}
                            className={cn(
                                "relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors",
                                "text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400",
                                isActive && "text-indigo-600 dark:text-indigo-400"
                            )}
                        >
                            <span className="hidden md:inline relative z-10">{item.name}</span>
                            <span className="md:hidden relative z-10">
                                <Icon size={18} strokeWidth={2.5} />
                            </span>

                            {isActive && (
                                <motion.div
                                    layoutId="lamp"
                                    className="absolute inset-0 w-full bg-indigo-500/5 dark:bg-indigo-400/10 rounded-full -z-10"
                                    initial={false}
                                    transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 30
                                    }}
                                >
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-500 dark:bg-indigo-400 rounded-t-full">
                                        <div className="absolute w-12 h-6 bg-indigo-500/20 dark:bg-indigo-400/20 rounded-full blur-md -top-2 -left-2" />
                                        <div className="absolute w-8 h-6 bg-indigo-500/20 dark:bg-indigo-400/20 rounded-full blur-md -top-1" />
                                        <div className="absolute w-4 h-4 bg-indigo-500/20 dark:bg-indigo-400/20 rounded-full blur-sm top-0 left-2" />
                                    </div>
                                </motion.div>
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

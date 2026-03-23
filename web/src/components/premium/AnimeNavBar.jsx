import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link, useLocation } from "react-router-dom"
import { Home, FileText, CreditCard, Info } from "lucide-react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs) {
    return twMerge(clsx(inputs))
}

/**
 * AnimeNavBar - A pill-shaped floating navigation bar with glow effects.
 * 
 * @param {Array} items - List of navigation items { name, url, icon }
 * @param {string} className - Additional CSS classes for the wrapper
 * @param {string} defaultActive - The name of the default active tab
 */
export default function AnimeNavBar({
    items = [
        { name: "Home", url: "#", icon: Home },
        { name: "Convert", url: "#", icon: FileText },
        { name: "Pricing", url: "#", icon: CreditCard },
        { name: "About", url: "#", icon: Info },
    ],
    className = "",
    defaultActive = "Home"
}) {
    const [mounted, setMounted] = useState(false)
    const [hoveredTab, setHoveredTab] = useState(null)
    const [activeTab, setActiveTab] = useState(defaultActive)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <div className={cn("fixed top-5 left-0 right-0 z-[9999]", className)}>
            <div className="flex justify-center pt-6">
                <motion.div
                    className="flex items-center gap-1 bg-black/40 border border-white/5 backdrop-blur-xl py-1.5 px-1.5 rounded-full shadow-2xl relative"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                    }}
                >
                    {items.map((item) => {
                        const Icon = item.icon
                        const isActive = activeTab === item.name
                        const isHovered = hoveredTab === item.name

                        return (
                            <Link
                                key={item.name}
                                to={item.url}
                                onClick={() => setActiveTab(item.name)}
                                onMouseEnter={() => setHoveredTab(item.name)}
                                onMouseLeave={() => setHoveredTab(null)}
                                className={cn(
                                    "relative cursor-pointer text-xs md:text-sm font-medium px-4 md:px-6 py-2 md:py-3 rounded-full transition-all duration-300",
                                    "text-white/50 hover:text-white",
                                    isActive && "text-white"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        className="absolute inset-0 rounded-full -z-10 overflow-hidden"
                                        layoutId="active-pill"
                                        transition={{
                                            type: "spring",
                                            stiffness: 500,
                                            damping: 35,
                                            mass: 0.8
                                        }}
                                    >
                                        {/* Multi-layered glow - Brighter indigo */}
                                        <div className="absolute inset-0 bg-indigo-400/30 rounded-full blur-md" />
                                        <div className="absolute inset-[-4px] bg-indigo-400/20 rounded-full blur-xl" />

                                        {/* Pulsing base */}
                                        <motion.div
                                            className="absolute inset-0 bg-indigo-400/10 rounded-full"
                                            animate={{
                                                opacity: [0.3, 0.6, 0.3],
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                        />

                                        {/* Animated shine sweep - Crisper */}
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                            animate={{
                                                x: ['-100%', '100%']
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: "linear"
                                            }}
                                        />
                                    </motion.div>
                                )}

                                <span className="hidden md:inline relative z-10 tracking-wide uppercase text-[10px]">
                                    {item.name}
                                </span>
                                <motion.span
                                    className="md:hidden relative z-10 block"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <Icon size={16} strokeWidth={2} />
                                </motion.span>

                                <AnimatePresence>
                                    {isHovered && !isActive && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="absolute inset-0 bg-white/5 rounded-full -z-10"
                                        />
                                    )}
                                </AnimatePresence>
                            </Link>
                        )
                    })}
                </motion.div>
            </div>
        </div>
    )
}

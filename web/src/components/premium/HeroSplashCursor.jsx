import React from 'react';
import SplashCursor from './SplashCursor';
import { motion } from 'framer-motion';

export default function HeroSplashCursor() {
    return (
        <div className="relative w-full h-screen bg-[#000000] text-white flex items-center justify-center overflow-hidden">
            {/* Background Effect - SplashCursor */}
            <div className="absolute inset-0 z-0">
                <SplashCursor
                    SIM_RESOLUTION={128}
                    DYE_RESOLUTION={1440}
                    DENSITY_DISSIPATION={3.5}
                    VELOCITY_DISSIPATION={2}
                    PRESSURE={0.1}
                    CURL={3}
                    SPLAT_RADIUS={0.2}
                    SPLAT_FORCE={6000}
                    COLOR_UPDATE_SPEED={10}
                />
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 w-full max-w-6xl mx-auto px-6 text-center pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center"
                >
                    <span className="text-[10px] md:text-xs tracking-[0.6em] uppercase opacity-40 mb-10 font-medium">
                        Algorithmic Fluid Dynamics
                    </span>

                    <h1 className="text-6xl md:text-[10rem] font-bold tracking-tighter mb-6 flex flex-col items-center leading-none">
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/20">
                            SPLASH
                        </span>
                        <span className="text-3xl md:text-5xl tracking-[0.5em] font-extralight mt-4 text-white/70">
                            VOLTURIANO
                        </span>
                    </h1>

                    <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent mb-12" />

                    <p className="text-sm md:text-lg max-w-xl opacity-40 mb-16 font-light leading-relaxed tracking-wider">
                        Interact with the void. A hyper-responsive fluid simulation crafted for high-performance luxury interfaces.
                    </p>

                    <div className="pointer-events-auto">
                        <button className="group relative px-12 py-4 overflow-hidden rounded-full border border-white/5 bg-white/5 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10">
                            <span className="relative z-10 text-[10px] tracking-[0.5em] uppercase opacity-60 group-hover:opacity-100 transition-all">
                                INITIATE
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Subtle Vignette */}
            <div className="absolute inset-0 pointer-events-none z-5 shadow-[inset_0_0_150px_rgba(0,0,0,0.7)]" />
        </div>
    );
}

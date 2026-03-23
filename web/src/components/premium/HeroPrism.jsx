import React from 'react';
import Prism from './Prism';
import { motion } from 'framer-motion';

export default function HeroPrism() {
    return (
        <div className="relative w-full h-screen bg-[#000000] text-white flex items-center justify-center overflow-hidden">
            {/* Background Effect - Prism */}
            <div className="absolute inset-0 z-0 scale-110 lg:scale-100">
                <Prism
                    height={3.5}
                    baseWidth={5.5}
                    animationType="3drotate"
                    glow={1}
                    noise={0.5}
                    scale={3.6}
                    hueShift={0}
                    colorFrequency={1}
                    timeScale={0.5}
                    bloom={1}
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
                        Geometric Radiance Synthesis
                    </span>

                    <h1 className="text-6xl md:text-[10rem] font-bold tracking-tighter mb-6 flex flex-col items-center leading-none">
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/20">
                            PRISM
                        </span>
                        <span className="text-3xl md:text-5xl tracking-[0.5em] font-extralight mt-4 text-white/70">
                            VOLTURIANO STUDIO
                        </span>
                    </h1>

                    <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent mb-12" />

                    <p className="text-sm md:text-lg max-w-xl opacity-40 mb-16 font-light leading-relaxed tracking-wider">
                        A cinematic geometric light sculpture. Engineered with precision shaders for immersive digital environments and luxury interfaces.
                    </p>

                    <div className="pointer-events-auto">
                        <button className="group relative px-12 py-4 overflow-hidden rounded-full border border-white/5 bg-white/5 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10">
                            <span className="relative z-10 text-[10px] tracking-[0.5em] uppercase opacity-60 group-hover:opacity-100 transition-all">
                                ENTER DIMENSION
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

import React from 'react';
import Balatro from './Balatro';
import { motion } from 'framer-motion';

export default function HeroBalatro() {
    return (
        <div className="relative w-full h-screen bg-[#000000] text-white flex items-center justify-center overflow-hidden">
            {/* Background Effect - Balatro */}
            <div className="absolute inset-0 z-0 opacity-80">
                <Balatro
                    spinRotation={-2}
                    spinSpeed={7}
                    color1="#DE443B"
                    color2="#006BB4"
                    color3="#162325"
                    contrast={3.5}
                    lighting={0.4}
                    spinAmount={0.25}
                    pixelFilter={700}
                />
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 w-full max-w-6xl mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="flex flex-col items-center"
                >
                    <span className="text-[10px] md:text-xs tracking-[0.5em] uppercase opacity-60 mb-8 font-medium">
                        EXPERIMENTAL INTERACTION
                    </span>

                    <h1 className="text-5xl md:text-9xl font-bold tracking-tighter mb-4 flex flex-col items-center">
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
                            BALATRO
                        </span>
                        <span className="text-2xl md:text-4xl tracking-[0.4em] font-light mt-2 text-white/80">
                            VOLTURIANO
                        </span>
                    </h1>

                    <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent mb-10" />

                    <p className="text-sm md:text-base max-w-lg opacity-50 mb-12 font-light leading-relaxed tracking-wide">
                        A mesmerizing, distorted color warp inspired by the Balatro aesthetic. Shader-powered organic motion designed for high-impact visual statements.
                    </p>

                    <button className="group relative px-8 py-3 overflow-hidden rounded-full border border-white/10 bg-white/5 backdrop-blur-sm transition-all hover:border-white/20">
                        <span className="relative z-10 text-[10px] tracking-[0.4em] uppercase opacity-80 group-hover:opacity-100 transition-opacity">
                            ENTER DIMENSION
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </button>
                </motion.div>
            </div>

            {/* Decorative bottom gradient */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent z-5" />
        </div>
    );
}

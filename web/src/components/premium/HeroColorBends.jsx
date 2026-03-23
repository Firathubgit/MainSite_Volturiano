import React from 'react';
import ColorBends from './ColorBends';

export default function HeroColorBends() {
    return (
        <div className="relative w-full h-screen bg-[#050505] text-white flex items-center justify-center overflow-hidden">
            <style dangerouslySetInnerHTML={{
                __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Montserrat:wght@200;300;400;500&display=swap');
        .font-premium { font-family: 'Cormorant Garamond', serif; }
        .font-sans-premium { font-family: 'Montserrat', sans-serif; }
        .text-glow { text-shadow: 0 0 40px rgba(255,255,255,0.3); }
      `}} />

            {/* Background Effect - Absolute Fill of the viewport */}
            <div className="absolute inset-0 z-0">
                <ColorBends
                    rotation={45}
                    speed={0.12}
                    colors={["#5227FF", "#FF9FFC", "#7cff67"]}
                    transparent={false}
                    autoRotate={0}
                    scale={0.6}
                    frequency={1}
                    warpStrength={1.2}
                    mouseInfluence={1}
                    parallax={0.4}
                    noise={0.12}
                    className="w-full h-full block"
                />
            </div>

            {/* CONTENT OVERLAY - High-end Luxury Aesthetic */}
            <div className="relative z-10 flex flex-col items-center justify-center px-6 md:px-12 text-center pointer-events-none w-full max-w-7xl">
                <div className="mb-4 overflow-hidden">
                    <span className="font-sans-premium text-[8px] md:text-[10px] uppercase tracking-[0.5em] text-white/50 block transform translate-y-0 opacity-100 transition-all">
                        Creative Excellence
                    </span>
                </div>

                <h1 className="font-premium text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-[1.1] tracking-tight text-white mb-2 text-glow" style={{ fontWeight: 300 }}>
                    VOLTURIANO<br />
                    <span className="italic text-white/90">STUDIO</span>
                </h1>

                <div className="w-16 md:w-24 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent mx-auto mb-6 md:mb-10"></div>

                <p className="font-sans-premium max-w-md md:max-w-xl mx-auto text-sm md:text-base text-gray-300 leading-relaxed font-light tracking-wide drop-shadow-lg opacity-80 px-4 md:px-0">
                    Pioneering digital narratives through algorithmic art and sensory-first design. We craft immersive environments for the next generation of luxury.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-8 mt-12 md:mt-16 pointer-events-auto">
                    <button className="font-sans-premium group relative px-8 md:px-12 py-4 md:py-5 text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-black bg-white transition-all hover:bg-transparent hover:text-white border border-white overflow-hidden">
                        <span className="relative z-10 transition-colors">Start Project</span>
                    </button>

                    <button className="font-sans-premium px-8 md:px-12 py-4 md:py-5 text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-white/50 hover:text-white transition-all">
                        Private View
                    </button>
                </div>
            </div>

            {/* Subtle Vignette for depth */}
            <div className="absolute inset-0 pointer-events-none z-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.8)]"></div>
        </div>
    );
}

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import styles from './RouteTransitionOverlay.module.css';

/**
 * PremiumBackground
 * Renders a cinematic, atmospheric glow background for the transition.
 * Supports 4 steps of "rising" light intensity.
 */
export const PremiumBackground = ({ step = 1, isRevisit = false }) => {
    // Palette - signature teal blue regardless of mode
    const colors = useMemo(() => [
        'rgba(0, 150, 160, 0.8)',  // Richer Teal Core
        'rgba(34, 211, 238, 0.8)', // Cyan
        'rgba(52, 139, 149, 0.9)',
        'rgba(98, 180, 189, 0.9)',
        'rgba(165, 243, 252, 0.8)', // Bright Cyan
        'rgba(204, 250, 255, 0.7)',
        'rgba(255, 255, 255, 0.5)', // Pure White Bloom
    ], []);

    // Step-based intensity mapping - fixed size/opacity for stability
    const stepConfig = useMemo(() => {
        switch (step) {
            case 1:
                return { opacity: 0.15, yOffset: '12vh', sizeMult: 0.8, bloomOpacity: 0.05 };
            case 1.5:
                return { opacity: 0.35, yOffset: '10vh', sizeMult: 0.9, bloomOpacity: 0.12 };
            case 2:
                return { opacity: 0.6, yOffset: '8vh', sizeMult: 1.0, bloomOpacity: 0.2 };
            case 3:
                return { opacity: 0.95, yOffset: '3vh', sizeMult: 1.1, bloomOpacity: 0.5 };
            case 4:
                return { opacity: 1.0, yOffset: '0vh', sizeMult: 1.2, bloomOpacity: 0.8 };
            default:
                return { opacity: 0.15, yOffset: '12vh', sizeMult: 0.8, bloomOpacity: 0.05 };
        }
    }, [step]);

    return (
        <div className={styles.premiumBackgroundRoot}>
            <div className={styles.blackBackground} />

            <motion.div
                className={styles.glowContainer}
                animate={{
                    opacity: stepConfig.opacity,
                }}
                transition={{ duration: 5, ease: "easeInOut" }}
            >
                {/* Left Deep Glow Source */}
                <GlowSource
                    position={{ left: '10%', bottom: '0%' }}
                    colors={colors}
                    stepConfig={stepConfig}
                    sizeBase={75}
                    delay={0}
                />

                {/* Right Ambient Glow Source */}
                <GlowSource
                    position={{ right: '10%', bottom: '-5%' }}
                    colors={colors}
                    stepConfig={stepConfig}
                    sizeBase={85}
                    delay={0.4}
                />

                {/* Center subtle bridge */}
                <GlowSource
                    position={{ left: '50%', bottom: '-10%', transform: 'translateX(-50%)' }}
                    colors={colors.slice(0, 5)}
                    stepConfig={stepConfig}
                    sizeBase={65}
                    delay={0.8}
                />
            </motion.div>

            {/* Atmosphere Overlays - Made thinner/more transparent to let gradients shine */}
            <div className={styles.vignette} />
            <div className={styles.bottomLinearFade} />
            <div className={styles.grainOverlay} />
        </div>
    );
};

const GlowSource = ({ position, colors, stepConfig, sizeBase, delay }) => {
    return (
        <motion.div
            className={styles.glowSource}
            style={{ ...position }}
            animate={{
                y: stepConfig.yOffset,
            }}
            transition={{
                duration: 6,
                delay,
                ease: [0.16, 1, 0.3, 1]
            }}
        >
            {colors.map((color, idx) => {
                const isBright = idx >= colors.length - 2;
                const baseSize = sizeBase - (idx * 10);
                if (baseSize <= 0) return null;

                const layerSize = baseSize * stepConfig.sizeMult;
                const baseOpacity = isBright ? stepConfig.bloomOpacity : 0.9;

                return (
                    <motion.div
                        key={idx}
                        className={styles.glowLayer}
                        style={{
                            backgroundColor: color,
                            width: `${layerSize}vw`,
                            height: `${layerSize * 0.55}vw`,
                            filter: `blur(110px)`, // CONSTANT BLUR - Fixes "fast buggy visual"/hiccups
                            zIndex: idx,
                            position: 'absolute',
                            borderRadius: '50%',
                        }}
                        animate={{
                            opacity: baseOpacity,
                        }}
                        transition={{
                            duration: 6, // Smoothly transition colors over 6 seconds
                            ease: "easeInOut",
                        }}
                    />
                );
            })}
        </motion.div>
    );
};

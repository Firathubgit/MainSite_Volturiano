import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouteTransition } from '../../contexts/RouteTransitionContext';
import { PremiumBackground } from './PremiumBackground';
import styles from './RouteTransitionOverlay.module.css';

const TypewriterEffect = ({ text, speed = 15, onComplete, onStart }) => {
    const [displayedText, setDisplayedText] = useState('');
    const index = useRef(0);
    const started = useRef(false);

    useEffect(() => {
        if (!text || text.length === 0) return;

        setDisplayedText('');
        index.current = 0;

        const timer = setInterval(() => {
            if (!started.current && onStart) {
                onStart();
                started.current = true;
            }

            if (index.current < text.length) {
                const Char = text.charAt(index.current);
                setDisplayedText((prev) => prev + Char);
                index.current++;
            } else {
                clearInterval(timer);
                if (onComplete) {
                    onComplete();
                }
            }
        }, speed);

        return () => {
            clearInterval(timer);
        };
    }, [text, speed, onComplete, onStart]);

    return <span>{displayedText}</span>;
};

export const RouteTransitionOverlay = () => {
    const { phase, transitionData, completeIntro } = useRouteTransition();
    const [showContent, setShowContent] = useState(false);
    const [showDots, setShowDots] = useState(false);
    const [step, setStep] = useState(1);
    const [cinematicDelayed, setCinematicDelayed] = useState(true);

    useEffect(() => {
        if (phase === 'intro') {
            setCinematicDelayed(true);
            const timer = setTimeout(() => setCinematicDelayed(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [phase]);

    useEffect(() => {
        if (phase === 'intro') {
            setShowContent(true);
            setStep(1);

            const isRevisit = transitionData?.isProjectRevisit;
            
            // Smoother, staggered timing for revisits to fill the 15s wait
            const step2Time = isRevisit ? 10000 : 1000;
            const stepIntermediateTime = isRevisit ? 5000 : null;

            const step2Timer = setTimeout(() => setStep(2), step2Time);
            let intermediateTimer;
            if (stepIntermediateTime) {
                intermediateTimer = setTimeout(() => setStep(1.5), stepIntermediateTime);
            }

            const dotTimer = setTimeout(() => setShowDots(true), 1800);

            return () => {
                clearTimeout(step2Timer);
                if (intermediateTimer) clearTimeout(intermediateTimer);
                clearTimeout(dotTimer);
            };
        } else if (phase === 'idle') {
            setShowContent(false);
            setShowDots(false);
            setStep(1);
        }
    }, [phase]);

    const handleTypewriterStart = useCallback(() => {
        setStep(3);
        setShowDots(false);
    }, []);

    const handleTypewriterComplete = useCallback(() => {
        setStep(4);
        // Soak time
        const timer = setTimeout(() => {
            setShowContent(false);
            completeIntro();
        }, 1500); // Accelerated from 3500ms for "fast fast" feel
        return () => clearTimeout(timer);
    }, [completeIntro]);

    // Safety fallback
    useEffect(() => {
        if (phase === 'intro' && !transitionData?.cinematicResponse) {
            const timer = setTimeout(() => {
                if (!transitionData?.cinematicResponse) {
                    handleTypewriterComplete();
                }
            }, 20000);
            return () => clearTimeout(timer);
        }
    }, [phase, transitionData?.cinematicResponse, handleTypewriterComplete]);

    useEffect(() => {
        if (phase === 'intro' && transitionData?.cinematicResponse) {
            setShowDots(false);
        }
    }, [phase, transitionData?.cinematicResponse]);

    if (phase === 'idle') return null;

    // The core of the calm fade: 
    // Overlay stays solid black during any transition phase except 'idle'.
    // We only fade the entire overlay root out when we are 'revealing'.
    const isActive = phase === 'outro' || phase === 'covered' || phase === 'intro' || phase === 'revealing';

    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    className={styles.overlayRoot}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                >
                    {/* Atmospheric Layer */}
                    <AnimatePresence>
                        {phase !== 'revealing' && (
                            <motion.div
                                key="atmosphere"
                                className={styles.ambientGlowContainer}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                            >
                                <PremiumBackground 
                                    step={step} 
                                    isRevisit={transitionData?.isProjectRevisit}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Sequential Content Fade-outs */}
                    <AnimatePresence>
                        {showContent && transitionData?.prompt && phase !== 'revealing' && (
                            <motion.div
                                className={styles.promptMessage}
                                initial={{ y: 20, opacity: 0, filter: 'blur(8px)' }}
                                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, filter: 'blur(10px)' }}
                                transition={{ duration: 0.8 }}
                            >
                                {transitionData.prompt}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                        {showContent && (showDots || cinematicDelayed || !transitionData?.cinematicResponse) && phase !== 'revealing' && (
                            <motion.div
                                key="loading"
                                className={styles.loadingContainer}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                <div className={styles.loader}>
                                    <div className={styles.innerDot} />
                                    <div className={styles.innerDot} />
                                </div>
                            </motion.div>
                        )}
                        {showContent && transitionData?.cinematicResponse && !cinematicDelayed && phase !== 'revealing' && (
                            <motion.div
                                key="response"
                                className={styles.assistantMessage}
                                initial={{ y: 20, opacity: 0, filter: 'blur(8px)' }}
                                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, filter: 'blur(10px)' }}
                                transition={{ duration: 0.8 }}
                            >
                                <TypewriterEffect
                                    text={transitionData.cinematicResponse}
                                    speed={18}
                                    onStart={handleTypewriterStart}
                                    onComplete={handleTypewriterComplete}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* This ensures we fade out into a calm black state before revealing the page */}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

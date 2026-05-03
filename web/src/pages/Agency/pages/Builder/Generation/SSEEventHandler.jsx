import React, { useEffect, useRef } from 'react';
import './ai-messages.css';
import { FiRotateCw, FiEdit2 } from 'react-icons/fi';
import { BsStars, BsTerminal, BsExclamationCircle, BsCheck2, BsLightningCharge } from 'react-icons/bs';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Hook to manage SSE connection and event routing
 */
export const useSSEEvents = ({ endpoint, onMessage, onThinking, onStatusUpdate, onComplete, onError }) => {
    const eventSourceRef = useRef(null);

    const connectSSE = (body) => {
        // This function is mainly a placeholder for potential direct SSE connection logic if needed.
        // The current implementation relies on the parent component's fetch loop.
        return {};
    };

    /**
     * Parse a raw SSE chunk and dispatch events
     * @param {string} chunk - Raw text chunk from stream
     */
    const processChunk = (chunk) => {
        const lines = chunk.split('\n');
        let currentEvent = null;

        for (const line of lines) {
            // Filter empty lines
            if (!line.trim()) continue;

            if (line.startsWith('event: ')) {
                currentEvent = line.substring(7).trim();
            } else if (line.startsWith('data: ')) {
                try {
                    const data = JSON.parse(line.substring(6));

                    // Dispatch based on event type
                    if (currentEvent === 'ai_thinking') {
                        onThinking?.(data);
                    } else if (currentEvent === 'ai_message') {
                        onMessage?.(data);
                    } else if (['verify_started', 'verify_passed', 'verify_failed', 'repair_started', 'rollback_started'].includes(currentEvent)) {
                        onStatusUpdate?.(currentEvent, data); // Technical updates
                    } else if (currentEvent === 'complete') {
                        onComplete?.(data);
                    } else if (currentEvent === 'error') {
                        onError?.(data);
                    }
                } catch (e) {
                    console.warn('Failed to parse SSE data:', e);
                }
            }
        }
    };

    return { processChunk };
};

/**
 * AI Thinking Indicator Component (Minimal)
 */
export const AIThinkingIndicator = ({ stage }) => {
    const [dots, setDots] = React.useState('');

    React.useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const getStageText = (s) => {
        switch (s) {
            case 'analyzing': return 'Analyzing';
            case 'booting': return 'Preparing environment';
            case 'planning': return 'Designing structure';
            case 'building': return 'Writing code';
            case 'verifying': return 'Verifying';
            case 'repairing': return 'Fixing issues';
            default: return 'Thinking';
        }
    };

    return (
        <div className="ai-thinking-container" style={{ paddingLeft: 0, marginTop: '8px' }}>
            {/* Base44 Shimmer Text with Animated Dots */}
            <span className="shimmer-text-global" style={{
                background: 'linear-gradient(90deg, #9ca3af 0%, #ffffff 50%, #9ca3af 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer 3s linear infinite',
                fontWeight: 500,
                fontSize: '0.9rem',
                display: 'inline-block'
            }}>
                {getStageText(stage)}{dots}
            </span>
            <style>{`
                @keyframes shimmer {
                    to { background-position: 200% center; }
                }
            `}</style>
        </div>
    );
};

/**
 * AI Message Bubble Component (Lovable Style)
 */
/**
 * Premium Streamed Text Reveal (Solar Scroll Math)
 */
const PremiumStreamedText = ({ text, onStreamEnd, instant = false }) => {
    const [progress, setProgress] = React.useState(instant ? 1 : 0);

    React.useEffect(() => {
        if (instant) {
            setProgress(1);
            return;
        }
        
        let start;
        let animationFrame;
        // Slower streaming speed: 24ms per char, bounded 1500 to 7000ms
        const duration = Math.min(Math.max(text.length * 24, 1500), 7000);

        const step = (timestamp) => {
            if (!start) start = timestamp;
            const elapsed = timestamp - start;
            const currentProgress = elapsed / duration;

            if (currentProgress < 1) {
                setProgress(currentProgress);
                animationFrame = requestAnimationFrame(step);
            } else {
                setProgress(1);
                if (onStreamEnd) onStreamEnd();
            }
        };
        animationFrame = requestAnimationFrame(step);

        return () => cancelAnimationFrame(animationFrame);
    }, [text, instant, onStreamEnd]);

    const tokens = text.split(/(\s+)/);
    let charCount = 0;
    const totalChars = text.length || 1; // Include spaces in total calculation for proper pacing

    return (
        <span style={{ display: 'inline', whiteSpace: 'pre-wrap' }}>
            {tokens.map((token, wordIndex) => {
                const tokenRevealStart = (charCount / totalChars) * 0.8;
                
                // If progress hasn't reached this word/space AT ALL, do not mount it yet.
                // This prevents prematurely pushing the height of the container downward.
                if (progress < tokenRevealStart && !instant) {
                    charCount += token.length;
                    return null;
                }

                if (/^\s+$/.test(token)) {
                    charCount += token.length;
                    return <span key={wordIndex}>{token}</span>;
                }
                
                return (
                    <span key={wordIndex} style={{ display: 'inline-flex' }}>
                        {token.split("").map((char, charIndex) => {
                            const currentGlobalCharIndex = charCount;
                            charCount++;
                            
                            const revealStart = (currentGlobalCharIndex / totalChars) * 0.8;
                            const revealEnd = revealStart + 0.1; 

                            // PREVENT RENDER: This forces the container to expand row-by-row naturally
                            if (progress < revealStart && !instant) return null;

                            let opacity = 0; 
                            let blur = 10;
                            let y = 14; 

                            if (progress > revealEnd || instant) {
                                opacity = 1;
                                blur = 0;
                                y = 0;
                            } else if (progress > revealStart) {
                                const localProgress = (progress - revealStart) / (revealEnd - revealStart);
                                opacity = localProgress;
                                blur = 10 * (1 - localProgress);
                                y = 14 * (1 - localProgress);
                            }

                            return (
                                <span
                                    key={charIndex}
                                    style={{ 
                                        opacity: opacity,
                                        filter: `blur(${blur}px)`,
                                        transform: `translateY(${y}px)`,
                                        // Removed animation easing because CSS conflicts with RequestAnimationFrame stepping
                                        display: 'inline-block'
                                    }}
                                >
                                    {char}
                                </span>
                            );
                        })}
                    </span>
                );
            })}
        </span>
    );
};

export const AIMessage = ({ message, style = 'casual', context, onRestore, isStreamingEligible, onStreamStateChange }) => {
    React.useEffect(() => {
        if (isStreamingEligible && onStreamStateChange) {
            onStreamStateChange(true);
        }
    }, [isStreamingEligible, onStreamStateChange]);

    const handleStreamEnd = React.useCallback(() => {
        if (onStreamStateChange) {
            onStreamStateChange(false);
        }
    }, [onStreamStateChange]);

    return (
        <div className={`ai-message-bubble ${style}`} style={{ position: 'relative' }}>
            <div className="ai-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="ai-text" style={{ flex: 1, margin: 0 }}>
                        {isStreamingEligible ? (
                            <PremiumStreamedText text={message} onStreamEnd={handleStreamEnd} />
                        ) : (
                            <PremiumStreamedText text={message} instant={true} />
                        )}
                    </div>
                    {context?.isEdit && (
                        <FiEdit2 size={12} style={{ color: '#a1a1aa', opacity: 0.6 }} title="Modified version" />
                    )}
                </div>

                {/* Action icons are now handled by parent to be under user bubbles */}

                {/* Optional Context Metrics */}
                {context && (
                    <div className="ai-metrics">
                        {context.filesCount && <span className="ai-metric-badge">{context.filesCount} files</span>}
                        {context.durationMs && <span className="ai-metric-badge">{(context.durationMs / 1000).toFixed(1)}s</span>}
                        {context.strategy && <span className="ai-metric-badge">Fix: {context.strategy}</span>}
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Premium Vertical Revolver for "Planning" step
 * Parses: "Planning X components: ... — ComponentA, ComponentB, ..."
 */
export const PlanningRevolver = ({ message, isLast }) => {
    // If this step is done (not last), we hide it to keep the UI clean (Base44 style)
    if (!isLast) return null;

    // Extract everything after the em-dash or first colon + list
    const match = message.match(/—\s*(.*)$/) || message.match(/:\s*([A-Z].*)$/);
    if (!match) return <span className="ai-text">{message}</span>;

    const components = match[1].split(',').map(c => c.trim()).filter(Boolean);
    const [index, setIndex] = React.useState(0);

    React.useEffect(() => {
        if (components.length <= 1) return;
        const interval = setInterval(() => {
            setIndex(prev => (prev + 1) % components.length);
        }, 1200); // Faster cycle
        return () => clearInterval(interval);
    }, [components.length]);

    return (
        <div className="ai-message-bubble planning-revolver" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', paddingLeft: 0 }}>
            <span style={{ color: '#94a3b8', fontSize: '0.95rem', fontWeight: 500 }}>Planning:</span>
            <div style={{ height: '24px', overflow: 'hidden', position: 'relative', width: '250px' }}>
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={index}
                        initial={{ y: 20, opacity: 0, filter: 'blur(4px)' }}
                        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                        exit={{ y: -20, opacity: 0, filter: 'blur(4px)' }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        style={{ position: 'absolute', top: 0, left: 0, color: '#e2e8f0', fontWeight: 500, fontSize: '0.95rem' }}
                    >
                        {components[index]}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

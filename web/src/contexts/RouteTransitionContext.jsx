import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBuilderAuth } from './BuilderAuthContext';
import { MODEL_IDS } from '../pages/Agency/pages/Builder/model-registry.client.js';

const RouteTransitionContext = createContext(null);

export const RouteTransitionProvider = ({ children }) => {
    const [phase, setPhase] = useState('idle'); // 'idle', 'outro', 'covered', 'intro', 'revealing'
    const [transitionData, setTransitionData] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { getAccessToken } = useBuilderAuth();

    // Reset if we unexpectedly unmount or route changes externally and we are stuck
    useEffect(() => {
        if (phase !== 'idle' && !location.pathname.includes('/builder')) {
            setPhase('idle');
            setTransitionData(null);
        }
    }, [location.pathname, phase]);

    const startTransition = useCallback(async (targetRoute, stateToPass) => {
        setTransitionData(stateToPass);
        setPhase('outro');

        // Fire the cinematic response API call as early as possible (in parallel with transitions).
        // The cinematic LLM is "fire-and-forget" for the user experience: if it
        // hangs (cold model, transient provider issue, server restart), we must
        // never let the transition stall on it. We use AbortController + a
        // hard timeout so the transition is bounded regardless of backend state.
        const fetchStartTime = Date.now();
        const CINEMATIC_TIMEOUT_MS = 6000;
        let cinematicPromise = null;
        let cinematicController = null;

        if (!stateToPass?.isProjectRevisit && !stateToPass?.templateId && !stateToPass?.templateData && stateToPass?.prompt) {
            let cineModel = MODEL_IDS.GEMINI_25_FLASH;
            if (stateToPass.model) {
                if (stateToPass.model.includes('openai/')) cineModel = MODEL_IDS.GPT_55_MINI;
                if (stateToPass.model.includes('anthropic/')) cineModel = MODEL_IDS.CLAUDE_HAIKU_45;
            }

            cinematicController = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const abortTimer = cinematicController
                ? setTimeout(() => {
                    try { cinematicController.abort(); } catch { /* noop */ }
                }, CINEMATIC_TIMEOUT_MS)
                : null;

            const token = getAccessToken();

            cinematicPromise = fetch('/api/cinematic-response', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ prompt: stateToPass.prompt, model: cineModel }),
                signal: cinematicController?.signal
            })
                .catch((e) => {
                    if (e?.name === 'AbortError') {
                        console.warn('[Cinematic] Request aborted after timeout — using fallback line.');
                    } else {
                        console.error('[Cinematic] Fetch failed:', e?.message || e);
                    }
                    return null;
                })
                .finally(() => {
                    if (abortTimer) clearTimeout(abortTimer);
                });
        }

        // Wait for Builder screen to fade out
        await new Promise(r => setTimeout(r, 500));

        setPhase('covered');
        navigate(targetRoute, { state: stateToPass });

        // Allow generation mount to settle before starting intro animations
        await new Promise(r => setTimeout(r, 100));
        setPhase('intro');

        if (stateToPass?.isProjectRevisit) {
            // "Illusion of work" for revisited projects: Wait 15 seconds
            const WAIT_TIME = 15000;
            
            // Pulse dots for 15s
            await new Promise(r => setTimeout(r, WAIT_TIME));
            
            // Then show fixed response
            setTransitionData(prev => ({ 
                ...prev, 
                cinematicResponse: "Alright! Setting up environment for you." 
            }));
        } else if (stateToPass?.templateId || stateToPass?.templateData) {
            // HARDCODED RESPONSE FOR TEMPLATES
            const minimumSuspenseTime = 2500;
            await new Promise(r => setTimeout(r, minimumSuspenseTime));
            
            const templateName = stateToPass?.templateData?.name || 'template';
            setTransitionData(prev => ({ 
                ...prev, 
                cinematicResponse: `Alright, I will set up the ${templateName} for you.` 
            }));
        } else {
            try {
                let res = null;
                if (cinematicPromise) {
                    res = await cinematicPromise;
                }
                
                let data = null;
                if (res && res.ok) {
                    data = await res.json();
                }

                // Slashed suspense time for "fast fast" transition
                const fetchDuration = Date.now() - fetchStartTime;
                const minimumSuspenseTime = 2500; // Accelerated from 8000ms

                if (fetchDuration < minimumSuspenseTime) {
                    await new Promise(r => setTimeout(r, minimumSuspenseTime - fetchDuration));
                }

                if (data && data.success && data.response) {
                    setTransitionData(prev => ({ ...prev, cinematicResponse: data.response }));
                } else {
                    setTransitionData(prev => ({ ...prev, cinematicResponse: "Architecting a premium experience with precise visuals." }));
                }
            } catch (e) {
                console.error('Failed to fetch cinematic response:', e);
                setTransitionData(prev => ({ ...prev, cinematicResponse: "Architecting a premium experience with precise visuals." }));
            }
        }

    }, [navigate, getAccessToken]);

    const completeIntro = useCallback(() => {
        setPhase('revealing');
        // REVEAL PHASE: This is where we trigger the exit of the overlay
        setTimeout(() => {
            setPhase('idle');
        }, 800);
    }, []);

    return (
        <RouteTransitionContext.Provider value={{ phase, transitionData, startTransition, completeIntro }}>
            {children}
        </RouteTransitionContext.Provider>
    );
};

export const useRouteTransition = () => useContext(RouteTransitionContext);

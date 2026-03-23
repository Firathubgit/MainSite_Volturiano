import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const RouteTransitionContext = createContext(null);

export const RouteTransitionProvider = ({ children }) => {
    const [phase, setPhase] = useState('idle'); // 'idle', 'outro', 'covered', 'intro', 'revealing'
    const [transitionData, setTransitionData] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

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
        } else if (stateToPass?.templateId) {
            // HARDCODED RESPONSE FOR TEMPLATES
            const minimumSuspenseTime = 2500;
            await new Promise(r => setTimeout(r, minimumSuspenseTime));
            
            setTransitionData(prev => ({ 
                ...prev, 
                cinematicResponse: "Alright, I will set up the template for you." 
            }));
        } else {
            try {
                const fetchStartTime = Date.now();
                const res = await fetch('/api/cinematic-response', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: stateToPass.prompt, model: stateToPass.model })
                });
                const data = await res.json();

                // Slashed suspense time for "fast fast" transition
                const fetchDuration = Date.now() - fetchStartTime;
                const minimumSuspenseTime = 2500; // Accelerated from 8000ms

                if (fetchDuration < minimumSuspenseTime) {
                    await new Promise(r => setTimeout(r, minimumSuspenseTime - fetchDuration));
                }

                if (data.success && data.response) {
                    setTransitionData(prev => ({ ...prev, cinematicResponse: data.response }));
                } else {
                    setTransitionData(prev => ({ ...prev, cinematicResponse: "Architecting a premium experience with precise visuals." }));
                }
            } catch (e) {
                console.error('Failed to fetch cinematic response:', e);
                setTransitionData(prev => ({ ...prev, cinematicResponse: "Architecting a premium experience with precise visuals." }));
            }
        }

    }, [navigate]);

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

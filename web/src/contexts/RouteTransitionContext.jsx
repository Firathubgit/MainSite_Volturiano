import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBuilderAuth } from './BuilderAuthContext';
import { MODEL_IDS } from '../pages/Agency/pages/Builder/model-registry.client.js';

const RouteTransitionContext = createContext(null);
const INTAKE_TIMEOUT_MS = 28000;

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseResponse(response, fallbackMessage) {
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
        throw new Error(data?.error || fallbackMessage);
    }
    return data;
}

function navigationState(data, additions = {}) {
    const {
        targetRoute: _targetRoute,
        intakeStatus: _intakeStatus,
        intakeError: _intakeError,
        componentStatus: _componentStatus,
        componentError: _componentError,
        intake: _intake,
        guidedIntake: _guidedIntake,
        ...state
    } = data || {};
    return { ...state, ...additions };
}

function restoreBuilderVisuals() {
    if (typeof document === 'undefined') return;
    const builderRoot = document.querySelector('[class*="outerWrapper"]');
    if (!builderRoot) return;
    builderRoot.style.opacity = '';
    builderRoot.style.transform = '';
    builderRoot.style.filter = '';
}

export const RouteTransitionProvider = ({ children }) => {
    const [phase, setPhase] = useState('idle');
    const [transitionData, setTransitionData] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { getAccessToken } = useBuilderAuth();
    const runRef = useRef(0);
    const controllerRef = useRef(null);
    const componentControllerRef = useRef(null);
    const finalizingRef = useRef(false);

    useEffect(() => {
        if (phase !== 'idle' && !location.pathname.includes('/builder')) {
            controllerRef.current?.abort();
            componentControllerRef.current?.abort();
            runRef.current += 1;
            finalizingRef.current = false;
            setPhase('idle');
            setTransitionData(null);
        }
    }, [location.pathname, phase]);

    useEffect(() => () => {
        controllerRef.current?.abort();
        componentControllerRef.current?.abort();
    }, []);

    const requestDesignIntake = useCallback(async (runId, data) => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        const timeout = setTimeout(() => controller.abort(), INTAKE_TIMEOUT_MS);

        setTransitionData((previous) => ({
            ...previous,
            intakeStatus: 'loading',
            intakeError: null,
        }));

        try {
            const token = getAccessToken();
            const response = await fetch('/api/design-intake/prepare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    prompt: data.prompt,
                    images: data.images || [],
                    model: data.model,
                    initialComponents: data.initialComponents || [],
                    allowCommunityComponents:
                        data.allowCommunityComponents !== false && data.premiumMode !== 'off',
                }),
                signal: controller.signal,
            });
            const result = await parseResponse(response, 'Could not prepare the design brief.');
            if (runRef.current !== runId) return;
            setTransitionData((previous) => ({
                ...previous,
                intakeStatus: 'ready',
                intake: result.intake,
                intakeError: null,
            }));
        } catch (error) {
            if (runRef.current !== runId) return;
            const message = error?.name === 'AbortError'
                ? 'Planning took too long. You can retry without losing your prompt.'
                : error.message;
            setTransitionData((previous) => ({
                ...previous,
                intakeStatus: 'error',
                intakeError: message,
            }));
        } finally {
            clearTimeout(timeout);
            if (controllerRef.current === controller) controllerRef.current = null;
        }
    }, [getAccessToken]);

    const runLegacyTransition = useCallback(async (runId, targetRoute, stateToPass) => {
        const fetchStartTime = Date.now();
        const cinematicController = new AbortController();
        const abortTimer = setTimeout(() => cinematicController.abort(), 6000);
        controllerRef.current = cinematicController;

        let cinematicPromise = null;
        if (!stateToPass?.isProjectRevisit && !stateToPass?.templateId && !stateToPass?.templateData && stateToPass?.prompt) {
            let cineModel = MODEL_IDS.GEMINI_25_FLASH;
            if (stateToPass.model?.includes('openai/')) cineModel = MODEL_IDS.GPT_55_MINI;
            if (stateToPass.model?.includes('anthropic/')) cineModel = MODEL_IDS.CLAUDE_HAIKU_45;
            const token = getAccessToken();
            cinematicPromise = fetch('/api/cinematic-response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ prompt: stateToPass.prompt, model: cineModel }),
                signal: cinematicController.signal,
            }).catch(() => null);
        }

        await wait(500);
        if (runRef.current !== runId) return;
        setPhase('covered');
        navigate(targetRoute, { state: stateToPass });
        await wait(100);
        if (runRef.current !== runId) return;
        setPhase('intro');

        let cinematicResponse = null;
        if (stateToPass?.isProjectRevisit) {
            await wait(15000);
            cinematicResponse = 'Alright! Setting up environment for you.';
        } else if (stateToPass?.templateId || stateToPass?.templateData) {
            await wait(2500);
            const templateName = stateToPass?.templateData?.name || 'template';
            cinematicResponse = `Alright, I will set up the ${templateName} for you.`;
        } else {
            const response = cinematicPromise ? await cinematicPromise : null;
            const elapsed = Date.now() - fetchStartTime;
            if (elapsed < 2500) await wait(2500 - elapsed);
            const payload = response?.ok ? await response.json().catch(() => null) : null;
            cinematicResponse = payload?.response
                || 'Architecting a premium experience with precise visuals.';
        }

        clearTimeout(abortTimer);
        if (runRef.current !== runId) return;
        setTransitionData((previous) => ({ ...previous, cinematicResponse }));
    }, [getAccessToken, navigate]);

    const refreshIntakeComponents = useCallback(async (answers) => {
        if (!transitionData?.guidedIntake || !transitionData?.intake) return;
        const runId = runRef.current;
        const allowCommunityComponents = (
            transitionData.allowCommunityComponents !== false
            && transitionData.premiumMode !== 'off'
        );

        if (!allowCommunityComponents) {
            setTransitionData((previous) => ({
                ...previous,
                componentStatus: 'ready',
                componentError: null,
            }));
            return;
        }

        componentControllerRef.current?.abort();
        const controller = new AbortController();
        componentControllerRef.current = controller;
        const timeout = setTimeout(() => controller.abort(), INTAKE_TIMEOUT_MS);

        setTransitionData((previous) => ({
            ...previous,
            componentStatus: 'loading',
            componentError: null,
        }));

        try {
            const token = getAccessToken();
            const response = await fetch('/api/design-intake/components', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    prompt: transitionData.prompt,
                    intake: transitionData.intake,
                    answers,
                    allowCommunityComponents,
                }),
                signal: controller.signal,
            });
            const result = await parseResponse(
                response,
                'Could not refresh component suggestions.',
            );
            if (runRef.current !== runId) return;
            setTransitionData((previous) => ({
                ...previous,
                intake: result.intake,
                componentStatus: 'ready',
                componentError: null,
            }));
        } catch (error) {
            if (runRef.current !== runId || finalizingRef.current) return;
            setTransitionData((previous) => ({
                ...previous,
                componentStatus: 'error',
                componentError: error?.name === 'AbortError'
                    ? 'Component matching took too long. Showing the prompt-based matches instead.'
                    : 'Fresh matches were unavailable. Showing the prompt-based matches instead.',
            }));
        } finally {
            clearTimeout(timeout);
            if (componentControllerRef.current === controller) {
                componentControllerRef.current = null;
            }
        }
    }, [getAccessToken, transitionData]);

    const startTransition = useCallback(async (targetRoute, stateToPass = {}) => {
        controllerRef.current?.abort();
        componentControllerRef.current?.abort();
        finalizingRef.current = false;
        const runId = runRef.current + 1;
        runRef.current = runId;
        const guidedIntake = Boolean(
            stateToPass.guidedIntake
            && !stateToPass.isProjectRevisit
            && !stateToPass.templateId
            && !stateToPass.templateData
            && stateToPass.prompt,
        );
        const data = {
            ...stateToPass,
            targetRoute,
            guidedIntake,
            intakeStatus: guidedIntake ? 'loading' : 'idle',
            intakeError: null,
            componentStatus: guidedIntake ? 'idle' : 'ready',
            componentError: null,
        };

        setTransitionData(data);
        setPhase('outro');

        if (!guidedIntake) {
            await runLegacyTransition(runId, targetRoute, stateToPass);
            return;
        }

        const intakePromise = requestDesignIntake(runId, data);
        await wait(500);
        if (runRef.current !== runId) return;
        setPhase('covered');
        await wait(100);
        if (runRef.current !== runId) return;
        setPhase('intro');
        await intakePromise;
    }, [requestDesignIntake, runLegacyTransition]);

    const retryIntake = useCallback(() => {
        if (!transitionData?.guidedIntake) return;
        const runId = runRef.current + 1;
        runRef.current = runId;
        requestDesignIntake(runId, transitionData);
    }, [requestDesignIntake, transitionData]);

    const finishIntake = useCallback(async (draft) => {
        if (!transitionData?.guidedIntake || !transitionData?.intake || finalizingRef.current) return;
        finalizingRef.current = true;
        componentControllerRef.current?.abort();
        const runId = runRef.current;
        setTransitionData((previous) => ({
            ...previous,
            intakeStatus: 'finalizing',
            intakeError: null,
        }));

        try {
            const token = getAccessToken();
            const response = await fetch('/api/design-intake/finalize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    prompt: transitionData.prompt,
                    intake: transitionData.intake,
                    draft,
                }),
            });
            const result = await parseResponse(response, 'Could not lock the design brief.');
            if (runRef.current !== runId) return;

            const enrichedState = navigationState(transitionData, {
                generationPrompt: result.generationPrompt,
                designBrief: result.designBrief,
                initialComponents: result.selectedComponents,
                manualSelectionIds: result.manualSelectionIds,
                confirmedBriefSummary: result.briefSummary,
                optimisticCreditDeduction: true,
            });
            setTransitionData((previous) => ({
                ...previous,
                ...enrichedState,
                intakeStatus: 'complete',
                cinematicResponse: result.briefSummary,
            }));

            await wait(500);
            if (runRef.current !== runId) return;
            navigate(transitionData.targetRoute, { state: enrichedState });
            await wait(180);
            if (runRef.current !== runId) return;
            setPhase('revealing');
            await wait(800);
            if (runRef.current === runId) setPhase('idle');
        } catch (error) {
            if (runRef.current !== runId) return;
            finalizingRef.current = false;
            setTransitionData((previous) => ({
                ...previous,
                intakeStatus: 'ready',
                intakeError: error.message,
            }));
        }
    }, [getAccessToken, navigate, transitionData]);

    const continueWithDefaults = useCallback(async () => {
        if (!transitionData?.targetRoute) return;
        const runId = runRef.current;
        const state = navigationState(transitionData, {
            optimisticCreditDeduction: true,
        });
        setTransitionData((previous) => ({
            ...previous,
            intakeStatus: 'complete',
            cinematicResponse: 'Using the strongest inferred direction from your original prompt.',
        }));
        navigate(transitionData.targetRoute, { state });
        await wait(180);
        if (runRef.current !== runId) return;
        setPhase('revealing');
        await wait(800);
        if (runRef.current === runId) setPhase('idle');
    }, [navigate, transitionData]);

    const cancelTransition = useCallback(() => {
        controllerRef.current?.abort();
        componentControllerRef.current?.abort();
        runRef.current += 1;
        const canceledRunId = runRef.current;
        finalizingRef.current = false;
        restoreBuilderVisuals();
        window.dispatchEvent(new CustomEvent('cinematic-transition-cancel'));
        setPhase('revealing');
        setTimeout(() => {
            if (runRef.current !== canceledRunId) return;
            setPhase('idle');
            setTransitionData(null);
        }, 500);
    }, []);

    const completeIntro = useCallback(() => {
        setPhase('revealing');
        setTimeout(() => setPhase('idle'), 800);
    }, []);

    return (
        <RouteTransitionContext.Provider value={{
            phase,
            transitionData,
            startTransition,
            completeIntro,
            retryIntake,
            refreshIntakeComponents,
            finishIntake,
            continueWithDefaults,
            cancelTransition,
        }}>
            {children}
        </RouteTransitionContext.Provider>
    );
};

export const useRouteTransition = () => useContext(RouteTransitionContext);

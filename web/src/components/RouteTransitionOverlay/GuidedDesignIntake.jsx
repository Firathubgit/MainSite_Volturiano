import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowRight,
    Check,
    Layers3,
    RotateCcw,
    Send,
} from 'lucide-react';
import { useRouteTransition } from '../../contexts/RouteTransitionContext';
import { useCredits } from '../../hooks/useCredits';
import CreditLimitModal from '../Modals/CreditLimitModal';
import styles from './GuidedDesignIntake.module.css';

function AssistantMessage({ children, muted = false, current = false }) {
    return (
        <motion.div
            className={styles.assistantRow}
            data-current={current ? 'true' : undefined}
            initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className={`${styles.assistantCopy} ${muted ? styles.mutedCopy : ''}`}>
                {children}
            </div>
        </motion.div>
    );
}

function UserMessage({ children, initial = false }) {
    return (
        <motion.div
            className={styles.userRow}
            data-initial={initial ? 'true' : undefined}
            initial={{ opacity: 0, y: initial ? 20 : 12, filter: 'blur(5px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className={styles.userBubble}>{children}</div>
        </motion.div>
    );
}

function LoadingDots() {
    return (
        <div className={styles.loadingDots} aria-label="Preparing your design brief">
            <span />
            <span />
            <span />
            <span />
        </div>
    );
}

export function GuidedDesignIntake() {
    const {
        transitionData,
        retryIntake,
        refreshIntakeComponents,
        finishIntake,
        continueWithDefaults,
        cancelTransition,
    } = useRouteTransition();
    const { isOut: outOfCredits, isUnlimited } = useCredits();
    const intake = transitionData?.intake;
    const status = transitionData?.intakeStatus;
    const [stage, setStage] = useState('questions');
    const [answers, setAnswers] = useState([]);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [typographyId, setTypographyId] = useState('');
    const [paletteId, setPaletteId] = useState('');
    const [componentIds, setComponentIds] = useState([]);
    const [customQuestionId, setCustomQuestionId] = useState(null);
    const [customValue, setCustomValue] = useState('');
    const [showCreditModal, setShowCreditModal] = useState(false);
    const scrollRef = useRef(null);
    const rootRef = useRef(null);
    const previousFocusRef = useRef(null);
    const planIdentityRef = useRef('');

    const planIdentity = intake
        ? `${intake.version}:${intake.interpretation}:${intake.questions?.map((question) => question.id).join(',')}`
        : '';

    useEffect(() => {
        if (!intake || planIdentityRef.current === planIdentity) return;
        planIdentityRef.current = planIdentity;
        setStage('questions');
        setAnswers([]);
        setQuestionIndex(0);
        setTypographyId(
            intake.typographyOptions?.find((option) => option.recommended)?.id
            || intake.typographyOptions?.[0]?.id
            || '',
        );
        setPaletteId(
            intake.paletteOptions?.find((option) => option.recommended)?.id
            || intake.paletteOptions?.[0]?.id
            || '',
        );
        setComponentIds(
            (intake.preselectedComponents || []).map((component) => component.id).slice(0, 4),
        );
        setCustomQuestionId(null);
        setCustomValue('');
    }, [intake, planIdentity]);

    useEffect(() => {
        if (typeof document === 'undefined' || !intake?.typographyOptions?.length) return undefined;
        const families = [...new Set(
            intake.typographyOptions.flatMap((option) => [
                option.typography.headingFont,
                option.typography.bodyFont,
            ]).filter(Boolean),
        )];
        if (families.length === 0) return undefined;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.dataset.guidedIntakeFonts = 'true';
        link.href = `https://fonts.googleapis.com/css2?${families
            .map((family) => `family=${String(family).trim().replace(/\s+/g, '+')}:wght@400;500;600;700;800`)
            .join('&')}&display=swap`;
        document.head.appendChild(link);
        return () => link.remove();
    }, [intake]);

    useEffect(() => {
        if (typeof document === 'undefined') return undefined;
        previousFocusRef.current = document.activeElement;
        const root = rootRef.current;
        if (!root) return undefined;

        const getFocusable = () => [...root.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        )].filter((element) => !element.hasAttribute('hidden'));
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                if (showCreditModal) {
                    setShowCreditModal(false);
                    return;
                }
                cancelTransition();
                return;
            }
            if (event.key !== 'Tab') return;

            const focusable = getFocusable();
            if (focusable.length === 0) {
                event.preventDefault();
                root.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            if (!root.contains(active)) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
            } else if (event.shiftKey && (active === first || active === root)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);
        root.focus({ preventScroll: true });
        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            const previousFocus = previousFocusRef.current;
            if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') {
                previousFocus.focus({ preventScroll: true });
            }
        };
    }, [cancelTransition, showCreditModal]);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            const root = rootRef.current;
            if (root && !root.contains(document.activeElement)) {
                root.focus({ preventScroll: true });
            }
        });
        return () => cancelAnimationFrame(frame);
    }, [stage, questionIndex, status]);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            const container = scrollRef.current;
            if (!container) return;
            const currentMessage = container.querySelector('[data-current="true"]');
            if (!currentMessage) {
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
                return;
            }
            const isCompact = currentMessage.offsetHeight < container.clientHeight * 0.66;
            const breathingRoom = isCompact
                ? Math.max(48, (container.clientHeight - currentMessage.offsetHeight) / 2)
                : 58;
            container.scrollTo({
                top: Math.max(0, currentMessage.offsetTop - breathingRoom),
                behavior: 'smooth',
            });
        });
        return () => cancelAnimationFrame(frame);
    }, [answers, stage, questionIndex, status, customQuestionId]);

    const selectedTypography = useMemo(
        () => intake?.typographyOptions?.find((option) => option.id === typographyId),
        [intake, typographyId],
    );
    const selectedPalette = useMemo(
        () => intake?.paletteOptions?.find((option) => option.id === paletteId),
        [intake, paletteId],
    );
    const allComponents = useMemo(() => {
        const byId = new Map();
        for (const component of [
            ...(intake?.preselectedComponents || []),
            ...(intake?.componentSuggestions || []),
        ]) {
            if (component?.id && !byId.has(component.id)) byId.set(component.id, component);
        }
        return [...byId.values()];
    }, [intake]);
    const selectedComponents = useMemo(
        () => componentIds
            .map((id) => allComponents.find((component) => component.id === id))
            .filter(Boolean),
        [allComponents, componentIds],
    );

    const currentQuestion = intake?.questions?.[questionIndex];
    const componentStatus = transitionData?.componentStatus || 'idle';
    const componentChoicesEnabled = (
        transitionData?.allowCommunityComponents !== false
        && transitionData?.premiumMode !== 'off'
    );
    const hasComponentStage = allComponents.length > 0 || componentChoicesEnabled;
    const chooseAnswer = (question, { optionId, value }) => {
        const nextAnswers = [
            ...answers.filter((answer) => answer.questionId !== question.id),
            { questionId: question.id, optionId, value },
        ];
        setAnswers(nextAnswers);
        setCustomQuestionId(null);
        setCustomValue('');

        if (questionIndex < intake.questions.length - 1) {
            setQuestionIndex((index) => index + 1);
        } else {
            refreshIntakeComponents(nextAnswers);
            setStage('typography');
        }
    };

    const submitCustomAnswer = (event) => {
        event?.preventDefault();
        if (!currentQuestion || !customValue.trim()) return;
        chooseAnswer(currentQuestion, {
            optionId: 'custom',
            value: customValue.trim(),
        });
    };

    const continueFromPalette = () => {
        setStage(hasComponentStage ? 'components' : 'review');
    };

    const toggleComponent = (componentId) => {
        setComponentIds((current) => {
            if (current.includes(componentId)) {
                return current.filter((id) => id !== componentId);
            }
            if (current.length >= 4) return current;
            return [...current, componentId];
        });
    };

    const startBuild = () => {
        if (outOfCredits && !isUnlimited) {
            setShowCreditModal(true);
            return;
        }
        finishIntake({
            answers,
            typographyId,
            paletteId,
            componentIds,
        });
    };

    const liveStatus = status === 'loading'
        ? 'Preparing your design brief.'
        : status === 'error'
            ? 'Planning paused. You can retry or build with inferred defaults.'
            : status === 'finalizing'
                ? 'Locking the confirmed design brief.'
                : status === 'complete'
                    ? 'Design brief locked. Opening the generation studio.'
                    : stage === 'questions'
                        ? `Decision ${questionIndex + 1} of ${intake?.questions?.length || 1}.`
                        : stage === 'typography'
                            ? 'Choose typography.'
                            : stage === 'palette'
                                ? 'Choose a color palette.'
                            : stage === 'components'
                                ? componentStatus === 'loading'
                                    ? 'Finding matching components.'
                                    : `${componentIds.length} of 4 components selected.`
                                : 'Review your selections.';

    return (
        <div
            ref={rootRef}
            className={styles.root}
            role="dialog"
            aria-modal="true"
            aria-label="Website design planning"
            aria-busy={status === 'loading' || status === 'finalizing'}
            tabIndex={-1}
        >
            <div className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
                {liveStatus}
            </div>
            <main className={styles.conversation} ref={scrollRef}>
                <div className={styles.conversationInner}>
                    <UserMessage initial>{transitionData?.prompt}</UserMessage>

                    {status === 'loading' && (
                        <AssistantMessage current>
                            <LoadingDots />
                        </AssistantMessage>
                    )}

                    {status === 'error' && (
                        <AssistantMessage current>
                            <p>{transitionData?.intakeError || 'The brief could not be prepared.'}</p>
                            <div className={styles.errorActions}>
                                <button type="button" className={styles.primaryButton} onClick={retryIntake}>
                                    <RotateCcw size={15} />
                                    Retry
                                </button>
                                <button type="button" className={styles.textButton} onClick={continueWithDefaults}>
                                    Use defaults
                                </button>
                            </div>
                        </AssistantMessage>
                    )}

                    {intake && status !== 'loading' && status !== 'error' && (
                        <>
                            <AssistantMessage>
                                <p>{intake.interpretation}</p>
                            </AssistantMessage>

                            {answers.map((answer) => {
                                const question = intake.questions.find((item) => item.id === answer.questionId);
                                if (!question) return null;
                                return (
                                    <React.Fragment key={answer.questionId}>
                                        <AssistantMessage muted>
                                            <p>{question.question}</p>
                                        </AssistantMessage>
                                        <UserMessage>{answer.value}</UserMessage>
                                    </React.Fragment>
                                );
                            })}

                            {stage === 'questions' && currentQuestion && (
                                <AssistantMessage current>
                                    <p className={styles.questionText}>{currentQuestion.question}</p>
                                    <div className={styles.optionList}>
                                        {currentQuestion.options.map((option) => (
                                            <button
                                                type="button"
                                                key={option.id}
                                                className={styles.optionButton}
                                                onClick={() => chooseAnswer(currentQuestion, {
                                                    optionId: option.id,
                                                    value: option.label,
                                                })}
                                            >
                                                <span className={styles.optionMarker} />
                                                    <span className={styles.optionCopy}>
                                                        <span>
                                                            {option.label}
                                                        </span>
                                                    </span>
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            className={styles.optionButton}
                                            onClick={() => setCustomQuestionId(currentQuestion.id)}
                                        >
                                            <span className={styles.optionMarker} />
                                            <span className={styles.optionCopy}>
                                                <span>Write my own</span>
                                            </span>
                                        </button>
                                    </div>
                                    <AnimatePresence>
                                        {customQuestionId === currentQuestion.id && (
                                            <motion.form
                                                className={styles.customAnswer}
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                onSubmit={submitCustomAnswer}
                                            >
                                                <input
                                                    autoFocus
                                                    value={customValue}
                                                    onChange={(event) => setCustomValue(event.target.value)}
                                                    placeholder="Describe the direction..."
                                                    maxLength={300}
                                                />
                                                <button type="submit" disabled={!customValue.trim()} aria-label="Use custom answer">
                                                    <Send size={15} />
                                                </button>
                                            </motion.form>
                                        )}
                                    </AnimatePresence>
                                </AssistantMessage>
                            )}

                            {stage === 'typography' && (
                                <AssistantMessage current>
                                    <fieldset className={styles.selectionFieldset}>
                                        <legend className={styles.stageTitle}>Typography</legend>
                                        <div className={styles.typographyGrid}>
                                            {intake.typographyOptions.map((option) => {
                                                const selected = typographyId === option.id;
                                                return (
                                                    <label
                                                        key={option.id}
                                                        className={`${styles.typographyCard} ${selected ? styles.selectedCard : ''}`}
                                                    >
                                                        <input
                                                            className={styles.selectionInput}
                                                            type="radio"
                                                            name="guided-intake-typography"
                                                            value={option.id}
                                                            checked={selected}
                                                            onChange={() => setTypographyId(option.id)}
                                                        />
                                                        <span
                                                            className={styles.typeSample}
                                                            style={{ fontFamily: `"${option.typography.headingFont}", sans-serif` }}
                                                        >
                                                            {option.sample}
                                                        </span>
                                                        <span className={styles.cardTitle}>
                                                            {option.label}
                                                        </span>
                                                        {selected && <Check className={styles.cardCheck} size={16} aria-hidden="true" />}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        <div className={styles.stageActions}>
                                            <button
                                                type="button"
                                                className={styles.primaryButton}
                                                disabled={!typographyId}
                                                onClick={() => setStage('palette')}
                                            >
                                                Continue
                                                <ArrowRight size={15} />
                                            </button>
                                        </div>
                                    </fieldset>
                                </AssistantMessage>
                            )}

                            {stage === 'palette' && (
                                <AssistantMessage current>
                                    <fieldset className={styles.selectionFieldset}>
                                        <legend className={styles.stageTitle}>Color palette</legend>
                                        <div className={styles.paletteGrid}>
                                            {intake.paletteOptions.map((option) => {
                                                const palette = option.palette;
                                                const selected = paletteId === option.id;
                                                const colors = [
                                                    palette.background,
                                                    palette.surface,
                                                    palette.primary,
                                                    palette.secondary,
                                                    palette.accent,
                                                ];
                                                return (
                                                    <label
                                                        key={option.id}
                                                        className={`${styles.paletteCard} ${selected ? styles.selectedCard : ''}`}
                                                    >
                                                        <input
                                                            className={styles.selectionInput}
                                                            type="radio"
                                                            name="guided-intake-palette"
                                                            value={option.id}
                                                            checked={selected}
                                                            onChange={() => setPaletteId(option.id)}
                                                        />
                                                        <span className={styles.swatches} aria-hidden="true">
                                                            {colors.map((color, index) => (
                                                                <i key={`${color}-${index}`} style={{ background: color }} />
                                                            ))}
                                                        </span>
                                                        <span className={styles.cardTitle}>
                                                            {option.label}
                                                        </span>
                                                        {selected && <Check className={styles.cardCheck} size={16} aria-hidden="true" />}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        <div className={styles.stageActions}>
                                            <button
                                                type="button"
                                                className={styles.textButton}
                                                onClick={() => setStage('typography')}
                                            >
                                                Back
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.primaryButton}
                                                disabled={!paletteId}
                                                onClick={continueFromPalette}
                                            >
                                                Continue
                                                <ArrowRight size={15} />
                                            </button>
                                        </div>
                                    </fieldset>
                                </AssistantMessage>
                            )}

                            {stage === 'components' && (
                                <AssistantMessage current>
                                    <section className={styles.componentStage} aria-labelledby="component-stage-title">
                                        <h2 id="component-stage-title" className={styles.stageTitle}>Components</h2>
                                        <span className={styles.stageHint}>Choose up to 4.</span>
                                    </section>
                                    <section
                                        className={styles.componentPanel}
                                        aria-label="Matching community components"
                                        aria-describedby="component-selection-count"
                                    >
                                        <span id="component-selection-count" className={styles.srOnly}>
                                            {componentIds.length} of 4 components selected.
                                        </span>
                                        {componentStatus === 'loading' ? (
                                            <div className={styles.componentState}>
                                                <LoadingDots />
                                            </div>
                                        ) : (
                                            <>
                                                {transitionData?.componentError && (
                                                    <div className={styles.componentNotice}>
                                                        {transitionData.componentError}
                                                    </div>
                                                )}
                                                {allComponents.length > 0 ? (
                                                    <div className={styles.componentGrid}>
                                                        {allComponents.map((component) => {
                                                            const selected = componentIds.includes(component.id);
                                                            const unavailable = !selected && componentIds.length >= 4;
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    key={component.id}
                                                                    aria-pressed={selected}
                                                                    disabled={unavailable}
                                                                    className={`${styles.componentCard} ${selected ? styles.selectedCard : ''}`}
                                                                    onClick={() => toggleComponent(component.id)}
                                                                >
                                                                    <span className={styles.componentPreview}>
                                                                        {component.thumbnailUrl ? (
                                                                            <img src={component.thumbnailUrl} alt="" />
                                                                        ) : (
                                                                            <span className={styles.previewFallback}>
                                                                                <Layers3 size={24} />
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                    <span className={styles.componentBody}>
                                                                        <span className={styles.cardTitle}>{component.name}</span>
                                                                    </span>
                                                                    <span className={styles.selectionCheck}>
                                                                        {selected && <Check size={14} />}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className={styles.componentState}>
                                                        <Layers3 size={22} />
                                                        <strong>No matching components</strong>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        <div className={styles.panelFooter}>
                                            <button
                                                type="button"
                                                className={styles.textButton}
                                                disabled={componentStatus === 'loading'}
                                                onClick={() => {
                                                    setComponentIds([]);
                                                    setStage('review');
                                                }}
                                            >
                                                Skip
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.primaryButton}
                                                disabled={componentStatus === 'loading'}
                                                onClick={() => setStage('review')}
                                            >
                                                Continue{componentIds.length > 0 ? ` (${componentIds.length})` : ''}
                                                <ArrowRight size={15} />
                                            </button>
                                        </div>
                                    </section>
                                </AssistantMessage>
                            )}

                            {stage === 'review' && (
                                <AssistantMessage current={status !== 'complete'}>
                                    <section className={styles.reviewPanel} aria-label="Confirmed selections">
                                        <div className={styles.reviewTags}>
                                            {answers.map((answer) => (
                                                <span className={styles.reviewTag} key={answer.questionId}>
                                                    {answer.value}
                                                </span>
                                            ))}
                                            {selectedTypography?.label && (
                                                <span className={styles.reviewTag}>{selectedTypography.label}</span>
                                            )}
                                            {selectedPalette?.label && (
                                                <span className={`${styles.reviewTag} ${styles.paletteTag}`}>
                                                    <span aria-hidden="true">
                                                        {[selectedPalette?.palette?.primary, selectedPalette?.palette?.accent]
                                                            .filter(Boolean)
                                                            .map((color) => <i key={color} style={{ background: color }} />)}
                                                    </span>
                                                    {selectedPalette.label}
                                                </span>
                                            )}
                                            {selectedComponents.map((component) => (
                                                <span className={styles.reviewTag} key={component.id}>
                                                    {component.name}
                                                </span>
                                            ))}
                                        </div>
                                        {transitionData?.intakeError && (
                                            <div className={styles.inlineError}>{transitionData.intakeError}</div>
                                        )}
                                        <div className={styles.panelFooter}>
                                            <button
                                                type="button"
                                                className={styles.textButton}
                                                onClick={() => setStage('typography')}
                                                disabled={status === 'finalizing'}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.buildButton}
                                                onClick={startBuild}
                                                disabled={status === 'finalizing'}
                                            >
                                                {status === 'finalizing' ? (
                                                    <>
                                                        <LoadingDots />
                                                        Locking brief
                                                    </>
                                                ) : (
                                                    'Continue to build'
                                                )}
                                            </button>
                                        </div>
                                    </section>
                                </AssistantMessage>
                            )}

                            {status === 'complete' && (
                                <AssistantMessage current>
                                    <p>{transitionData?.cinematicResponse || 'Opening the generation studio.'}</p>
                                </AssistantMessage>
                            )}
                        </>
                    )}
                </div>
            </main>
            <CreditLimitModal
                isOpen={showCreditModal}
                onClose={() => setShowCreditModal(false)}
            />
        </div>
    );
}

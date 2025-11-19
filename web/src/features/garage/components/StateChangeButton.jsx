import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../../stores/garageStore';
import { getValidTargetStates, isTerminalState } from '../utils/stateTransitions';
import StateChangeDialog from './StateChangeDialog';
import styles from './StateChangeButton.module.css';

/**
 * StateChangeButton - Dropdown button for changing garage item state
 * @param {Object} props
 * @param {string} props.itemId - Garage item ID
 * @param {string} props.currentState - Current state of the item
 * @param {Function} props.onStateChanged - Optional callback when state changes
 */
export default function StateChangeButton({
  itemId,
  currentState,
  onStateChanged
}) {
  const { t } = useTranslation('account');
  const { updateItemState } = useGarageStore();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingState, setPendingState] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState(null);
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const validTargetStates = useMemo(() => {
    if (!currentState) return [];
    return getValidTargetStates(currentState);
  }, [currentState]);

  const isTerminal = useMemo(() => {
    return isTerminalState(currentState);
  }, [currentState]);

  const getStateLabel = (state) => {
    return t(`garage.stateChange.states.${state}`, state);
  };

  const handleStateClick = (targetState) => {
    if (targetState === currentState) {
      setIsOpen(false);
      return;
    }

    // Check if confirmation is needed
    const needsConfirmation = targetState === 'archived' || targetState === 'purchased';
    
    if (needsConfirmation) {
      setPendingState(targetState);
      setShowDialog(true);
    } else {
      changeState(targetState);
    }
    setIsOpen(false);
  };

  const changeState = async (newState) => {
    if (!itemId || !newState) return;

    setIsChanging(true);
    setError(null);

    try {
      const { error: changeError } = await updateItemState(itemId, newState, {
        source: 'manual'
      });

      if (changeError) {
        throw changeError;
      }

      // Success
      if (onStateChanged) {
        onStateChanged(newState);
      }
    } catch (err) {
      console.error('[StateChangeButton] Failed to change state:', err);
      setError(err.message || t('garage.stateChange.error', 'Failed to change state'));
    } finally {
      setIsChanging(false);
      setPendingState(null);
    }
  };

  const handleDialogConfirm = () => {
    setShowDialog(false);
    if (pendingState) {
      changeState(pendingState);
    }
  };

  const handleDialogCancel = () => {
    setShowDialog(false);
    setPendingState(null);
  };

  // Don't show button if state is terminal
  if (isTerminal) {
    return null;
  }

  // Don't show button if no valid transitions
  if (validTargetStates.length === 0) {
    return null;
  }

  return (
    <>
      <div className={styles.wrapper} ref={wrapperRef}>
        <button
          type="button"
          className={styles.button}
          onClick={() => setIsOpen(!isOpen)}
          disabled={isChanging}
          title={t('garage.stateChange.title', 'Change State')}
        >
          <span className={styles.buttonText}>
            {isChanging
              ? t('garage.stateChange.changing', 'Changing...')
              : getStateLabel(currentState)}
          </span>
          {!isChanging && (
            <span className={styles.arrow}>▼</span>
          )}
        </button>

        {isOpen && (
          <div className={styles.dropdown}>
            {validTargetStates.map((state) => (
              <button
                key={state}
                type="button"
                className={`${styles.option} ${
                  state === currentState ? styles.optionActive : ''
                }`}
                onClick={() => handleStateClick(state)}
                disabled={isChanging}
              >
                {getStateLabel(state)}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
      </div>

      <StateChangeDialog
        show={showDialog}
        fromState={currentState}
        toState={pendingState}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />
    </>
  );
}


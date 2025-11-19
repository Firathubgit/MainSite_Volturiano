/**
 * State transition validation utilities
 * Defines valid states and allowed transitions between states
 */

/**
 * All valid garage item states
 */
export const VALID_STATES = ['saved', 'purchased', 'prototype', 'wishlist', 'archived'];

/**
 * Valid state transitions mapping
 * Key: from state, Value: array of valid target states
 */
export const VALID_TRANSITIONS = {
  'saved': ['purchased', 'prototype', 'wishlist', 'archived'],
  'purchased': ['saved', 'archived'], // Can't go back to prototype/wishlist once purchased
  'prototype': ['saved', 'wishlist', 'archived'],
  'wishlist': ['saved', 'prototype', 'archived'],
  'archived': [] // Terminal state - no transitions allowed from archived
};

/**
 * Check if a state transition is valid
 * @param {string} fromState - Current state
 * @param {string} toState - Target state
 * @returns {boolean} True if transition is valid
 */
export function canTransition(fromState, toState) {
  if (!fromState || !toState) {
    return false;
  }

  // Same state is always allowed (no-op)
  if (fromState === toState) {
    return true;
  }

  // Check if fromState exists in transitions
  const validTargets = VALID_TRANSITIONS[fromState];
  if (!validTargets) {
    return false;
  }

  // Check if toState is in valid targets
  return validTargets.includes(toState);
}

/**
 * Validate a state transition, throws error if invalid
 * @param {string} fromState - Current state
 * @param {string} toState - Target state
 * @throws {Error} If transition is invalid
 */
export function validateTransition(fromState, toState) {
  if (!fromState || !toState) {
    throw new Error(`Invalid states: fromState=${fromState}, toState=${toState}`);
  }

  // Same state is valid (no-op)
  if (fromState === toState) {
    return;
  }

  // Check if states are valid
  if (!VALID_STATES.includes(fromState)) {
    throw new Error(`Invalid fromState: ${fromState}. Valid states: ${VALID_STATES.join(', ')}`);
  }

  if (!VALID_STATES.includes(toState)) {
    throw new Error(`Invalid toState: ${toState}. Valid states: ${VALID_STATES.join(', ')}`);
  }

  // Check if transition is allowed
  if (!canTransition(fromState, toState)) {
    const validTargets = VALID_TRANSITIONS[fromState] || [];
    throw new Error(
      `Invalid transition: ${fromState} → ${toState}. ` +
      `Valid targets from ${fromState}: ${validTargets.join(', ') || 'none (terminal state)'}`
    );
  }
}

/**
 * Get valid target states for a given source state
 * @param {string} fromState - Current state
 * @returns {string[]} Array of valid target states
 */
export function getValidTargetStates(fromState) {
  if (!fromState || !VALID_STATES.includes(fromState)) {
    return [];
  }

  return VALID_TRANSITIONS[fromState] || [];
}

/**
 * Check if a state is terminal (no transitions allowed)
 * @param {string} state - State to check
 * @returns {boolean} True if state is terminal
 */
export function isTerminalState(state) {
  if (!state) {
    return false;
  }

  const validTargets = VALID_TRANSITIONS[state];
  return Array.isArray(validTargets) && validTargets.length === 0;
}

/**
 * Check if a state is valid
 * @param {string} state - State to validate
 * @returns {boolean} True if state is valid
 */
export function isValidState(state) {
  return VALID_STATES.includes(state);
}


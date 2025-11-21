/**
 * History Utility
 * Implements undo/redo functionality with immutable state snapshots
 */

const MAX_HISTORY_SIZE = 50;

export class HistoryStack {
  constructor() {
    this.past = [];
    this.present = null;
    this.future = [];
  }

  /**
   * Push a new state to history
   * @param {object} state - State snapshot
   */
  push(state) {
    if (this.present) {
      this.past.push(this.present);
      
      // Limit history size
      if (this.past.length > MAX_HISTORY_SIZE) {
        this.past.shift();
      }
    }
    
    this.present = state;
    this.future = []; // Clear future when new action is performed
  }

  /**
   * Undo - move present to future, past to present
   * @returns {object|null} Previous state or null
   */
  undo() {
    if (this.past.length === 0) {
      return null;
    }

    const previous = this.past.pop();
    if (this.present) {
      this.future.unshift(this.present);
    }
    this.present = previous;
    
    return previous;
  }

  /**
   * Redo - move present to past, future to present
   * @returns {object|null} Next state or null
   */
  redo() {
    if (this.future.length === 0) {
      return null;
    }

    const next = this.future.shift();
    if (this.present) {
      this.past.push(this.present);
    }
    this.present = next;
    
    return next;
  }

  /**
   * Check if undo is possible
   * @returns {boolean}
   */
  canUndo() {
    return this.past.length > 0;
  }

  /**
   * Check if redo is possible
   * @returns {boolean}
   */
  canRedo() {
    return this.future.length > 0;
  }

  /**
   * Clear history
   */
  clear() {
    this.past = [];
    this.present = null;
    this.future = [];
  }

  /**
   * Get current state
   * @returns {object|null}
   */
  getCurrent() {
    return this.present;
  }
}

/**
 * Create a deep clone of state for history
 * @param {object} state - State to clone
 * @returns {object} Cloned state
 */
export function createStateSnapshot(state) {
  // Simple deep clone - in production, use a library like lodash.cloneDeep
  return JSON.parse(JSON.stringify(state));
}

/**
 * Command pattern helper for reversible actions
 */
export class Command {
  constructor(execute, undo, description = '') {
    this.execute = execute;
    this.undo = undo;
    this.description = description;
  }
}


/**
 * Context Compaction
 *
 * Replaces the naive trimBlock() strategy in context-assembler.js with
 * proportional budget allocation.  Recent turns are protected with a
 * guaranteed minimum so the agent never loses sight of what just happened.
 *
 * Budget order (highest priority → lowest):
 *   1. Frame text (envelope tags, instructions) — fixed ~400 chars
 *   2. Recent turns — protected minimum of RECENT_TURNS_MIN_BUDGET
 *   3. Agent memory — capped at MEMORY_MAX_BUDGET
 *   4. Project context — gets whatever chars remain
 */

const FRAME_BUDGET = 400;
const RECENT_TURNS_MIN_BUDGET = 3000;
const MEMORY_MAX_BUDGET = 1600;

/**
 * Allocate a character budget across the three context blocks.
 * Returns trimmed versions of each block that together fit within maxTotalChars.
 *
 * @param {Object} options
 * @param {string} options.projectContextBlock
 * @param {string} options.memoryBlock
 * @param {string} options.recentTurnsBlock
 * @param {number} [options.maxTotalChars=9000]
 * @returns {{ projectContextBlock: string, memoryBlock: string, recentTurnsBlock: string }}
 */
export function compactContextBlocks({
  projectContextBlock = '',
  memoryBlock = '',
  recentTurnsBlock = '',
  maxTotalChars = 9000
} = {}) {
  const available = Math.max(0, maxTotalChars - FRAME_BUDGET);

  // 1. Cap memory
  const cappedMemory = smartTrim(memoryBlock, MEMORY_MAX_BUDGET);

  // 2. Protect recent turns: at least RECENT_TURNS_MIN_BUDGET, but can grow if
  //    project context + memory leave room
  const recentBudget = Math.max(
    RECENT_TURNS_MIN_BUDGET,
    available - cappedMemory.length - projectContextBlock.length
  );
  const cappedRecent = smartTrim(recentTurnsBlock, recentBudget);

  // 3. Project context gets whatever is left
  const projectBudget = Math.max(0, available - cappedMemory.length - cappedRecent.length);
  const cappedProject = smartTrim(projectContextBlock, projectBudget);

  return {
    projectContextBlock: cappedProject,
    memoryBlock: cappedMemory,
    recentTurnsBlock: cappedRecent
  };
}

/**
 * Trim a text block to maxLength by removing lines from the top (oldest).
 * Always cuts at line boundaries.  Prepends a "[... trimmed]" marker so
 * the model knows context was cut.
 */
export function smartTrim(text, maxLength) {
  const clean = String(text || '').trim();
  if (!clean || clean.length <= maxLength) return clean;
  if (maxLength <= 0) return '';

  const marker = '[... earlier context trimmed]\n';
  const budget = maxLength - marker.length;
  if (budget <= 0) return '';

  // Keep lines from the END (most recent) up to budget
  const lines = clean.split('\n');
  const kept = [];
  let chars = 0;

  for (let i = lines.length - 1; i >= 0; i--) {
    const lineChars = lines[i].length + (kept.length > 0 ? 1 : 0); // +1 for newline
    if (chars + lineChars > budget) break;
    kept.unshift(lines[i]);
    chars += lineChars;
  }

  if (kept.length === 0) {
    // Even a single line doesn't fit — hard-slice the last line
    return `${marker}${clean.slice(clean.length - budget).trim()}`;
  }

  if (kept.length < lines.length) {
    return `${marker}${kept.join('\n')}`;
  }

  // Everything fit despite initial length check (rounding) — return as-is
  return clean.slice(0, maxLength);
}

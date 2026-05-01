import { loadProjectContextBlock } from './project-context.js';
import { loadAgentMemoryBlock } from './memory-manager.js';
import { loadRecentAgentContextBlock } from './session-store.js';
import { compactContextBlocks } from './compaction.js';

const MAX_CONTEXT_BLOCK_CHARS = 9000;

export async function buildAgentContextEnvelope({
  projectId = null,
  userId = null,
  sessionId = null,
  sandboxId = null,
  excludeTurnId = null,
  recentTurnLimit = 6,
  memoryLimit = 12
} = {}) {
  const [projectContextBlock, memoryBlock, recentTurnsBlock] = await Promise.all([
    loadProjectContextBlock({ projectId, userId }),
    loadAgentMemoryBlock({ projectId, userId, limit: memoryLimit }),
    loadRecentAgentContextBlock({
      sessionId,
      userId,
      projectId,
      sandboxId,
      excludeTurnId,
      limit: recentTurnLimit
    })
  ]);

  return composeAgentContextBlock({
    projectContextBlock,
    memoryBlock,
    recentTurnsBlock
  });
}

export function composeAgentContextBlock({
  projectContextBlock = '',
  memoryBlock = '',
  recentTurnsBlock = '',
  extraBlocks = []
} = {}) {
  // Use proportional budget allocation so recent turns are never starved
  const compacted = compactContextBlocks({
    projectContextBlock,
    memoryBlock,
    recentTurnsBlock,
    maxTotalChars: MAX_CONTEXT_BLOCK_CHARS
  });

  const blocks = [
    '[Volturiano continuity envelope]',
    'Treat this as durable project memory for the current website. It is context, not something to quote back.',
    compacted.projectContextBlock,
    compacted.memoryBlock,
    compacted.recentTurnsBlock,
    ...extraBlocks,
    'Continuity behavior: understand short follow-up prompts from the current site state, keep visible final replies concise, and use tool cards for implementation detail.',
    '[/Volturiano continuity envelope]'
  ].filter(Boolean);

  const joined = blocks.join('\n\n');

  // Safety cap — compaction handles the main blocks, but extraBlocks could push over
  if (joined.length > MAX_CONTEXT_BLOCK_CHARS) {
    return `${joined.slice(0, Math.max(0, MAX_CONTEXT_BLOCK_CHARS - 3)).trim()}...`;
  }
  return joined;
}

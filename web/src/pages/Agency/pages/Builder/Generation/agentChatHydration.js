export function mergeHydratedAgentMessages(currentMessages = [], hydratedMessages = []) {
  if (!Array.isArray(hydratedMessages) || hydratedMessages.length === 0) return currentMessages;

  const unmatchedOptimisticUserMessages = new Map();
  const existingAgentIds = new Set();

  for (const msg of currentMessages) {
    const agentMessageId = msg?.metadata?.agentMessageId || msg?.id;
    // Treat as local if it has no ID, or if it explicitly has a local- ID
    const isLocal = !agentMessageId || String(agentMessageId).startsWith('local-');
    
    if (!isLocal) {
      existingAgentIds.add(getChatMessageIdentity(msg));
    } else if (msg.type === 'user' || msg.role === 'user') {
      const content = String(msg.content || '').trim();
      if (!unmatchedOptimisticUserMessages.has(content)) {
        unmatchedOptimisticUserMessages.set(content, []);
      }
      unmatchedOptimisticUserMessages.get(content).push(true);
    }
  }

  const additions = [];

  for (const rawMessage of hydratedMessages) {
    const message = normalizeHydratedAgentMessage(rawMessage);
    if (!message) continue;

    const identity = getChatMessageIdentity(message);

    if (existingAgentIds.has(identity)) continue;

    if (message.type === 'user' || message.role === 'user') {
      const content = String(message.content || '').trim();
      const localMatches = unmatchedOptimisticUserMessages.get(content);
      if (localMatches && localMatches.length > 0) {
        localMatches.shift();
        existingAgentIds.add(identity);
        continue;
      }
    }

    existingAgentIds.add(identity);
    additions.push(message);
  }

  if (additions.length === 0) return currentMessages;

  const stableMessages = [];
  const transientMessages = [];
  for (const message of currentMessages) {
    if (isTransientStatusMessage(message)) {
      transientMessages.push(message);
    } else {
      stableMessages.push(message);
    }
  }

  return [...stableMessages, ...additions, ...transientMessages];
}

export function normalizeHydratedAgentMessage(message) {
  if (!message?.content) return null;
  return {
    content: message.content,
    type: message.type || (message.role === 'user' ? 'user' : 'ai-narrator'),
    timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
    metadata: {
      ...(message.metadata || {}),
      hydrated: true,
      agentMessageId: message.id
    }
  };
}

export function getChatMessageIdentity(message) {
  const agentMessageId = message?.metadata?.agentMessageId || message?.id;
  if (agentMessageId) return `agent:${agentMessageId}`;
  return `${message?.type || 'message'}:${String(message?.content || '').trim()}`;
}

export function isTransientStatusMessage(message) {
  return message?.type === 'system' && /^(preparing environment|rehydrating sandbox)/i.test(String(message.content || ''));
}

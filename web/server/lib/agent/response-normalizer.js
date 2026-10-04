const DEFAULT_MAX_CHARS = 420;
const DEFAULT_MAX_BULLETS = 3;

const LOW_VALUE_LINE_PATTERNS = [
  /^#+\s*/,
  /^(summary|changes made|what changed|files changed|implementation details):?$/i,
  /^(certainly|sure|of course|here'?s what i did)[:,.!]?$/i,
  /\bwould you like me to\b/i,
  /\blet me know\b/i
];

export function normalizeAgentResponse(rawResponse = '', metadata = {}) {
  const clean = cleanResponseText(rawResponse);
  const maxChars = metadata.maxChars || DEFAULT_MAX_CHARS;
  const maxBullets = metadata.maxBullets || DEFAULT_MAX_BULLETS;

  if (!clean) {
    return buildEnvelope(defaultCompletionMessage(metadata), {
      rawResponse,
      wasNormalized: true,
      reason: 'empty_response',
      metadata
    });
  }

  if (isAlreadyConcise(clean, maxChars, maxBullets)) {
    return buildEnvelope(clean, {
      rawResponse,
      wasNormalized: false,
      reason: 'already_concise',
      metadata
    });
  }

  const hasProblem = hasProblemLanguage(clean, metadata);
  const bullets = extractUsefulBullets(clean, maxBullets);
  if (bullets.length > 0) {
    return buildEnvelope(formatBulletMessage(hasProblem, bullets), {
      rawResponse,
      wasNormalized: true,
      reason: 'bullet_compaction',
      metadata
    });
  }

  const sentences = extractUsefulSentences(clean);
  const compact = sentences.slice(0, hasProblem ? 2 : 3).join(' ');
  const fallback = compact || defaultCompletionMessage(metadata);
  const lead = hasProblem ? 'I hit an issue: ' : '';

  return buildEnvelope(trimToLength(`${lead}${fallback}`, maxChars), {
    rawResponse,
    wasNormalized: true,
    reason: 'sentence_compaction',
    metadata
  });
}

export function cleanResponseText(text = '') {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !LOW_VALUE_LINE_PATTERNS.some((pattern) => pattern.test(line)))
    .join('\n')
    .trim();
}

function buildEnvelope(userMessage, { rawResponse, wasNormalized, reason, metadata }) {
  const summaryBullets = extractUsefulBullets(userMessage, DEFAULT_MAX_BULLETS);
  return {
    userMessage,
    summaryBullets,
    buildStatus: metadata.buildStatus || null,
    verificationRan: metadata.verificationRan ?? null,
    incompleteReason: metadata.incompleteReason || null,
    changedFiles: metadata.changedFiles || [],
    toolCallCount: metadata.toolCallCount || 0,
    mutationCount: metadata.mutationCount || 0,
    nextSuggestedAction: metadata.nextSuggestedAction || null,
    wasNormalized,
    reason,
    originalLength: String(rawResponse || '').length
  };
}

function isAlreadyConcise(text, maxChars, maxBullets) {
  const lines = text.split('\n').filter(Boolean);
  const bulletCount = lines.filter(isBulletLine).length;
  return text.length <= maxChars
    && sentenceCount(text) <= 4
    && bulletCount <= maxBullets
    && lines.length <= 5;
}

function extractUsefulBullets(text, maxBullets) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(isBulletLine)
    .map((line) => line.replace(/^([-*]|[0-9]+[.)])\s+/, '').trim())
    .filter(Boolean)
    .filter((line) => !LOW_VALUE_LINE_PATTERNS.some((pattern) => pattern.test(line)))
    .slice(0, maxBullets)
    .map((line) => trimToLength(line, 150));
}

function extractUsefulSentences(text) {
  return extractSentences(text)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((sentence) => !LOW_VALUE_LINE_PATTERNS.some((pattern) => pattern.test(sentence)));
}

function formatBulletMessage(hasProblem, bullets) {
  const lead = hasProblem ? 'I hit an issue:' : 'Done:';
  return [lead, ...bullets.map((line) => `- ${line}`)].join('\n');
}

function defaultCompletionMessage(metadata = {}) {
  if (metadata.hadError) return 'I hit an issue and stopped before making unsafe changes.';
  if (metadata.incompleteReason === 'max_steps_reached') return 'I hit the step limit before I could fully verify the result.';
  if (metadata.buildStatus === 'failed' || metadata.incompleteReason === 'build_verification_failed') {
    return 'I hit an issue: the latest changes did not pass build verification yet.';
  }
  if ((metadata.mutationCount || 0) > 0 && metadata.verificationRan === false) {
    return 'I stopped before build verification ran, so the latest changes are not confirmed yet.';
  }
  if ((metadata.mutationCount || 0) > 0) return 'Done - I applied the changes.';
  if (metadata.expectedMutation) return "I couldn't complete that edit because no project files were changed.";
  return 'Done - I checked the project.';
}

function hasProblemLanguage(text, metadata = {}) {
  return Boolean(metadata.hadError)
    || Boolean(metadata.incompleteReason)
    || metadata.buildStatus === 'failed'
    || ((metadata.mutationCount || 0) > 0 && metadata.verificationRan === false)
    || /\b(error|failed|failing|issue|unable|couldn'?t|cannot|blocked|warning)\b/i.test(text);
}

function isBulletLine(line) {
  return /^([-*]|[0-9]+[.)])\s+/.test(line);
}

function extractSentences(text) {
  return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
}

function sentenceCount(text) {
  return extractSentences(text).length;
}

function trimToLength(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

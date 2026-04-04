/**
 * LLM Pipeline Logger — Comprehensive Request/Response Tracing
 * 
 * Logs every LLM call across the AI website builder pipeline with:
 *   - Stage identifier (which step in the pipeline)
 *   - What was SENT to the LLM (system prompt, user prompt, schema shape)
 *   - What was RECEIVED from the LLM (response, duration, token usage)
 *   - Error details (status code, retryable, full message)
 * 
 * Usage:
 *   import { llmLog } from './llm-logger.js';
 *   llmLog.request('ENHANCE', { model, systemPrompt, userPrompt });
 *   llmLog.response('ENHANCE', { response, durationMs });
 *   llmLog.error('ENHANCE', error);
 */

const STAGE_EMOJIS = {
  'CINEMATIC':       '🎬',
  'ENHANCE':         '✏️',
  'DESIGN-SYSTEM':   '🎨',
  'SELECT-V1':       '🧩',
  'PIPELINE-V2':     '🚀',
  'TEMPLATE-MATCH':  '📐',
  'BLUEPRINT-GEN':   '🏗️',
  'CATEGORY-REFINE': '📂',
  'INDUSTRY-FILTER': '🏭',
  'FINAL-SELECT':    '🎯',
  'COPYWRITER':      '✍️',
  'POLISH':          '💎',
  'POLISH-FILLER':   '💬',
  'AUTO-REPAIR':     '🔧',
  'WEBSITE-TYPE':    '🌐',
};

function truncate(str, maxLen = 300) {
  if (!str) return '(empty)';
  const s = String(str);
  return s.length > maxLen ? s.substring(0, maxLen) + `... [${s.length} chars total]` : s;
}

function schemaShape(schema) {
  if (!schema) return '(none)';
  try {
    // For Zod schemas, extract the shape description
    if (schema._def?.typeName === 'ZodObject') {
      const keys = Object.keys(schema._def.shape() || {});
      return `{ ${keys.join(', ')} }`;
    }
    if (typeof schema === 'object') {
      return JSON.stringify(Object.keys(schema)).substring(0, 200);
    }
    return String(schema).substring(0, 100);
  } catch {
    return '(unreadable schema)';
  }
}

const DIVIDER = '─'.repeat(70);
const HEAVY_DIVIDER = '═'.repeat(70);

export const llmLog = {
  /**
   * Log an LLM request being sent
   */
  request(stage, { model, systemPrompt, userPrompt, schema: schemaObj, temperature, maxTokens, maxRetries, extraContext } = {}) {
    const emoji = STAGE_EMOJIS[stage] || '🤖';
    console.log('');
    console.log(HEAVY_DIVIDER);
    console.log(`${emoji}  [LLM-PIPELINE] ${stage} — REQUEST OUTBOUND`);
    console.log(HEAVY_DIVIDER);
    console.log(`  📤 Model:        ${model || '(default)'}`);
    if (temperature !== undefined) console.log(`  🌡️  Temperature:   ${temperature}`);
    if (maxTokens)   console.log(`  📏 Max Tokens:   ${maxTokens}`);
    if (maxRetries)   console.log(`  🔄 Max Retries:  ${maxRetries}`);
    if (schemaObj)    console.log(`  📋 Schema Shape: ${schemaShape(schemaObj)}`);
    console.log(DIVIDER);
    console.log(`  💬 System Prompt:`);
    console.log(`     ${truncate(systemPrompt, 500)}`);
    console.log(DIVIDER);
    console.log(`  💬 User Prompt:`);
    console.log(`     ${truncate(userPrompt, 500)}`);
    if (extraContext) {
      console.log(DIVIDER);
      console.log(`  📎 Extra Context: ${truncate(JSON.stringify(extraContext), 300)}`);
    }
    console.log(HEAVY_DIVIDER);
    console.log('');
  },

  /**
   * Log an LLM response received
   */
  response(stage, { response, durationMs, tokenUsage, rawLength, fileCount } = {}) {
    const emoji = STAGE_EMOJIS[stage] || '🤖';
    const durationStr = durationMs ? `${(durationMs / 1000).toFixed(1)}s` : '(unknown)';
    
    console.log('');
    console.log(HEAVY_DIVIDER);
    console.log(`${emoji}  [LLM-PIPELINE] ${stage} — RESPONSE RECEIVED`);
    console.log(HEAVY_DIVIDER);
    console.log(`  ⏱️  Duration:     ${durationStr}`);
    
    if (rawLength !== undefined) {
      console.log(`  📦 Response Size: ${rawLength} chars`);
    } else if (response) {
      const len = typeof response === 'string' ? response.length : JSON.stringify(response).length;
      console.log(`  📦 Response Size: ${len} chars`);
    }
    
    if (tokenUsage) {
      console.log(`  🪙 Tokens:       prompt=${tokenUsage.promptTokens || '?'}, completion=${tokenUsage.completionTokens || '?'}, total=${tokenUsage.totalTokens || '?'}`);
    }
    
    if (fileCount !== undefined) {
      console.log(`  📂 Files Output:  ${fileCount}`);
    }
    
    console.log(DIVIDER);
    console.log(`  📥 Response Body:`);
    if (typeof response === 'string') {
      console.log(`     ${truncate(response, 600)}`);
    } else if (response) {
      console.log(`     ${truncate(JSON.stringify(response, null, 2), 600)}`);
    } else {
      console.log(`     (empty/null response)`);
    }
    console.log(HEAVY_DIVIDER);
    console.log('');
  },

  /**
   * Log an LLM error
   */
  error(stage, error, { retryable, statusCode, responseBody } = {}) {
    const emoji = STAGE_EMOJIS[stage] || '🤖';
    
    console.log('');
    console.log(HEAVY_DIVIDER);
    console.error(`${emoji}  [LLM-PIPELINE] ${stage} — ❌ ERROR`);
    console.log(HEAVY_DIVIDER);
    console.error(`  🚨 Error Type:   ${error?.name || 'Unknown'}`);
    console.error(`  🚨 Message:      ${error?.message || String(error)}`);
    
    if (statusCode !== undefined) console.error(`  🔢 Status Code:  ${statusCode}`);
    if (retryable !== undefined) console.error(`  🔄 Retryable:    ${retryable}`);
    
    if (responseBody) {
      console.error(`  📄 Response Body:`);
      console.error(`     ${truncate(responseBody, 400)}`);
    }
    
    if (error?.data?.error) {
      console.error(`  📄 API Error Detail:`);
      console.error(`     Type:    ${error.data.error.type || 'N/A'}`);
      console.error(`     Param:   ${error.data.error.param || 'N/A'}`);
      console.error(`     Message: ${error.data.error.message || 'N/A'}`);
    }
    
    console.log(HEAVY_DIVIDER);
    console.log('');
  },

  /**
   * Log a pipeline milestone (non-LLM step)
   */
  milestone(stage, message, data = {}) {
    const emoji = STAGE_EMOJIS[stage] || '📌';
    console.log(`${emoji}  [LLM-PIPELINE] ${stage} — ${message}`);
    if (Object.keys(data).length > 0) {
      console.log(`     ${truncate(JSON.stringify(data), 300)}`);
    }
  },
};

export default llmLog;

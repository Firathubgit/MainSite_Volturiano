## AI Chat Widget Architecture

### Goals
- Provide concierge-style assistance with Volturiano tone (precise, respectful, non-speculative).
- Support text and optional voice interaction.
- Allow feature-flagged rollout per `.cursor/rules/11-feature-flags.md`.

### Feature Slice Layout
```
web/src/features/ai/
  components/
    ChatWidget.jsx
    MessageList.jsx
    InputBar.jsx
    SuggestedActions.jsx
  hooks/
    useChatSession.js
    useSpeechIO.js
  prompts/
    en.json
    sv.json
  store/
    chatStore.js
```

### Conversation Flow
1. Widget opens (fab bottom-right). Initial welcome message references brand context.
2. User submits question → UI dispatches action to store.
3. Store calls Supabase Edge function `ai-chat` with sanitized payload (message history, locale, intents).
4. Response streamed back (Server-Sent Events or chunked fetch) and appended to chat.
5. Optional quick actions (e.g., “Schedule test drive”, “Show finance options”).

### Prompt Strategy
- System prompt assembled from:
  - Brand manifesto (concise summary).
  - Safety and scope guardrails (no financial commitments, no safety claims).
  - Allowed data sources (only from Supabase RPCs, docs).
- Locale-specific phrasing pulled from `prompts/<locale>.json`.

### Edge Function Outline (`functions/ai-chat/index.ts`)
1. Authenticate request (session JWT).
2. Rate limit per user/IP.
3. Build prompt with context (user locale, profile data if opted in).
4. Call LLM provider (OpenAI/Anthropic TBD).
5. Post-process response (trim, add CTA, log analytics).
6. Return JSON stream to client.

### Storage & Logging
- `assistant_sessions` table to persist conversation summaries (optional, with consent).
- `assistant_events` for telemetry (message_sent, handoff_triggered, redirect_used).
- Ensure RLS restricts to owner; admin access via SECURITY DEFINER if needed.

### Security & Compliance
- Strip PII before sending to LLM.
- Enforce guardrails (no deposits, no VIN exposure).
- Provide disclaimer for financial estimates.

### Future Enhancements
- Integrate voice IO (see `useSpeechIO`).
- Add personalization (garage data) when user authenticated.
- Provide admin tooling for prompt updates.



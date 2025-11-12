## AI Assistant Testing Checklist

### Functional
- Chat widget opens/closes correctly on desktop/tablet/mobile.
- Messages send/receive with loading state and error fallback.
- Voice input (if supported) starts/stops as expected; fallback message shown when unsupported.
- Quick actions trigger appropriate navigation or responses.
- Handoff flow submits callback request and logs event.

### Localization
- Switch locale in profile; verify prompts/responses match selected language.
- Confirm translated UI copy (buttons, placeholders) from `account` namespace.
- Ensure fallback to English when translation missing.

### Compliance
- Verify guardrails respond correctly to restricted queries (financial commitments, safety).
- Check disclaimers for finance outputs.
- Ensure no personal data appears in logs/LLM payloads without consent.

### Performance
- Widget loads lazily only when user interacts.
- Network requests have timeouts and retry/backoff logic.
- FPS remains above 55 while widget open.

### Regression
- Run automated tests on key intents (test drive, finance, support).
- Validate analytics events are emitted (message_sent, redirect_clicked, handoff_created).
- Check voice IO respects `prefers-reduced-motion` and audio mute settings.



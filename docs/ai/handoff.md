   ## AI Assistant Handoff Strategy

   ### Objectives
   - Seamlessly escalate from automated chat to human assistance (phone/email).
   - Capture context for support agents.
   - Track conversions for service quality.

   ### Triggers
   - User requests human (keywords: “call me”, “speak to agent”).
   - AI confidence below threshold (LLM returns low certainty).
   - Sensitive topics (finance commitments, safety issues) flagged by guardrails.

   ### Escalation Flow
   1. AI notifies user: “I can connect you with our concierge.”
   2. Display options:
      - Call Volturiano (tap-to-call `tel:+...`).
      - Request callback (submit form).
      - Email support link.
   3. Log escalation event in `assistant_events` with metadata (intent, timestamp).
   4. If callback requested, insert row into `assistant_handoff_requests` table (see schema below) and send notification to support channel (email/Slack).

   ### Table: `assistant_handoff_requests`
   | Column | Type | Notes |
   | --- | --- | --- |
   | `id` | uuid pk | default `gen_random_uuid()` |
   | `owner_id` | uuid | null if guest; referenced with RLS |
   | `name` | text | optional |
   | `contact_method` | text | phone/email |
   | `payload` | jsonb | conversation summary, intent |
   | `status` | text | pending/resolved |
   | `created_at` | timestamptz | default now() |

   ### UI Considerations
   - Show confirmation message after escalation request.
   - Provide estimated response time.
   - Offer to continue chat while waiting.

   ### Analytics
   - Track number of escalations by intent.
   - Monitor resolution times.
   - Use data to refine prompts or add new knowledge.



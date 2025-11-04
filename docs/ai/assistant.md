---
title: AI Assistant (FAQ Concierge)
description: Productized plan for the on-site AI helper.
status: draft
---

Goals
- Language-aware FAQ and guided helper with prequestion buttons.

Frontend
- Widget under features/ai with chat UI, prompt templates per locale in JSON.
- Read-only knowledge from /docs and curated FAQs; opt-in telemetry.

Backend
- Supabase Edge Function proxy to LLM; rate limits; safety filters; logs minimal metadata (no PII).

Escalation
- When unsure or sensitive, offer contact/dealer handoff and link to human support.


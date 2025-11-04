---
title: AI Helper Guidelines
description: Constraints and structure for the on-site AI chat/FAQ.
status: active
apply_to: repo
labels: [ai, faq, chat]
---

Scope
- Acts as branded FAQ + guided concierge. No speculative claims; cite sources from /docs where relevant.

Architecture
- Frontend widget under features/ai with prequestion templates and language-aware prompts.
- Backend: Supabase Edge Function proxy to LLM provider; rate limit per IP/user; log minimal telemetry.

Content
- Prompt templates live in /web/src/features/ai/prompts/<locale>.json.
- Guardrails: refuse financial advice; avoid vehicle safety claims; redirect to human contact for edge cases.

Context
- AI should reflect the brand voice: precise, respectful, and non-speculative. It augments documentation and routes users to humans for transactions or safety topics.


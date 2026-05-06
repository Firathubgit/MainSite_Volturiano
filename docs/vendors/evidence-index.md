# Vendor Evidence Index

Keep one dated copy or link for each vendor. This is not a legal opinion; it is the evidence folder that supports the Privacy Policy, DPA and data inventory.

## Core vendors
| Vendor | Purpose | Data involved | Region/transfer note | Evidence needed |
|---|---|---|---|---|
| Supabase | Auth, database, storage | account, projects, community, logs | confirm project region and DPA | DPA, subprocessor list, backup docs |
| Stripe | Payments, invoices, receipts | billing identity, payment refs, disputes | confirm Stripe account region | DPA, tax/invoice settings, webhook config |
| Railway / deployment host | Backend hosting | request metadata, logs, env secrets | confirm service region | DPA/security docs, log retention |
| Vercel analytics/speed insights | Analytics/performance if enabled | device/browser metrics | consent-gated | DPA, retention docs |
| OpenAI / Anthropic / Google / Groq | AI generation and analysis | prompts, images, generated code, metadata | provider-specific | DPA, retention, training-use terms |
| E2B / sandbox provider | Code execution sandbox | generated project code, packages, logs | provider-specific | DPA, retention, isolation docs |

## Required fields per vendor
- Contract/DPA link or stored copy.
- Subprocessor list link.
- Data retention note.
- Data region note.
- Incident notification terms.
- Whether customer data is used for model training or service improvement.
- Date last reviewed.

## Launch rule
Do not claim a vendor has zero retention, EU-only processing, or no training use unless that exact point is written in the vendor contract or current official documentation.

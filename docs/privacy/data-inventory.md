# Data inventory and ROPA starter

This is the operational data map for Volturiano Builder. It is a technical record, not final legal advice.

| Dataset | Store | Personal data | Purpose | Legal basis draft | Retention draft | Export | Delete |
|---|---|---|---|---|---|---|---|
| Profile | `profiles`, Supabase Auth | name, email reference, username, avatar, preferences, plan, Stripe refs | account, auth, billing, admin | contract, legal obligation, legitimate interest | account lifetime plus legal holds | yes | delete or minimize |
| Projects | `projects` | prompts, generated files, metadata, thumbnails | provide builder service | contract | account lifetime or until deletion | yes | yes |
| Snapshots | `snapshots` | generated files, chat text, restore state | restore/history/debugging | contract, legitimate interest | 90 days draft | yes | yes |
| Published sites | `published_sites`, `published-sites` bucket | site metadata and user-provided content | hosting/publishing | contract | until unpublish/delete plus backup window | yes | yes, with storage cleanup |
| Agent data | `agent_sessions`, `agent_turns`, `agent_messages`, `agent_tool_events`, `agent_memory` | prompts, outputs, tool args/results, memory | AI continuity, debugging, abuse prevention | contract, legitimate interest | 14-90 days draft depending table | yes | yes |
| Billing ledger | `credit_transactions`, Stripe | payment refs, invoice refs, refund/dispute refs | accounting, credits, refunds, disputes | contract, legal obligation | accounting retention | yes | anonymize/minimize, not destructive |
| Refund requests | `refund_requests` | reason, details, Stripe refs | refund support and disputes | contract, legitimate interest | accounting/support retention | yes | minimize when legal retention allows |
| Community submissions | `community_submissions`, `components`, `templates` | code, media, author refs, review metadata | component library, moderation | contract, consent/license, legitimate interest | policy dependent | yes | delete/minimize unless active public library/legal hold |
| Reports/takedowns | `component_reports`, `copyright_takedown_requests` | reporter/requester details, claim evidence | DSA/IP/legal handling | legal obligation, legitimate interest | legal/support retention | yes for requester where applicable | minimize after retention |
| Feedback/issues | `platform_feedback`, `platform_issues` | user id, message, route/source | support and product improvement | legitimate interest | support retention | yes | yes |
| Consent/rights | `consent_events`, `gdpr_requests` | consent state, request history, metadata | compliance evidence | legal obligation, legitimate interest | compliance retention | yes | usually retained/minimized |
| Security logs | `audit_logs`, server logs | user id, IP, user agent, actions | security, fraud, auditability | legitimate interest, legal obligation | 180 days draft or incident hold | partial | minimize after retention |
| GitHub publishing connection | `github_connections` | GitHub user id, GitHub username, granted OAuth scopes, AES-256-GCM-encrypted access token | enable user-initiated `Publish to Vercel` flow (create/update GitHub repo + open Vercel import) | contract, consent | until user disconnects or deletes account | yes (metadata; token stays encrypted) | yes — disconnect best-effort revokes the GitHub grant and removes the row |
| Project publish metadata | `projects.github_repo_owner/name/branch/last_commit_sha`, `projects.vercel_import_url`, `projects.last_github_push_at`, `projects.publish_status` | repo coordinates and last-push reference for the user's own published project | provide an &ldquo;Update GitHub&rdquo; path and link to Vercel import | contract | account lifetime or until project deletion | yes | yes |

## Open decisions for human review

- Exact accounting retention and format for Stripe/Revolut evidence.
- Exact AI provider retention settings per production model.
- Whether first public launch is B2B-only or also consumer-facing.
- Whether customers need signed DPA before using published sites with visitor data.

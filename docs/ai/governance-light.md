# AI Governance Light

This is the minimum practical AI governance file for the guarded MVP.

## Model inventory
| Flow | Models/providers | Data sent | Human review | Retention assumption |
|---|---|---|---|---|
| Initial website generation | configured LLM providers | prompt, selected components, images, project context | user reviews result | verify per provider |
| Edit mode | configured LLM providers | user instruction, project files, selected components, memory | user reviews result | verify per provider |
| Component analysis | configured LLM providers | submitted code, metadata, screenshots if enabled | admin approval required | verify per provider |
| Template generation/selection | configured LLM providers | template prompt, component metadata | user/admin review | verify per provider |

## Boundaries
- The builder is a creative/software generation tool, not legal, medical, financial or regulated professional advice.
- Community content is not trusted until approved.
- AI quality scoring helps triage; it does not replace moderation.
- User prompts and outputs can contain personal data, so retention and export/delete flows must include agent data.

## Controls
- Keep provider retention assumptions in `docs/vendors/evidence-index.md`.
- Keep community submissions in `pending_review` until admin approval.
- Keep screenshot rendering disabled unless hardened sandbox settings are explicitly enabled.
- Keep abuse, takedown and security contacts visible.
- Re-check this file whenever models/providers are added or changed.

# Models and providers

The server supports three providers. You need a key for at least one.

| Provider | Env var | How it is called |
|---|---|---|
| Google Gemini | `GEMINI_API_KEY` | Gemini 3.x models use the native `@google/genai` SDK for the agent loop. Other calls use the AI SDK. |
| OpenAI | `OPENAI_API_KEY` | AI SDK for the agent loop. The Responses API for the small polish helpers. |
| Anthropic | `ANTHROPIC_API_KEY` | AI SDK. |

`OPENAI_BASE_URL` points the OpenAI client at any OpenAI-compatible endpoint.

## The model list

Models are defined once, in `apps/server/shared/model-registry.js`. The UI imports the same file, so the picker and the server always agree.

| Model id | Shown in picker | Tier |
|---|---|---|
| `google/gemini-3.5-flash` | Yes (default) | heavy |
| `google/gemini-2.5-flash` | Yes | light |
| `google/gemini-3.1-pro-preview` | Yes | heavy |
| `openai/gpt-5.5` | Yes | heavy |
| `openai/gpt-5.5-mini` | Yes | light |
| `anthropic/claude-opus-4-7` | Yes | heavy |
| `anthropic/claude-haiku-4-5-20251001` | Yes | light |
| `google/gemini-3.1-pro-preview-customtools` | No, internal | heavy |
| `google/gemini-3.1-flash-lite` | No, internal | light |

Model ids change often. If a provider retires one of these, update the id in `model-registry.js`.

## Roles

Code does not hard-code model ids. It asks for a role, and `MODEL_ROLES` maps the role to a model:

| Role | Used for |
|---|---|
| `generalGeneration` | The default model for builds and edits. |
| `agentToolHeavy` | The agent loop when the request did not pick a model. |
| `lightweight`, `fastPolish`, `fastAnthropic` | Small jobs: design intake, narration, page planning, repair of restored files. |
| `premiumPolish` | The optional polish pass when restoring files. |

## Running with one key

Roles point at models from different providers. With only one key, some of those models would be unreachable. `resolveModelForProviders` solves that:

1. If the requested model's provider has a key, use it.
2. Otherwise take the model's tier (heavy or light) and use the same tier from a provider that does have a key. The order of preference is Google, OpenAI, Anthropic.

So with only `ANTHROPIC_API_KEY` set, a request for `google/gemini-3.5-flash` runs on `anthropic/claude-opus-4-7`, and a request for the light Gemini model runs on Claude Haiku. The server logs each substitution:

```
[providers] google/gemini-3.5-flash has no API key configured, using anthropic/claude-opus-4-7
```

Note that the heavy Anthropic model is the most expensive option in the list. If you run on Anthropic only and want cheaper builds, change `PROVIDER_TIER_DEFAULTS.anthropic.heavy` in `model-registry.js`.

## Adding a model

1. Add an id to `MODEL_IDS` and an entry to `MODEL_REGISTRY` with `provider`, `tier` and `userSelectable`.
2. If it should replace a role's model, update `MODEL_ROLES`.
3. Run `npm test`. `tests/model-registry.test.js` and `tests/providers.test.js` cover the list and the fallback.

## Adding a provider

1. Add its client in `apps/server/lib/provider-helpers.js` (`providerClient`) and its key in `PROVIDER_KEYS`.
2. Add tier defaults in `PROVIDER_TIER_DEFAULTS`.
3. The agent loop talks to models through the AI SDK adapter in `shared/agent-loop.js`, so a provider with an AI SDK package needs no loop changes.

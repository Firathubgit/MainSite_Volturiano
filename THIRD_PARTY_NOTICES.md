# Third-party notices

Volturiano Agent is released under the MIT License (see `LICENSE`). This file lists the third-party software and assets it uses.

## npm dependencies

Installed from the npm registry by `npm install`. Their source is not copied into this repository. Each package's license text ships inside its folder in `node_modules`.

| Package | License | Used by |
|---|---|---|
| `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`, `ai` | Apache-2.0 | server |
| `@google/genai` | Apache-2.0 | server |
| `openai` | Apache-2.0 | server |
| `@e2b/code-interpreter` | MIT | server |
| `express`, `cors`, `express-rate-limit` | MIT | server |
| `dotenv` | BSD-2-Clause | server |
| `zod` | MIT | server |
| `puppeteer` (optional) | Apache-2.0 | server |
| `react`, `react-dom` | MIT | web |
| `react-router-dom` | MIT | web |
| `framer-motion` | MIT | web |
| `lucide-react` | ISC | web |
| `react-icons` | MIT. The icon sets used are listed below | web |
| `react-syntax-highlighter` | MIT | web |
| `vite`, `vitest` | MIT | build and test |
| `eslint`, `@eslint/js`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `globals` | MIT | lint |
| `concurrently` | MIT | dev |

The full dependency tree (about 560 packages) uses only permissive licenses: MIT, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause, BlueOak-1.0.0, 0BSD, CC0-1.0 and Python-2.0. `json-schema` is dual licensed (AFL-2.1 or BSD-3-Clause) and is used under BSD-3-Clause.

Puppeteer downloads a Chromium build at install time. Chromium is distributed under its own BSD-style and other open-source licenses.

## Packages installed inside generated projects

The sandbox starter app installs these in the sandbox, not in this repository: `react`, `react-dom`, `react-router-dom`, `framer-motion`, `lucide-react`, `react-icons`, `@radix-ui/react-icons`, `clsx`, `tailwind-merge`, `three`, `@react-three/fiber`, `@react-three/drei`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`. All are MIT or ISC licensed. A generated site that you export depends on them under their own licenses.

## Icons

- **Feather** (via `react-icons/fi`): MIT.
- **Bootstrap Icons** (via `react-icons/bs`): MIT.
- **Lucide** (via `lucide-react`): ISC.
- **Material Symbols** by Google: two inline SVG paths in `apps/web/src/builder/generation/`, Apache-2.0.

Model providers are shown in the UI as plain lettered badges. No provider logos are included.

## Fonts

Inter and JetBrains Mono are loaded at runtime from Google Fonts. Both are licensed under the SIL Open Font License 1.1. The font files are not included in this repository. The design intake also loads the fonts a user picks for their site from Google Fonts.

## Component registry

Everything in `packages/registry` was written for this project and is MIT licensed. Each component records its license and source in `component.json`, and a test fails if either is missing.

## Artwork

The logo, favicons and the two decorative images in `apps/web/src/builder/assets` are original project artwork by the author. "Volturiano" and the logo identify this project and its author. The MIT License covers the code, not the name or the logo.

## Design influences

The agent's file tools follow patterns that are common to agentic coding tools: edits by exact string replacement, a check that every path stays inside the workspace, structured patches for each change, and bounded file reads. The implementation in `apps/server/shared/sandbox-fs.js` and `apps/server/lib/agent/tool-runtime.js` is written in JavaScript for this project.

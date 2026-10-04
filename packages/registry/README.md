# Component registry

Ready-made sections the agent can install into a generated site instead of writing them from scratch.

The registry is plain files. The server reads this folder at startup (set `REGISTRY_DIR` to use another one). If the folder is empty, the agent still works. It just writes every section itself.

## Layout

```
components/
  hero-split/
    component.json   metadata the agent searches on
    HeroSplit.jsx    the source that gets installed
templates/
  starter-landing.json
```

## Add a component

1. Create a folder under `components/`.
2. Add the source file. Use React, Tailwind classes and packages the sandbox already has (`react`, `lucide-react`, `framer-motion`, `react-icons`, `react-router-dom`, `clsx`, `tailwind-merge`).
3. Add `component.json`:

```json
{
  "id": "hero.split.v1",
  "name": "Split Hero",
  "category": "Hero",
  "description": "What it is, in one sentence.",
  "visualDescription": "What it looks like. The agent reads this to judge fit.",
  "tags": ["hero", "landing"],
  "keywords": ["headline", "cta"],
  "suitableFor": ["landing_page", "saas"],
  "notSuitableFor": ["dashboard"],
  "moodTone": "minimal, professional",
  "colorProfile": { "mode": "dark" },
  "qualityScore": 7,
  "license": "MIT",
  "source": "Where the code came from",
  "usage": { "importName": "HeroSplit" },
  "requires": ["lucide-react"],
  "files": [
    { "path": "src/components/HeroSplit.jsx", "source": "HeroSplit.jsx" }
  ]
}
```

`id` must be unique. `path` is where the file lands in the generated project. `source` is the file name next to `component.json`. `requires` lists npm packages the component needs. Packages outside the server's allow-list are not installed.

Restart the server after changing the registry.

## Add a template

A template is an ordered list of component ids plus a short instruction for the agent. See `templates/starter-landing.json`.

## License rule

Only add code you wrote or code under MIT, Apache-2.0, BSD or a similar permissive license. Fill in `license` and `source`, and add third-party code to `THIRD_PARTY_NOTICES.md` at the repo root. Do not add code that has no license, a Commons Clause or a paid license.

Everything in this folder today was written for this project and is MIT licensed.

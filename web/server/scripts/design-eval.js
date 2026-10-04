/**
 * Design Quality Eval Harness
 *
 * Runs fixed prompts through the real agent pipeline (sandbox → initial build
 * → screenshots) and scores the rendered output with a multimodal judge.
 * This turns "our sites look better" into a tracked number: run it nightly or
 * before shipping prompt/model/harness changes, and compare runs.
 *
 * Usage:
 *   node scripts/design-eval.js                 # quick run (3 prompts)
 *   node scripts/design-eval.js --limit 10      # first 10 prompts
 *   node scripts/design-eval.js --all           # full suite (30 prompts)
 *   node scripts/design-eval.js --tag baseline  # label the run
 *
 * Results are written to scripts/eval-results/<timestamp>-<tag>.json with
 * per-prompt scores and a run summary. Requires E2B_API_KEY + model keys.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateObject } from 'ai';
import { z } from 'zod';
import { SandboxFactory } from '../lib/sandbox/factory.js';
import { sandboxManager } from '../lib/sandbox/sandbox-manager.js';
import { runAgentLoop } from '../shared/agent-loop.js';
import { captureViewportScreenshots } from '../lib/screenshot.js';
import { getModel } from '../lib/provider-helpers.js';
import { resolveModelRole } from '../shared/model-registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, 'eval-results');

// ─── Fixed prompt suite ──────────────────────────────────────
// Deliberately spans industries, moods, and difficulty. Do not casually edit:
// score comparability across runs depends on the prompts staying stable.

const EVAL_PROMPTS = [
  { id: 'saas-dark', prompt: 'A landing page for "Driftloop", a developer tool that records and replays production traffic. Dark, technical, premium — think Linear/Vercel energy.' },
  { id: 'restaurant-warm', prompt: 'Website for "Casa Lumen", an upscale Mexican restaurant in Lisbon. Warm, candle-lit mood, menu section, reservation CTA.' },
  { id: 'fitness-bold', prompt: 'A bold high-energy site for "IRONWORKS", a strength gym in Berlin. Dark with neon accents, class schedule, membership pricing.' },
  { id: 'portfolio-minimal', prompt: 'Minimal portfolio for a Copenhagen-based furniture designer named Mette Holm. Generous whitespace, editorial typography, project gallery.' },
  { id: 'fintech-trust', prompt: 'Landing page for "Northbeam", a savings app for freelancers. Trustworthy, clean, light mode, feature breakdown and security section.' },
  { id: 'streetwear-edgy', prompt: 'A streetwear drop site for the brand "GRAVEYARD SHIFT". Grungy, underground, oversized type, lookbook grid.' },
  { id: 'wedding-elegant', prompt: 'An elegant one-page wedding site for Sofia & Marco, September 2026 in Tuscany. Serif typography, RSVP section, schedule, soft palette.' },
  { id: 'agency-premium', prompt: 'Website for "Volt Studio", a premium web design agency. Cinematic hero, case studies, services, strong conversion-focused copy.' },
  { id: 'kids-playful', prompt: 'A playful site for "Tiny Sprouts", a Montessori preschool. Bright but tasteful, rounded shapes, enrollment info, staff section.' },
  { id: 'crypto-skeptical', prompt: 'Landing page for "Ledgerline", a crypto tax reporting tool for accountants. Professional and sober — explicitly NOT degenerate crypto aesthetics.' },
  { id: 'barber-classic', prompt: 'Site for "Fade Theory", a modern barbershop in Atlanta. Masculine, classic-meets-modern, booking CTA, price list, gallery.' },
  { id: 'travel-vivid', prompt: 'A travel agency site for "Meridian Trips" specializing in Japan itineraries. Vivid imagery direction, itinerary cards, testimonials.' },
  { id: 'law-serious', prompt: 'Website for "Hartmann & Vale", a boutique corporate law firm. Deep navy, serif headings, practice areas, attorney profiles.' },
  { id: 'music-immersive', prompt: 'An immersive site for the synthwave artist "NEON CHAPEL" — new album "Midnight Mass". Dark, atmospheric, tour dates, streaming links.' },
  { id: 'bakery-cozy', prompt: 'Cozy site for "Flour & Flame", a sourdough bakery in Portland. Warm earthy palette, menu, wholesale inquiry section.' },
  { id: 'ai-startup', prompt: 'Landing page for "Parsel", an AI document extraction API. Developer-focused, code snippet in hero, pricing tiers, modern light design.' },
  { id: 'realestate-lux', prompt: 'A luxury real estate site for "Apex Estates", Dubai penthouses. Black and gold restraint, property showcase, contact concierge.' },
  { id: 'nonprofit-hope', prompt: 'Website for "Blue Canopy", a reforestation nonprofit. Hopeful but serious, impact stats, donation tiers, project map section.' },
  { id: 'gaming-esports', prompt: 'Team site for "HEXBOUND", a competitive Valorant esports org. Aggressive dark design, roster cards, sponsors, match schedule.' },
  { id: 'skincare-clean', prompt: 'A clean beauty site for "Bare Theory" skincare. Soft neutrals, ingredient transparency section, product grid, routine builder teaser.' },
  { id: 'coffee-thirdwave', prompt: 'Site for "Slow Bloom Coffee Roasters". Third-wave aesthetic, subscription offer, brew guides, roast profiles.' },
  { id: 'architecture-stark', prompt: 'Portfolio for "Atelier Norr", a Scandinavian architecture practice. Stark, photographic, project index, studio philosophy.' },
  { id: 'petcare-friendly', prompt: 'A friendly site for "Wagtown", a dog daycare and grooming studio in Austin. Warm, trustworthy, pricing, booking, FAQ.' },
  { id: 'event-conference', prompt: 'Conference site for "SYNTAX 2027", a frontend engineering conference in Amsterdam. Speaker grid, schedule, ticket tiers, sponsors.' },
  { id: 'vintage-records', prompt: 'Site for "Static Age Records", a vintage vinyl shop. Retro-inspired but not kitsch, new arrivals, events, about the shop.' },
  { id: 'medical-calm', prompt: 'Website for "Meridian Health", a private physiotherapy clinic. Calming, clinical-but-human, services, team, online booking CTA.' },
  { id: 'auto-performance', prompt: 'A site for "Apex Dynamics", a performance car tuning shop. Dark carbon aesthetics, services, dyno results showcase, gallery.' },
  { id: 'education-mooc', prompt: 'Landing page for "Lumen Academy", cohort-based data science courses. Credible, outcome-focused, curriculum overview, alumni stories.' },
  { id: 'fashion-editorial', prompt: 'An editorial site for "MAISON VRAI", an avant-garde fashion house lookbook, FW26 collection. Bold typography, asymmetric layout.' },
  { id: 'multipage-restaurant', prompt: 'A multi-page website for "Ember & Oak" steakhouse: Home, Menu, Private Dining, and Contact pages with shared navigation.' }
];

// ─── Judge ───────────────────────────────────────────────────

const judgeSchema = z.object({
  visualHierarchy: z.number().min(0).max(10).describe('Clear focal points, intentional reading order, section rhythm'),
  typography: z.number().min(0).max(10).describe('Font choices, scale contrast, line lengths, polish'),
  colorAndContrast: z.number().min(0).max(10).describe('Cohesive palette, sufficient contrast, intentional accents'),
  layoutCraft: z.number().min(0).max(10).describe('Spacing, alignment, responsive sanity, no broken/overlapping elements'),
  originality: z.number().min(0).max(10).describe('Feels designed for this brand, not a generic template'),
  slopPenalty: z.number().min(0).max(10).describe('0 = heavy AI slop (placeholder copy, generic everything), 10 = zero slop markers'),
  promptAdherence: z.number().min(0).max(10).describe('Matches the requested industry, mood, content, and structure'),
  verdict: z.string().describe('Two sentences: the strongest aspect and the most important fix'),
  worstProblem: z.string().describe('Single most damaging visual/content problem, or "none"')
});

const JUDGE_SYSTEM_PROMPT = `You are a brutally honest senior product designer reviewing AI-generated websites.
Score strictly: a 7+ should be rare and mean "I would ship this". Generic template-feel caps originality at 4.
Placeholder copy ("Acme", "Feature 1", lorem ipsum) caps slopPenalty at 3. Broken layout caps layoutCraft at 3.
You are scoring the SCREENSHOT(S), not the idea.`;

async function judgeScreenshots({ prompt, screenshots }) {
  const model = getModel(resolveModelRole('generalGeneration'));
  const content = [
    { type: 'text', text: `The site was generated from this brief:\n\n"${prompt}"\n\nScore the rendered result (screenshots attached: ${screenshots.map((s) => s.label).join(', ')}).` },
    ...screenshots.map((shot) => ({ type: 'image', image: shot.base64, mimeType: shot.mimeType }))
  ];

  const result = await generateObject({
    model,
    schema: judgeSchema,
    maxRetries: 3,
    messages: [
      { role: 'system', content: JUDGE_SYSTEM_PROMPT },
      { role: 'user', content }
    ],
    temperature: 0
  });
  return result.object;
}

function overallScore(scores) {
  return Number((
    scores.visualHierarchy * 0.18 +
    scores.typography * 0.14 +
    scores.colorAndContrast * 0.14 +
    scores.layoutCraft * 0.16 +
    scores.originality * 0.14 +
    scores.slopPenalty * 0.12 +
    scores.promptAdherence * 0.12
  ).toFixed(2));
}

// ─── Runner ──────────────────────────────────────────────────

async function runOne(entry) {
  const startedAt = Date.now();
  let provider = null;
  const record = { id: entry.id, prompt: entry.prompt, status: 'failed' };

  try {
    console.log(`\n━━━ [${entry.id}] provisioning sandbox...`);
    provider = SandboxFactory.create();
    const sandboxInfo = await provider.createSandbox();
    await provider.setupViteApp();
    sandboxManager.registerSandbox(sandboxInfo.sandboxId, provider);

    console.log(`━━━ [${entry.id}] running initial build...`);
    const result = await runAgentLoop({
      prompt: entry.prompt,
      modelId: resolveModelRole('agentToolHeavy'),
      sandboxId: sandboxInfo.sandboxId,
      maxStepsOverride: 35,
      enableCatalogTools: true,
      enableVisualJudge: true,
      isInitialBuild: true,
      onEvent: () => {}
    });

    record.buildStatus = result.buildStatus;
    record.rounds = result.rounds;
    record.repairRounds = result.repairRounds;
    record.mutationCount = result.mutations.length;
    record.incompleteReason = result.incompleteReason;

    console.log(`━━━ [${entry.id}] capturing screenshots...`);
    const screenshots = await captureViewportScreenshots(sandboxInfo.url, {
      viewports: [
        { label: 'desktop', width: 1280, height: 800 },
        { label: 'mobile', width: 390, height: 844 }
      ],
      renderWaitMs: 4000
    });

    if (screenshots.length === 0) {
      record.error = 'No screenshots captured';
      return record;
    }

    console.log(`━━━ [${entry.id}] judging...`);
    const scores = await judgeScreenshots({ prompt: entry.prompt, screenshots });
    record.scores = scores;
    record.overall = overallScore(scores);
    record.status = 'completed';
    console.log(`━━━ [${entry.id}] overall: ${record.overall}/10 — ${scores.verdict}`);
  } catch (error) {
    record.error = error.message;
    console.error(`━━━ [${entry.id}] FAILED: ${error.message}`);
  } finally {
    record.durationMs = Date.now() - startedAt;
    if (provider) {
      try { await provider.terminate(); } catch { /* best effort */ }
    }
  }

  return record;
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const limitArg = args.indexOf('--limit');
  const tagArg = args.indexOf('--tag');
  const limit = all ? EVAL_PROMPTS.length : (limitArg !== -1 ? Number(args[limitArg + 1]) || 3 : 3);
  const tag = tagArg !== -1 ? String(args[tagArg + 1] || 'run') : 'run';

  if (!process.env.E2B_API_KEY) {
    console.error('E2B_API_KEY is required to run design evals.');
    process.exit(1);
  }

  const suite = EVAL_PROMPTS.slice(0, limit);
  console.log(`Design eval: ${suite.length} prompt(s), tag "${tag}"`);

  const records = [];
  for (const entry of suite) {
    records.push(await runOne(entry));
  }

  const completed = records.filter((record) => record.status === 'completed');
  const summary = {
    tag,
    ranAt: new Date().toISOString(),
    promptCount: suite.length,
    completed: completed.length,
    failed: records.length - completed.length,
    averageOverall: completed.length
      ? Number((completed.reduce((sum, record) => sum + record.overall, 0) / completed.length).toFixed(2))
      : null,
    dimensionAverages: completed.length
      ? Object.fromEntries(
        ['visualHierarchy', 'typography', 'colorAndContrast', 'layoutCraft', 'originality', 'slopPenalty', 'promptAdherence']
          .map((dimension) => [
            dimension,
            Number((completed.reduce((sum, record) => sum + record.scores[dimension], 0) / completed.length).toFixed(2))
          ])
      )
      : null
  };

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const filename = path.join(RESULTS_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}-${tag}.json`);
  fs.writeFileSync(filename, JSON.stringify({ summary, records }, null, 2));

  console.log('\n══════════ DESIGN EVAL SUMMARY ══════════');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Full results: ${filename}`);
  process.exit(summary.failed > 0 && summary.completed === 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Design eval crashed:', error);
  process.exit(1);
});

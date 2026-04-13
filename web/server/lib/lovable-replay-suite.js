export const LOVABLE_REPLAY_SUITE = [
  {
    id: 'single-section-waitlist',
    prompt: 'Build a single section waitlist page for my AI devtool startup with one strong CTA.',
    expected: { buildMode: 'single_section', routingMode: 'none' }
  },
  {
    id: 'single-page-marketing',
    prompt: 'Create a long single-page marketing website for a creative agency with sections for services, case studies, and contact.',
    expected: { buildMode: 'single_page_multi_section', routingMode: 'anchors' }
  },
  {
    id: 'multipage-business',
    prompt: 'Build a multipage business site with Home, About, Services, and Contact pages.',
    expected: { buildMode: 'multi_page', routingMode: 'router' }
  },
  {
    id: 'app-shell-todo',
    prompt: 'Create a frontend-only todo app dashboard shell with sidebar, task list, and calendar view.',
    expected: { buildMode: 'app_shell', routingMode: 'none' }
  },
  {
    id: 'no-community-custom',
    prompt: 'Build a fully custom one-page internal tool UI from scratch with no community templates or shared components.',
    expected: { catalogPosture: 'codegen_first' }
  }
];

export function evaluateReplayResults(results = []) {
  const total = Math.max(1, results.length);
  const modeMatches = results.filter((r) => r.modeMatched).length;
  const semanticMatches = results.filter((r) => r.semanticMatched).length;
  const singlePageDriftCount = results.filter((r) => r.singlePageDrift).length;
  return {
    modeAccuracy: modeMatches / total,
    semanticCoverage: semanticMatches / total,
    singlePageDrift: singlePageDriftCount / total
  };
}

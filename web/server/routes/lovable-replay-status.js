import { LOVABLE_REPLAY_SUITE } from '../lib/lovable-replay-suite.js';

export default async function lovableReplayStatus(req, res) {
  try {
    const modeAccuracy = Number(process.env.LOVABLE_REPLAY_MODE_ACCURACY || 0);
    const semanticCoverage = Number(process.env.LOVABLE_REPLAY_SEMANTIC_COVERAGE || 0);
    const singlePageDrift = Number(process.env.LOVABLE_REPLAY_SINGLE_PAGE_DRIFT || 100);
    const stableDays = Number(process.env.LOVABLE_REPLAY_STABLE_DAYS || 0);

    const cutoverReady =
      modeAccuracy >= 0.9 &&
      semanticCoverage >= 0.85 &&
      singlePageDrift <= 0.05 &&
      stableDays >= 7;

    return res.json({
      success: true,
      cutoverReady,
      thresholds: {
        modeAccuracy: 0.9,
        semanticCoverage: 0.85,
        singlePageDrift: 0.05,
        stableDays: 7
      },
      current: {
        modeAccuracy,
        semanticCoverage,
        singlePageDrift,
        stableDays
      },
      suite: LOVABLE_REPLAY_SUITE
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message || 'replay status failed' });
  }
}

import {
  finalizeDesignIntake,
} from '../lib/design/design-intake.js';
import {
  prepareDesignIntake,
  refreshDesignIntakeComponents,
} from '../lib/design/prepare-design-intake.js';

export async function prepareDesignIntakeRoute(req, res) {
  try {
    const {
      prompt,
      images = [],
      model,
      initialComponents = [],
      allowCommunityComponents = true,
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'prompt is required' });
    }

    const intake = await prepareDesignIntake({
      prompt: prompt.trim(),
      images,
      modelId: model,
      initialComponents,
      allowCommunityComponents: allowCommunityComponents !== false,
    });

    return res.json({ success: true, intake });
  } catch (error) {
    console.error('[design-intake] Prepare failed:', error);
    return res.status(500).json({
      success: false,
      error: 'The design brief could not be prepared. Please try again.',
    });
  }
}

export function finalizeDesignIntakeRoute(req, res) {
  try {
    const result = finalizeDesignIntake(req.body || {});
    return res.json({ success: true, ...result });
  } catch (error) {
    console.warn('[design-intake] Finalize rejected:', error.message);
    return res.status(400).json({ success: false, error: error.message });
  }
}

export async function refreshDesignIntakeComponentsRoute(req, res) {
  try {
    const {
      prompt,
      intake,
      answers = [],
      allowCommunityComponents = true,
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'prompt is required' });
    }

    const refreshedIntake = await refreshDesignIntakeComponents({
      prompt: prompt.trim(),
      intake,
      answers,
      allowCommunityComponents: allowCommunityComponents !== false,
    });

    return res.json({ success: true, intake: refreshedIntake });
  } catch (error) {
    console.warn('[design-intake] Component refresh rejected:', error.message);
    return res.status(400).json({
      success: false,
      error: 'Component suggestions could not be refreshed for this brief.',
    });
  }
}

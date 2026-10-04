import { beforeAll, describe, expect, it } from 'vitest';

let finalizeDesignIntake: typeof import('../../server/lib/design/design-intake.js').finalizeDesignIntake;
let buildComponentRetrievalQuery: typeof import('../../server/lib/design/design-intake.js').buildComponentRetrievalQuery;
let normalizePreparedDesignIntake: typeof import('../../server/lib/design/design-intake.js').normalizePreparedDesignIntake;
let normalizeProvidedDesignBrief: typeof import('../../server/lib/design/design-intake.js').normalizeProvidedDesignBrief;
let replaceComponentSuggestions: typeof import('../../server/lib/design/design-intake.js').replaceComponentSuggestions;

beforeAll(async () => {
  process.env.OPENAI_API_KEY ||= 'design-intake-test-key';
  ({
    buildComponentRetrievalQuery,
    finalizeDesignIntake,
    normalizePreparedDesignIntake,
    normalizeProvidedDesignBrief,
    replaceComponentSuggestions,
  } = await import('../../server/lib/design/design-intake.js'));
});

const designSystem = {
  colorPalette: {
    primary: '#22D3EE',
    secondary: '#348B95',
    accent: '#AFFFFC',
    background: '#050708',
    surface: '#101719',
    text: '#F4FBFC',
    textSecondary: '#9CB7BA',
    gradient: 'from-[#22D3EE] to-[#348B95]',
    mode: 'dark',
    mood: 'cinematic teal contrast',
  },
  typography: {
    headingFont: 'Space Grotesk',
    bodyFont: 'Inter',
    displaySize: 'clamp(2.75rem, 6vw, 5.5rem)',
    headingWeight: '800',
    style: 'confident geometric display',
  },
  imagery: {
    subjects: ['artist portrait', 'album artwork', 'live performance'],
    style: 'high-contrast editorial photography',
    unsplashKeywords: ['music artist', 'concert portrait', 'album studio'],
    mood: 'cool',
  },
  layoutPreferences: {
    borderRadius: '0.875rem',
    spacing: 'airy',
    cardStyle: 'outlined',
    sectionPadding: 'py-20',
  },
  mood: 'cinematic, editorial, and immersive',
  industryCategory: 'music',
  designPersonality: ['cinematic', 'bold', 'editorial'],
  toneOfVoice: 'confident and specific',
};

const generated = {
  interpretation: 'A cinematic artist hub should foreground the music, identity, and strongest path into featured work.',
  questions: [
    {
      id: 'x'.repeat(64),
      question: 'What should visitors discover first when they arrive?',
      helper: 'This establishes the opening hierarchy.',
      options: [
        {
          id: 'y'.repeat(64),
          label: 'Featured release',
          description: 'Lead with the latest music and one primary action.',
          recommended: true,
        },
        {
          id: 'story',
          label: 'Artist story',
          description: 'Lead with identity, history, and narrative.',
          recommended: true,
        },
        {
          id: 'catalog',
          label: 'Full catalog',
          description: 'Make releases immediately browsable.',
        },
      ],
    },
  ],
  designSystem,
  paletteOptions: [
    {
      id: 'night',
      label: 'Night Signal',
      description: 'Cool cinematic contrast',
      recommended: true,
      palette: designSystem.colorPalette,
    },
    {
      id: 'paper',
      label: 'Editorial Paper',
      description: 'Clean gallery contrast',
      palette: {
        ...designSystem.colorPalette,
        primary: '#1D4ED8',
        accent: '#2563EB',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        text: '#0F172A',
        textSecondary: '#475569',
        gradient: 'from-[#1D4ED8] to-[#2563EB]',
        mode: 'light',
        mood: 'clean editorial clarity',
      },
    },
    {
      id: 'ember',
      label: 'Backstage Ember',
      description: 'Warm performance energy',
      palette: {
        ...designSystem.colorPalette,
        primary: '#C2410C',
        secondary: '#7C2D12',
        accent: '#FB923C',
        background: '#120A07',
        surface: '#24120C',
        text: '#FFF7ED',
        textSecondary: '#FED7AA',
        gradient: 'from-[#C2410C] to-[#FB923C]',
        mood: 'warm performance energy',
      },
    },
  ],
};

function prepare() {
  return normalizePreparedDesignIntake({
    generated,
    prompt: 'Build a cinematic music artist hub',
    initialComponents: [
      {
        id: 'selected-hero',
        name: 'Selected Hero',
        category: 'Hero',
        authorType: 'community',
      },
    ],
    catalogComponents: [
      {
        id: 'selected-hero',
        name: 'Duplicate Hero',
        authorType: 'community',
      },
      {
        id: 'release-grid',
        uuid: 'release-grid-uuid',
        name: 'Release Grid',
        category: 'Gallery',
        authorType: 'community',
        matchedRoles: ['gallery'],
        qualityScore: 0.92,
      },
      {
        id: 'story-timeline',
        name: 'Story Timeline',
        category: 'Story',
        authorType: 'system',
        fitReasons: ['site:portfolio'],
      },
    ],
  });
}

describe('guided design intake', () => {
  it('normalizes bounded IDs, recommendations, and grounded component suggestions', () => {
    const intake = prepare();
    const question = intake.questions[0];

    expect(question.id.length).toBeLessThanOrEqual(64);
    expect(question.options.every((option) => option.id.length <= 64)).toBe(true);
    expect(question.options.filter((option) => option.recommended)).toHaveLength(1);
    expect(intake.paletteOptions.filter((option) => option.recommended)).toHaveLength(1);
    expect(intake.typographyOptions.filter((option) => option.recommended)).toHaveLength(1);
    expect(intake.preselectedComponents.map((component) => component.id)).toEqual(['selected-hero']);
    expect(intake.componentSuggestions.map((component) => component.id)).toEqual([
      'release-grid',
      'story-timeline',
    ]);
    expect(intake.componentSuggestions[0].fitReason).toContain('Gallery');
  });

  it('creates a generation payload from custom answers and canonical selections', () => {
    const intake = prepare();
    const question = intake.questions[0];
    const typography = intake.typographyOptions[1];
    const palette = intake.paletteOptions[1];

    const result = finalizeDesignIntake({
      prompt: 'Build a cinematic music artist hub',
      intake,
      draft: {
        answers: [{
          questionId: question.id,
          optionId: 'custom',
          value: 'Open on the newest album and tour announcement',
        }],
        typographyId: typography.id,
        paletteId: palette.id,
        componentIds: ['selected-hero', 'release-grid-uuid'],
      },
    });

    expect(result.manualSelectionIds).toEqual(['selected-hero', 'release-grid']);
    expect(result.designBrief.typography.headingFont).toBe(typography.typography.headingFont);
    expect(result.designBrief.colorPalette.primary).toBe(palette.palette.primary);
    expect(result.designBrief.intake?.answers[0].answer).toBe(
      'Open on the newest album and tour announcement',
    );
    expect(result.designBrief.intake?.componentIds).toEqual(['selected-hero', 'release-grid']);
    expect(result.generationPrompt).toContain('[Confirmed pre-build decisions]');
    expect(result.generationPrompt).toContain('Release Grid [release-grid]');
    expect(result.briefSummary).toContain(' · ');
    expect(normalizeProvidedDesignBrief(result.designBrief)).toEqual(result.designBrief);
  });

  it('honors an empty component selection and falls back to recommended choices', () => {
    const intake = prepare();
    const result = finalizeDesignIntake({
      prompt: 'Build a cinematic music artist hub',
      intake,
      draft: {
        answers: [],
        componentIds: [],
      },
    });

    expect(result.selectedComponents).toEqual([]);
    expect(result.manualSelectionIds).toEqual([]);
    expect(result.generationPrompt).toContain('Community components: none preselected');
    expect(result.designBrief.intake?.answers[0].answer).toBe(
      intake.questions[0].options.find((option) => option.recommended)?.label,
    );
  });

  it('re-ranks grounded component suggestions against confirmed structural answers', () => {
    const intake = prepare();
    const question = intake.questions[0];
    const query = buildComponentRetrievalQuery({
      prompt: 'Build a cinematic music artist hub',
      intake,
      answers: [{
        questionId: question.id,
        optionId: 'custom',
        value: 'Lead with tour dates and ticket conversion',
      }],
    });

    expect(query).toContain('Lead with tour dates and ticket conversion');
    expect(query).toContain(question.question);

    const refreshed = replaceComponentSuggestions({
      intake,
      catalogComponents: [{
        id: 'tour-schedule',
        name: 'Tour Schedule',
        authorType: 'community',
        matchedRoles: ['schedule'],
      }],
    });
    expect(refreshed.componentSuggestions.map((component) => component.id)).toEqual([
      'tour-schedule',
    ]);
    expect(refreshed.preselectedComponents.map((component) => component.id)).toEqual([
      'selected-hero',
    ]);
  });

  it('rejects an expired or malformed prepared intake', () => {
    expect(() => finalizeDesignIntake({
      prompt: 'Build a site',
      intake: { version: 99 },
      draft: {},
    })).toThrow(/expired or is invalid/i);
  });
});

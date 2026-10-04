import { z } from 'zod';
import { CURATED_FONT_PAIRINGS, designSystemSchema } from './derive-design-system.js';

export const DESIGN_INTAKE_VERSION = 1;
export const MAX_INTAKE_COMPONENTS = 4;

const paletteSchema = designSystemSchema.shape.colorPalette;

export const intakeQuestionSchema = z.object({
  id: z.string().min(1).max(64),
  question: z.string().min(8).max(220),
  helper: z.string().max(180).optional().default(''),
  options: z.array(z.object({
    id: z.string().min(1).max(64),
    label: z.string().min(1).max(80),
    description: z.string().max(180).optional().default(''),
    recommended: z.boolean().optional().default(false),
  })).min(2).max(4),
});

export const paletteOptionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  description: z.string().max(180).optional().default(''),
  recommended: z.boolean().optional().default(false),
  palette: paletteSchema,
});

export const generatedIntakeSchema = z.object({
  interpretation: z.string().min(12).max(420),
  questions: z.array(intakeQuestionSchema).min(1).max(2),
  designSystem: designSystemSchema,
  paletteOptions: z.array(paletteOptionSchema).min(3).max(4),
});

export const componentSuggestionSchema = z.object({
  id: z.string().min(1).max(160),
  uuid: z.string().max(160).nullable().optional(),
  name: z.string().min(1).max(120),
  category: z.string().max(100).optional().default('Section'),
  description: z.string().max(320).optional().default(''),
  thumbnailUrl: z.string().nullable().optional(),
  authorType: z.string().max(40).optional().default('community'),
  fitReason: z.string().max(180).optional().default('Strong match for this brief.'),
  qualityScore: z.number().nullable().optional(),
  preselected: z.boolean().optional().default(false),
});

export const typographyOptionSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
  description: z.string().max(180).optional().default(''),
  sample: z.string().max(8).optional().default('Ag'),
  recommended: z.boolean().optional().default(false),
  typography: designSystemSchema.shape.typography,
});

export const preparedDesignIntakeSchema = z.object({
  version: z.literal(DESIGN_INTAKE_VERSION),
  interpretation: z.string().min(1).max(420),
  questions: z.array(intakeQuestionSchema).min(1).max(2),
  designSystem: designSystemSchema,
  typographyOptions: z.array(typographyOptionSchema).min(1).max(4),
  paletteOptions: z.array(paletteOptionSchema).min(1).max(4),
  componentSuggestions: z.array(componentSuggestionSchema).max(8),
  preselectedComponents: z.array(componentSuggestionSchema).max(MAX_INTAKE_COMPONENTS),
});

const intakeDraftSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().min(1).max(64),
    optionId: z.string().min(1).max(64).optional(),
    value: z.string().min(1).max(300),
  })).max(4).default([]),
  typographyId: z.string().max(80).optional(),
  paletteId: z.string().max(80).optional(),
  componentIds: z.array(z.string().min(1).max(160)).max(MAX_INTAKE_COMPONENTS).default([]),
});

const designBriefIntakeMetadataSchema = z.object({
  version: z.literal(DESIGN_INTAKE_VERSION),
  interpretation: z.string().max(420),
  answers: z.array(z.object({
    question: z.string().max(220),
    answer: z.string().max(300),
  })).max(4),
  typography: z.string().max(80),
  palette: z.string().max(80),
  componentIds: z.array(z.string().max(160)).max(MAX_INTAKE_COMPONENTS),
});

export const finalizedDesignBriefSchema = designSystemSchema.extend({
  intake: designBriefIntakeMetadataSchema.optional(),
});

const FONT_DIRECTIONS = [
  { label: 'Modern Sans', heading: 'Inter', body: 'Inter', vibe: 'professional', description: 'Clear, versatile, and quietly polished.' },
  { label: 'Geometric', heading: 'Space Grotesk', body: 'Inter', vibe: 'tech', description: 'Structured shapes with a precise digital edge.' },
  { label: 'Bold Modern', heading: 'Syne', body: 'Inter', vibe: 'bold-modern', description: 'Expressive display type with readable supporting copy.' },
  { label: 'Elegant Serif', heading: 'Playfair Display', body: 'Lora', vibe: 'luxury', description: 'Editorial contrast with an elevated, crafted feel.' },
  { label: 'Editorial', heading: 'Newsreader', body: 'Inter', vibe: 'editorial', description: 'Story-led typography with contemporary utility.' },
  { label: 'Technical Mono', heading: 'Sora', body: 'Inter', vibe: 'tech', description: 'Technical character without sacrificing readability.' },
  { label: 'Humanist', heading: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans', vibe: 'organic', description: 'Warm, approachable forms for people-focused brands.' },
  { label: 'Energetic', heading: 'Bebas Neue', body: 'Inter', vibe: 'sporty', description: 'Condensed impact for movement, culture, and action.' },
  { label: 'Playful', heading: 'Nunito', body: 'Nunito', vibe: 'playful', description: 'Friendly rounded forms with an optimistic voice.' },
];

const FALLBACK_PALETTES = {
  dark: {
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
  light: {
    primary: '#176B75',
    secondary: '#72A6AB',
    accent: '#0E8793',
    background: '#F5F8F7',
    surface: '#FFFFFF',
    text: '#102426',
    textSecondary: '#5B6D70',
    gradient: 'from-[#176B75] to-[#72A6AB]',
    mode: 'light',
    mood: 'calm editorial clarity',
  },
  warm: {
    primary: '#A85D36',
    secondary: '#D8B58B',
    accent: '#E47745',
    background: '#17120F',
    surface: '#261D18',
    text: '#FFF8F1',
    textSecondary: '#CDBCB0',
    gradient: 'from-[#A85D36] to-[#E47745]',
    mode: 'dark',
    mood: 'warm tactile confidence',
  },
};

export function normalizePreparedDesignIntake({
  generated,
  catalogComponents = [],
  initialComponents = [],
  prompt = '',
} = {}) {
  const parsed = generatedIntakeSchema.safeParse(generated);
  const core = parsed.success ? parsed.data : buildFallbackGeneratedIntake(prompt);
  const questions = normalizeQuestions(core.questions);
  const paletteOptions = normalizeRecommended(core.paletteOptions).map((option, index) => ({
    ...option,
    id: indexedId(option.id || option.label, 'palette', index),
  }));
  const typographyOptions = buildTypographyOptions(core.designSystem, prompt);
  const preselectedComponents = normalizePreselectedComponents(initialComponents);
  const preselectedIds = new Set(preselectedComponents.flatMap(componentIdentityKeys));
  const componentSuggestions = buildComponentSuggestions(catalogComponents)
    .filter((component) => !componentIdentityKeys(component).some((key) => preselectedIds.has(key)))
    .slice(0, Math.max(0, 6 - preselectedComponents.length));

  return preparedDesignIntakeSchema.parse({
    version: DESIGN_INTAKE_VERSION,
    interpretation: core.interpretation,
    questions,
    designSystem: core.designSystem,
    typographyOptions,
    paletteOptions,
    componentSuggestions,
    preselectedComponents,
  });
}

export function buildComponentRetrievalQuery({ prompt, intake, answers = [] } = {}) {
  const plan = preparedDesignIntakeSchema.parse(intake);
  const parsedAnswers = intakeDraftSchema.shape.answers.parse(answers);
  const resolvedAnswers = resolveAnswers(plan.questions, parsedAnswers);
  const cleanPrompt = String(prompt || '').trim();

  return [
    cleanPrompt,
    '',
    `Planning interpretation: ${plan.interpretation}`,
    'Confirmed structural decisions:',
    ...resolvedAnswers.map(({ question, answer }) => `- ${question}: ${answer}`),
    `Industry: ${plan.designSystem.industryCategory}`,
    `Design personality: ${(plan.designSystem.designPersonality || []).join(', ')}`,
    'Find reusable sections that support these confirmed decisions.',
  ].filter(Boolean).join('\n');
}

export function replaceComponentSuggestions({ intake, catalogComponents = [] } = {}) {
  const plan = preparedDesignIntakeSchema.parse(intake);
  const preselectedIds = new Set(plan.preselectedComponents.flatMap(componentIdentityKeys));
  const componentSuggestions = buildComponentSuggestions(catalogComponents)
    .filter((component) => !componentIdentityKeys(component).some((key) => preselectedIds.has(key)))
    .slice(0, Math.max(0, 6 - plan.preselectedComponents.length));

  return preparedDesignIntakeSchema.parse({
    ...plan,
    componentSuggestions,
  });
}

export function finalizeDesignIntake({ prompt, intake, draft } = {}) {
  const parsedIntake = preparedDesignIntakeSchema.safeParse(intake);
  if (!parsedIntake.success) {
    throw new Error('The design brief expired or is invalid. Please prepare it again.');
  }

  const parsedDraft = intakeDraftSchema.safeParse(draft || {});
  if (!parsedDraft.success) {
    throw new Error('One or more design selections are invalid.');
  }

  const plan = parsedIntake.data;
  const choices = parsedDraft.data;
  const typography = findSelectedOption(
    plan.typographyOptions,
    choices.typographyId,
  );
  const palette = findSelectedOption(
    plan.paletteOptions,
    choices.paletteId,
  );
  const answers = resolveAnswers(plan.questions, choices.answers);
  const selectedComponents = resolveSelectedComponents(plan, choices.componentIds);

  const designBrief = finalizedDesignBriefSchema.parse({
    ...plan.designSystem,
    colorPalette: palette.palette,
    typography: typography.typography,
    intake: {
      version: DESIGN_INTAKE_VERSION,
      interpretation: plan.interpretation,
      answers: answers.map(({ question, answer }) => ({ question, answer })),
      typography: typography.label,
      palette: palette.label,
      componentIds: selectedComponents.map((component) => component.id),
    },
  });

  const confirmedLines = [
    ...answers.map(({ question, answer }) => `- ${question}: ${answer}`),
    `- Typography: ${typography.label} (${typography.typography.headingFont} headings, ${typography.typography.bodyFont} body)`,
    `- Color direction: ${palette.label} (${palette.palette.mode}; primary ${palette.palette.primary}, accent ${palette.palette.accent})`,
  ];
  if (selectedComponents.length > 0) {
    confirmedLines.push(`- Community components to prioritize: ${selectedComponents.map((component) => `${component.name} [${component.id}]`).join(', ')}`);
  } else {
    confirmedLines.push('- Community components: none preselected; create only what the brief requires.');
  }

  const cleanPrompt = String(prompt || '').trim() || 'Build a polished website from the confirmed brief.';
  const generationPrompt = [
    cleanPrompt,
    '',
    '[Confirmed pre-build decisions]',
    ...confirmedLines,
    'Treat these as requirements. Do not re-ask these questions or silently replace the chosen direction.',
    '[/Confirmed pre-build decisions]',
  ].join('\n');

  const briefSummary = [
    'Brief confirmed',
    `${palette.label} palette`,
    typography.label,
    selectedComponents.length > 0
      ? `${selectedComponents.length} community ${selectedComponents.length === 1 ? 'component' : 'components'}`
      : 'custom sections',
  ].join(' · ');

  return {
    generationPrompt,
    designBrief,
    selectedComponents,
    manualSelectionIds: selectedComponents.map((component) => component.id),
    briefSummary,
  };
}

export function normalizeProvidedDesignBrief(value) {
  const parsed = finalizedDesignBriefSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function buildFallbackGeneratedIntake(prompt = '') {
  const normalizedPrompt = String(prompt || '').toLowerCase();
  const isWarm = /(restaurant|food|cafe|bakery|craft|organic|wellness)/.test(normalizedPrompt);
  const isLight = /(clinic|health|education|children|family|legal|finance)/.test(normalizedPrompt);
  const basePalette = isWarm ? FALLBACK_PALETTES.warm : isLight ? FALLBACK_PALETTES.light : FALLBACK_PALETTES.dark;
  const alternativePalette = basePalette.mode === 'dark' ? FALLBACK_PALETTES.light : FALLBACK_PALETTES.dark;

  return {
    interpretation: 'I have the core idea. Two focused decisions will lock the content priority and visual character before the build starts.',
    questions: [
      {
        id: 'primary-outcome',
        question: 'What should visitors be able to do first?',
        helper: 'This determines the hero, page hierarchy, and strongest call to action.',
        options: [
          { id: 'explore', label: 'Explore the story', description: 'Lead with narrative, identity, and discovery.', recommended: true },
          { id: 'act', label: 'Take one clear action', description: 'Optimize the opening around a primary conversion.', recommended: false },
          { id: 'browse', label: 'Browse offerings', description: 'Make products, services, or content immediately scannable.', recommended: false },
        ],
      },
      {
        id: 'visual-energy',
        question: 'How should the experience feel in motion?',
        helper: 'This steers composition, density, and animation restraint.',
        options: [
          { id: 'cinematic', label: 'Cinematic and immersive', description: 'Large moments, deliberate pacing, atmospheric motion.', recommended: true },
          { id: 'clean', label: 'Clean and direct', description: 'Fast scanning, restrained motion, practical hierarchy.', recommended: false },
          { id: 'expressive', label: 'Bold and expressive', description: 'Graphic layouts, stronger contrast, energetic transitions.', recommended: false },
        ],
      },
    ],
    designSystem: {
      colorPalette: basePalette,
      typography: {
        headingFont: 'Space Grotesk',
        bodyFont: 'Inter',
        displaySize: 'clamp(2.75rem, 6vw, 5.5rem)',
        headingWeight: '800',
        style: 'confident geometric display with quiet supporting copy',
      },
      imagery: {
        subjects: ['editorial hero subject', 'contextual detail', 'brand atmosphere'],
        style: 'high-contrast editorial photography with intentional negative space',
        unsplashKeywords: ['editorial brand', 'cinematic detail', 'modern atmosphere'],
        mood: basePalette.mode === 'dark' ? 'cool' : 'neutral',
      },
      layoutPreferences: {
        borderRadius: '0.875rem',
        spacing: 'airy',
        cardStyle: 'outlined',
        sectionPadding: 'py-20',
      },
      mood: basePalette.mood,
      industryCategory: 'general',
      designPersonality: ['intentional', 'distinctive', 'usable'],
      toneOfVoice: 'clear, confident, specific, and free of filler',
    },
    paletteOptions: [
      { id: 'recommended', label: 'Recommended', description: basePalette.mood, recommended: true, palette: basePalette },
      { id: 'contrast', label: 'Studio Contrast', description: alternativePalette.mood, recommended: false, palette: alternativePalette },
      { id: 'warm', label: 'Warm Signal', description: FALLBACK_PALETTES.warm.mood, recommended: false, palette: FALLBACK_PALETTES.warm },
    ],
  };
}

function normalizeQuestions(questions) {
  return questions.slice(0, 2).map((question, questionIndex) => {
    const normalizedOptions = normalizeRecommended(question.options).map((option, optionIndex) => ({
      ...option,
      id: indexedId(option.id || option.label, 'option', optionIndex),
    }));
    return {
      ...question,
      id: indexedId(question.id || question.question, 'question', questionIndex),
      options: normalizedOptions,
    };
  });
}

function normalizeRecommended(options) {
  const list = Array.isArray(options) ? options.map((option) => ({ ...option })) : [];
  const recommendedIndex = Math.max(0, list.findIndex((option) => option.recommended));
  return list.map((option, index) => ({ ...option, recommended: index === recommendedIndex }));
}

function buildTypographyOptions(designSystem, prompt) {
  const baseTypography = designSystem.typography;
  const promptText = `${prompt} ${designSystem.mood || ''} ${(designSystem.designPersonality || []).join(' ')}`.toLowerCase();
  const preferredVibes = [];
  if (/(luxury|elegant|premium|fashion)/.test(promptText)) preferredVibes.push('luxury', 'editorial');
  if (/(tech|saas|digital|future|cyber|technical)/.test(promptText)) preferredVibes.push('tech', 'bold-modern');
  if (/(sport|fitness|music|energy|action)/.test(promptText)) preferredVibes.push('sporty', 'bold-modern');
  if (/(playful|children|friendly|fun)/.test(promptText)) preferredVibes.push('playful', 'organic');
  if (/(organic|wellness|people|community)/.test(promptText)) preferredVibes.push('organic', 'professional');
  preferredVibes.push('professional', 'tech', 'editorial', 'bold-modern', 'organic');

  const baseDirection = FONT_DIRECTIONS.find((direction) => (
    direction.heading === baseTypography.headingFont && direction.body === baseTypography.bodyFont
  )) || {
    label: baseTypography.style || baseTypography.headingFont,
    heading: baseTypography.headingFont,
    body: baseTypography.bodyFont,
    vibe: 'recommended',
    description: baseTypography.style || 'Recommended from the initial brief.',
  };

  const directions = [baseDirection];
  for (const vibe of preferredVibes) {
    const candidate = FONT_DIRECTIONS.find((direction) => direction.vibe === vibe);
    if (!candidate) continue;
    if (directions.some((direction) => direction.heading === candidate.heading && direction.body === candidate.body)) continue;
    directions.push(candidate);
    if (directions.length === 3) break;
  }

  for (const pairing of CURATED_FONT_PAIRINGS) {
    if (directions.length === 3) break;
    if (directions.some((direction) => direction.heading === pairing.heading && direction.body === pairing.body)) continue;
    directions.push({
      label: pairing.vibe.replace(/(^|-)([a-z])/g, (_, separator, char) => `${separator ? ' ' : ''}${char.toUpperCase()}`),
      heading: pairing.heading,
      body: pairing.body,
      vibe: pairing.vibe,
      description: 'A curated, production-safe pairing.',
    });
  }

  return directions.slice(0, 3).map((direction, index) => ({
    id: uniqueId(`${direction.heading}-${direction.body}`, `type-${index + 1}`),
    label: direction.label,
    description: direction.description,
    sample: sampleForTypography(direction),
    recommended: index === 0,
    typography: {
      ...baseTypography,
      headingFont: direction.heading,
      bodyFont: direction.body,
      style: direction.description,
    },
  }));
}

function sampleForTypography(direction) {
  if (direction.vibe === 'tech') return '0x';
  if (direction.vibe === 'editorial') return 'Ed';
  if (direction.vibe === 'organic') return 'Hu';
  return 'Ag';
}

function normalizePreselectedComponents(components) {
  const normalized = [];
  const seen = new Set();
  for (const component of Array.isArray(components) ? components : []) {
    const id = String(component?.id || component?.component_id || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    normalized.push({
      id,
      uuid: component?.uuid || null,
      name: String(component?.display_name || component?.name || 'Selected component').slice(0, 120),
      category: String(component?.category || 'Selected').slice(0, 100),
      description: String(component?.description || 'Already selected from the component library.').slice(0, 320),
      thumbnailUrl: component?.thumbnailUrl || component?.thumbnail_url || component?.preview_image_url || null,
      authorType: component?.authorType || component?.author_type || 'community',
      fitReason: 'Already selected before planning.',
      qualityScore: numberOrNull(component?.qualityScore ?? component?.quality_score),
      preselected: true,
    });
    if (normalized.length === MAX_INTAKE_COMPONENTS) break;
  }
  return normalized;
}

function buildComponentSuggestions(components) {
  const source = Array.isArray(components) ? components : [];
  const seen = new Set();
  const suggestions = [];

  // The shared registry already blends semantic/intent fit and quality.
  // Preserve that ranking so provenance never outranks relevance.
  for (const component of source) {
    const id = String(component?.id || component?.component_id || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const matchedRole = component?.matchedRoles?.[0];
    const fitReason = matchedRole
      ? `${titleCase(matchedRole)} section matched to this brief.`
      : humanizeFitReason(component?.fitReasons?.[0]) || 'Strong match for this direction.';
    suggestions.push({
      id,
      uuid: component?.uuid || null,
      name: String(component?.name || component?.display_name || id).slice(0, 120),
      category: String(component?.category || matchedRole || 'Section').slice(0, 100),
      description: String(component?.description || component?.visualDescription || '').slice(0, 320),
      thumbnailUrl: component?.thumbnailUrl || component?.thumbnail_url || component?.preview_image_url || null,
      authorType: component?.authorType || component?.author_type || 'community',
      fitReason,
      qualityScore: numberOrNull(component?.qualityScore ?? component?.quality_score),
      preselected: false,
    });
    if (suggestions.length === 8) break;
  }
  return suggestions;
}

function resolveAnswers(questions, suppliedAnswers) {
  const byQuestion = new Map(suppliedAnswers.map((answer) => [answer.questionId, answer]));
  return questions.map((question) => {
    const supplied = byQuestion.get(question.id);
    const recommended = question.options.find((option) => option.recommended) || question.options[0];
    const selected = supplied?.optionId
      ? question.options.find((option) => option.id === supplied.optionId)
      : null;
    const answer = String(supplied?.value || selected?.label || recommended.label).trim().slice(0, 300);
    return {
      questionId: question.id,
      question: question.question,
      optionId: selected?.id || supplied?.optionId || recommended.id,
      answer,
    };
  });
}

function resolveSelectedComponents(plan, selectedIds) {
  const available = [...plan.preselectedComponents, ...plan.componentSuggestions];
  const byId = new Map();
  for (const component of available) {
    for (const key of componentIdentityKeys(component)) byId.set(key, component);
  }

  const requested = selectedIds;
  const selected = [];
  const seen = new Set();
  for (const id of requested) {
    const component = byId.get(id);
    if (!component || seen.has(component.id)) continue;
    seen.add(component.id);
    selected.push(component);
    if (selected.length === MAX_INTAKE_COMPONENTS) break;
  }
  return selected;
}

function findSelectedOption(options, selectedId) {
  return options.find((option) => option.id === selectedId)
    || options.find((option) => option.recommended)
    || options[0];
}

function componentIdentityKeys(component) {
  return [component?.id, component?.uuid].filter(Boolean).map(String);
}

function humanizeFitReason(reason) {
  if (!reason || typeof reason !== 'string') return '';
  const [kind, value] = reason.split(':');
  if (!value) return '';
  if (kind === 'semantic') return 'Semantically matched to the requested experience.';
  return `${titleCase(value.split(',')[0])} fit for this brief.`;
}

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function uniqueId(value, fallback) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return normalized || fallback;
}

function indexedId(value, fallback, index) {
  const suffix = `-${index + 1}`;
  const base = uniqueId(value, fallback).slice(0, 64 - suffix.length);
  return `${base}${suffix}`;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

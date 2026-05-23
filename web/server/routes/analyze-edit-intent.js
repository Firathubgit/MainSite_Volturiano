import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../lib/provider-helpers.js';
import { normalizePublicModelId, resolveModelRole } from '../shared/model-registry.js';

const searchPlanSchema = z.object({
  editType: z.string().describe('Type: add_component, modify_component, add_section, modify_styling, fix_issue, refactor'),
  reasoning: z.string().describe('Why this edit type was chosen'),
  searchTerms: z.array(z.string()).describe('Keywords to search for in the codebase'),
  fileTypesToSearch: z.array(z.string()).optional().describe('File extensions to focus on'),
});

export default async function analyzeEditIntent(req, res) {
  try {
    const { prompt, manifest, model = resolveModelRole('generalGeneration') } = req.body;
    const effectiveModel = normalizePublicModelId(model);

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'prompt is required' });
    }

    console.log('[analyze-edit-intent] Analyzing:', prompt.substring(0, 80) + '...');

    const fileList = manifest?.files?.map(f => f.path || f).join('\n') || 'No files available';

    const result = await generateObject({
      model: getModel(effectiveModel),
      schema: searchPlanSchema,
      messages: [
        {
          role: 'system',
          content: `You are a code analysis expert. Given a user's edit request and a list of existing files, determine what type of edit is needed and what to search for.

File types:
- add_component: Adding a new component/section
- modify_component: Changing an existing component
- add_section: Adding a section to an existing page
- modify_styling: Changing styles/appearance
- fix_issue: Fixing a bug or error
- refactor: Restructuring code

Current files:\n${fileList}`,
        },
        { role: 'user', content: `User wants to: ${prompt}` },
      ],
    });

    res.json({ success: true, searchPlan: result.object });
  } catch (error) {
    console.error('[analyze-edit-intent] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

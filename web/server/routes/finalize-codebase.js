import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../lib/provider-helpers.js';
import { resolveSandboxProvider } from '../lib/sandbox/provider-resolver.js';
import { log } from '../lib/build-manifest.js';
import { normalizePublicModelId, resolveModelRole } from '../shared/model-registry.js';

const modificationSchema = z.object({
    modifications: z.array(z.object({
        filePath: z.string().describe('The file path to modify (e.g., "src/components/HeroSection.jsx")'),
        action: z.enum(['rewrite', 'replace_block']).describe('Type of modification'),
        content: z.string().describe('The new full file content (for rewrite) or replacement block'),
        targetBlock: z.string().optional().describe('For replace_block, the exact string to replace'),
        reason: z.string().describe('Why this change is being made'),
    })),
    summary: z.string().describe('Brief summary of what was polished'),
});

export default async function finalizeCodebase(req, res) {
    const { buildId, prompt, sandboxId, model = resolveModelRole('premiumPolish') } = req.body;
    const effectiveModel = normalizePublicModelId(model);

    try {
        log(buildId, '[finalize-codebase] Starting final polish step...');

        const resolution = await resolveSandboxProvider({
            sandboxId,
            allowGlobalFallback: !sandboxId,
            allowReconnect: true,
            requireAlive: true
        });
        if (!resolution.ok) throw new Error(resolution.message);
        const provider = resolution.provider;

        // 1. Gather Context (App.jsx, index.css, and headers/footers)
        const fileList = await provider.listFiles('/home/user/app/src');
        const componentFiles = fileList.filter(f => f.includes('components/'));

        // Read key files
        const appJsx = await provider.readFile('src/App.jsx').catch(() => '');
        const indexCss = await provider.readFile('src/index.css').catch(() => '');

        // Read up to 5 component files to give context (prefer Header/Footer/Hero)
        const criticalComponents = componentFiles
            .filter(f => /Header|Footer|Hero|Nav/i.test(f))
            .slice(0, 5);

        const componentContext = await Promise.all(
            criticalComponents.map(async f => {
                const content = await provider.readFile(f);
                return `\n--- FILE: ${f} ---\n${content}`;
            })
        );

        const fullContext = `
--- FILE: src/App.jsx ---
${appJsx}

--- FILE: src/index.css ---
${indexCss}

${componentContext.join('\n')}
`;

        // 2. AI Polish Step
        const MODIFICATION_PROMPT = `
You are the "Final Polish" engine. Your job is to review the code and align it with the user's ORIGINAL vision.

ORIGINAL USER REQUEST: "${prompt}"

YOUR TASKS:
1. **Text Refinement**: Ensure all placeholder text (e.g., "Company Name", "Feature 1") is replaced with relevant, high-quality copy based on the request.
2. **Consistency Check**: Ensure the Header and Footer links/branding match the prompt.
3. **Layout Polish**: If you see obvious layout issues (e.g., missing padding in App.jsx), fix them.
4. **Content Match**: If the user asked for a "Sushi Restaurant", ensure the Hero headline isn't "Welcome to My Website".

Output a list of file modifications. 
- Use 'rewrite' to output the FULL improved file content (safest).
- Use 'replace_block' ONLY for small, unique text swaps.
- Do NOT hallucinate new files. Only edit existing ones.
`;

        const result = await generateObject({
            model: getModel(effectiveModel),
            schema: modificationSchema,
            messages: [
                { role: 'system', content: MODIFICATION_PROMPT },
                { role: 'user', content: `Here is the current code:\n${fullContext}` }
            ],
        });

        const { modifications, summary } = result.object;

        // 3. Apply Changes
        log(buildId, `[finalize-codebase] Applying ${modifications.length} improvements: ${summary}`);

        for (const mod of modifications) {
            if (mod.action === 'rewrite') {
                await provider.writeFile(mod.filePath, mod.content);
            } else if (mod.action === 'replace_block' && mod.targetBlock) {
                const currentContent = await provider.readFile(mod.filePath);
                const newContent = currentContent.replace(mod.targetBlock, mod.content);
                await provider.writeFile(mod.filePath, newContent);
            }
        }

        res.json({ success: true, summary, modifiedFiles: modifications.map(m => m.filePath) });

    } catch (error) {
        console.error('[finalize-codebase] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

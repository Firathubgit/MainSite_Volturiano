import OpenAI from 'openai';

let openaiClient = null;

/**
 * Get or create OpenAI client singleton
 */
export function getOpenAIClient() {
    if (!openaiClient && process.env.OPENAI_API_KEY) {
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    } else if (!openaiClient) {
        console.warn('[OpenAI] API Key missing, narrator will use fallbacks.');
    }
    return openaiClient;
}

// Prompt construction helper
const getPromptForStage = (stage, context) => {
    const base = `You are a minimalist, technical coding assistant.
Rules:
1. MAX 12 words per message.
2. NO emojis.
3. NO "I am..." or "I need to...". Start with verbs (e.g., "Building...", "Installing...").
4. Be cool, casual, and precise.
5. Lowercase is acceptable for style.`;

    switch (stage) {
        case 'planning':
            return `${base}\nTask: Briefly state plan for ${context.prompt || 'the website'}. Example: "structuring hero, gallery, and contact sections."`;

        case 'applying':
            return `${base}\nTask: State what you are applying. Context: ${context.filesCount} files. Example: "applying ${context.filesCount} files to sandbox."`;

        case 'installing':
            return `${base}\nTask: List key packages being installed. Context: ${context.packages.join(', ')}. Example: "installing framer-motion and lucide-react."`;

        case 'building':
            return `${base}\nTask: Mention the component being built. Context: ${context.componentName}. Example: "writing ${context.componentName} logic."`;

        case 'verifying':
            if (context.passed) return `${base}\nTask: Confirm build success. Example: "build verification passed. app is live."`;
            return `${base}\nTask: Mention build failure. Example: "build failed. investigating errors."`;

        case 'repairing':
            return `${base}\nTask: Mention fixing strategy. Context: ${context.strategy}. Example: "fixing via ${context.strategy}."`;

        case 'repair_success':
            return `${base}\nTask: Confirm fix. Example: "fixes applied. verified successfully."`;

        case 'rollback':
            return `${base}\nTask: Announce rollback. Example: "critical error. rolling back changes."`;

        case 'complete':
            return `${base}\nTask: Final success message. Be evocative and premium. Example: "manifestation complete. your vision is live in the preview."`;

        default:
            return `${base}\nTask: Brief status update.`;
    }
};

import { renderAppTemplate } from '../lib/render-app-template.js';

export default async function renderApp(req, res) {
    try {
        const { components } = req.body;

        if (!components || !Array.isArray(components)) {
            return res.status(400).json({ error: 'Invalid components array' });
        }

        const appJsx = renderAppTemplate({ components });

        res.json({ success: true, appJsx });
    } catch (error) {
        console.error('[render-app] Error:', error);
        res.status(500).json({ error: error.message });
    }
}

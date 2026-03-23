import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase URL or Key missing. Check .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const componentEnrichment = [
    {
        component_id: 'hero.video.smokeinf.v1',
        visual_description: 'A full-viewport cinematic video hero featuring looped white-gray organic smoke drifting unpredictable on pure black. Non-directional, atmospheric, infinity-loop feel.',
        mood_tone: 'moody, cinematic, premium, mysterious, high-end',
        suitable_for: ['creative-agency', 'luxury-brand', 'portfolio', 'film-production', 'night-life'],
        not_suitable_for: ['children-education', 'medical', 'corporate-banking'],
        design_personality: 'editorial, minimalist',
        color_mode: 'dark'
    },
    {
        component_id: 'feature.code.integration.v1',
        visual_description: 'A developer-focused section with a code editor widget. Features syntax highlighting and deep purple atmospheric glows behind a glass container.',
        mood_tone: 'technical, clean, professional, efficient',
        suitable_for: ['saas', 'api-documentation', 'developer-tools', 'fintech'],
        not_suitable_for: ['lifestyle', 'fashion', 'restaurant'],
        design_personality: 'utilitarian, precision',
        color_mode: 'dark'
    },
    {
        component_id: 'footer.solar.v1',
        visual_description: 'A complex grid footer with a deep indigo/purple gradient arch at the bottom. Features link columns and a prominent contact email link with hover effects.',
        mood_tone: 'sophisticated, established, high-tech',
        suitable_for: ['enterprise', 'agency', 'tech-platform', 'solar-energy'],
        not_suitable_for: ['personal-blog', 'ultra-minimalist'],
        design_personality: 'comprehensive',
        color_mode: 'dark'
    },
    {
        component_id: 'scroll.reveal.solar.v1',
        visual_description: 'A sticky scroll-driven experience where text reveals character-by-character as a giant purple energy orb grows in the background.',
        mood_tone: 'philosophical, immersive, slow-paced',
        suitable_for: ['brand-storytelling', 'philosophy-sections', 'award-winning-portfolios'],
        not_suitable_for: ['e-commerce-listings', 'news-sites'],
        design_personality: 'experimental',
        color_mode: 'dark'
    },
    {
        component_id: 'navigation.island.v1',
        visual_description: 'A floating "island" style navbar with rounded pill shapes and glassmorphism. Compact and modern.',
        mood_tone: 'modern, light-weight, accessible',
        suitable_for: ['saas-landing-page', 'mobile-first-app', 'modern-agency'],
        not_suitable_for: ['traditional-law-firm', 'heavy-content-portals'],
        design_personality: 'minimalist',
        color_mode: 'adaptive'
    },
    {
        component_id: 'hero.unicorn.v1',
        visual_description: 'Interactive background with ultra-thin, wide-tracked editorial typography. Features smooth entrance animations and bespoke luxury feel.',
        mood_tone: 'bespoke, elite, artistic, luxury',
        suitable_for: ['fashion-brand', 'fine-art', 'luxury-architect', 'high-end-studio'],
        not_suitable_for: ['budget-travel', 'fast-food', 'utility-tools'],
        design_personality: 'luxury-editorial',
        color_mode: 'dark'
    },
    {
        component_id: 'work.showcase.solar.v1',
        visual_description: 'A list of project items with large hover-reveal images and sleek year/category badges.',
        mood_tone: 'organized, visual, confident',
        suitable_for: ['portfolio', 'case-studies', 'architectural-firm', 'design-studio'],
        not_suitable_for: ['dashboards', 'social-media-feeds'],
        design_personality: 'showcase',
        color_mode: 'dark'
    },
    {
        component_id: 'hero.solar.v1',
        visual_description: 'A clean hero with a soft purple radial arch emanating from the top. Features minimalist typography and a scroll hint.',
        mood_tone: 'clean, focused, optimistic',
        suitable_for: ['solar-energy', 'sustainability', 'clean-tech', 'corporate-main-page'],
        not_suitable_for: ['gaming', 'gritty-urban-brands'],
        design_personality: 'corporate-modern',
        color_mode: 'dark'
    },
    {
        component_id: 'pricing.minimal.v1',
        visual_description: 'Three-column pricing layout with clean typography and high-contrast primary buttons for the featured tier.',
        mood_tone: 'trustworthy, transparent, simple',
        suitable_for: ['saas', 'subscription-service', 'hosting'],
        not_suitable_for: ['one-off-luxury-items'],
        design_personality: 'functional',
        color_mode: 'dark'
    },
    {
        component_id: 'features.glowing.cards.v1',
        visual_description: 'Interactive grid of cards with multi-colored borders that glow and track the user\'s mouse movement.',
        mood_tone: 'energetic, futuristic, playful',
        suitable_for: ['gaming', 'crypto', 'cutting-edge-tech', 'event-promo'],
        not_suitable_for: ['funereal-services', 'government-portals'],
        design_personality: 'futuristic',
        color_mode: 'dark'
    },
    {
        component_id: 'hero.interaction.prism.v1',
        visual_description: 'Immersive background with a 3D geometric prism sculpture that wobbles and glows based on cursor input.',
        mood_tone: 'immersive, high-tech, cinematic',
        suitable_for: ['agency-hero', 'product-launch', 'creative-portfolio'],
        not_suitable_for: ['informational-text-heavy-sites'],
        design_personality: 'cinematic',
        color_mode: 'dark'
    },
    {
        component_id: 'hero.image.product.v1',
        visual_description: 'Product shot focused hero with a clean studio lighting feel and vast whitespace. Typography is tiny and anchored to corners.',
        mood_tone: 'boutique, editorial, premium',
        suitable_for: ['e-commerce', 'fashion', 'luxury-watch', 'bespoke-furniture'],
        not_suitable_for: ['heavy-industry', 'security-software'],
        design_personality: 'boutique-editorial',
        color_mode: 'light'
    },
    {
        component_id: 'nav.interaction.spotlight.v1',
        visual_description: 'A floating navbar with a beautiful spotlight effect that follows the mouse cursor across the links. Uses glassmorphic background.',
        mood_tone: 'interactive, modern, sleek',
        suitable_for: ['saas', 'modern-website', 'interactive-portfolio'],
        not_suitable_for: ['static-corporate-sites'],
        design_personality: 'modern',
        color_mode: 'adaptive'
    },
    {
        component_id: 'navigation.qyvora.v1',
        visual_description: 'A futuristic navigation bar with sharp geometric lines and glowing accent borders. High-tech feel.',
        mood_tone: 'futuristic, techno, sharp',
        suitable_for: ['gaming', 'crypto', 'high-tech-agency'],
        not_suitable_for: ['organic-brands', 'children-sites'],
        design_personality: 'futuristic',
        color_mode: 'dark'
    },
    {
        component_id: 'navigation.solar.v1',
        visual_description: 'A minimal, transparent navbar that becomes blurred on scroll. Features clean typography and a bold CTA button.',
        mood_tone: 'clean, professional, lightweight',
        suitable_for: ['enterprise', 'solar-energy', 'clean-tech'],
        not_suitable_for: ['chaotic-brands'],
        design_personality: 'minimalist',
        color_mode: 'dark'
    },
    {
        component_id: 'hero.animated.v1',
        visual_description: 'A text-switcher hero where the main headline rotates through multiple values with smooth slide-up animations.',
        mood_tone: 'dynamic, active, catchy',
        suitable_for: ['marketing-landing-page', 'saas-hero', 'creative-business'],
        not_suitable_for: ['pure-luxury-minimalism'],
        design_personality: 'dynamic',
        color_mode: 'dark'
    }
];

async function enrich() {
    console.log('[Enrichment] Starting metadata population...');

    for (const item of componentEnrichment) {
        const { component_id, ...metadata } = item;

        // Convert arrays to Supabase-friendly strings or JSON if needed
        // Based on user dump, suitable_for and not_suitable_for are strings or JSONB
        const updateData = {
            ...metadata,
            suitable_for: JSON.stringify(metadata.suitable_for),
            not_suitable_for: JSON.stringify(metadata.not_suitable_for),
            updated_at: new Date()
        };

        const { error } = await supabase
            .from('components')
            .update(updateData)
            .eq('component_id', component_id);

        if (error) {
            console.error(`[Error] Failed to update ${component_id}:`, error.message);
        } else {
            console.log(`[Success] Enriched ${component_id}`);
        }
    }

    console.log('[Enrichment] Done.');
}

enrich();

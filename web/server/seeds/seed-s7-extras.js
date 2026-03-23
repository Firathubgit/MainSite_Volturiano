// Phase S7 Seed — Part 3: Industry Verticals, Color Themes, Compatibility
import { supabaseAdmin } from '../lib/supabase-admin.js';
const sb = supabaseAdmin;

async function upsert(table, data, conflict = 'slug') {
    const { error } = await sb.from(table).upsert(data, { onConflict: conflict });
    if (error) console.error(`[${table}] Error:`, error.message);
    else console.log(`[${table}] ✅ Seeded ${data.length} rows`);
}

// ═══ D. 50+ INDUSTRY VERTICALS ═══
function iv(slug, name, desc, modes, themes, typo, anim, high, low, banned, acc, gdpr, hipaa) {
    return { slug, name, description: desc, preferred_color_modes: modes || ['dark'], preferred_color_themes: themes || [], preferred_typography: typo || ['modern-sans'], preferred_animation_level: anim || 'medium', high_priority_categories: high || [], low_priority_categories: low || [], banned_categories: banned || [], requires_accessibility: acc || false, requires_gdpr: gdpr || false, requires_hipaa: hipaa || false, is_active: true };
}
const verticals = [
    iv('tech-saas', 'Tech / SaaS', 'Technology and SaaS companies', ['dark'], ['midnight-tech', 'slate-pro'], ['modern-sans', 'mono-tech'], 'medium', ['hero', 'feature', 'pricing', 'cta', 'stats'], ['menu', 'booking'], []),
    iv('startup', 'Startup', 'Early-stage startups', ['dark'], ['gradient-aurora', 'midnight-tech'], ['modern-sans'], 'heavy', ['hero', 'feature', 'pricing', 'cta', 'countdown'], ['menu', 'booking'], []),
    iv('fintech', 'Fintech', 'Financial technology', ['dark'], ['electric-blue', 'arctic-frost'], ['modern-sans', 'mono-tech'], 'medium', ['hero', 'feature', 'stats', 'pricing', 'comparison'], ['gallery', 'menu'], [], true, true),
    iv('edtech', 'EdTech', 'Education technology', ['dark', 'light'], ['midnight-tech', 'clean-minimal'], ['modern-sans'], 'medium', ['hero', 'feature', 'pricing', 'video', 'auth'], ['menu', 'booking'], [], true),
    iv('healthcare', 'Healthcare', 'Medical practices and healthcare', ['light'], ['medical-clean', 'minty-fresh'], ['modern-sans'], 'subtle', ['hero', 'team', 'booking', 'testimonial', 'contact'], ['ecommerce', 'countdown'], [], true, true, true),
    iv('dental', 'Dental', 'Dental clinics and labs', ['light'], ['medical-clean', 'minty-fresh'], ['modern-sans'], 'subtle', ['hero', 'team', 'booking', 'gallery', 'contact'], ['ecommerce'], [], true, false, true),
    iv('veterinary', 'Veterinary', 'Animal healthcare', ['light'], ['warm-earth', 'pastel-soft'], ['modern-sans'], 'subtle', ['hero', 'team', 'booking', 'gallery', 'contact'], ['ecommerce'], []),
    iv('legal', 'Legal', 'Law firms and legal services', ['dark', 'light'], ['corporate-trust', 'ivory-classic'], ['serif'], 'subtle', ['hero', 'team', 'feature', 'testimonial', 'blog'], ['ecommerce', 'countdown'], []),
    iv('finance', 'Finance / Accounting', 'Financial services', ['light'], ['corporate-trust', 'arctic-frost'], ['modern-sans'], 'subtle', ['hero', 'feature', 'pricing', 'testimonial', 'stats'], ['gallery', 'menu'], [], true, true),
    iv('insurance', 'Insurance', 'Insurance companies', ['light'], ['corporate-trust', 'arctic-frost'], ['modern-sans'], 'subtle', ['hero', 'feature', 'pricing', 'comparison', 'faq'], ['gallery', 'menu'], [], true, true),
    iv('real-estate', 'Real Estate', 'Property and real estate', ['light', 'mixed'], ['clean-minimal', 'warm-earth'], ['modern-sans'], 'medium', ['hero', 'gallery', 'map', 'contact', 'pricing'], ['ecommerce'], []),
    iv('architecture', 'Architecture', 'Architecture firms', ['light'], ['terracotta', 'clean-minimal'], ['serif'], 'medium', ['hero', 'gallery', 'feature', 'process', 'team'], ['ecommerce', 'pricing'], []),
    iv('interior-design', 'Interior Design', 'Interior design studios', ['light'], ['terracotta', 'pastel-soft'], ['serif'], 'medium', ['hero', 'gallery', 'feature', 'process', 'testimonial'], ['ecommerce'], []),
    iv('construction', 'Construction', 'Construction and contracting', ['dark'], ['carbon-steel', 'luxury-noir'], ['modern-sans'], 'subtle', ['hero', 'gallery', 'feature', 'process', 'testimonial'], ['ecommerce'], []),
    iv('home-services', 'Home Services', 'Cleaning, HVAC, plumbing etc.', ['light'], ['clean-minimal', 'minty-fresh'], ['modern-sans'], 'subtle', ['hero', 'feature', 'pricing', 'process', 'contact'], ['ecommerce'], []),
    iv('automotive', 'Automotive', 'Auto dealers and repair', ['dark'], ['carbon-steel', 'luxury-noir'], ['modern-sans'], 'medium', ['hero', 'gallery', 'comparison', 'pricing', 'contact'], ['blog'], []),
    iv('restaurant', 'Restaurant / Café', 'Food service establishments', ['dark'], ['restaurant-warm', 'luxury-noir'], ['serif'], 'medium', ['hero', 'menu', 'gallery', 'booking', 'contact'], ['ecommerce', 'auth'], []),
    iv('hospitality', 'Hospitality / Hotel', 'Hotels and resorts', ['dark', 'mixed'], ['luxury-noir', 'restaurant-warm'], ['serif'], 'medium', ['hero', 'gallery', 'booking', 'feature', 'map'], ['auth'], []),
    iv('travel', 'Travel / Tourism', 'Travel agencies and tourism', ['light', 'mixed'], ['ocean-breeze', 'sunset-glow'], ['modern-sans'], 'medium', ['hero', 'gallery', 'pricing', 'map', 'blog'], ['auth'], []),
    iv('retail', 'Retail / E-Commerce', 'Online and physical retail', ['light'], ['clean-minimal', 'candy-pop'], ['modern-sans'], 'medium', ['hero', 'ecommerce', 'gallery', 'testimonial', 'newsletter'], ['booking'], []),
    iv('fashion', 'Fashion', 'Fashion brands and retailers', ['dark'], ['luxury-noir', 'rose-gold'], ['modern-sans'], 'heavy', ['hero', 'gallery', 'ecommerce', 'blog', 'social'], ['booking', 'faq'], []),
    iv('beauty', 'Beauty / Salon', 'Beauty and hair services', ['mixed'], ['lavender-dream', 'rose-gold'], ['modern-sans'], 'medium', ['hero', 'gallery', 'team', 'pricing', 'booking'], ['ecommerce'], []),
    iv('wellness', 'Wellness / Spa', 'Spa and wellness centers', ['light'], ['lavender-dream', 'pastel-soft'], ['serif'], 'subtle', ['hero', 'feature', 'pricing', 'booking', 'gallery'], ['ecommerce'], []),
    iv('fitness', 'Fitness / Gym', 'Gyms and fitness centers', ['dark'], ['blood-orange', 'carbon-steel'], ['modern-sans'], 'heavy', ['hero', 'pricing', 'team', 'gallery', 'booking'], ['ecommerce'], []),
    iv('pet-care', 'Pet Care', 'Pet grooming and services', ['light'], ['warm-earth', 'pastel-soft'], ['modern-sans'], 'medium', ['hero', 'feature', 'team', 'gallery', 'booking'], ['ecommerce'], []),
    iv('food-bev', 'Food / Beverage', 'Food and beverage companies', ['dark', 'light'], ['restaurant-warm', 'warm-earth'], ['serif'], 'medium', ['hero', 'menu', 'gallery', 'ecommerce', 'testimonial'], [], []),
    iv('non-profit', 'Non-Profit / Charity', 'Charitable organizations', ['light'], ['warm-earth', 'forest-green'], ['modern-sans'], 'subtle', ['hero', 'stats', 'cta', 'newsletter', 'gallery'], ['ecommerce', 'pricing'], [], true),
    iv('education', 'Education', 'Schools and educational institutions', ['light'], ['clean-minimal', 'ocean-breeze'], ['modern-sans'], 'subtle', ['hero', 'feature', 'team', 'pricing', 'blog'], ['ecommerce'], [], true),
    iv('media', 'Media / Publishing', 'News, magazines, and publishers', ['light', 'dark'], ['vintage-paper', 'clean-minimal'], ['serif'], 'subtle', ['hero', 'blog', 'newsletter', 'social', 'sidebar'], ['ecommerce', 'booking'], []),
    iv('entertainment', 'Entertainment', 'Entertainment venues', ['dark'], ['neon-nightlife', 'candy-pop'], ['modern-sans'], 'heavy', ['hero', 'gallery', 'video', 'pricing', 'booking'], ['blog'], []),
    iv('gaming', 'Gaming', 'Game studios and esports', ['dark'], ['neon-nightlife', 'cyber-punk'], ['mono-tech'], 'heavy', ['hero', 'gallery', 'video', 'social', 'blog'], ['booking', 'contact'], []),
    iv('music', 'Music', 'Musicians and music industry', ['dark'], ['neon-nightlife', 'deep-space'], ['modern-sans'], 'heavy', ['hero', 'gallery', 'video', 'social', 'timeline'], ['ecommerce'], []),
    iv('photography', 'Photography', 'Photographers and studios', ['dark'], ['sunset-glow', 'luxury-noir'], ['modern-sans'], 'medium', ['hero', 'gallery', 'contact', 'pricing', 'blog'], ['ecommerce'], []),
    iv('creative-agency', 'Creative Agency', 'Design and creative studios', ['dark'], ['gradient-aurora', 'luxury-noir'], ['modern-sans'], 'heavy', ['hero', 'gallery', 'feature', 'team', 'testimonial'], ['ecommerce'], []),
    iv('marketing-agency', 'Marketing Agency', 'Marketing and ad agencies', ['dark'], ['midnight-tech', 'gradient-aurora'], ['modern-sans'], 'heavy', ['hero', 'feature', 'stats', 'testimonial', 'pricing'], ['ecommerce'], []),
    iv('consulting', 'Consulting', 'Consulting firms', ['dark', 'light'], ['corporate-trust', 'slate-pro'], ['modern-sans'], 'subtle', ['hero', 'feature', 'team', 'process', 'testimonial'], ['ecommerce', 'gallery'], []),
    iv('hr-recruitment', 'HR / Recruitment', 'HR and staffing agencies', ['light'], ['corporate-trust', 'clean-minimal'], ['modern-sans'], 'subtle', ['hero', 'feature', 'table', 'auth', 'testimonial'], ['gallery'], []),
    iv('logistics', 'Logistics / Shipping', 'Logistics and supply chain', ['dark'], ['carbon-steel', 'slate-pro'], ['modern-sans'], 'subtle', ['hero', 'feature', 'process', 'stats', 'table'], ['gallery', 'booking'], []),
    iv('energy', 'Energy / Solar', 'Renewable energy companies', ['light', 'mixed'], ['forest-green', 'ocean-breeze'], ['modern-sans'], 'medium', ['hero', 'feature', 'stats', 'process', 'pricing'], ['ecommerce'], []),
    iv('political', 'Political', 'Political campaigns and orgs', ['light'], ['corporate-trust', 'blood-orange'], ['modern-sans'], 'medium', ['hero', 'team', 'stats', 'timeline', 'newsletter'], ['ecommerce'], []),
    iv('religious', 'Religious / Community', 'Churches and religious orgs', ['light'], ['warm-earth', 'ivory-classic'], ['serif'], 'subtle', ['hero', 'feature', 'team', 'timeline', 'blog'], ['ecommerce', 'pricing'], []),
    iv('childcare', 'Childcare', 'Daycare and childcare centers', ['light'], ['pastel-soft', 'candy-pop'], ['modern-sans'], 'subtle', ['hero', 'feature', 'team', 'gallery', 'pricing'], ['ecommerce'], [], true),
    iv('trades', 'Trades', 'Electricians, plumbers, etc.', ['light'], ['carbon-steel', 'clean-minimal'], ['modern-sans'], 'subtle', ['hero', 'feature', 'pricing', 'process', 'contact'], ['ecommerce'], []),
    iv('freelance', 'Freelance', 'Freelancers and independents', ['dark'], ['gradient-aurora', 'clean-minimal'], ['modern-sans'], 'medium', ['hero', 'gallery', 'feature', 'testimonial', 'contact'], ['ecommerce'], []),
    iv('personal', 'Personal / Portfolio', 'Personal websites', ['dark'], ['clean-minimal', 'gradient-aurora'], ['modern-sans'], 'medium', ['hero', 'gallery', 'timeline', 'contact', 'blog'], ['ecommerce', 'pricing'], []),
    iv('web3-crypto', 'Web3 / Crypto', 'Blockchain and cryptocurrency', ['dark'], ['cyber-punk', 'neon-nightlife'], ['mono-tech'], 'heavy', ['hero', 'feature', 'stats', 'comparison', 'faq'], ['booking', 'menu'], []),
    iv('science', 'Science / Research', 'Research and academic', ['light'], ['ocean-breeze', 'clean-minimal'], ['modern-sans'], 'subtle', ['hero', 'feature', 'blog', 'gallery', 'table'], ['ecommerce', 'pricing'], [], true),
    iv('government', 'Government', 'Government agencies', ['light'], ['corporate-trust', 'arctic-frost'], ['modern-sans'], 'none', ['hero', 'feature', 'blog', 'contact', 'faq'], ['ecommerce', 'pricing'], [], true, true),
    iv('agriculture', 'Agriculture', 'Farming and agriculture', ['light'], ['forest-green', 'warm-earth'], ['modern-sans'], 'subtle', ['hero', 'feature', 'gallery', 'process', 'contact'], ['auth'], []),
    iv('manufacturing', 'Manufacturing', 'Manufacturing companies', ['dark'], ['carbon-steel', 'slate-pro'], ['modern-sans'], 'subtle', ['hero', 'feature', 'process', 'stats', 'gallery'], ['booking'], []),
];

// ═══ E. 30 COLOR THEMES ═══
function ct(slug, name, desc, pal, mode, warmth, intensity, ind, types) {
    const cv = {}; const tc = {};
    for (const [k, v] of Object.entries(pal)) { cv[`--color-${k}`] = v; tc[k] = v; }
    return { slug, name, description: desc, palette: pal, css_variables: cv, tailwind_config: tc, mode, warmth, intensity, suitable_industries: ind || [], suitable_website_types: types || [], wcag_aa_compliant: true, is_active: true };
}
const themes = [
    ct('midnight-tech', 'Midnight Tech', 'Dark tech aesthetic', { primary: '#6366F1', secondary: '#8B5CF6', accent: '#22D3EE', background: '#0F172A', surface: '#1E293B', text: '#F8FAFC', muted: '#94A3B8' }, 'dark', 'cool', 'bold', ['tech', 'saas'], ['saas-landing', 'ai-ml-tool']),
    ct('warm-earth', 'Warm Earth', 'Organic warm tones', { primary: '#D97706', secondary: '#B45309', accent: '#059669', background: '#FFFBEB', surface: '#FEF3C7', text: '#1C1917', muted: '#78716C' }, 'light', 'warm', 'medium', ['non-profit', 'wellness'], ['non-profit', 'spa-wellness']),
    ct('corporate-trust', 'Corporate Trust', 'Professional and trustworthy', { primary: '#1D4ED8', secondary: '#1E40AF', accent: '#0891B2', background: '#F8FAFC', surface: '#FFFFFF', text: '#0F172A', muted: '#64748B' }, 'light', 'neutral', 'subtle', ['finance', 'legal'], ['law-firm', 'insurance']),
    ct('neon-nightlife', 'Neon Nightlife', 'Vibrant nightlife energy', { primary: '#F43F5E', secondary: '#EC4899', accent: '#A855F7', background: '#0A0A0A', surface: '#171717', text: '#FAFAFA', muted: '#A3A3A3' }, 'dark', 'vibrant', 'extreme', ['gaming', 'entertainment'], ['gaming-studio', 'escape-room']),
    ct('clean-minimal', 'Clean Minimal', 'Minimalist elegance', { primary: '#18181B', secondary: '#3F3F46', accent: '#2563EB', background: '#FFFFFF', surface: '#F4F4F5', text: '#18181B', muted: '#A1A1AA' }, 'light', 'neutral', 'subtle', ['personal', 'freelance'], ['portfolio', 'freelancer']),
    ct('luxury-noir', 'Luxury Noir', 'Premium dark luxury', { primary: '#D4AF37', secondary: '#B8860B', accent: '#F5F5DC', background: '#0A0A0A', surface: '#1A1A1A', text: '#FAFAF9', muted: '#A8A29E' }, 'dark', 'warm', 'bold', ['fashion', 'automotive'], ['fashion-brand', 'car-dealership']),
    ct('pastel-soft', 'Pastel Soft', 'Gentle pastels', { primary: '#F9A8D4', secondary: '#C4B5FD', accent: '#67E8F9', background: '#FEFCE8', surface: '#FFF7ED', text: '#1C1917', muted: '#A8A29E' }, 'light', 'warm', 'subtle', ['beauty', 'childcare'], ['beauty-salon', 'childcare']),
    ct('gradient-aurora', 'Gradient Aurora', 'Dynamic aurora gradients', { primary: '#8B5CF6', secondary: '#06B6D4', accent: '#F59E0B', background: '#030712', surface: '#111827', text: '#F9FAFB', muted: '#6B7280' }, 'dark', 'vibrant', 'bold', ['startup', 'creative-agency'], ['startup-mvp', 'agency-studio']),
    ct('medical-clean', 'Medical Clean', 'Clinical and clean', { primary: '#0EA5E9', secondary: '#0284C7', accent: '#10B981', background: '#F0F9FF', surface: '#FFFFFF', text: '#0C4A6E', muted: '#7DD3FC' }, 'light', 'cool', 'subtle', ['healthcare', 'dental'], ['doctor-medical', 'dental-clinic']),
    ct('restaurant-warm', 'Restaurant Warm', 'Warm dining ambiance', { primary: '#DC2626', secondary: '#991B1B', accent: '#F59E0B', background: '#1C1917', surface: '#292524', text: '#FAFAF9', muted: '#A8A29E' }, 'dark', 'warm', 'medium', ['restaurant', 'food-bev'], ['restaurant', 'bakery-cafe']),
    ct('ocean-breeze', 'Ocean Breeze', 'Coastal serenity', { primary: '#0891B2', secondary: '#0E7490', accent: '#06B6D4', background: '#ECFEFF', surface: '#FFFFFF', text: '#164E63', muted: '#67E8F9' }, 'light', 'cool', 'medium', ['travel', 'science'], ['hotel-resort', 'travel-agency']),
    ct('forest-green', 'Forest Green', 'Natural earth tones', { primary: '#16A34A', secondary: '#15803D', accent: '#84CC16', background: '#F0FDF4', surface: '#FFFFFF', text: '#14532D', muted: '#86EFAC' }, 'mixed', 'neutral', 'medium', ['energy', 'agriculture'], ['solar-energy']),
    ct('sunset-glow', 'Sunset Glow', 'Golden hour warmth', { primary: '#F97316', secondary: '#EA580C', accent: '#FBBF24', background: '#18181B', surface: '#27272A', text: '#FAFAFA', muted: '#A1A1AA' }, 'dark', 'warm', 'bold', ['photography'], ['photography', 'video-production']),
    ct('arctic-frost', 'Arctic Frost', 'Cool icy precision', { primary: '#3B82F6', secondary: '#2563EB', accent: '#93C5FD', background: '#EFF6FF', surface: '#FFFFFF', text: '#1E3A5F', muted: '#93C5FD' }, 'light', 'cool', 'subtle', ['finance', 'insurance'], ['accounting', 'insurance']),
    ct('cyber-punk', 'Cyber Punk', 'Neon cyber aesthetic', { primary: '#00FF41', secondary: '#39FF14', accent: '#FF00FF', background: '#0D0D0D', surface: '#1A1A2E', text: '#00FF41', muted: '#666666' }, 'dark', 'vibrant', 'extreme', ['web3-crypto', 'gaming'], ['crypto-web3', 'nft-marketplace']),
    ct('terracotta', 'Terracotta', 'Earthy terracotta warmth', { primary: '#C2410C', secondary: '#9A3412', accent: '#D97706', background: '#FFF7ED', surface: '#FFFFFF', text: '#431407', muted: '#FDBA74' }, 'light', 'warm', 'medium', ['architecture', 'interior-design'], ['interior-design', 'architecture']),
    ct('lavender-dream', 'Lavender Dream', 'Soft lavender calm', { primary: '#8B5CF6', secondary: '#7C3AED', accent: '#C4B5FD', background: '#FAF5FF', surface: '#FFFFFF', text: '#4C1D95', muted: '#C4B5FD' }, 'light', 'cool', 'subtle', ['wellness', 'beauty'], ['spa-wellness', 'yoga-meditation']),
    ct('carbon-steel', 'Carbon Steel', 'Industrial strength', { primary: '#6B7280', secondary: '#4B5563', accent: '#F59E0B', background: '#111827', surface: '#1F2937', text: '#F9FAFB', muted: '#6B7280' }, 'dark', 'neutral', 'medium', ['construction', 'manufacturing'], ['construction', 'auto-repair']),
    ct('candy-pop', 'Candy Pop', 'Playful vibrant colors', { primary: '#F43F5E', secondary: '#8B5CF6', accent: '#FBBF24', background: '#FFFBEB', surface: '#FFFFFF', text: '#18181B', muted: '#A1A1AA' }, 'light', 'vibrant', 'bold', ['entertainment', 'childcare'], ['escape-room', 'childcare']),
    ct('deep-space', 'Deep Space', 'Cosmic dark theme', { primary: '#818CF8', secondary: '#6366F1', accent: '#C084FC', background: '#020617', surface: '#0F172A', text: '#E2E8F0', muted: '#475569' }, 'dark', 'cool', 'bold', ['tech', 'music'], ['ai-ml-tool', 'music-band']),
    ct('vintage-paper', 'Vintage Paper', 'Classic paper texture', { primary: '#854D0E', secondary: '#713F12', accent: '#A16207', background: '#FEFCE8', surface: '#FEF9C3', text: '#422006', muted: '#CA8A04' }, 'light', 'warm', 'subtle', ['media'], ['blog-magazine', 'news-media']),
    ct('royal-gold', 'Royal Gold', 'Opulent gold accents', { primary: '#D4AF37', secondary: '#B8860B', accent: '#FFD700', background: '#0C0A09', surface: '#1C1917', text: '#FAFAF9', muted: '#78716C' }, 'dark', 'warm', 'bold', ['fashion'], ['fashion-brand']),
    ct('minty-fresh', 'Minty Fresh', 'Clean mint tones', { primary: '#10B981', secondary: '#059669', accent: '#34D399', background: '#ECFDF5', surface: '#FFFFFF', text: '#064E3B', muted: '#6EE7B7' }, 'light', 'cool', 'subtle', ['dental', 'healthcare'], ['dental-clinic', 'optometrist']),
    ct('blood-orange', 'Blood Orange', 'Bold orange energy', { primary: '#EA580C', secondary: '#C2410C', accent: '#FB923C', background: '#1C1917', surface: '#292524', text: '#FAFAF9', muted: '#A8A29E' }, 'dark', 'warm', 'bold', ['fitness'], ['fitness-gym', 'personal-trainer']),
    ct('slate-pro', 'Slate Pro', 'Professional dark slate', { primary: '#6366F1', secondary: '#4F46E5', accent: '#818CF8', background: '#0F172A', surface: '#1E293B', text: '#E2E8F0', muted: '#64748B' }, 'dark', 'neutral', 'medium', ['tech', 'consulting'], ['analytics-dashboard', 'crm']),
    ct('cherry-blossom', 'Cherry Blossom', 'Delicate pink florals', { primary: '#EC4899', secondary: '#DB2777', accent: '#F9A8D4', background: '#FDF2F8', surface: '#FFFFFF', text: '#831843', muted: '#F9A8D4' }, 'light', 'warm', 'subtle', ['beauty'], ['beauty-salon', 'florist']),
    ct('electric-blue', 'Electric Blue', 'High-energy blue', { primary: '#2563EB', secondary: '#1D4ED8', accent: '#60A5FA', background: '#0F172A', surface: '#1E293B', text: '#F0F9FF', muted: '#64748B' }, 'dark', 'cool', 'bold', ['fintech', 'automotive'], ['fintech', 'car-dealership']),
    ct('rose-gold', 'Rose Gold', 'Elegant rose gold', { primary: '#BE185D', secondary: '#9D174D', accent: '#F9A8D4', background: '#1C1917', surface: '#292524', text: '#FDF2F8', muted: '#A8A29E' }, 'mixed', 'warm', 'medium', ['beauty', 'fashion'], ['wedding', 'fashion-brand']),
    ct('matrix-green', 'Matrix Green', 'Hacker/dev aesthetic', { primary: '#22C55E', secondary: '#16A34A', accent: '#4ADE80', background: '#030712', surface: '#111827', text: '#22C55E', muted: '#374151' }, 'dark', 'cool', 'bold', ['tech'], ['tech-docs', 'api-product']),
    ct('ivory-classic', 'Ivory Classic', 'Timeless ivory elegance', { primary: '#1E3A5F', secondary: '#1E40AF', accent: '#D4AF37', background: '#FAFAF9', surface: '#FFFFFF', text: '#1C1917', muted: '#A8A29E' }, 'light', 'neutral', 'subtle', ['legal', 'consulting'], ['law-firm', 'consulting']),
];

// ═══ F. COMPONENT COMPATIBILITY ═══
const compat = [
    ['hero', 'header', 'perfect-pair', 1.0, 'Hero and header always go together'],
    ['hero', 'hero', 'incompatible', 0.0, 'Never use two heroes'],
    ['footer', 'footer', 'incompatible', 0.0, 'Never use two footers'],
    ['header', 'header', 'incompatible', 0.0, 'Never use two headers'],
    ['header', 'footer', 'perfect-pair', 1.0, 'Every site needs both'],
    ['hero', 'footer', 'perfect-pair', 1.0, 'Standard site structure'],
    ['pricing', 'faq', 'complementary', 0.8, 'FAQ answers pricing questions'],
    ['pricing', 'testimonial', 'perfect-pair', 0.9, 'Social proof near pricing converts'],
    ['pricing', 'cta', 'complementary', 0.7, 'CTA reinforces pricing decisions'],
    ['pricing', 'comparison', 'perfect-pair', 0.9, 'Comparison helps pricing decisions'],
    ['hero', 'feature', 'perfect-pair', 0.9, 'Features follow heroes naturally'],
    ['hero', 'logos', 'complementary', 0.7, 'Trust signals after hero'],
    ['feature', 'testimonial', 'complementary', 0.8, 'Social proof validates features'],
    ['feature', 'cta', 'complementary', 0.7, 'CTA after features'],
    ['feature', 'stats', 'complementary', 0.7, 'Stats back up features'],
    ['gallery', 'testimonial', 'complementary', 0.6, 'Visual proof near social proof'],
    ['gallery', 'cta', 'complementary', 0.6, 'CTA after visual showcase'],
    ['testimonial', 'cta', 'complementary', 0.8, 'CTA after social proof converts'],
    ['testimonial', 'logos', 'complementary', 0.7, 'Multiple trust signals'],
    ['blog', 'newsletter', 'perfect-pair', 0.9, 'Newsletter captures blog readers'],
    ['blog', 'sidebar', 'complementary', 0.7, 'Sidebar navigation for blogs'],
    ['contact', 'map', 'perfect-pair', 0.9, 'Map shows contact location'],
    ['contact', 'faq', 'complementary', 0.6, 'FAQ reduces contact volume'],
    ['team', 'testimonial', 'complementary', 0.7, 'People trust people'],
    ['process', 'cta', 'complementary', 0.7, 'CTA after explaining process'],
    ['countdown', 'cta', 'perfect-pair', 0.9, 'Urgency drives action'],
    ['countdown', 'hero', 'complementary', 0.7, 'Countdown in hero section'],
    ['auth', 'onboarding', 'perfect-pair', 0.9, 'Onboarding follows auth'],
    ['auth', 'application', 'perfect-pair', 0.9, 'Auth gates app access'],
    ['application', 'sidebar', 'perfect-pair', 0.9, 'App shells need sidebars'],
    ['application', 'dashboard-widget', 'perfect-pair', 0.9, 'Dashboards in app shells'],
    ['application', 'modal', 'complementary', 0.7, 'Apps use modals'],
    ['application', 'notification', 'complementary', 0.7, 'Apps show notifications'],
    ['sidebar', 'table', 'complementary', 0.7, 'Sidebar filters tables'],
    ['table', 'modal', 'complementary', 0.6, 'Modals for table row details'],
    ['ecommerce', 'gallery', 'complementary', 0.7, 'Product galleries'],
    ['ecommerce', 'testimonial', 'complementary', 0.7, 'Reviews boost sales'],
    ['ecommerce', 'cta', 'complementary', 0.7, 'Buy now CTAs'],
    ['menu', 'booking', 'perfect-pair', 0.9, 'View menu then book'],
    ['menu', 'gallery', 'complementary', 0.7, 'Food photos with menu'],
    ['booking', 'contact', 'complementary', 0.6, 'Contact if booking issues'],
    ['booking', 'map', 'complementary', 0.7, 'Location for booking'],
    ['video', 'hero', 'complementary', 0.8, 'Video hero sections'],
    ['video', 'gallery', 'complementary', 0.7, 'Video in media galleries'],
    ['social', 'newsletter', 'complementary', 0.6, 'Multiple engagement channels'],
    ['stats', 'logos', 'complementary', 0.6, 'Numbers and brand trust'],
    ['comparison', 'pricing', 'perfect-pair', 0.9, 'Compare then price'],
    ['banner', 'header', 'complementary', 0.7, 'Banners above headers'],
    ['changelog', 'newsletter', 'complementary', 0.6, 'Subscribe to updates'],
    ['error', 'header', 'complementary', 0.5, 'Error pages need navigation'],
].map(([a, b, rel, score, notes]) => ({
    component_a_id: a, component_b_id: b, compatibility_score: score, relationship: rel, notes
}));

export async function seedVerticals() {
    console.log('\n═══ SEEDING INDUSTRY VERTICALS ═══');
    await upsert('industry_verticals', verticals);
}

export async function seedThemes() {
    console.log('\n═══ SEEDING COLOR THEMES ═══');
    await upsert('color_themes', themes);
}

export async function seedCompatibility() {
    console.log('\n═══ SEEDING COMPATIBILITY ═══');
    // Compatibility uses composite unique, not slug
    const { error } = await sb.from('component_compatibility').upsert(compat, { onConflict: 'component_a_id,component_b_id' });
    if (error) console.error('[compatibility] Error:', error.message);
    else console.log(`[compatibility] ✅ Seeded ${compat.length} pairs`);
}

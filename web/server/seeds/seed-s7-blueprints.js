// Phase S7 Seed — Part 2: Blueprints, Verticals, Themes, Compatibility
// This is imported and called by seed-s7-taxonomy.js
import { supabaseAdmin } from '../lib/supabase-admin.js';
const sb = supabaseAdmin;

async function upsert(table, data) {
    const { error } = await sb.from(table).upsert(data, { onConflict: 'slug' });
    if (error) console.error(`[${table}] Error:`, error.message);
    else console.log(`[${table}] ✅ Seeded ${data.length} rows`);
}

// ═══ C. 100 WEBSITE TYPE BLUEPRINTS ═══
function bp(slug, name, req, opt, count, mode, typo, industries, keywords, layout) {
    return { slug, name, description: `${name} blueprint`, required_categories: req, optional_categories: opt || [], recommended_component_count: count || 6, min_components: 4, max_components: 12, default_color_mode: mode || 'dark', default_typography: typo || 'modern-sans', primary_industries: industries || [], prompt_keywords: keywords || [], example_prompts: [`Build me a ${name.toLowerCase()}`], component_layout_order: layout || req, is_active: true };
}

const blueprints = [
    bp('saas-landing', 'SaaS Landing Page', ['hero', 'header', 'feature', 'pricing', 'testimonial', 'faq', 'cta', 'footer'], ['logos', 'stats'], 8, 'dark', 'modern-sans', ['tech', 'saas'], ['saas', 'software', 'platform', 'subscription', 'app']),
    bp('portfolio', 'Portfolio / Personal Site', ['hero', 'header', 'gallery', 'team', 'contact', 'footer'], ['blog'], 6, 'dark', 'modern-sans', ['creative', 'personal'], ['portfolio', 'personal', 'work', 'showcase']),
    bp('ecommerce-store', 'E-Commerce Store', ['header', 'hero', 'ecommerce', 'footer'], ['newsletter', 'testimonial'], 8, 'light', 'modern-sans', ['retail'], ['shop', 'store', 'ecommerce', 'products', 'buy']),
    bp('agency-studio', 'Agency / Studio Website', ['hero', 'header', 'feature', 'gallery', 'team', 'testimonial', 'contact', 'pricing', 'footer'], [], 8, 'dark', 'modern-sans', ['creative'], ['agency', 'studio', 'design', 'creative']),
    bp('blog-magazine', 'Blog / Magazine', ['header', 'hero', 'blog', 'newsletter', 'sidebar', 'footer'], ['social'], 6, 'light', 'serif', ['media'], ['blog', 'magazine', 'articles', 'news', 'content']),
    bp('restaurant', 'Restaurant / Food Service', ['hero', 'menu', 'gallery', 'booking', 'contact', 'map', 'testimonial', 'footer'], [], 7, 'dark', 'modern-sans', ['hospitality'], ['restaurant', 'food', 'dining', 'menu', 'reservation']),
    bp('real-estate', 'Real Estate Listing', ['hero', 'gallery', 'map', 'contact', 'feature', 'pricing', 'comparison', 'footer'], [], 7, 'light', 'modern-sans', ['real-estate'], ['real estate', 'property', 'listing', 'homes', 'apartment']),
    bp('startup-mvp', 'Startup MVP Landing', ['hero', 'header', 'feature', 'pricing', 'cta', 'testimonial', 'faq', 'footer'], ['countdown'], 7, 'dark', 'modern-sans', ['tech', 'startup'], ['startup', 'mvp', 'launch', 'product']),
    bp('admin-dashboard', 'Admin Dashboard', ['application', 'dashboard-widget', 'sidebar', 'table', 'modal', 'notification', 'auth'], [], 7, 'dark', 'mono-tech', ['enterprise'], ['admin', 'dashboard', 'panel', 'management']),
    bp('doctor-medical', 'Doctor / Medical Practice', ['hero', 'header', 'team', 'booking', 'contact', 'testimonial', 'faq', 'map', 'footer'], [], 7, 'light', 'modern-sans', ['healthcare'], ['doctor', 'medical', 'clinic', 'health', 'patient']),
    bp('fitness-gym', 'Fitness / Gym', ['hero', 'pricing', 'team', 'gallery', 'booking', 'testimonial', 'cta', 'contact', 'footer'], [], 7, 'dark', 'modern-sans', ['fitness'], ['fitness', 'gym', 'workout', 'training', 'exercise']),
    bp('law-firm', 'Law Firm', ['hero', 'header', 'team', 'feature', 'testimonial', 'contact', 'blog', 'faq', 'footer'], [], 7, 'dark', 'serif', ['legal'], ['lawyer', 'law firm', 'attorney', 'legal', 'counsel']),
    bp('non-profit', 'Non-Profit / Charity', ['hero', 'stats', 'gallery', 'team', 'cta', 'newsletter', 'blog', 'contact', 'footer'], [], 7, 'light', 'modern-sans', ['non-profit'], ['charity', 'non-profit', 'donate', 'foundation', 'cause']),
    bp('event-conference', 'Event / Conference', ['hero', 'countdown', 'feature', 'team', 'pricing', 'booking', 'gallery', 'map', 'footer'], [], 8, 'dark', 'modern-sans', ['events'], ['event', 'conference', 'summit', 'meetup', 'seminar']),
    bp('online-course', 'Online Course / EdTech', ['hero', 'feature', 'pricing', 'testimonial', 'faq', 'video', 'cta', 'footer'], ['auth'], 7, 'dark', 'modern-sans', ['education'], ['course', 'learn', 'edtech', 'online learning', 'tutorial']),
    bp('crypto-web3', 'Crypto / Web3', ['hero', 'feature', 'stats', 'pricing', 'comparison', 'faq', 'cta', 'footer'], [], 7, 'dark', 'mono-tech', ['fintech', 'web3'], ['crypto', 'web3', 'blockchain', 'defi', 'token']),
    bp('ai-ml-tool', 'AI / ML Tool', ['hero', 'feature', 'pricing', 'video', 'comparison', 'stats', 'faq', 'footer'], [], 7, 'dark', 'mono-tech', ['tech'], ['ai', 'machine learning', 'ml', 'artificial intelligence', 'gpt']),
    bp('mobile-app-landing', 'Mobile App Landing', ['hero', 'feature', 'gallery', 'pricing', 'testimonial', 'cta', 'footer'], [], 6, 'dark', 'modern-sans', ['tech'], ['app', 'mobile', 'ios', 'android', 'download']),
    bp('wedding', 'Wedding / Event Personal', ['hero', 'gallery', 'timeline', 'countdown', 'map', 'contact', 'footer'], [], 6, 'light', 'serif', ['personal'], ['wedding', 'marriage', 'ceremony', 'celebration']),
    bp('dental-clinic', 'Dental Clinic', ['hero', 'team', 'booking', 'feature', 'testimonial', 'gallery', 'contact', 'map', 'footer'], [], 7, 'light', 'modern-sans', ['dental'], ['dentist', 'dental', 'teeth', 'orthodontist']),
    bp('construction', 'Construction / Contractor', ['hero', 'feature', 'gallery', 'process', 'testimonial', 'contact', 'map', 'footer'], [], 7, 'dark', 'modern-sans', ['construction'], ['construction', 'contractor', 'building', 'renovation']),
    bp('photography', 'Photography Portfolio', ['hero', 'gallery', 'contact', 'pricing', 'blog', 'footer'], ['team'], 6, 'dark', 'modern-sans', ['creative'], ['photography', 'photographer', 'photos', 'shoots']),
    bp('music-band', 'Music / Band', ['hero', 'gallery', 'video', 'social', 'timeline', 'contact', 'footer'], [], 6, 'dark', 'modern-sans', ['entertainment'], ['band', 'music', 'musician', 'artist', 'album']),
    bp('church', 'Church / Religious Org', ['hero', 'feature', 'team', 'timeline', 'blog', 'newsletter', 'contact', 'map', 'footer'], [], 7, 'light', 'serif', ['religious'], ['church', 'faith', 'ministry', 'worship', 'community']),
    bp('accounting', 'Accounting / Finance', ['hero', 'feature', 'team', 'pricing', 'testimonial', 'faq', 'contact', 'footer'], [], 7, 'light', 'modern-sans', ['finance'], ['accounting', 'finance', 'tax', 'bookkeeping', 'cpa']),
    bp('beauty-salon', 'Hair / Beauty Salon', ['hero', 'gallery', 'team', 'pricing', 'booking', 'testimonial', 'contact', 'map', 'footer'], [], 8, 'dark', 'modern-sans', ['beauty'], ['salon', 'beauty', 'hair', 'spa', 'nails']),
    bp('car-dealership', 'Car Dealership', ['hero', 'gallery', 'comparison', 'pricing', 'contact', 'map', 'testimonial', 'footer'], [], 7, 'dark', 'modern-sans', ['automotive'], ['cars', 'dealership', 'auto', 'vehicles']),
    bp('travel-agency', 'Travel Agency', ['hero', 'gallery', 'feature', 'pricing', 'testimonial', 'blog', 'map', 'footer'], [], 7, 'light', 'modern-sans', ['travel'], ['travel', 'vacation', 'tours', 'flights', 'booking']),
    bp('hotel-resort', 'Hotel / Resort', ['hero', 'gallery', 'booking', 'feature', 'map', 'testimonial', 'pricing', 'footer'], [], 7, 'dark', 'serif', ['hospitality'], ['hotel', 'resort', 'accommodation', 'rooms', 'stay']),
    bp('insurance', 'Insurance Company', ['hero', 'feature', 'pricing', 'comparison', 'faq', 'testimonial', 'contact', 'footer'], [], 7, 'light', 'modern-sans', ['insurance'], ['insurance', 'coverage', 'policy', 'claims', 'quote']),
    bp('consulting', 'Consulting Firm', ['hero', 'feature', 'team', 'process', 'testimonial', 'blog', 'pricing', 'footer'], [], 7, 'dark', 'modern-sans', ['consulting'], ['consulting', 'consultant', 'strategy', 'advisory']),
    bp('marketing-agency', 'Marketing Agency', ['hero', 'feature', 'stats', 'gallery', 'testimonial', 'team', 'pricing', 'blog', 'footer'], [], 8, 'dark', 'modern-sans', ['marketing'], ['marketing', 'digital marketing', 'seo', 'advertising']),
    bp('interior-design', 'Interior Design', ['hero', 'gallery', 'feature', 'process', 'testimonial', 'contact', 'footer'], [], 6, 'light', 'serif', ['design'], ['interior design', 'decoration', 'home design', 'architecture']),
    bp('pet-services', 'Pet Services', ['hero', 'feature', 'team', 'gallery', 'booking', 'testimonial', 'pricing', 'contact', 'footer'], [], 8, 'light', 'modern-sans', ['pet-care'], ['pet', 'grooming', 'vet', 'dog', 'cat']),
    bp('food-delivery', 'Food Delivery App', ['hero', 'feature', 'ecommerce', 'pricing', 'testimonial', 'cta', 'footer', 'menu'], [], 7, 'dark', 'modern-sans', ['food-tech'], ['food delivery', 'order', 'takeout', 'delivery app']),
    bp('podcast', 'Podcast Website', ['hero', 'video', 'blog', 'newsletter', 'social', 'team', 'contact', 'footer'], [], 7, 'dark', 'modern-sans', ['media'], ['podcast', 'episodes', 'listen', 'audio', 'show']),
    bp('job-board', 'Job Board / Careers', ['hero', 'table', 'auth', 'footer'], ['sidebar'], 5, 'light', 'modern-sans', ['hr'], ['jobs', 'careers', 'hiring', 'recruitment', 'job board']),
    bp('marketplace', 'Online Marketplace', ['header', 'hero', 'ecommerce', 'auth', 'dashboard-widget', 'footer'], ['sidebar'], 7, 'light', 'modern-sans', ['marketplace'], ['marketplace', 'buy', 'sell', 'vendors', 'platform']),
    bp('coworking', 'Coworking Space', ['hero', 'feature', 'pricing', 'gallery', 'booking', 'map', 'testimonial', 'cta', 'footer'], [], 8, 'dark', 'modern-sans', ['real-estate'], ['coworking', 'office', 'workspace', 'shared office']),
    bp('cleaning', 'Cleaning Service', ['hero', 'feature', 'pricing', 'booking', 'testimonial', 'process', 'contact', 'footer'], [], 7, 'light', 'modern-sans', ['home-services'], ['cleaning', 'maid', 'housekeeping', 'janitorial']),
    bp('solar-energy', 'Solar / Energy Company', ['hero', 'feature', 'stats', 'process', 'pricing', 'testimonial', 'contact', 'map', 'footer'], [], 8, 'light', 'modern-sans', ['energy'], ['solar', 'energy', 'renewable', 'panels', 'green']),
    bp('political', 'Political Campaign', ['hero', 'team', 'stats', 'timeline', 'newsletter', 'blog', 'social', 'cta', 'footer'], [], 8, 'light', 'modern-sans', ['political'], ['campaign', 'election', 'vote', 'political', 'candidate']),
    bp('e-learning', 'E-Learning Platform', ['hero', 'feature', 'pricing', 'auth', 'application', 'video', 'dashboard-widget', 'footer'], [], 7, 'dark', 'modern-sans', ['education'], ['e-learning', 'courses', 'lms', 'training', 'online class']),
    bp('social-network', 'Social Network', ['auth', 'application', 'sidebar', 'social', 'notification', 'modal', 'dashboard-widget'], [], 7, 'dark', 'modern-sans', ['tech'], ['social network', 'community', 'profiles', 'connect']),
    bp('crm', 'CRM / Sales Tool', ['application', 'sidebar', 'table', 'dashboard-widget', 'modal', 'auth', 'notification'], [], 7, 'dark', 'mono-tech', ['enterprise'], ['crm', 'sales', 'leads', 'pipeline', 'customers']),
    bp('project-management', 'Project Management', ['application', 'sidebar', 'table', 'dashboard-widget', 'modal', 'auth'], [], 6, 'dark', 'mono-tech', ['enterprise'], ['project management', 'tasks', 'kanban', 'sprints']),
    bp('analytics-dashboard', 'Analytics Dashboard', ['application', 'dashboard-widget', 'sidebar', 'table', 'auth', 'notification'], [], 6, 'dark', 'mono-tech', ['data'], ['analytics', 'dashboard', 'charts', 'metrics', 'data']),
    bp('email-marketing', 'Email Marketing', ['application', 'dashboard-widget', 'table', 'auth', 'modal', 'notification', 'stats'], [], 7, 'dark', 'modern-sans', ['marketing'], ['email marketing', 'campaigns', 'newsletter', 'automation']),
    bp('veterinary', 'Veterinary Clinic', ['hero', 'team', 'booking', 'feature', 'gallery', 'testimonial', 'contact', 'map', 'footer'], [], 8, 'light', 'modern-sans', ['healthcare'], ['vet', 'veterinary', 'animal', 'pet clinic']),
    bp('architecture', 'Architecture Firm', ['hero', 'gallery', 'feature', 'process', 'team', 'testimonial', 'contact', 'footer'], [], 7, 'light', 'serif', ['architecture'], ['architecture', 'architect', 'buildings', 'design']),
];

const blueprints2 = [
    bp('logistics', 'Logistics / Shipping', ['hero', 'feature', 'process', 'stats', 'pricing', 'table', 'contact', 'footer'], [], 7, 'dark', 'modern-sans', ['logistics'], ['logistics', 'shipping', 'freight', 'supply chain']),
    bp('recruitment', 'Recruitment Agency', ['hero', 'feature', 'table', 'auth', 'testimonial', 'contact', 'footer'], [], 6, 'light', 'modern-sans', ['hr'], ['recruitment', 'staffing', 'hiring', 'talent', 'headhunter']),
    bp('wine-brewery', 'Wine / Brewery', ['hero', 'gallery', 'menu', 'ecommerce', 'booking', 'timeline', 'footer'], [], 6, 'dark', 'serif', ['beverage'], ['wine', 'brewery', 'beer', 'vineyard', 'winery']),
    bp('spa-wellness', 'Spa / Wellness', ['hero', 'feature', 'pricing', 'gallery', 'booking', 'team', 'testimonial', 'contact', 'footer'], [], 8, 'light', 'serif', ['wellness'], ['spa', 'wellness', 'massage', 'relaxation']),
    bp('childcare', 'Childcare / Daycare', ['hero', 'feature', 'team', 'gallery', 'pricing', 'testimonial', 'contact', 'map', 'footer'], [], 8, 'light', 'modern-sans', ['childcare'], ['childcare', 'daycare', 'nursery', 'preschool']),
    bp('tutoring', 'Tutoring Service', ['hero', 'feature', 'team', 'pricing', 'booking', 'testimonial', 'faq', 'contact', 'footer'], [], 8, 'light', 'modern-sans', ['education'], ['tutor', 'tutoring', 'academic', 'lessons']),
    bp('moving-company', 'Moving Company', ['hero', 'feature', 'pricing', 'process', 'testimonial', 'contact', 'map', 'footer'], [], 7, 'dark', 'modern-sans', ['home-services'], ['moving', 'movers', 'relocation', 'packing']),
    bp('florist', 'Florist', ['hero', 'gallery', 'ecommerce', 'booking', 'contact', 'map', 'footer'], [], 6, 'light', 'serif', ['retail'], ['florist', 'flowers', 'bouquet', 'floral', 'arrangements']),
    bp('fashion-brand', 'Fashion Brand', ['hero', 'gallery', 'ecommerce', 'blog', 'social', 'newsletter', 'footer'], [], 6, 'dark', 'modern-sans', ['fashion'], ['fashion', 'clothing', 'apparel', 'designer', 'style']),
    bp('tech-docs', 'Tech Documentation', ['header', 'sidebar', 'blog', 'footer'], ['table', 'changelog'], 5, 'dark', 'mono-tech', ['tech'], ['documentation', 'docs', 'technical', 'reference', 'api docs']),
    bp('api-product', 'API Product Page', ['hero', 'feature', 'pricing', 'integrations', 'changelog', 'blog', 'footer'], [], 6, 'dark', 'mono-tech', ['tech'], ['api', 'developer', 'integration', 'endpoint', 'sdk']),
    bp('fintech', 'Fintech App', ['hero', 'feature', 'stats', 'pricing', 'comparison', 'faq', 'auth', 'footer'], [], 7, 'dark', 'modern-sans', ['fintech'], ['fintech', 'banking', 'payments', 'financial', 'money']),
    bp('nft-marketplace', 'NFT Marketplace', ['hero', 'gallery', 'ecommerce', 'auth', 'dashboard-widget', 'stats', 'footer'], [], 7, 'dark', 'mono-tech', ['web3'], ['nft', 'marketplace', 'digital art', 'collectible', 'mint']),
    bp('podcast-network', 'Podcast Network', ['hero', 'video', 'blog', 'team', 'newsletter', 'social', 'gallery', 'footer'], [], 7, 'dark', 'modern-sans', ['media'], ['podcast network', 'shows', 'episodes', 'audio']),
    bp('news-media', 'News / Media Outlet', ['header', 'hero', 'blog', 'sidebar', 'newsletter', 'social', 'footer'], [], 6, 'light', 'serif', ['media'], ['news', 'media', 'journalism', 'breaking news', 'press']),
    bp('gaming-studio', 'Gaming Studio', ['hero', 'gallery', 'video', 'team', 'blog', 'social', 'footer'], [], 6, 'dark', 'modern-sans', ['gaming'], ['gaming', 'game studio', 'video games', 'indie', 'esports']),
    bp('bakery-cafe', 'Bakery / Café', ['hero', 'menu', 'gallery', 'booking', 'testimonial', 'contact', 'map', 'footer'], [], 7, 'light', 'serif', ['food'], ['bakery', 'cafe', 'coffee', 'pastry', 'brunch']),
    bp('yoga-meditation', 'Yoga / Meditation', ['hero', 'feature', 'pricing', 'booking', 'team', 'gallery', 'testimonial', 'footer'], [], 7, 'light', 'serif', ['wellness'], ['yoga', 'meditation', 'mindfulness', 'wellness']),
    bp('electrician', 'Electrician / Plumber', ['hero', 'feature', 'pricing', 'testimonial', 'process', 'contact', 'map', 'footer'], [], 7, 'light', 'modern-sans', ['trades'], ['electrician', 'plumber', 'electrical', 'plumbing']),
    bp('landscaping', 'Landscaping', ['hero', 'gallery', 'feature', 'pricing', 'testimonial', 'process', 'contact', 'footer'], [], 7, 'light', 'modern-sans', ['home-services'], ['landscaping', 'lawn', 'garden', 'outdoor']),
    bp('pitch-deck', 'Startup Pitch Deck', ['hero', 'stats', 'feature', 'team', 'timeline', 'pricing', 'cta', 'footer'], [], 7, 'dark', 'modern-sans', ['startup'], ['pitch deck', 'investors', 'fundraise', 'startup pitch']),
    bp('resume-cv', 'Resume / CV Website', ['hero', 'timeline', 'feature', 'stats', 'gallery', 'contact', 'footer'], [], 6, 'dark', 'modern-sans', ['personal'], ['resume', 'cv', 'curriculum vitae', 'career']),
    bp('saas-changelog', 'SaaS Changelog', ['header', 'changelog', 'newsletter', 'footer'], [], 4, 'dark', 'mono-tech', ['tech'], ['changelog', 'updates', 'release notes', 'versions']),
    bp('docs-wiki', 'Documentation Wiki', ['header', 'sidebar', 'blog', 'footer'], [], 4, 'dark', 'mono-tech', ['tech'], ['wiki', 'documentation', 'knowledge base', 'help center']),
    bp('freelancer', 'Freelancer Portfolio', ['hero', 'gallery', 'feature', 'testimonial', 'pricing', 'contact', 'footer'], [], 6, 'dark', 'modern-sans', ['freelance'], ['freelancer', 'freelance', 'independent', 'contractor']),
    bp('vc-firm', 'Investment / VC Firm', ['hero', 'feature', 'team', 'stats', 'gallery', 'blog', 'contact', 'footer'], [], 7, 'dark', 'serif', ['finance'], ['venture capital', 'investment', 'vc', 'fund', 'portfolio']),
    bp('property-mgmt', 'Property Management', ['hero', 'gallery', 'feature', 'pricing', 'contact', 'map', 'table', 'footer'], [], 7, 'light', 'modern-sans', ['real-estate'], ['property management', 'rentals', 'tenant', 'landlord']),
    bp('dental-lab', 'Dental Lab', ['hero', 'feature', 'gallery', 'process', 'team', 'contact', 'footer'], [], 6, 'light', 'modern-sans', ['healthcare'], ['dental lab', 'prosthetics', 'crowns', 'dental tech']),
    bp('taxi-ride', 'Taxi / Ride Service', ['hero', 'feature', 'pricing', 'booking', 'map', 'testimonial', 'cta', 'footer'], [], 7, 'dark', 'modern-sans', ['transport'], ['taxi', 'ride', 'cab', 'uber', 'lyft']),
    bp('towing', 'Towing Service', ['hero', 'feature', 'pricing', 'process', 'contact', 'map', 'cta', 'footer'], [], 7, 'dark', 'modern-sans', ['automotive'], ['towing', 'roadside', 'breakdown', 'tow truck']),
    bp('roofing', 'Roofing Company', ['hero', 'gallery', 'feature', 'pricing', 'testimonial', 'process', 'contact', 'footer'], [], 7, 'dark', 'modern-sans', ['construction'], ['roofing', 'roof', 'shingles', 'gutters']),
    bp('hvac', 'HVAC Service', ['hero', 'feature', 'pricing', 'process', 'testimonial', 'contact', 'map', 'footer'], [], 7, 'light', 'modern-sans', ['home-services'], ['hvac', 'heating', 'cooling', 'air conditioning']),
    bp('pest-control', 'Pest Control', ['hero', 'feature', 'pricing', 'process', 'testimonial', 'contact', 'cta', 'footer'], [], 7, 'light', 'modern-sans', ['home-services'], ['pest control', 'exterminator', 'bugs', 'rodents']),
    bp('printing', 'Printing Service', ['hero', 'feature', 'gallery', 'pricing', 'ecommerce', 'process', 'contact', 'footer'], [], 7, 'light', 'modern-sans', ['print'], ['printing', 'print shop', 'business cards', 'flyers']),
    bp('optometrist', 'Optometrist / Eye Clinic', ['hero', 'team', 'feature', 'booking', 'gallery', 'testimonial', 'contact', 'footer'], [], 7, 'light', 'modern-sans', ['healthcare'], ['optometrist', 'eye doctor', 'vision', 'glasses']),
    bp('dog-walking', 'Dog Walking / Pet Sitting', ['hero', 'feature', 'pricing', 'team', 'booking', 'testimonial', 'contact', 'footer'], [], 7, 'light', 'modern-sans', ['pet-care'], ['dog walking', 'pet sitting', 'dog walker', 'pet care']),
    bp('auto-repair', 'Auto Repair / Mechanic', ['hero', 'feature', 'pricing', 'gallery', 'testimonial', 'process', 'contact', 'footer'], [], 7, 'dark', 'modern-sans', ['automotive'], ['auto repair', 'mechanic', 'car service', 'garage']),
    bp('dry-cleaning', 'Dry Cleaning', ['hero', 'feature', 'pricing', 'process', 'testimonial', 'contact', 'map', 'footer'], [], 7, 'light', 'modern-sans', ['home-services'], ['dry cleaning', 'laundry', 'garment care']),
    bp('personal-trainer', 'Personal Trainer', ['hero', 'feature', 'pricing', 'team', 'gallery', 'testimonial', 'booking', 'footer'], [], 7, 'dark', 'modern-sans', ['fitness'], ['personal trainer', 'fitness', 'coaching', 'workout']),
    bp('video-production', 'Video Production', ['hero', 'gallery', 'feature', 'process', 'team', 'testimonial', 'pricing', 'footer'], [], 7, 'dark', 'modern-sans', ['media'], ['video production', 'filmmaking', 'videography']),
    bp('music-school', 'Music School', ['hero', 'feature', 'team', 'pricing', 'gallery', 'testimonial', 'booking', 'footer'], [], 7, 'light', 'modern-sans', ['education'], ['music school', 'lessons', 'instruments', 'piano']),
    bp('dance-studio', 'Dance Studio', ['hero', 'feature', 'team', 'pricing', 'gallery', 'booking', 'testimonial', 'footer'], [], 7, 'dark', 'modern-sans', ['arts'], ['dance', 'ballet', 'studio', 'classes']),
    bp('martial-arts', 'Martial Arts Gym', ['hero', 'feature', 'team', 'pricing', 'gallery', 'booking', 'testimonial', 'footer'], [], 7, 'dark', 'modern-sans', ['fitness'], ['martial arts', 'karate', 'mma', 'boxing', 'dojo']),
    bp('tattoo-parlor', 'Tattoo Parlor', ['hero', 'gallery', 'team', 'pricing', 'booking', 'contact', 'footer'], [], 6, 'dark', 'modern-sans', ['arts'], ['tattoo', 'body art', 'ink', 'piercing']),
    bp('escape-room', 'Escape Room', ['hero', 'feature', 'pricing', 'booking', 'gallery', 'testimonial', 'map', 'footer'], [], 7, 'dark', 'modern-sans', ['entertainment'], ['escape room', 'puzzle', 'adventure', 'entertainment']),
    bp('bakery-wholesale', 'Bakery Wholesale', ['hero', 'ecommerce', 'feature', 'pricing', 'gallery', 'contact', 'footer'], [], 6, 'light', 'modern-sans', ['food-b2b'], ['wholesale', 'bakery supply', 'bulk', 'distributor']),
    bp('saas-onboarding', 'SaaS Onboarding Flow', ['onboarding', 'auth', 'dashboard-widget', 'sidebar', 'modal', 'notification'], [], 6, 'dark', 'modern-sans', ['tech'], ['onboarding', 'setup', 'wizard', 'welcome']),
    bp('community-forum', 'Community Forum', ['header', 'auth', 'social', 'blog', 'sidebar', 'modal', 'notification', 'footer'], [], 7, 'dark', 'modern-sans', ['community'], ['forum', 'community', 'discussion', 'board']),
    bp('donation', 'Donation / Fundraiser', ['hero', 'stats', 'gallery', 'cta', 'pricing', 'newsletter', 'testimonial', 'footer'], [], 7, 'light', 'modern-sans', ['non-profit'], ['donation', 'fundraiser', 'give', 'support', 'charity']),
    bp('white-label', 'White-Label Template', ['hero', 'feature', 'pricing', 'testimonial', 'faq', 'cta', 'footer'], [], 6, 'dark', 'modern-sans', ['generic'], ['template', 'white label', 'neutral', 'generic', 'starter']),
];

export async function seedBlueprints() {
    console.log('\n═══ SEEDING BLUEPRINTS ═══');
    await upsert('website_type_blueprints', [...blueprints, ...blueprints2]);
}

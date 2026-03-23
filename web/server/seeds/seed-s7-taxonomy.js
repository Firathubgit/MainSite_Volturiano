// Phase S7 Seed Script — Run: node seeds/seed-s7-taxonomy.js
import 'dotenv/config';
import { supabaseAdmin } from '../lib/supabase-admin.js';
const sb = supabaseAdmin;
if (!sb) { console.error('No Supabase client — check env vars'); process.exit(1); }

async function upsert(table, data, conflict = 'slug') {
    const { error } = await sb.from(table).upsert(data, { onConflict: conflict });
    if (error) console.error(`[${table}] Error:`, error.message);
    else console.log(`[${table}] ✅ Seeded ${data.length} rows`);
}

// ═══ A. TOP-LEVEL CATEGORIES ═══
const cats = [
    ['hero', 'Hero Sections', 'Full-width hero banners, video heroes, animated heroes', 80],
    ['header', 'Headers & Navigation', 'Top navbars, sidebars, mega menus, sticky headers', 40],
    ['footer', 'Footers', 'Mega footers, minimal footers, newsletter footers', 40],
    ['feature', 'Features & Benefits', 'Feature grids, bento layouts, icon features', 80],
    ['pricing', 'Pricing & Plans', 'Toggle pricing, comparison tables, usage-based', 60],
    ['testimonial', 'Testimonials & Social Proof', 'Card testimonials, carousels, video testimonials', 50],
    ['faq', 'FAQ & Help Sections', 'Accordion FAQs, tabbed FAQs, searchable FAQs', 30],
    ['cta', 'Call to Action', 'Banner CTAs, inline CTAs, popup CTAs, sticky CTAs', 40],
    ['gallery', 'Galleries & Media', 'Masonry, lightbox, carousel, before/after galleries', 60],
    ['contact', 'Contact & Forms', 'Contact forms, maps, multi-step forms, booking', 40],
    ['team', 'Team & People', 'Team grids, bios, org charts, advisors', 30],
    ['blog', 'Blog & Content', 'Blog grids, article pages, author pages, reading lists', 50],
    ['stats', 'Statistics & Metrics', 'Counter sections, dashboard stats, infographics', 35],
    ['logos', 'Logos & Trust Signals', 'Logo strips, partner grids, certification badges', 25],
    ['process', 'Process & How It Works', 'Step wizards, timelines, flowcharts', 25],
    ['newsletter', 'Newsletter & Email Capture', 'Inline signups, popup signups, lead magnets', 20],
    ['ecommerce', 'E-Commerce & Shopping', 'Product grids, carts, checkouts, wishlists', 80],
    ['application', 'Application Shells & Dashboards', 'Sidebar layouts, top-nav layouts, split panes', 50],
    ['background', 'Backgrounds & Visual Effects', 'WebGL shaders, particle systems, gradients', 50],
    ['utility', 'Utility & Layout', 'Dividers, spacers, containers, scroll indicators', 30],
    ['onboarding', 'Onboarding & Welcome', 'Welcome screens, feature tours, setup wizards', 25],
    ['auth', 'Authentication & Login', 'Login forms, signup forms, social auth, 2FA', 35],
    ['dashboard-widget', 'Dashboard Widgets', 'Charts, KPI cards, activity feeds, notifications', 40],
    ['sidebar', 'Sidebars & Drawers', 'Nav sidebars, filter sidebars, chat sidebars', 20],
    ['modal', 'Modals & Dialogs', 'Confirmation modals, form modals, command modals', 30],
    ['notification', 'Notifications & Alerts', 'Toast notifications, banners, inline alerts', 20],
    ['table', 'Tables & Data Grids', 'Sortable tables, filterable grids, inline edit', 30],
    ['card', 'Card Components', 'Product cards, profile cards, stat cards', 40],
    ['timeline', 'Timelines & History', 'Vertical timelines, horizontal timelines, milestones', 20],
    ['map', 'Maps & Location', 'Interactive maps, store locators, heatmaps', 15],
    ['video', 'Video & Media Players', 'Video heroes, embedded players, live streams', 20],
    ['social', 'Social Media & Feeds', 'Social walls, tweet embeds, Instagram grids', 25],
    ['comparison', 'Comparison & Versus', 'Feature comparisons, before/after, plan comparisons', 20],
    ['countdown', 'Countdown & Urgency', 'Launch countdowns, sale timers, event countdowns', 15],
    ['integrations', 'Integrations & API Showcase', 'Integration grids, API docs, webhook visualizers', 15],
    ['changelog', 'Changelog & Updates', 'Release notes, version history, roadmap', 15],
    ['error', 'Error & Status Pages', '404 pages, 500 pages, maintenance pages', 15],
    ['banner', 'Banners & Announcements', 'Top banners, promotional bars, cookie consent', 20],
    ['menu', 'Menus & Food/Product Lists', 'Restaurant menus, service lists, catalog views', 20],
    ['booking', 'Booking & Scheduling', 'Calendar pickers, appointment forms, seat maps', 20],
].map(([slug, display_name, description, target_component_count], i) => ({
    slug, display_name, description, target_component_count, sort_order: i + 1, depth: 0, parent_id: null, is_active: true
}));

// ═══ B. SUB-CATEGORIES ═══
const subCatDefs = {
    hero: ['hero-video:Video Background Hero', 'hero-static:Static Image Hero', 'hero-split:Split Screen Hero', 'hero-animated:Animated/Motion Hero', 'hero-3d:3D/WebGL Hero', 'hero-particle:Particle Effect Hero', 'hero-gradient:Gradient Hero', 'hero-carousel:Carousel/Slider Hero', 'hero-minimal:Minimal Text Hero', 'hero-interactive:Interactive/Cursor Hero'],
    header: ['header-glass:Glassmorphism Navbar', 'header-sticky:Sticky/Fixed Navbar', 'header-sidebar:Sidebar Navigation', 'header-mega-menu:Mega Menu', 'header-hamburger:Mobile Hamburger Menu', 'header-centered:Centered Logo Navbar', 'header-transparent:Transparent Overlay Navbar', 'header-animated:Animated/Reveal Navbar'],
    footer: ['footer-mega:Mega Footer', 'footer-minimal:Minimal Footer', 'footer-cta:Footer with CTA', 'footer-newsletter:Newsletter Footer', 'footer-social:Social-First Footer', 'footer-sitemap:Sitemap Footer'],
    feature: ['feature-grid:Feature Grid', 'feature-bento:Bento Grid Layout', 'feature-tabs:Tabbed Features', 'feature-accordion:Accordion Features', 'feature-icon:Icon Feature List', 'feature-alternating:Alternating Left/Right', 'feature-comparison:Feature Comparison', 'feature-interactive:Interactive Feature Demo'],
    pricing: ['pricing-toggle:Monthly/Annual Toggle', 'pricing-comparison:Feature Comparison Table', 'pricing-slider:Usage-Based Slider', 'pricing-enterprise:Enterprise Custom', 'pricing-freemium:Freemium Highlight', 'pricing-per-seat:Per-Seat Pricing'],
    ecommerce: ['ecom-product-grid:Product Grid', 'ecom-product-detail:Product Detail Page', 'ecom-cart:Shopping Cart', 'ecom-checkout:Checkout Flow', 'ecom-wishlist:Wishlist', 'ecom-filter:Product Filters', 'ecom-reviews:Product Reviews', 'ecom-categories:Category Browser', 'ecom-search:Product Search', 'ecom-featured:Featured Products', 'ecom-sale:Sale Banner', 'ecom-comparison:Product Comparison'],
    application: ['app-sidebar-nav:Sidebar Nav Shell', 'app-top-nav:Top Nav Shell', 'app-data-table:Data Table View', 'app-kanban:Kanban Board', 'app-calendar:Calendar View', 'app-settings:Settings Page', 'app-profile:User Profile', 'app-inbox:Inbox/Messages', 'app-file-manager:File Manager', 'app-command-palette:Command Palette'],
    auth: ['auth-login:Login Form', 'auth-signup:Signup Form', 'auth-social:Social Login', 'auth-magic-link:Magic Link/OTP', 'auth-forgot-password:Forgot Password', 'auth-2fa:Two-Factor Auth', 'auth-onboarding:Post-Auth Onboarding'],
    'dashboard-widget': ['widget-chart:Chart Widget', 'widget-kpi:KPI/Metric Card', 'widget-activity:Activity Feed', 'widget-user-list:User/Member List', 'widget-notifications:Notification Center', 'widget-progress:Progress Tracker', 'widget-map:Map Widget', 'widget-calendar:Calendar Widget'],
    background: ['bg-shader:WebGL Shader', 'bg-particle:Particle System', 'bg-gradient:Animated Gradient', 'bg-noise:Noise/Grain Pattern', 'bg-aurora:Aurora/Northern Lights', 'bg-mesh:Mesh Gradient', 'bg-geometric:Geometric Pattern', 'bg-video:Video Background'],
    booking: ['booking-calendar:Calendar Date Picker', 'booking-slots:Time Slot Selector', 'booking-form:Appointment Form', 'booking-room:Room/Resource Selector', 'booking-confirmation:Booking Confirmation'],
    testimonial: ['testimonial-card:Card Testimonial', 'testimonial-carousel:Carousel Testimonial', 'testimonial-video:Video Testimonial', 'testimonial-tweet-wall:Tweet Wall', 'testimonial-quote:Quote Block'],
    faq: ['faq-accordion:Accordion FAQ', 'faq-tabbed:Tabbed FAQ', 'faq-searchable:Searchable FAQ', 'faq-sidebar:Sidebar FAQ', 'faq-chatbot:Chatbot FAQ'],
    cta: ['cta-banner:Banner CTA', 'cta-inline:Inline CTA', 'cta-popup:Popup CTA', 'cta-sticky:Sticky CTA', 'cta-exit-intent:Exit-Intent CTA'],
    gallery: ['gallery-masonry:Masonry Gallery', 'gallery-lightbox:Lightbox Gallery', 'gallery-carousel:Carousel Gallery', 'gallery-before-after:Before/After Gallery', 'gallery-3d:3D Gallery'],
    contact: ['contact-form:Contact Form', 'contact-map:Map Contact', 'contact-multi-step:Multi-Step Form', 'contact-booking:Booking Form', 'contact-chat:Live Chat Widget'],
    team: ['team-grid:Team Grid', 'team-carousel:Team Carousel', 'team-bio:Team Bios', 'team-org-chart:Org Chart', 'team-founders:Founders Section'],
    blog: ['blog-grid:Blog Grid', 'blog-article:Article Page', 'blog-author:Author Page', 'blog-category:Category Page', 'blog-reading-list:Reading List'],
    stats: ['stats-counter:Counter Section', 'stats-dashboard:Dashboard Stats', 'stats-comparison:Comparison Stats', 'stats-infographic:Infographic', 'stats-live:Live Stats'],
    logos: ['logos-strip:Logo Strip', 'logos-grid:Partner Grid', 'logos-carousel:Logo Carousel', 'logos-badges:Certification Badges'],
    process: ['process-steps:Numbered Steps', 'process-timeline:Timeline Process', 'process-flowchart:Flowchart', 'process-wizard:Step Wizard'],
    newsletter: ['newsletter-inline:Inline Signup', 'newsletter-popup:Popup Signup', 'newsletter-gated:Gated Content', 'newsletter-footer:Footer Signup'],
    utility: ['utility-divider:Section Divider', 'utility-spacer:Spacer', 'utility-scroll-indicator:Scroll Indicator', 'utility-back-to-top:Back to Top'],
    onboarding: ['onboarding-welcome:Welcome Screen', 'onboarding-tour:Feature Tour', 'onboarding-wizard:Setup Wizard', 'onboarding-progress:Progress Indicator', 'onboarding-checklist:Onboarding Checklist'],
    sidebar: ['sidebar-nav:Navigation Sidebar', 'sidebar-filter:Filter Sidebar', 'sidebar-chat:Chat Sidebar', 'sidebar-settings:Settings Sidebar'],
    modal: ['modal-confirmation:Confirmation Modal', 'modal-form:Form Modal', 'modal-media:Media Modal', 'modal-command:Command Modal', 'modal-drawer:Drawer Modal'],
    notification: ['notification-toast:Toast Notification', 'notification-banner:Banner Notification', 'notification-inline:Inline Alert', 'notification-snackbar:Snackbar'],
    table: ['table-sortable:Sortable Table', 'table-filterable:Filterable Grid', 'table-expandable:Expandable Rows', 'table-inline-edit:Inline Edit Table', 'table-pagination:Paginated Table'],
    card: ['card-product:Product Card', 'card-profile:Profile Card', 'card-stat:Stat Card', 'card-blog:Blog Card', 'card-project:Project Card'],
    timeline: ['timeline-vertical:Vertical Timeline', 'timeline-horizontal:Horizontal Timeline', 'timeline-milestone:Milestone Tracker', 'timeline-roadmap:Roadmap Timeline'],
    map: ['map-interactive:Interactive Map', 'map-store-locator:Store Locator', 'map-route:Route Planner', 'map-heatmap:Heatmap'],
    video: ['video-hero:Video Hero', 'video-player:Embedded Player', 'video-gallery:Video Gallery', 'video-live:Live Stream'],
    social: ['social-wall:Social Wall', 'social-twitter:Tweet Embeds', 'social-instagram:Instagram Grid', 'social-share:Share Buttons', 'social-feed:Social Feed'],
    comparison: ['comparison-feature:Feature Comparison', 'comparison-before-after:Before/After', 'comparison-plan:Plan Comparison', 'comparison-tool:Tool Comparison'],
    countdown: ['countdown-launch:Launch Countdown', 'countdown-sale:Sale Timer', 'countdown-event:Event Countdown', 'countdown-stock:Limited Stock'],
    integrations: ['integrations-grid:Integration Grid', 'integrations-api:API Documentation', 'integrations-webhook:Webhook Visualizer', 'integrations-connector:Connector Map'],
    changelog: ['changelog-release:Release Notes', 'changelog-version:Version History', 'changelog-roadmap:Roadmap', 'changelog-whats-new:What\'s New'],
    error: ['error-404:404 Page', 'error-500:500 Page', 'error-maintenance:Maintenance Page', 'error-coming-soon:Coming Soon Page'],
    banner: ['banner-top:Top Banner', 'banner-promo:Promotional Bar', 'banner-cookie:Cookie Consent', 'banner-status:System Status', 'banner-announcement:Announcement Bar'],
    menu: ['menu-restaurant:Restaurant Menu', 'menu-service-list:Service List', 'menu-catalog:Catalog View', 'menu-spec-sheet:Spec Sheet'],
};

async function seedCategories() {
    console.log('\n═══ SEEDING CATEGORIES ═══');
    await upsert('component_categories', cats);
    const { data: parents } = await sb.from('component_categories').select('id, slug').is('parent_id', null);
    const parentMap = {};
    (parents || []).forEach(p => { parentMap[p.slug] = p.id; });
    const subs = [];
    let sortIdx = 100;
    for (const [parentSlug, items] of Object.entries(subCatDefs)) {
        const pid = parentMap[parentSlug];
        if (!pid) { console.warn(`Parent ${parentSlug} not found, skipping`); continue; }
        for (const item of items) {
            const [slug, display_name] = item.split(':');
            subs.push({ slug, display_name, description: display_name, parent_id: pid, depth: 1, sort_order: ++sortIdx, target_component_count: 0, is_active: true });
        }
    }
    console.log(`Inserting ${subs.length} sub-categories...`);
    await upsert('component_categories', subs);
}

// ═══ IMPORT REMAINING SEEDERS ═══
import { seedBlueprints } from './seed-s7-blueprints.js';
import { seedVerticals, seedThemes, seedCompatibility } from './seed-s7-extras.js';

// ═══ MAIN ═══
async function main() {
    console.log('🚀 Phase S7 Taxonomy Seed — Starting...\n');
    await seedCategories();
    await seedBlueprints();
    await seedVerticals();
    await seedThemes();
    await seedCompatibility();
    console.log('\n✅ Phase S7 seed complete!');
    process.exit(0);
}
main().catch(e => { console.error('FATAL:', e); process.exit(1); });

/**
 * Phase S6: Component Catalog Migration Script
 * Reads local catalog.json and bundle files, maps them to the structured
 * `components` and `component_categories` schema, and uploads to Supabase.
 * 
 * Usage: node server/scripts/migrate-catalog-to-supabase.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Setup ES module filename/dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
    console.log("Please ensure a service role key is available in your .env to bypass RLS for migration.");
    process.exit(1);
}

// Initialize admin client to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const REGISTRY_DIR = path.join(__dirname, '../lib/registry');
const CATALOG_PATH = path.join(REGISTRY_DIR, 'catalog.json');
const BUNDLES_DIR = path.join(REGISTRY_DIR, 'bundles');
const TEMPLATES_DIR = path.join(REGISTRY_DIR, 'templates');

async function runMigration() {
    console.log(`\n🚀 Starting Component Catalog Migration to Supabase...`);
    console.log(`📂 Source Directory: ${REGISTRY_DIR}`);

    if (!fs.existsSync(CATALOG_PATH)) {
        console.error(`❌ Catalog not found at ${CATALOG_PATH}`);
        process.exit(1);
    }

    try {
        // 1. Read Catalog
        const catalogRaw = fs.readFileSync(CATALOG_PATH, 'utf8');
        const catalogData = JSON.parse(catalogRaw);

        console.log(`\nFound ${catalogData.categories.length} categories and ${catalogData.components.length} components in catalog.json`);

        // 2. Upsert Categories
        console.log(`\n📁 Migrating Categories...`);
        for (const catName of catalogData.categories) {
            const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

            const { error: catError } = await supabase
                .from('component_categories')
                .upsert({
                    slug: slug,
                    name: catName,
                    display_name: catName,
                    is_active: true
                }, { onConflict: 'slug' });

            if (catError) {
                console.error(`  ❌ Failed to upsert category ${catName}:`, catError.message);
            } else {
                console.log(`  ✅ Upserted category: ${catName}`);
            }
        }

        // 3. Migrate Components
        console.log(`\n📦 Migrating Components...`);
        let successCount = 0;
        let failCount = 0;

        for (const compMeta of catalogData.components) {
            try {
                // Read Bundle Code
                const bundlePath = path.join(BUNDLES_DIR, `${compMeta.id}.json`);
                if (!fs.existsSync(bundlePath)) {
                    console.warn(`  ⚠️ Bundle file missing for ${compMeta.id} - Skipping!`);
                    failCount++;
                    continue;
                }

                const bundleRaw = fs.readFileSync(bundlePath, 'utf8');
                const bundleData = JSON.parse(bundleRaw);
                const bundleSize = Buffer.byteLength(bundleRaw, 'utf8');

                // Map JSON structure to Supabase Column Schema
                const record = {
                    component_id: compMeta.id,
                    name: compMeta.name,
                    category: compMeta.category,
                    subcategory: null,
                    component_type: 'component', // default logic
                    version: 'v1',

                    // Metadata
                    display_name: compMeta.name,
                    description: compMeta.description || null,
                    visual_description: compMeta.visualDescription || null,
                    mood_tone: compMeta.moodTone || null,

                    // Arrays -> JSONB
                    tags: compMeta.tags || [],
                    keywords: compMeta.keywords || [],
                    suitable_for: compMeta.suitableFor || [],
                    not_suitable_for: compMeta.notSuitableFor || [],

                    // Feature flags
                    supports: compMeta.supports || {},
                    requires: compMeta.requires || {},
                    responsive: compMeta.quality?.responsive ?? true,

                    // Color & Style extraction (safely fallback if missing)
                    color_mode: compMeta.colorProfile?.mode || 'adaptive',
                    color_primary: compMeta.colorProfile?.primary || null,
                    color_warmth: compMeta.colorProfile?.warmth || null,
                    typography_style: compMeta.typographyStyle || null,
                    layout_type: compMeta.layoutType || null,

                    // The actual code bundle
                    bundle_code: bundleData,
                    bundle_size_bytes: bundleSize,

                    // Metrics & Status defaults
                    status: 'active',
                    is_premium: compMeta.tags?.includes('premium') || false,
                    usage_count: 0
                };

                // Upsert to Supabase
                const { error: compError } = await supabase
                    .from('components')
                    .upsert(record, { onConflict: 'component_id' });

                if (compError) {
                    console.error(`  ❌ DB Error for ${compMeta.id}:`, compError.message);
                    failCount++;
                } else {
                    console.log(`  ✅ Successfully migrated: ${compMeta.id} (${(bundleSize / 1024).toFixed(1)} KB)`);
                    successCount++;
                }

            } catch (err) {
                console.error(`  ❌ Processing Error for ${compMeta.id}:`, err.message);
                failCount++;
            }
        }

        // 4. Migrate Templates
        console.log(`\n🎨 Migrating Templates...`);
        if (fs.existsSync(TEMPLATES_DIR)) {
            const templateFiles = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.json'));
            console.log(`Found ${templateFiles.length} template files.`);

            for (const tFile of templateFiles) {
                try {
                    const tPath = path.join(TEMPLATES_DIR, tFile);
                    const tRaw = fs.readFileSync(tPath, 'utf8');
                    const tData = JSON.parse(tRaw);

                    const record = {
                        template_id: tData.templateId,
                        name: tData.name,
                        description: tData.description || null,
                        visual_description: tData.visualDescription || null,
                        thumbnail_url: tData.thumbnailUrl || null,
                        app_wrapper_class: tData.appWrapperClass || null,
                        template_code: {
                            components: tData.components || [],
                            theme: tData.theme || {}
                        },
                        status: 'active'
                    };

                    const { error: tError } = await supabase
                        .from('templates')
                        .upsert(record, { onConflict: 'template_id' });

                    if (tError) {
                        console.error(`  ❌ DB Error for template ${tData.templateId}:`, tError.message);
                    } else {
                        console.log(`  ✅ Successfully migrated template: ${tData.templateId}`);
                    }
                } catch (err) {
                    console.error(`  ❌ Processing Error for template file ${tFile}:`, err.message);
                }
            }
        }

        console.log(`\n🎉 Migration Complete!`);
        console.log(`-----------------------------------`);
        console.log(`Total Components: ${catalogData.components.length}`);
        console.log(`✅ Success: ${successCount}`);
        console.log(`❌ Failed:  ${failCount}`);

    } catch (err) {
        console.error(`\n❌ Fatal Error during migration:`, err.message);
    }
}

// Execute
runMigration();

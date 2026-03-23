
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUNDLES_DIR = path.join(__dirname, '../lib/registry/bundles');

function fixRuntimeErrors2() {
    console.log('Fixing runtime errors (Phase 2)...');

    // 1. Fix HeroVideoSmoke (and others) - Force replace literal \n with newline
    const bundlesToFix = [
        'hero.video.smoke.v1.json',
        'hero.video.glass.v1.json',
        'hero.image.product.v1.json',
        'hero.video.orbital.v1.json'
    ];

    for (const bundleFile of bundlesToFix) {
        fixBundleNewlines(bundleFile);
    }
}

function fixBundleNewlines(filename) {
    const filePath = path.join(BUNDLES_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.error(`${filename} not found!`);
        return;
    }

    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const bundle = JSON.parse(raw);
        let modified = false;

        if (bundle.files) {
            for (const f of bundle.files) {
                // Check if content has literal \n (backslash + n)
                // In memory string, this is "\\n" 

                // Debug: check existence
                if (f.content.includes('\\n')) {
                    console.log(`Found literal \\n in ${filename}`);
                    // Replace ALL occurrences
                    f.content = f.content.split('\\n').join('\n');
                    modified = true;
                }

                // Also check for double escaped \\n just in case (\\\\n)
                if (f.content.includes('\\\\n')) {
                    console.log(`Found literal \\\\n in ${filename}`);
                    f.content = f.content.split('\\\\n').join('\n');
                    modified = true;
                }
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(bundle, null, 4), 'utf-8');
            console.log(`Fixed newlines in: ${filename}`);
        } else {
            console.log(`No newline issues found in: ${filename}`);
        }
    } catch (err) {
        console.error(`Error fixing ${filename}:`, err);
    }
}

fixRuntimeErrors2();


import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUNDLES_DIR = path.join(__dirname, '../lib/registry/bundles');

function fixBundles() {
    console.log(`Scanning bundles in: ${BUNDLES_DIR}`);

    if (!fs.existsSync(BUNDLES_DIR)) {
        console.error('Bundles directory not found!');
        process.exit(1);
    }

    const files = fs.readdirSync(BUNDLES_DIR).filter(f => f.endsWith('.json'));
    let fixedCount = 0;

    for (const file of files) {
        const filePath = path.join(BUNDLES_DIR, file);
        try {
            const raw = fs.readFileSync(filePath, 'utf-8');

            // Check if the file contains double-escaped newlines in the content field
            // We look for the pattern \\n inside the string values of the "content" field
            // but since we are reading the raw file, we can just look for the literal characters \ and n
            // However, we want to be careful not to break other things.
            // A safer approach is to parse it, check the content, fix it, and verify.

            const bundle = JSON.parse(raw);
            let modified = false;

            if (bundle.files && Array.isArray(bundle.files)) {
                for (const fileEntry of bundle.files) {
                    if (typeof fileEntry.content === 'string') {
                        // Check if it has literal "\n" characters (which are escaped as \\n in the JSON file)
                        // In the JS string, a literal backslash is \\. So we check if the string includes literal \n characters?
                        // No, the issue is that the JSON file contains the sequence `\n` (two chars) where it should contain a newline control character (one char), 
                        // OR (more likely) the JSON file contains `\\n` (which becomes `\n` in the JS string) instead of `\n` (which becomes newline).

                        // Let's look at the raw file content again from step 28.
                        // "content": "import React, { useRef, useEffect, useState } from 'react';\\n\\nexport default function
                        // In the raw read of the file, we see `\\n`.
                        // When JSON.parse parses this, `\\n` becomes `\n` (literal backslash followed by n).
                        // We want it to be a newline character `\n`.

                        if (fileEntry.content.includes('\\n')) {
                            // Replace all occurrences of literal \n with actual newline
                            fileEntry.content = fileEntry.content.split('\\n').join('\n');
                            modified = true;
                        }
                    }
                }
            }

            if (modified) {
                // Write it back with 4 spaces indentation
                fs.writeFileSync(filePath, JSON.stringify(bundle, null, 4), 'utf-8');
                console.log(`Fixed: ${file}`);
                fixedCount++;
            }
        } catch (err) {
            console.error(`Error processing ${file}:`, err.message);
        }
    }

    console.log(`\nFinished! Fixed ${fixedCount} out of ${files.length} bundles.`);
}

fixBundles();

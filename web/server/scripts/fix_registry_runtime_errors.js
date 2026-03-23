
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUNDLES_DIR = path.join(__dirname, '../lib/registry/bundles');

function fixRuntimeErrors() {
    console.log('Fixing runtime errors in bundles...');

    // 1. Fix Pin3D (card.pin3d.v1.json)
    fixPin3D();

    // 2. Fix FooterFlickering (footer.flickering.v1.json)
    fixFooterFlickering();

    // 3. Fix CodeIntegration (feature.code.integration.v1.json)
    fixCodeIntegration();
}

function fixPin3D() {
    const filePath = path.join(BUNDLES_DIR, 'card.pin3d.v1.json');
    if (!fs.existsSync(filePath)) {
        console.error('Pin3D bundle not found!');
        return;
    }

    try {
        const bundle = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const fileEntry = bundle.files.find(f => f.path.includes('Pin3D.jsx'));

        if (fileEntry) {
            // Replace inner <a> with <div> and remove href/target/rel props
            // Original:
            // <a
            //     href={href}
            //     target={"_blank"}
            //     rel="noopener noreferrer"
            //     className="relative flex space-x-2 items-center z-10 rounded-full bg-zinc-950 py-0.5 px-4 ring-1 ring-white/10"
            // >

            // We'll use a regex to find this specific block or string replacement if exact

            let content = fileEntry.content;

            // Simplistic replacement logic: replace the specific start tag and end tag
            // Note: newline handling might be tricky with regex if we are not careful about matching

            // Search for the opening tag with props
            const openTagRegex = /<a\s+href={href}\s+target=\{"_blank"\}\s+rel="noopener noreferrer"\s+className=/;

            if (openTagRegex.test(content)) {
                content = content.replace(openTagRegex, '<div className=');
                // We lost the rest of the className value?
                // No, replace replaces the match. The className value follows the match.
                // Wait, "className=" is at the end of regex.
                // So `<a ... className="foo">` becomes `<div className="foo">`.
                // Correct.

                // Now replace closing tag `</a>` corresponding to this.
                // It is inside PinPerspective.
                // There might be multiple <a> tags?
                // PinPerspective only has this one.
                // But Pin3D uses <Link>.
                // So replacing `</a>` inside PinPerspective (which is inside `content`) requires context.
                // PinPerspective definition: `export const PinPerspective = ...`

                // Let's replace `</a>` specifically where we expect it.
                // The `<a>` wraps two `<span>`s.
                // `</span>\n                    </a>`

                content = content.replace(/<\/span>\s*<\/a>/, '</span>\n                    </div>');

                fileEntry.content = content;
                fs.writeFileSync(filePath, JSON.stringify(bundle, null, 4), 'utf-8');
                console.log('Fixed Pin3D: Replaced nested <a> with <div>');
            } else {
                console.warn('Pin3D: Could not find <a> tag pattern to replace.');
            }
        }
    } catch (err) {
        console.error('Error fixing Pin3D:', err);
    }
}

function fixFooterFlickering() {
    const filePath = path.join(BUNDLES_DIR, 'footer.flickering.v1.json');
    if (!fs.existsSync(filePath)) {
        console.error('FooterFlickering bundle not found!');
        return;
    }

    try {
        const bundle = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const fileEntry = bundle.files.find(f => f.path.includes('FooterFlickering.jsx'));

        if (fileEntry) {
            // Remove stray backslashes `\\\`
            if (fileEntry.content.includes('))}\\\\\\\\')) {
                // In JS string, `\\\` is `\\\\\\`? No.
                // The file content had `))}\\\` in the view_file output.
                // `view_file` escapes backslashes.
                // In local string it is `))}\\\`.
                // Let's replace `\\\` with empty string or check logic.
                // It was `))}\\\`. It should be `))}`.

                fileEntry.content = fileEntry.content.replace('))}\\\\', '))}') // Replace `))}\` ?
                // Wait. `\\\` means 3 backslashes?
                // Step 70 output: `))}\\\`.
                // That likely means `))}\` followed by `\\`.
                // Or just `))}\`. 
                // Let's replace `\\\\` variants.
                // Safest to just replace `))}\\\\` with `))}` if found.
            }
            // Actually, let's look for `))}\\` (escaped backslash in string).

            // Let's just do a specific string replace for the context
            const brokenStr = '))}\\\\';
            const fixedStr = '))}'

            if (fileEntry.content.includes(brokenStr)) {
                fileEntry.content = fileEntry.content.replace(brokenStr, fixedStr);
                fs.writeFileSync(filePath, JSON.stringify(bundle, null, 4), 'utf-8');
                console.log('Fixed FooterFlickering: Removed stray backslashes');
            } else if (fileEntry.content.includes('))}\\')) {
                fileEntry.content = fileEntry.content.replace('))}\\', '))}')
                fs.writeFileSync(filePath, JSON.stringify(bundle, null, 4), 'utf-8');
                console.log('Fixed FooterFlickering: Removed stray backslashes (variant 2)');
            } else {
                console.warn('FooterFlickering: Could not find stray backslashes pattern.');
                // Debug: Print the snippet around that area
                const idx = fileEntry.content.indexOf('column.links.map');
                if (idx !== -1) {
                    // console.log('Snippet:', fileEntry.content.substring(idx, idx + 300));
                }
            }
        }
    } catch (err) {
        console.error('Error fixing FooterFlickering:', err);
    }
}

function fixCodeIntegration() {
    const filePath = path.join(BUNDLES_DIR, 'feature.code.integration.v1.json');
    if (!fs.existsSync(filePath)) {
        console.error('CodeIntegration bundle not found!');
        return;
    }

    try {
        const bundle = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const fileEntry = bundle.files.find(f => f.path.includes('CodeIntegration.jsx'));

        if (fileEntry) {
            // Move default prop value to constant
            // 1. Extract the default string

            const startMarker = "codeSnippet = `";
            const endMarker = "` \n}) => {";

            const startIdx = fileEntry.content.indexOf(startMarker);
            const endIdx = fileEntry.content.indexOf(endMarker, startIdx);

            if (startIdx !== -1 && endIdx !== -1) {
                const codeValue = fileEntry.content.substring(startIdx + startMarker.length, endIdx);

                // Construct new content
                const constantDef = `const DEFAULT_CODE_SNIPPET = \`${codeValue}\`;\n\n`;

                // Replace default value in props with constant reference
                // "codeSnippet = `...`" -> "codeSnippet = DEFAULT_CODE_SNIPPET"

                const propDef = fileEntry.content.substring(startIdx, endIdx + 1); // codeSnippet = `...`
                const newPropDef = "codeSnippet = DEFAULT_CODE_SNIPPET";

                let newContent = fileEntry.content.replace(propDef, newPropDef);

                // Add constant definition before component
                // Find "const CodeIntegration"
                newContent = newContent.replace('const CodeIntegration', constantDef + 'const CodeIntegration');

                fileEntry.content = newContent;
                fs.writeFileSync(filePath, JSON.stringify(bundle, null, 4), 'utf-8');
                console.log('Fixed CodeIntegration: Refactored default prop to constant');
            } else {
                console.warn('CodeIntegration: Could not find default prop pattern.');
            }
        }
    } catch (err) {
        console.error('Error fixing CodeIntegration:', err);
    }
}

fixRuntimeErrors();

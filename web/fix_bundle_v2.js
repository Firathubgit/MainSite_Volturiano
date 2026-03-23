
const fs = require('fs');
const path = require('path');

// Hardcoded path to ensure no resolution errors
const filePath = String.raw`c:\Users\Firat\Documents\Projects\MainSite_Volturiano\web\server\lib\registry\bundles\hero.video.orbital.v1.json`;

console.log('Starting fix for:', filePath);

try {
    if (!fs.existsSync(filePath)) {
        console.error('File not found at:', filePath);
        process.exit(1);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    // We expect the file to be valid JSON
    const data = JSON.parse(raw);

    if (data.files && data.files.length > 0) {
        let content = data.files[0].content;

        // Count raw backslashes to diagnose
        const doubleEscapes = (content.match(/\\n/g) || []).length;
        console.log(`Found ${doubleEscapes} double-escaped newlines.`);

        if (doubleEscapes > 0) {
            // Replace literal "\n" (backslash+n) with actual newline character
            const fixedContent = content.replace(/\\n/g, '\n');
            data.files[0].content = fixedContent;

            // Write back with nicely formatted JSON
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
            console.log('SUCCESS: File fixed and saved.');
        } else {
            console.log('NO CHANGE: No double-escaped newlines found.');
        }
    } else {
        console.error('INVALID STRUCTURE: files array missing or empty');
    }
} catch (e) {
    console.error('CRASH:', e.message);
    process.exit(1);
}

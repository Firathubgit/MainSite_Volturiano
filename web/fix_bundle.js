
const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\Firat\\Documents\\Projects\\MainSite_Volturiano\\web\\server\\lib\\registry\\bundles\\hero.video.orbital.v1.json';

try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    if (data.files && data.files.length > 0) {
        let content = data.files[0].content;
        // Replace literal "\n" (backslash + n) with actual newline character
        // In the parsed string, \\n appears as a backslash char followed by n char.
        // We want to replace that sequence with \n (newline char).

        // Check if we have double escaping
        if (content.includes('\\n')) {
            console.log('Found double escaped newlines. Fixing...');
            // Replace literal backslash followed by n with newline
            content = content.split('\\n').join('\n');
            data.files[0].content = content;

            // Write back
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
            console.log('File fixed and saved.');
        } else {
            console.log('No double escaped newlines found in parsed content.');
            // Force save anyway just in case my check is wrong, but using the existing value? 
            // No, look at the raw string.
            // If raw file has \\n, JSON.parse reads it as \n (backslash n).
            // content.includes('\\n') checks for backslash n.
        }
    }
} catch (e) {
    console.error('Error:', e);
}

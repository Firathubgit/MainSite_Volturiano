
import fs from 'fs';
import path from 'path';

const filePath = String.raw`c:\Users\Firat\Documents\Projects\MainSite_Volturiano\web\server\lib\registry\bundles\footer.flickering.v1.json`;

try {
    const content = fs.readFileSync(filePath, 'utf-8');
    JSON.parse(content);
    console.log("JSON is VALID");
} catch (e) {
    console.error("JSON is INVALID:", e.message);
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const registryDir = path.join(__dirname, '../lib/registry');

console.log('Registry Dir:', registryDir);
if (fs.existsSync(registryDir)) {
    console.log('Files:', fs.readdirSync(registryDir));
    const bundlesDir = path.join(registryDir, 'bundles');
    if (fs.existsSync(bundlesDir)) {
        console.log('Bundles count:', fs.readdirSync(bundlesDir).length);
    } else {
        console.log('Bundles dir missing');
    }
} else {
    console.log('Registry dir missing');
}

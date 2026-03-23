import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        console.log(`Browser Log [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', err => {
        console.error(`Browser Error: ${err.message}`);
    });

    await page.goto(`file://${path.join(__dirname, 'test-shader.html')}`);

    // wait for DONE_TEST
    await new Promise(r => setTimeout(r, 2000));

    await browser.close();
})();

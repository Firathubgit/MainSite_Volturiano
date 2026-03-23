import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        console.log(`Browser Log [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', err => {
        console.log(`Browser Error: ${err.message}`);
    });

    console.log("Navigating to http://localhost:5173/test.html...");
    await page.goto('http://localhost:5173/test.html', { waitUntil: 'networkidle' });

    // wait for layout
    await page.waitForFunction(() => {
        return new Promise(resolve => setTimeout(resolve, 3000)).then(() => true);
    });

    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    console.log("BODY HTML:", bodyHtml.substring(0, 500));

    await browser.close();
})();

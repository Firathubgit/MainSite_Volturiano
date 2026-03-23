import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => {
        console.log(`Browser Log [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', err => {
        console.error(`Browser Error: ${err.message}`);
    });

    console.log("Navigating to http://localhost:5173/test.html...");
    await page.goto('http://localhost:5173/test.html', { waitUntil: 'networkidle0' });

    // wait for layout
    await new Promise(r => setTimeout(r, 2000));

    await page.screenshot({ path: 'test-colorbends-screenshot.png' });
    console.log("Screenshot saved!");

    await browser.close();
})();

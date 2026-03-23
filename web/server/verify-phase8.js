import 'dotenv/config'; // Load .env
import { selectComponentsV2 } from './lib/select-components-v2.js';

async function runVerification() {
    console.log("======================================================");
    console.log("🔍 PHASE S8 FINAL VERIFICATION TEST");
    console.log("======================================================");

    const testPrompt = "A futuristic dark-mode tech agency website with neon accents and a glassmorphism contact form.";
    const designSystem = {
        industryCategory: 'technology',
        colorPalette: { mode: 'dark', primary: '#00ff00' },
        industry: 'software-technology'
    };

    try {
        const startTime = Date.now();
        const result = await selectComponentsV2(testPrompt, designSystem);
        const duration = (Date.now() - startTime) / 1000;

        console.log("\n--- PIPELINE SUCCESS ---");
        console.log(`⏱️ Duration: ${duration.toFixed(2)}s`);
        console.log(`🌐 Website Type: ${result.websiteType}`);
        console.log(`📦 Blueprint: ${result.blueprint}`);
        console.log(`🧩 Components Selected: ${result.components.length}`);

        // Check for specific fields required by the frontend
        const first = result.components[0];
        const requiredFields = ['component_id', 'name', 'bundle_code', 'role', 'exportName', 'path'];
        const missing = requiredFields.filter(f => !first[f]);

        if (missing.length === 0) {
            console.log("✅ Data Schema: PASSED (All frontend fields present)");
        } else {
            console.error("❌ Data Schema: FAILED (Missing fields: " + missing.join(', ') + ")");
        }

        console.log("\n--- COMPONENT LIST ---");
        result.components.forEach((c, i) => {
            console.log(`${i + 1}. [${c.role}] ${c.name} (${c.component_id})`);
        });

        console.log("\n--- STATS ---");
        console.log(JSON.stringify(result.stats, null, 2));

        process.exit(0);
    } catch (err) {
        console.error("\n❌ VERIFICATION FAILED:");
        console.error(err);
        process.exit(1);
    }
}

runVerification();

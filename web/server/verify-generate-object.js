// using built-in fetch

const PORT = 3001;
const API_URL = `http://127.0.0.1:${PORT}/api/generate-single-component`;

async function testGenerateObject() {
    console.log(`Testing generate-single-component (schema-safe) at ${API_URL}...`);

    const payload = {
        component: {
            name: 'TestComponent',
            path: 'src/components/TestComponent.jsx',
            description: 'A simple test component',
            designFocus: 'Minimalist',
            keyContent: 'Hello World'
        },
        buildId: 'test-build-obj-' + Date.now()
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${text}`);
        }

        const data = await response.json();
        console.log("Response success:", data.success);

        // Check for structured output
        if (data.content && data.content.includes("export default function TestComponent")) {
            console.log("✅ Validation Passed: 'content' field exists and contains code.");
        } else {
            console.error("❌ Validation Failed: 'content' field missing or invalid.");
            console.log("Full response:", JSON.stringify(data, null, 2));
            process.exit(1);
        }

        // Check for correct export name
        if (data.name === 'TestComponent') {
            console.log("✅ Export name matches.");
        } else {
            console.warn(`⚠️ Name mismatch: Expected TestComponent, got ${data.name}`);
        }

    } catch (error) {
        console.error("❌ Verification Failed:", error.message);
        process.exit(1);
    }
}

testGenerateObject();

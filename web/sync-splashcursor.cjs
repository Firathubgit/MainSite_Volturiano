const fs = require('fs');
const path = require('path');

const SPLASH_PATH = path.join(__dirname, 'src/components/premium/SplashCursor.jsx');
const HERO_PATH = path.join(__dirname, 'src/components/premium/HeroSplashCursor.jsx');
const BUNDLE_PATH = path.join(__dirname, 'server/lib/registry/bundles/hero.interaction.splashcursor.v1.json');

try {
    let splashCode = fs.readFileSync(SPLASH_PATH, 'utf8');
    let heroCode = fs.readFileSync(HERO_PATH, 'utf8');

    // Remove 'use client'
    splashCode = splashCode.replace(/'use client';\r?\n/g, '');
    heroCode = heroCode.replace(/'use client';\r?\n/g, '');

    // 1. Clean up SplashCursor.jsx
    // Remove default export
    splashCode = splashCode.replace(/export default SplashCursor;/g, '');
    // Ensure the function itself is still available
    if (!splashCode.includes('function SplashCursor')) {
        splashCode = splashCode.replace(/export function SplashCursor/g, 'function SplashCursor');
    }

    // 2. Strip imports from HeroSplashCursor (except framer-motion)
    // We want to remove the local SplashCursor import and the React import to prevent redeclaration
    heroCode = heroCode.replace(/import SplashCursor from '.\/SplashCursor';/g, '');
    heroCode = heroCode.replace(/import React from 'react';/g, '');
    heroCode = heroCode.replace(/import React, {.*} from 'react';/g, '');

    // 3. Ensure HeroSplashCursor has its export default for the bundle
    if (!heroCode.includes('export default')) {
        heroCode = heroCode.replace(/function HeroSplashCursor/g, 'export default function HeroSplashCursor');
    }

    const combinedCode = splashCode + '\n\n' + heroCode;

    const bundle = {
        "id": "hero.interaction.splashcursor.v1",
        "category": "InteractionHero",
        "name": "SplashCursor Interaction Hero",
        "tags": [
            "premium",
            "interactive",
            "canvas",
            "dark",
            "react-bits",
            "webgl",
            "fluid"
        ],
        "keywords": [
            "hero",
            "interactive",
            "fluid",
            "simulation",
            "canvas",
            "shader",
            "premium"
        ],
        "description": "A hyper-responsive WebGL fluid simulation known as 'SplashCursor'. Features high-performance fluid dynamics that react to cursor movement and clicks, layered behind luxury branding and typography.",
        "supports": {
            "cta": true
        },
        "requires": {
            "packages": [
                "framer-motion"
            ],
            "webgl": true
        },
        "quality": {
            "responsive": true,
            "a11yBaseline": true,
            "mobileFirst": true
        },
        "visualDescription": "High-impact fluid simulation with vibrant swirling colors on a dark background. Reacts dynamically to mouse input. Elegant centering of brand typography.",
        "colorProfile": {
            "primary": "#ffffff",
            "accents": [
                "#5227FF",
                "#FF9FFC"
            ],
            "mode": "dark",
            "warmth": "vibrant"
        },
        "suitableFor": [
            "tech-startup",
            "agency",
            "portfolio",
            "luxury-brand",
            "creative-studio"
        ],
        "moodTone": "high-tech, cinematic, immersive, luxurious, interactive",
        "typographyStyle": "clean sans-serif, minimalist, elegant, bold",
        "layoutType": "full-width, canvas background, centered content overlay",
        "preview": {
            "thumbnailUrl": null,
            "notes": "WebGL rendering; requires a browser with WebGL enabled."
        },
        "usage": {
            "importName": "HeroSplashCursor"
        },
        "files": [
            {
                "path": "src/components/premium/HeroSplashCursor.jsx",
                "type": "component",
                "content": combinedCode
            }
        ]
    };

    fs.writeFileSync(BUNDLE_PATH, JSON.stringify(bundle, null, 4));
    console.log(`Successfully created bundle: ${BUNDLE_PATH}`);

} catch (err) {
    console.error('ERROR during synchronization:', err);
    process.exit(1);
}

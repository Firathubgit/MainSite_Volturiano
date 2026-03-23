const fs = require('fs');
const path = require('path');

const AURORA_PATH = path.join(__dirname, 'src/components/premium/Aurora.jsx');
const HERO_PATH = path.join(__dirname, 'src/components/premium/HeroAuroraV2.jsx');
const BUNDLE_PATH = path.join(__dirname, 'server/lib/registry/bundles/hero.interaction.aurora.v1.json');

try {
    let auroraCode = fs.readFileSync(AURORA_PATH, 'utf8');
    let heroCode = fs.readFileSync(HERO_PATH, 'utf8');

    // 1. Remove export default from Aurora
    auroraCode = auroraCode.replace(/export default Aurora;/g, '');
    // Remove individual exports if any
    auroraCode = auroraCode.replace(/export function Aurora/g, 'function Aurora');

    // 2. Strip imports from HeroAuroraV2 (except framer-motion)
    // We want to remove the local Aurora import and the React import to prevent redeclaration
    heroCode = heroCode.replace(/import Aurora from '.\/Aurora';/g, '');
    heroCode = heroCode.replace(/import React from 'react';/g, '');
    heroCode = heroCode.replace(/import React, {.*} from 'react';/g, '');

    // 3. Ensure HeroAuroraV2 has its export default
    if (!heroCode.includes('export default')) {
        heroCode = heroCode.replace(/function HeroAuroraV2/g, 'export default function HeroAuroraV2');
    }

    const combinedCode = auroraCode + '\n\n' + heroCode;

    const bundle = {
        "id": "hero.interaction.aurora.v1",
        "category": "InteractionHero",
        "name": "Aurora Interaction Hero",
        "tags": [
            "premium",
            "interactive",
            "canvas",
            "dark",
            "react-bits",
            "webgl",
            "ogl"
        ],
        "keywords": [
            "hero",
            "interactive",
            "aurora",
            "canvas",
            "shader",
            "ogl",
            "premium"
        ],
        "description": "A stunning, interactive WebGL-powered animated canvas known as 'Aurora'. Featuring organic, flowing waves of light with highly refined, luxurious Hero typography and branding. Powered by OGL.",
        "supports": {
            "cta": true
        },
        "requires": {
            "packages": [
                "framer-motion",
                "ogl"
            ],
            "webgl": true
        },
        "quality": {
            "responsive": true,
            "a11yBaseline": true,
            "mobileFirst": true
        },
        "visualDescription": "High-end cinematic aurora lights shifting through a dark space with organic motion, behind elegant, high-end serif typography. Interactive shader-based interaction.",
        "colorProfile": {
            "primary": "#ffffff",
            "accents": [
                "#5227FF",
                "#7cff67"
            ],
            "mode": "dark",
            "warmth": "neutral"
        },
        "suitableFor": [
            "tech-startup",
            "agency",
            "portfolio",
            "luxury-brand"
        ],
        "moodTone": "high-tech, cinematic, immersive, luxurious, ethereal",
        "typographyStyle": "clean sans-serif, minimalist, elegant, serif",
        "layoutType": "full-width, canvas background, centered content overlay",
        "preview": {
            "thumbnailUrl": null,
            "notes": "WebGL rendering; requires a browser with WebGL enabled."
        },
        "usage": {
            "importName": "HeroAuroraV2"
        },
        "files": [
            {
                "path": "src/components/premium/HeroAuroraV2.jsx",
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

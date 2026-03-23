const fs = require('fs');
const path = require('path');

const BALATRO_PATH = path.join(__dirname, 'src/components/premium/Balatro.jsx');
const HERO_PATH = path.join(__dirname, 'src/components/premium/HeroBalatro.jsx');
const BUNDLE_PATH = path.join(__dirname, 'server/lib/registry/bundles/hero.interaction.balatro.v1.json');

try {
    let balatroCode = fs.readFileSync(BALATRO_PATH, 'utf8');
    let heroCode = fs.readFileSync(HERO_PATH, 'utf8');

    // 1. Remove export default from Balatro
    balatroCode = balatroCode.replace(/export default Balatro;/g, '');
    // Remove individual exports if any
    balatroCode = balatroCode.replace(/export function Balatro/g, 'function Balatro');

    // 2. Strip imports from HeroBalatro (except framer-motion)
    heroCode = heroCode.replace(/import Balatro from '.\/Balatro';/g, '');
    heroCode = heroCode.replace(/import React from 'react';/g, '');
    heroCode = heroCode.replace(/import React, {.*} from 'react';/g, '');

    // 3. Ensure HeroBalatro has its export default
    if (!heroCode.includes('export default')) {
        heroCode = heroCode.replace(/function HeroBalatro/g, 'export default function HeroBalatro');
    }

    const combinedCode = balatroCode + '\n\n' + heroCode;

    const bundle = {
        "id": "hero.interaction.balatro.v1",
        "category": "InteractionHero",
        "name": "Balatro Interaction Hero",
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
            "balatro",
            "canvas",
            "shader",
            "ogl",
            "premium"
        ],
        "description": "A stunning, interactive WebGL-powered animated canvas inspired by the Balatro aesthetic. Featuring organic, flowing waves of psychedelic colors with highly refined, luxurious Hero typography and branding. Powered by OGL.",
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
        "visualDescription": "High-end cinematic distorted waves of color shifting through a dark space with organic motion, behind elegant, high-end serif typography. Interactive shader-based interaction.",
        "colorProfile": {
            "primary": "#ffffff",
            "accents": [
                "#DE443B",
                "#006BB4"
            ],
            "mode": "dark",
            "warmth": "vibrant"
        },
        "suitableFor": [
            "tech-startup",
            "agency",
            "portfolio",
            "luxury-brand"
        ],
        "moodTone": "high-tech, cinematic, immersive, luxurious, ethereal, psychedelic",
        "typographyStyle": "clean sans-serif, minimalist, elegant, serif",
        "layoutType": "full-width, canvas background, centered content overlay",
        "preview": {
            "thumbnailUrl": null,
            "notes": "WebGL rendering; requires a browser with WebGL enabled."
        },
        "usage": {
            "importName": "HeroBalatro"
        },
        "files": [
            {
                "path": "src/components/premium/HeroBalatro.jsx",
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

const fs = require('fs');
const path = require('path');

const PRISMATIC_PATH = path.join(__dirname, 'src/components/premium/PrismaticBurst.jsx');
const HERO_PATH = path.join(__dirname, 'src/components/premium/HeroPrismaticBurst.jsx');
const CSS_PATH = path.join(__dirname, 'src/components/premium/PrismaticBurst.css');
const BUNDLE_PATH = path.join(__dirname, 'server/lib/registry/bundles/hero.interaction.prismaticburst.v1.json');

try {
    let prismaticCode = fs.readFileSync(PRISMATIC_PATH, 'utf8');
    let heroCode = fs.readFileSync(HERO_PATH, 'utf8');
    let cssCode = fs.readFileSync(CSS_PATH, 'utf8');

    // Remove 'use client'
    prismaticCode = prismaticCode.replace(/'use client';\r?\n/g, '');
    heroCode = heroCode.replace(/'use client';\r?\n/g, '');

    // 1. Clean up PrismaticBurst.jsx
    // Remove local CSS import
    prismaticCode = prismaticCode.replace(/import '.\/PrismaticBurst.css';/g, '');
    // Remove default export
    prismaticCode = prismaticCode.replace(/export default PrismaticBurst;/g, '');
    // Ensure the function itself is still available
    if (!prismaticCode.includes('function PrismaticBurst')) {
        prismaticCode = prismaticCode.replace(/export function PrismaticBurst/g, 'function PrismaticBurst');
    }

    // 2. Strip imports from HeroPrismaticBurst (except framer-motion)
    // We want to remove the local PrismaticBurst import and the React import to prevent redeclaration
    heroCode = heroCode.replace(/import PrismaticBurst from '.\/PrismaticBurst';/g, '');
    heroCode = heroCode.replace(/import React from 'react';/g, '');
    heroCode = heroCode.replace(/import React, {.*} from 'react';/g, '');

    // 3. Ensure HeroPrismaticBurst has its export default for the bundle
    if (!heroCode.includes('export default')) {
        heroCode = heroCode.replace(/function HeroPrismaticBurst/g, 'export default function HeroPrismaticBurst');
    }

    // 4. Inject CSS into a style tag within the component code for the bundle
    // We'll wrap the CSS in a string and inject it at the top of the file
    const cssInjection = `
const styles = \`${cssCode}\`;
if (typeof document !== 'undefined') {
    const styleTag = document.createElement('style');
    styleTag.textContent = styles;
    document.head.appendChild(styleTag);
}
`;

    const combinedCode = cssInjection + '\n\n' + prismaticCode + '\n\n' + heroCode;

    const bundle = {
        "id": "hero.interaction.prismaticburst.v1",
        "category": "InteractionHero",
        "name": "PrismaticBurst Interaction Hero",
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
            "prismatic",
            "burst",
            "volumetric",
            "shader",
            "premium"
        ],
        "description": "A cinematic volumetric light burst simulation known as 'PrismaticBurst'. Features high-fidelity shader dynamics that react to cursor movement, layered behind luxury branding and typography. Powered by OGL.",
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
        "visualDescription": "High-impact volumetric light bursts with organic noise motion on a dark background. Elegant centering of brand typography.",
        "colorProfile": {
            "primary": "#ffffff",
            "accents": [
                "#ffffff"
            ],
            "mode": "dark",
            "warmth": "neutral"
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
            "importName": "HeroPrismaticBurst"
        },
        "files": [
            {
                "path": "src/components/premium/HeroPrismaticBurst.jsx",
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

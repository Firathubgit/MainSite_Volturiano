const fs = require('fs');
const path = require('path');

const PRISM_PATH = path.join(__dirname, 'src/components/premium/Prism.jsx');
const HERO_PATH = path.join(__dirname, 'src/components/premium/HeroPrism.jsx');
const CSS_PATH = path.join(__dirname, 'src/components/premium/Prism.css');
const BUNDLE_PATH = path.join(__dirname, 'server/lib/registry/bundles/hero.interaction.prism.v1.json');

try {
    let prismCode = fs.readFileSync(PRISM_PATH, 'utf8');
    let heroCode = fs.readFileSync(HERO_PATH, 'utf8');
    let cssCode = fs.readFileSync(CSS_PATH, 'utf8');

    // Remove 'use client'
    prismCode = prismCode.replace(/'use client';\r?\n/g, '');
    heroCode = heroCode.replace(/'use client';\r?\n/g, '');

    // 1. Clean up Prism.jsx
    // Remove local CSS import
    prismCode = prismCode.replace(/import '.\/Prism.css';/g, '');
    // Remove default export
    prismCode = prismCode.replace(/export default Prism;/g, '');
    // Ensure the function itself is still available
    if (!prismCode.includes('function Prism')) {
        prismCode = prismCode.replace(/export function Prism/g, 'function Prism');
    }

    // 2. Strip imports from HeroPrism (except framer-motion)
    // We want to remove the local Prism import and the React import to prevent redeclaration
    heroCode = heroCode.replace(/import Prism from '.\/Prism';/g, '');
    heroCode = heroCode.replace(/import React from 'react';/g, '');
    heroCode = heroCode.replace(/import React, {.*} from 'react';/g, '');

    // 3. Ensure HeroPrism has its export default for the bundle
    if (!heroCode.includes('export default')) {
        heroCode = heroCode.replace(/function HeroPrism/g, 'export default function HeroPrism');
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

    const combinedCode = cssInjection + '\n\n' + prismCode + '\n\n' + heroCode;

    const bundle = {
        "id": "hero.interaction.prism.v1",
        "category": "InteractionHero",
        "name": "Prism Interaction Hero",
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
            "prism",
            "geometry",
            "light",
            "shader",
            "premium"
        ],
        "description": "A cinematic geometric light sculpture known as 'Prism'. Features shader-powered organic wobble and glow effects that react to cursor movement, layered behind luxury branding and typography. Powered by OGL.",
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
        "visualDescription": "High-impact geometric light sculpture with organic motion and vibrant glow on a dark background. Elegant centering of brand typography.",
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
            "importName": "HeroPrism"
        },
        "files": [
            {
                "path": "src/components/premium/HeroPrism.jsx",
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

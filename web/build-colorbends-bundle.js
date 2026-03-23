import fs from 'fs';

let rawTsx = fs.readFileSync('colorbends-temp.tsx', 'utf8');

// Strip TypeScript Types to make it valid JSX for the sandbox
rawTsx = rawTsx.replace(/type ColorBendsProps = \{[\s\S]*?\};\n/, '');
rawTsx = rawTsx.replace(/: ColorBendsProps/, '');
rawTsx = rawTsx.replace(/<HTMLDivElement \| null>/g, '');
rawTsx = rawTsx.replace(/<THREE\.WebGLRenderer \| null>/g, '');
rawTsx = rawTsx.replace(/<number \| null>/g, '');
rawTsx = rawTsx.replace(/<THREE\.ShaderMaterial \| null>/g, '');
rawTsx = rawTsx.replace(/<ResizeObserver \| null>/g, '');
rawTsx = rawTsx.replace(/<number>/g, '');
rawTsx = rawTsx.replace(/<THREE\.Vector2>/g, '');
rawTsx = rawTsx.replace(/<THREE\.Vector3\[\]>/g, '');
rawTsx = rawTsx.replace(/ as any/g, '');
rawTsx = rawTsx.replace(/ as THREE\.Vector2/g, '');
rawTsx = rawTsx.replace(/ as THREE\.Vector3/g, '');
rawTsx = rawTsx.replace(/ as Window/g, '');
rawTsx = rawTsx.replace(/ \(renderer as any\)/g, ' renderer');
rawTsx = rawTsx.replace(/\(THREE as any\)/g, 'THREE');
rawTsx = rawTsx.replace(/ as const/g, '');
rawTsx = rawTsx.replace(/\(colors \|\| \[\]\)\.filter\(Boolean\)\.slice\(0, MAX_COLORS\)\.map\(toVec3\)/g, '(colors || []).filter(Boolean).slice(0, MAX_COLORS).map(toVec3)');
rawTsx = rawTsx.replace(/hex: string/g, 'hex');
rawTsx = rawTsx.replace(/e: PointerEvent/g, 'e');

// Ensure lucide icon imports don't conflict, though we aren't importing any inside ColorBends itself.
const imports = `import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ArrowRight } from 'lucide-react';
`;

let componentBody = rawTsx.split(`export default function ColorBends`)[1];
componentBody = `export function ColorBends` + componentBody; // don't default export the inner component

const heroWrapper = `
// --- Hero Wrapper ---
export default function HeroColorBends() {
  return (
    <div className="relative w-full min-h-screen bg-[#050505] text-white flex items-center justify-center overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: \`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Montserrat:wght@300;400;500&display=swap');
        .font-premium { font-family: 'Cormorant Garamond', serif; }
        .font-sans-premium { font-family: 'Montserrat', sans-serif; }
      \`}} />
      
      {/* BACKGROUND: Color Bends WebGL */}
      <div className="absolute inset-0 z-0 opacity-80">
        <ColorBends
           rotation={45}
           speed={0.2}
           colors={["#5227FF","#FF9FFC","#7cff67"]}
           transparent={false}
           autoRotate={0}
           scale={1}
           frequency={1}
           warpStrength={1.5}
           mouseInfluence={1}
           parallax={0.5}
           noise={0.1}
         />
      </div>
      
      {/* CONTENT OVERLAY */}
      <div className="relative z-10 flex flex-col items-center justify-center max-w-4xl px-6 mx-auto text-center pointer-events-none">
        
        <h1 className="font-premium text-6xl md:text-8xl lg:text-9xl tracking-tight text-white mb-6 drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]" style={{ fontWeight: 300 }}>
          COLOR<span className="italic text-white/80">BENDS</span>
        </h1>
        
        <div className="w-16 h-[1px] bg-white/40 mx-auto mb-8"></div>
        
        <p className="font-sans-premium max-w-2xl mx-auto text-sm md:text-base text-gray-200 leading-loose font-light tracking-wide drop-shadow-md">
          A mesmerising sensory experience, shaped smoothly through algorithmic physics. Redefine luxury interaction and elevate your digital space.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-14 pointer-events-auto">
          <button className="font-sans-premium group flex items-center justify-center gap-3 px-10 py-4 text-[11px] uppercase tracking-[0.2em] text-white border border-white/20 bg-transparent transition-all hover:bg-white hover:text-black active:scale-95">
            Explore Features
          </button>
          
          <button className="font-sans-premium group flex items-center justify-center gap-3 px-10 py-4 text-[11px] uppercase tracking-[0.2em] text-white/70 hover:text-white transition-all active:scale-95">
            Book Demo
          </button>
        </div>
      </div>
    </div>
  );
}
`;

// Constants from original file
const originalConstants = rawTsx.split(`export default function ColorBends`)[0].replace(/import[\s\S]*?;/g, '').trim();

const fullJsxContent = `
${imports}
${originalConstants}

${componentBody}

${heroWrapper}
`.trim();


const bundlePath = 'c:/Users/Firat/Documents/Projects/MainSite_Volturiano/web/server/lib/registry/bundles/hero.interaction.colorbends.v1.json';
const catalogPath = 'c:/Users/Firat/Documents/Projects/MainSite_Volturiano/web/server/lib/registry/catalog.json';

const bundleObj = {
    "id": "hero.interaction.colorbends.v1",
    "category": "Hero",
    "name": "ColorBends Premium Hero",
    "tags": [
        "premium",
        "interactive",
        "canvas",
        "dark",
        "react-bits",
        "webgl",
        "three",
        "threejs"
    ],
    "keywords": [
        "hero",
        "animated",
        "colorbends",
        "luxury",
        "canvas",
        "dark",
        "premium",
        "threejs"
    ],
    "description": "A stunning, interactive WebGL-powered animated canvas utilizing THREE.js known as 'ColorBends'. Generates flowing waves of gradient colors with a highly refined, luxurious Hero typography overlay.",
    "supports": {
        "cta": true
    },
    "requires": {
        "packages": [
            "lucide-react",
            "three"
        ],
        "webgl": true
    },
    "quality": {
        "responsive": true,
        "a11yBaseline": true,
        "mobileFirst": true
    },
    "visualDescription": "A completely immersive dark canvas with a mesmerizing, flowing multi-color wave distortion. The abstract background seamlessly reacts to mouse movement behind elegant, high-end serif typography.",
    "colorProfile": {
        "primary": "#ffffff",
        "accents": [
            "#5227FF",
            "#FF9FFC",
            "#7cff67"
        ],
        "mode": "dark",
        "warmth": "vibrant"
    },
    "suitableFor": [
        "tech-startup",
        "agency",
        "portfolio",
        "freelancer",
        "entertainment",
        "web3"
    ],
    "notSuitableFor": [
        "medical",
        "law-firm",
        "childrens-education"
    ],
    "moodTone": "high-tech, mysterious, cinematic, immersive, luxurious",
    "typographyStyle": "clean sans-serif, minimalist, elegant, serif",
    "layoutType": "full-width, canvas background, centered content overlay",
    "preview": {
        "thumbnailUrl": null,
        "notes": "WebGL rendering; requires a browser with WebGL enabled."
    },
    "usage": {
        "importName": "HeroColorBends"
    },
    "files": [
        {
            "path": "src/components/premium/HeroColorBends.jsx",
            "type": "component",
            "content": fullJsxContent
        }
    ]
};

fs.writeFileSync(bundlePath, JSON.stringify(bundleObj, null, 4));

const catalogStr = fs.readFileSync(catalogPath, 'utf8');
const catalog = JSON.parse(catalogStr);

// Insert right after darkveil
let foundIndex = catalog.components.findIndex(c => c.id === 'hero.interaction.darkveil.v1');
if (foundIndex === -1) {
    foundIndex = catalog.components.length - 1;
}
catalog.components.splice(foundIndex + 1, 0, {
    "id": bundleObj.id,
    "category": bundleObj.category,
    "name": bundleObj.name,
    "tags": bundleObj.tags,
    "keywords": bundleObj.keywords,
    "description": bundleObj.description,
    "supports": bundleObj.supports,
    "requires": bundleObj.requires,
    "quality": bundleObj.quality,
    "visualDescription": bundleObj.visualDescription,
    "colorProfile": bundleObj.colorProfile,
    "suitableFor": bundleObj.suitableFor,
    "notSuitableFor": bundleObj.notSuitableFor,
    "moodTone": bundleObj.moodTone,
    "typographyStyle": bundleObj.typographyStyle,
    "layoutType": bundleObj.layoutType,
    "preview": bundleObj.preview
});

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 4));

console.log("Successfully created hero.interaction.colorbends.v1.json bundle and injected it into catalog.json");

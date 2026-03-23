import fs from 'fs';

const bundlePath = 'c:/Users/Firat/Documents/Projects/MainSite_Volturiano/web/server/lib/registry/bundles/hero.interaction.darkveil.v1.json';
const catalogPath = 'c:/Users/Firat/Documents/Projects/MainSite_Volturiano/web/server/lib/registry/catalog.json';

const bundleStr = fs.readFileSync(bundlePath, 'utf8');
const bundle = JSON.parse(bundleStr);

// The new premium React wrapper
const newWrapper = `// --- Hero Wrapper ---
export default function HeroDarkVeil() {
  return (
    <div className="relative w-full min-h-screen bg-[#050505] text-white flex items-center justify-center overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: \\\`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Montserrat:wght@300;400;500&display=swap');
        .font-premium { font-family: 'Cormorant Garamond', serif; }
        .font-sans-premium { font-family: 'Montserrat', sans-serif; }
      \\\`}} />
      
      {/* BACKGROUND: Dark Veil WebGL */}
      <div className="absolute inset-0 z-0 opacity-85">
        <DarkVeil 
          hueShift={-40} 
          noiseIntensity={0.12} 
          scanlineIntensity={0.3} 
          speed={0.15} 
          scanlineFrequency={250} 
          warpAmount={0.9} 
          resolutionScale={1.2}
        />
      </div>
      
      {/* CONTENT OVERLAY */}
      <div className="relative z-10 flex flex-col items-center justify-center max-w-4xl px-6 mx-auto text-center">
        
        <h1 className="font-premium text-6xl md:text-8xl lg:text-9xl tracking-tight text-white mb-6 drop-shadow-2xl" style={{ fontWeight: 300 }}>
          DARK<span className="italic text-white/70">VEIL</span>
        </h1>
        
        <div className="w-16 h-[1px] bg-white/30 mx-auto mb-8"></div>
        
        <p className="font-sans-premium max-w-2xl mx-auto text-sm md:text-base text-gray-300 leading-loose font-light tracking-wide">
          Experience the pinnacle of digital luxury and refined aesthetics, tailored for modern brands seeking to make a lasting impression in an immersive landscape.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-14">
          <button className="font-sans-premium group flex items-center justify-center gap-3 px-10 py-4 text-[11px] uppercase tracking-[0.2em] text-white border border-white/20 bg-transparent transition-all hover:bg-white hover:text-black active:scale-95">
            Discover Collection
          </button>
          
          <button className="font-sans-premium group flex items-center justify-center gap-3 px-10 py-4 text-[11px] uppercase tracking-[0.2em] text-white/60 hover:text-white transition-all active:scale-95">
            Contact Concierge
          </button>
        </div>
      </div>
    </div>
  );
}
`;

let contentStart = bundle.files[0].content.split('// --- Hero Wrapper ---')[0];
bundle.files[0].content = contentStart + newWrapper;

// Update the description in the bundle
bundle.description = "A stunning animated canvas background known as 'DarkVeil', overlaid with a luxurious and deeply elegant Hero typography section. Features premium serif fonts and refined styling.";
bundle.visualDescription = "A completely immersive dark canvas with a subtle, shifting misty aurora-like veil (Dark Veil). The abstract background seamlessly loops behind elegant, high-end serif typography.";

fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 4));

// Update the same metadata in catalog.json
const catalogStr = fs.readFileSync(catalogPath, 'utf8');
const catalog = JSON.parse(catalogStr);

const darkveilEntry = catalog.components.find(c => c.id === 'hero.interaction.darkveil.v1');
if (darkveilEntry) {
    darkveilEntry.description = bundle.description;
    darkveilEntry.visualDescription = bundle.visualDescription;
    darkveilEntry.keywords = ["hero", "animated", "darkveil", "luxury", "canvas", "dark", "premium"];
}
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 4));

console.log("Updated DarkVeil component styling and metadata.");

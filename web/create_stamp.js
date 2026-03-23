import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const base64Data = fs.readFileSync(path.join(__dirname, 'src/assets/Logo/TornadoLogo.b64'), 'utf8').trim();

const jsxContent = `import React from 'react';

/**
 * Volturiano Branding Stamp
 * This component is automatically injected into published sites.
 */
export default function VolturianoStamp() {
    // Inject the CSS inline to avoid needing an external stylesheet
    React.useEffect(() => {
        if (!document.getElementById('volturiano-stamp-styles')) {
            const style = document.createElement('style');
            style.id = 'volturiano-stamp-styles';
            style.innerHTML = \`
.stampWrapper { display: flex; justify-content: center; align-items: center; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.1); }
.volturianoStamp { position: fixed; bottom: 16px; right: 16px; z-index: 999999; display: inline-flex; align-items: center; justify-content: flex-start; gap: 0; padding: 0px 5px; width: 55px; height: 55px; border-radius: 14px; text-decoration: none; overflow: hidden; white-space: nowrap; border: 2px solid transparent; background-image: linear-gradient(to bottom, #0a0a0a, #141414), linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(80,80,80,0.5) 50%, rgba(255,255,255,0.8) 100%); background-origin: padding-box, border-box; background-clip: padding-box, border-box; box-shadow: 0px 4px 30px -5px rgba(255, 255, 255, 0.15); transition: width 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), padding 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease, transform 0.3s ease; transform: scale(0.8); transform-origin: right bottom; }
.volturianoStamp:hover { width: 230px; padding: 0px 20px; box-shadow: 0px 8px 40px -4px rgba(255, 255, 255, 0.35); transform: scale(0.8) translateY(-2px); }
.stampContent { display: flex; align-items: center; gap: 15px; opacity: 0; max-width: 0; padding-right: 0; overflow: hidden; transition: max-width 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.4s ease-out, padding-right 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.4s ease-out; transform: translateX(10px); }
.volturianoStamp:hover .stampContent { opacity: 1; max-width: 200px; padding-right: 15px; transform: translateX(0); }
.stampText { position: relative; z-index: 2; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif; font-size: 14px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; background: linear-gradient(to bottom, #ffffff 0%, #b0b0b0 100%); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); white-space: nowrap; }
.stampSeparator { width: 1.5px; height: 24px; background: linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.5)); border-radius: 10px; opacity: 0.9; margin-top: 2px; flex-shrink: 0; display: block; }
.stampLogo { height: 45px; width: auto; display: block; filter: brightness(0) invert(1); opacity: 0.95; margin-top: -1px; flex-shrink: 0; margin-left: auto; margin-right: auto; }
            \`;
            document.head.appendChild(style);
        }
    }, []);

    return (
        <a 
            href="https://volturiano.com/builder" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="volturianoStamp"
        >
            <div className="stampContent">
                <span className="stampText">POWERED BY</span>
                <div className="stampSeparator" />
            </div>
            <img 
                src={"data:image/png;base64,${base64Data}"} 
                alt="Volturiano" 
                className="stampLogo" 
            />
        </a>
    );
}
`;

fs.writeFileSync(path.join(__dirname, 'server/lib/templates/VolturianoStamp.jsx'), jsxContent);
console.log('Successfully wrote server/lib/templates/VolturianoStamp.jsx');

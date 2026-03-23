import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const html = `
<!DOCTYPE html>
<html>
<head>
    <style>body, html { margin: 0; width: 100%; height: 100%; background: #000; }</style>
    <!-- Import Maps -->
    <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js"
      }
    }
    </script>
</head>
<body>
    <div id="container" style="width:100%; height:100%;"></div>
    <script type="module">
        import * as THREE from 'three';

        // Add a console.error hook
        window.onerror = function(msg, url, lineNo, columnNo, error) {
            console.error('Window Error:', msg, lineNo);
        };

        const MAX_COLORS = 8;
        const frag = \`
        #ifdef GL_ES
        precision highp float;
        #endif
        #define MAX_COLORS \${MAX_COLORS}
        uniform vec2 uCanvas;
        uniform float uTime;
        uniform float uSpeed;
        uniform vec2 uRot;
        uniform int uColorCount;
        uniform vec3 uColors[MAX_COLORS];
        uniform int uTransparent;
        uniform float uScale;
        uniform float uFrequency;
        uniform float uWarpStrength;
        uniform vec2 uPointer; // in NDC [-1,1]
        uniform float uMouseInfluence;
        uniform float uParallax;
        uniform float uNoise;
        varying vec2 vUv;

        void main() {
          float t = uTime * uSpeed;
          vec2 p = vUv * 2.0 - 1.0;
          p += uPointer * uParallax * 0.1;
          vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
          vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);
          q /= max(uScale, 0.0001);
          q /= 0.5 + 0.2 * dot(q, q);
          q += 0.2 * cos(t) - 7.56;
          vec2 toward = (uPointer - rp);
          q += toward * uMouseInfluence * 0.2;

            vec3 col = vec3(0.0);
            float a = 1.0;

            if (uColorCount > 0) {
              vec2 s = q;
              vec3 sumCol = vec3(0.0);
              float cover = 0.0;
              for (int i = 0; i < MAX_COLORS; ++i) {
                    if (i >= uColorCount) break;
                    s -= 0.01;
                    vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
                    float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
                    float kBelow = clamp(uWarpStrength, 0.0, 1.0);
                    float kMix = pow(kBelow, 0.3); // strong response across 0..1
                    float gain = 1.0 + max(uWarpStrength - 1.0, 0.0); // allow >1 to amplify displacement
                    vec2 disp = (r - s) * kBelow;
                    vec2 warped = s + disp * gain;
                    float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
                    float m = mix(m0, m1, kMix);
                    float w = 1.0 - exp(-6.0 / exp(6.0 * m));
                    sumCol += uColors[i] * w;
                    cover = max(cover, w);
              }
              col = clamp(sumCol, 0.0, 1.0);
              a = uTransparent > 0 ? cover : 1.0;
            } else {
                vec2 s = q;
                for (int k = 0; k < 3; ++k) {
                    s -= 0.01;
                    vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
                    float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(k)) / 4.0);
                    float kBelow = clamp(uWarpStrength, 0.0, 1.0);
                    float kMix = pow(kBelow, 0.3);
                    float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
                    vec2 disp = (r - s) * kBelow;
                    vec2 warped = s + disp * gain;
                    float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(k)) / 4.0);
                    float m = mix(m0, m1, kMix);
                    col[k] = 1.0 - exp(-6.0 / exp(6.0 * m));
                }
                a = uTransparent > 0 ? max(max(col.r, col.g), col.b) : 1.0;
            }

            if (uNoise > 0.0001) {
              float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);
              col += (n - 0.5) * uNoise;
              col = clamp(col, 0.0, 1.0);
            }

            vec3 rgb = (uTransparent > 0) ? col * a : col;
            gl_FragColor = vec4(rgb, a);
        }
        \`;

        const vert = \`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
        \`;

        // init
        const container = document.getElementById('container');
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const geometry = new THREE.PlaneGeometry(2, 2);
        
        const uColorsArray = Array.from({ length: 8 }, () => new THREE.Vector3(0, 0, 0));
        
        // mock colors
        uColorsArray[0].set(0.32, 0.15, 1.0);
        uColorsArray[1].set(1.0, 0.62, 0.98);
        uColorsArray[2].set(0.48, 1.0, 0.4);

        const material = new THREE.ShaderMaterial({
          vertexShader: vert,
          fragmentShader: frag,
          uniforms: {
            uCanvas: { value: new THREE.Vector2(800, 600) },
            uTime: { value: 0 },
            uSpeed: { value: 0.2 },
            uRot: { value: new THREE.Vector2(1, 0) },
            uColorCount: { value: 3 },
            uColors: { value: uColorsArray },
            uTransparent: { value: 0 },
            uScale: { value: 1 },
            uFrequency: { value: 1 },
            uWarpStrength: { value: 1.5 },
            uPointer: { value: new THREE.Vector2(0, 0) },
            uMouseInfluence: { value: 1 },
            uParallax: { value: 0.5 },
            uNoise: { value: 0.1 }
          },
          premultipliedAlpha: true,
          transparent: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        renderer.setSize(800, 600);
        container.appendChild(renderer.domElement);

        try {
            renderer.render(scene, camera);
            console.log('RENDER SUCCESSFUL! pixel buffer checking...');
            
            const gl = renderer.getContext();
            const pixels = new Uint8Array(4);
            gl.readPixels(400, 300, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            console.log("PIXEL AT CENTER:", pixels);
        } catch (err) {
            console.error('RENDER FATAL:', err.message);
        }
        
        setTimeout(() => console.log('DONE_TEST'), 1000);
    </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'test-shader.html'), html);

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        console.log(\`Browser Log [\${msg.type()}]: \${msg.text()}\`);
    });
    page.on('pageerror', err => {
        console.log(\`Browser Error: \${err.message}\`);
    });

    await page.goto(\`file://\${path.join(__dirname, 'test-shader.html')}\`);
    
    // wait for DONE_TEST
    await page.waitForFunction(() => {
        return new Promise(resolve => setTimeout(resolve, 1500)).then(() => true);
    });

    await browser.close();
})();

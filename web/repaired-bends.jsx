import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ArrowRight } from 'lucide-react';

const MAX_COLORS = 8;

const frag = `
  #ifdef GL_ES
  precision highp float;
  #endif
  #define MAX_COLORS 8
  uniform vec2 uCanvas;
  uniform float uTime;
  uniform float uSpeed;
  uniform vec2 uRot;
  uniform int uColorCount;
  uniform vec3 uColors[8];
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
      for (int i = 0; i < 8; ++i) {
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
      a = uTransparent > 0 ? clamp(cover, 0.0, 1.0) : 1.0;
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
        a = uTransparent > 0 ? clamp(max(max(col.r, col.g), col.b), 0.0, 1.0) : 1.0;
    }

    if (uNoise > 0.0001) {
      float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);
      col += (n - 0.5) * uNoise;
      col = clamp(col, 0.0, 1.0);
    }

    vec3 rgb = (uTransparent > 0) ? col * a : col;
    gl_FragColor = vec4(rgb, a);
}
`;

const vert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const toVec3 = (hex) => {
  const h = String(hex || '#000000').replace('#', '').trim();
  const v = h.length === 3
    ? [parseInt(h[0] + h[0], 16) || 0, parseInt(h[1] + h[1], 16) || 0, parseInt(h[2] + h[2], 16) || 0]
    : [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
  return new THREE.Vector3(v[0] / 255, v[1] / 255, v[2] / 255);
};

export function ColorBends({
  className,
  style,
  rotation = 45,
  speed = 0.2,
  colors = [],
  transparent = true,
  autoRotate = 0,
  scale = 1,
  frequency = 1,
  warpStrength = 1,
  mouseInfluence = 1,
  parallax = 0.5,
  noise = 0.1
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const rafRef = useRef(null);
  const materialRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const rotationRef = useRef(rotation);
  const autoRotateRef = useRef(autoRotate);
  const pointerTargetRef = useRef(new THREE.Vector2(0, 0));
  const pointerCurrentRef = useRef(new THREE.Vector2(0, 0));
  const pointerSmoothRef = useRef(8);

  useEffect(() => {
    const container = containerRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const geometry = new THREE.PlaneGeometry(2, 2);
    const initialArr = (colors || []).filter(Boolean).slice(0, MAX_COLORS).map(toVec3);
    const uColorsArray = Array.from({ length: MAX_COLORS }, (_, i) =>
      i < initialArr.length ? initialArr[i] : new THREE.Vector3(0, 0, 0)
    );
    const material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uCanvas: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uSpeed: { value: speed },
        uRot: { value: new THREE.Vector2(1, 0) },
        uColorCount: { value: initialArr.length },
        uColors: { value: uColorsArray },
        uTransparent: { value: transparent ? 1 : 0 },
        uScale: { value: scale },
        uFrequency: { value: frequency },
        uWarpStrength: { value: warpStrength },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uMouseInfluence: { value: mouseInfluence },
        uParallax: { value: parallax },
        uNoise: { value: noise }
      },
      premultipliedAlpha: true,
      transparent: true
    });
    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      alpha: true
    });
    rendererRef.current = renderer;
    (renderer).outputColorSpace = (THREE).SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, transparent ? 0 : 1);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    let startTime = performance.now();
    let lastTime = startTime;

    const handleResize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      (material.uniforms.uCanvas.value).set(w, h);
    };

    handleResize();

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(handleResize);
      ro.observe(container);
      resizeObserverRef.current = ro;
    } else {
      (window).addEventListener('resize', handleResize);
    }

    const loop = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      const elapsed = (now - startTime) / 1000;
      lastTime = now;
      material.uniforms.uTime.value = elapsed;

      const deg = (rotationRef.current % 360) + autoRotateRef.current * elapsed;
      const rad = (deg * Math.PI) / 180;
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      (material.uniforms.uRot.value).set(c, s);

      const cur = pointerCurrentRef.current;
      const tgt = pointerTargetRef.current;
      const amt = Math.min(1, dt * pointerSmoothRef.current);
      cur.lerp(tgt, amt);
      (material.uniforms.uPointer.value).copy(cur);
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      else (window).removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const material = materialRef.current;
    const renderer = rendererRef.current;
    if (!material) return;

    rotationRef.current = rotation;
    autoRotateRef.current = autoRotate;
    material.uniforms.uSpeed.value = speed;
    material.uniforms.uScale.value = scale;
    material.uniforms.uFrequency.value = frequency;
    material.uniforms.uWarpStrength.value = warpStrength;
    material.uniforms.uMouseInfluence.value = mouseInfluence;
    material.uniforms.uParallax.value = parallax;
    material.uniforms.uNoise.value = noise;

    const arr = (colors || []).filter(Boolean).slice(0, MAX_COLORS).map(toVec3);
    material.uniforms.uColors.value = Array.from({ length: MAX_COLORS }, (_, i) =>
      i < arr.length ? arr[i].clone() : new THREE.Vector3(0, 0, 0)
    );
    material.uniforms.uColorCount.value = arr.length;

    material.uniforms.uTransparent.value = transparent ? 1 : 0;
    if (renderer) renderer.setClearColor(0x000000, transparent ? 0 : 1);
  }, [
    rotation,
    autoRotate,
    speed,
    scale,
    frequency,
    warpStrength,
    mouseInfluence,
    parallax,
    noise,
    colors,
    transparent
  ]);

  useEffect(() => {
    const material = materialRef.current;
    const container = containerRef.current;
    if (!material || !container) return;

    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      const y = -(((e.clientY - rect.top) / (rect.height || 1)) * 2 - 1);
      pointerTargetRef.current.set(x, y);
    };

    container.addEventListener('pointermove', handlePointerMove);
    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  return <div ref={containerRef} className={`w-full h-full relative overflow-hidden ${className}`} style={style} />;
}



// --- Hero Wrapper ---
export default function HeroColorBends() {
  return (
    <div className="relative w-full min-h-screen bg-[#050505] text-white flex items-center justify-center overflow-hidden">
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Montserrat:wght@300;400;500&display=swap');
        .font-premium { font-family: 'Cormorant Garamond', serif; }
        .font-sans-premium { font-family: 'Montserrat', sans-serif; }
      `}} />

      {/* BACKGROUND: Color Bends WebGL */}
      <div className="absolute inset-0 z-0 opacity-80">
        <ColorBends
          rotation={45}
          speed={0.2}
          colors={["#5227FF", "#FF9FFC", "#7cff67"]}
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
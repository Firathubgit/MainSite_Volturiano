import React, { Suspense, useEffect, useRef, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const CAR_MODEL_URL = new URL('../../assets/3DConfigurator/VolturianoGLB.glb', import.meta.url).href;

function VolturianoCar({ bodyColor = '#FF4520', rimColor = '#111111', onMaterialsReady }) {
  const gltf = useGLTF(CAR_MODEL_URL);
  const bodyMatRef = useRef(null);
  const rimMatRef = useRef(null);

  useEffect(() => {
    console.log('[Viewer3D] GLTF loaded:', gltf);
    console.log('[Viewer3D] GLTF scene:', gltf?.scene);
    console.log('[Viewer3D] CAR_MODEL_URL:', CAR_MODEL_URL);
  }, [gltf]);

  useEffect(() => {
    if (!gltf?.scene) {
      console.warn('[Viewer3D] No scene found in GLTF');
      return;
    }

    gltf.scene.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (!material) return;
        
        // Enable environment map usage for all materials
        if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
          material.envMapIntensity = 1.0;
          material.needsUpdate = true;
        }
        
        if (material.name === 'Mat_BodyPaint') {
          bodyMatRef.current = material;
          // Enhance car paint material for better reflections
          if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
            material.metalness = 0.8;
            material.roughness = 0.2;
            material.envMapIntensity = 1.5; // Stronger reflections for car paint
          }
        }
        if (material.name === 'Mat_RimPaint') {
          rimMatRef.current = material;
          // Rim material settings
          if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
            material.metalness = 0.9;
            material.roughness = 0.1;
            material.envMapIntensity = 1.2;
          }
        }
      });
    });

    if (onMaterialsReady) {
      onMaterialsReady({
        setBodyColor: (hex) => bodyMatRef.current?.color.set(hex),
        setRimColor: (hex) => rimMatRef.current?.color.set(hex),
      });
    }
  }, [gltf, onMaterialsReady]);

  useEffect(() => {
    if (bodyColor && bodyMatRef.current) {
      bodyMatRef.current.color.set(bodyColor);
    }
  }, [bodyColor]);

  useEffect(() => {
    if (rimColor && rimMatRef.current) {
      rimMatRef.current.color.set(rimColor);
    }
  }, [rimColor]);

  useEffect(() => {
    if (gltf?.scene) {
      // Scale up the car to feel more present in the studio
      gltf.scene.scale.set(2, 2, 2);
      // Position car on the ground (adjust Y if needed)
      gltf.scene.position.y = 0;
    }
  }, [gltf]);

  if (!gltf?.scene) return null;
  return <primitive object={gltf.scene} dispose={null} />;
}

// Dark geometric environment background
function GeometricBackground() {
  const { scene, gl } = useThree();
  const envMapRef = useRef();

  useEffect(() => {
    // Create a dark environment map for reflections
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');

    // Dark radial gradient background (darker at edges, slightly lighter in center)
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(0.3, '#0f0f0f');
    gradient.addColorStop(0.7, '#080808');
    gradient.addColorStop(1, '#000000');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    // Add subtle geometric grid pattern (like moodboard)
    context.strokeStyle = '#1a1a1a';
    context.lineWidth = 0.5;
    const gridSize = 64;
    for (let i = 0; i <= size; i += gridSize) {
      context.beginPath();
      context.moveTo(i, 0);
      context.lineTo(i, size);
      context.stroke();
      context.beginPath();
      context.moveTo(0, i);
      context.lineTo(size, i);
      context.stroke();
    }

    // Add diagonal pattern overlay (subtle)
    context.strokeStyle = '#151515';
    context.lineWidth = 0.3;
    const diagonalSpacing = 40;
    for (let i = -size; i <= size * 2; i += diagonalSpacing) {
      context.beginPath();
      context.moveTo(i, 0);
      context.lineTo(i + size, size);
      context.stroke();
    }

    // Convert canvas to texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.needsUpdate = true;

    // Create PMREM generator for environment map using the scene's renderer
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    pmremGenerator.dispose();
    texture.dispose();

    scene.environment = envMap;
    scene.background = new THREE.Color(0x0a0a0a); // Dark background matching moodboard
    envMapRef.current = envMap;

    return () => {
      if (envMapRef.current) {
        envMapRef.current.dispose();
      }
    };
  }, [scene, gl]);

  return null;
}

// Geometric wall panels for depth - matching moodboard aesthetic
function GeometricWalls() {
  const wallsRef = useRef();

  const wallGeometry = useMemo(() => {
    const group = new THREE.Group();
    
    // Create geometric panels on back wall (staggered/interlocking pattern)
    const panelCount = 24;
    const baseZ = -18;
    
    for (let i = 0; i < panelCount; i++) {
      const width = 6 + Math.random() * 4;
      const height = 6 + Math.random() * 4;
      const depth = 0.15 + Math.random() * 0.1;
      
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0, 0, 0.06 + Math.random() * 0.04),
          roughness: 0.85,
          metalness: 0.05,
        })
      );
      
      // Staggered positioning for interlocking effect
      const x = (Math.random() - 0.5) * 35;
      const y = (Math.random() - 0.5) * 18 + 6;
      const z = baseZ + (Math.random() - 0.5) * 0.5;
      
      panel.position.set(x, y, z);
      panel.rotation.y = (Math.random() - 0.5) * 0.05;
      panel.rotation.x = (Math.random() - 0.5) * 0.02;
      group.add(panel);
    }
    
    return group;
  }, []);

  return <primitive ref={wallsRef} object={wallGeometry} />;
}

function GroundPlane() {
  const { scene } = useThree();
  const groundRef = useRef();

  useEffect(() => {
    if (!groundRef.current) return;
    
    // Dark geometric floor matching moodboard aesthetic (staggered/interlocking pattern)
    const material = new THREE.MeshStandardMaterial({
      color: '#151515', // Very dark gray
      roughness: 0.7,
      metalness: 0.15,
      envMap: scene.environment,
      envMapIntensity: 0.2,
      receiveShadow: true,
    });
    
    groundRef.current.material = material;
  }, [scene.environment]);

  return (
    <mesh
      ref={groundRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[200, 200, 60, 60]} />
    </mesh>
  );
}

export function Viewer3D({ bodyColor, rimColor, onMaterialsReady }) {
  return (
    <div style={{ aspectRatio: '16/9', borderRadius: '10px', overflow: 'hidden' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [6, 1.8, 8], fov: 50 }}
        gl={{ 
          toneMappingExposure: 1.2, // Adjusted for dark environment
          toneMapping: THREE.ACESFilmicToneMapping,
          physicallyCorrectLights: true
        }}
      >
        <Suspense fallback={null}>
          <GeometricBackground />
          <GeometricWalls />
          <GroundPlane />
          <VolturianoCar bodyColor={bodyColor} rimColor={rimColor} onMaterialsReady={onMaterialsReady} />
        </Suspense>
        
        {/* Lighting optimized for dark geometric environment */}
        <ambientLight intensity={0.4} color="#ffffff" />
        <directionalLight 
          position={[10, 12, 8]} 
          intensity={1.2} 
          castShadow 
          color="#ffffff"
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-8, 10, -6]} intensity={0.6} color="#ffffff" />
        <pointLight position={[0, 8, 0]} intensity={0.5} color="#ffffff" />
        
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          minDistance={4}
          maxDistance={25}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2.2}
          target={[0, 0.5, 0]} // Focus point slightly above ground (car center)
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload(CAR_MODEL_URL);


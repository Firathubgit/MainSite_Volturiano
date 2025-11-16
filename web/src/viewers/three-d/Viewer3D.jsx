import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const CAR_MODEL_URL = new URL('../../assets/3DConfigurator/VolturianoGLB.glb', import.meta.url).href;

// Custom HDRI environment map - using URL for .exr file
const CUSTOM_HDRI_URL = new URL('../../assets/3DConfigurator/studio_small_06_4k.exr', import.meta.url).href;

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

function GroundPlane() {
  const { scene } = useThree();
  const groundRef = useRef();

  useEffect(() => {
    if (!groundRef.current || !scene.environment) return;
    
    // Get environment map from scene
    const envMap = scene.environment;
    
    // Premium polished concrete/stone material - Polestar/Lamborghini style
    const material = new THREE.MeshPhysicalMaterial({
      color: '#fafafa', // Very light gray - bright but not pure white, like Polestar's floor
      roughness: 0.05, // Extremely polished, mirror-like
      metalness: 0.0,
      clearcoat: 0.5, // Adds that premium glossy finish
      clearcoatRoughness: 0.1,
      envMap: envMap,
      envMapIntensity: 1.2, // Strong reflections
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
      <planeGeometry args={[200, 200]} />
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
          toneMappingExposure: 1.5, // Brighter exposure for premium showroom feel
          toneMapping: THREE.ACESFilmicToneMapping,
          physicallyCorrectLights: true
        }}
      >
        {/* Custom HDRI environment map - studio_small_06 from Poly Haven */}
        <Suspense fallback={null}>
          <Environment 
            files={CUSTOM_HDRI_URL}
            resolution={512}
            background={true}
            environmentIntensity={1.8}
          />
          <GroundPlane />
          <VolturianoCar bodyColor={bodyColor} rimColor={rimColor} onMaterialsReady={onMaterialsReady} />
        </Suspense>
        
        {/* Subtle fill lights - HDRI provides primary lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 12, 8]} intensity={0.4} castShadow />
        <directionalLight position={[-8, 10, -6]} intensity={0.2} />
        
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


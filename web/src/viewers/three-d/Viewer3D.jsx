import React, { Suspense, useEffect, useRef, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Use public folder path for reliable production builds
// This ensures the GLB file is always accessible in both dev and production
const CAR_MODEL_URL = '/VolturianoGLB.glb';

function VolturianoCar({ bodyColor = '#FF4520', rimColor = '#111111', onMaterialsReady }) {
  const gltf = useGLTF(CAR_MODEL_URL, true); // true = useDraco for compression if available
  const bodyMatRef = useRef(null);
  const rimMatRef = useRef(null);

  useEffect(() => {
    console.log('[Viewer3D] GLTF loaded:', gltf);
    console.log('[Viewer3D] GLTF scene:', gltf?.scene);
    console.log('[Viewer3D] CAR_MODEL_URL:', CAR_MODEL_URL);
    
    if (gltf?.scene) {
      // Check for texture loading issues
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            if (material) {
              // Log texture status
              if (material.map && !material.map.image) {
                console.warn('[Viewer3D] Material', material.name, 'has map but image not loaded');
              }
              if (material.map && material.map.image) {
                console.log('[Viewer3D] Material', material.name, 'texture loaded:', material.map.image.src);
              }
            }
          });
        }
      });
    }
  }, [gltf]);

  useEffect(() => {
    if (!gltf?.scene) {
      console.warn('[Viewer3D] No scene found in GLTF');
      return;
    }

    // Log all meshes and materials for debugging
    const allMaterials = new Set();
    const allMeshes = [];
    
    gltf.scene.traverse((child) => {
      if (!child.isMesh) return;
      
      // Set shadow properties on mesh (not material)
      child.castShadow = true;
      child.receiveShadow = true;
      
      allMeshes.push({
        name: child.name,
        material: child.material
      });

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (!material) return;
        
        allMaterials.add(material.name || 'unnamed');
        
        // Ensure all materials are properly initialized
        // This is critical for base mesh materials that don't change color
        if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
          material.needsUpdate = true;
          
          // Ensure textures are properly loaded
          if (material.map) {
            material.map.needsUpdate = true;
          }
          if (material.normalMap) {
            material.normalMap.needsUpdate = true;
          }
          if (material.roughnessMap) {
            material.roughnessMap.needsUpdate = true;
          }
          if (material.metalnessMap) {
            material.metalnessMap.needsUpdate = true;
          }
        }
        
        // Handle paint materials (for color changes)
        if (material.name === 'Mat_BodyPaint') {
          bodyMatRef.current = material;
          // Enhance car paint material for dark environment
          if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
            material.metalness = 0.8;
            material.roughness = 0.2;
          }
        }
        if (material.name === 'Mat_RimPaint') {
          rimMatRef.current = material;
          // Rim material settings
          if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
            material.metalness = 0.9;
            material.roughness = 0.1;
          }
        }
      });
    });
    
    console.log('[Viewer3D] Found meshes:', allMeshes.length);
    console.log('[Viewer3D] Found materials:', Array.from(allMaterials));
    console.log('[Viewer3D] Mesh details:', allMeshes.map(m => ({ name: m.name, materialName: Array.isArray(m.material) ? m.material.map(mat => mat.name) : m.material?.name })));

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

// Geometric Environment Background Component
function GeometricEnvironment() {
  const groupRef = useRef();

  // Create dense wireframe buildings surrounding the car on all sides
  const buildings = useMemo(() => {
    const buildingGroup = new THREE.Group();
    
    // Use seeded random for consistent results
    let seed = 12345;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    // Create dense grid of buildings surrounding the car
    // Grid covers all directions: front, back, left, right
    const gridSpacing = 4; // Spacing between buildings
    const gridSizeX = 30; // Number of buildings in X direction (left-right)
    const gridSizeZ = 25; // Number of buildings in Z direction (front-back)
    
    // Minimum distance from car center - buildings start further away
    const minDistanceFromCar = 18;
    
    for (let x = -gridSizeX; x <= gridSizeX; x++) {
      for (let z = -gridSizeZ; z <= gridSizeZ; z++) {
        const posX = x * gridSpacing;
        const posZ = z * gridSpacing;
        
        // Skip buildings too close to the car
        const distanceFromCar = Math.sqrt(posX * posX + posZ * posZ);
        if (distanceFromCar < minDistanceFromCar) continue;
        
        // Add some randomness to skip some positions for more organic feel
        // But keep it dense (80% chance to place a building)
        if (random() > 0.2) {
          const height = 6 + random() * 14;
          const width = 1.5 + random() * 2.5;
          const depth = 1.5 + random() * 2.5;
          
          // Vary position slightly for more natural look
          const finalX = posX + (random() - 0.5) * 1.2;
          const finalZ = posZ + (random() - 0.5) * 1.2;
          
          // Create wireframe box
          const geometry = new THREE.BoxGeometry(width, height, depth);
          const edges = new THREE.EdgesGeometry(geometry);
          const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ 
              color: '#ffffff', 
              opacity: 0.15,
              transparent: true 
            })
          );
          
          line.position.set(finalX, height / 2, finalZ);
          buildingGroup.add(line);
        }
      }
    }

    return buildingGroup;
  }, []);

  // Create diagonal line pattern background
  const diagonalLines = useMemo(() => {
    const lineGroup = new THREE.Group();
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: '#ffffff', 
      opacity: 0.08,
      transparent: true 
    });

    // Use seeded random for consistent results
    let seed = 67890;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    // Create diagonal lines across the background
    for (let i = 0; i < 50; i++) {
      const points = [];
      const x = (random() - 0.5) * 100;
      const y = (random() - 0.5) * 50;
      const z = -30 - random() * 20;
      
      points.push(new THREE.Vector3(x, y, z));
      points.push(new THREE.Vector3(x + 20, y - 10, z));
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);
      lineGroup.add(line);
    }

    return lineGroup;
  }, []);

  // Create grid pattern
  const gridPattern = useMemo(() => {
    const gridGroup = new THREE.Group();
    const gridMaterial = new THREE.LineBasicMaterial({ 
      color: '#ffffff', 
      opacity: 0.05,
      transparent: true 
    });

    // Horizontal grid lines
    for (let i = -20; i <= 20; i += 2) {
      const points = [
        new THREE.Vector3(-50, i, -25),
        new THREE.Vector3(50, i, -25)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, gridMaterial);
      gridGroup.add(line);
    }

    // Vertical grid lines
    for (let i = -50; i <= 50; i += 5) {
      const points = [
        new THREE.Vector3(i, -20, -25),
        new THREE.Vector3(i, 20, -25)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, gridMaterial);
      gridGroup.add(line);
    }

    return gridGroup;
  }, []);

  useEffect(() => {
    if (!groupRef.current) return;
    
    groupRef.current.add(buildings);
    groupRef.current.add(diagonalLines);
    groupRef.current.add(gridPattern);

    return () => {
      buildings.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      diagonalLines.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      gridPattern.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    };
  }, [buildings, diagonalLines, gridPattern]);

  return <group ref={groupRef} />;
}

function GroundPlane() {
  const groundRef = useRef();

  useEffect(() => {
    if (!groundRef.current) return;
    
    // Dark geometric floor with subtle pattern
    const material = new THREE.MeshStandardMaterial({
      color: '#0a0a0a', // Very dark gray, almost black
      roughness: 0.8,
      metalness: 0.1,
      receiveShadow: true,
    });
    
    groundRef.current.material = material;
  }, []);

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
    <div style={{ aspectRatio: '16/9', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#000000' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [6, 1.8, 8], fov: 50 }}
        gl={{ 
          toneMappingExposure: 1.2,
          toneMapping: THREE.ACESFilmicToneMapping,
          physicallyCorrectLights: true
        }}
      >
        {/* Dark geometric environment background */}
        <color attach="background" args={['#000000']} />
        
        <Suspense fallback={null}>
          <GeometricEnvironment />
          <GroundPlane />
          <VolturianoCar bodyColor={bodyColor} rimColor={rimColor} onMaterialsReady={onMaterialsReady} />
        </Suspense>
        
        {/* Lighting optimized for dark geometric environment */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[10, 12, 8]} 
          intensity={1.2} 
          castShadow 
          color="#ffffff"
        />
        <directionalLight 
          position={[-8, 10, -6]} 
          intensity={0.6} 
          color="#ffffff"
        />
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


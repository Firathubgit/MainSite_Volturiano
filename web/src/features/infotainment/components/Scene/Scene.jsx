/**
 * 3D Scene Component for Infotainment
 * Uses the actual VolturianoGLB.glb model
 */
import React, { useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Environment,
  ContactShadows,
  SpotLight,
  PerspectiveCamera,
  useGLTF,
} from '@react-three/drei';
import * as THREE from 'three';
import { DRIVE_MODES, CAMERA_VIEWS } from '../../constants/infotainmentConstants';
// import studioEnv from '../../../../assets/3DConfigurator/studio_small_06_4k.exr';

const CAR_MODEL_URL = '/VolturianoGLB.glb';

// Camera Controller with smooth transitions
function CameraController({ view }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(-4, 2.5, 4));

  useEffect(() => {
    switch (view) {
      case CAMERA_VIEWS.SIDE:
        targetPos.current.set(6, 1.5, 0);
        break;
      case CAMERA_VIEWS.REAR:
        targetPos.current.set(3, 2, 5);
        break;
      case CAMERA_VIEWS.TOP:
        targetPos.current.set(0, 7, 0);
        break;
      default:
        targetPos.current.set(-4, 2.5, 4);
        break;
    }
  }, [view]);

  useFrame((state, delta) => {
    state.camera.position.lerp(targetPos.current, 2.5 * delta);
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}

// Dynamic Lights based on drive mode
function Lights({ mode }) {
  const color =
    mode === DRIVE_MODES.SPORT
      ? '#FF4520'
      : mode === DRIVE_MODES.COMFORT
        ? '#0036FF'
        : '#FFFFFF';
  const intensity = mode === DRIVE_MODES.LUXURY ? 2 : 5;

  return (
    <>
      <ambientLight intensity={0.5} />
      <SpotLight
        position={[5, 10, 5]}
        angle={0.5}
        penumbra={0.5}
        intensity={20}
        castShadow
        shadow-bias={-0.0001}
      />
      <SpotLight
        position={[-5, 5, -5]}
        angle={0.5}
        penumbra={1}
        intensity={intensity}
        color={color}
        distance={20}
      />
      <rectAreaLight
        width={10}
        height={2}
        intensity={10}
        color={mode === DRIVE_MODES.SPORT ? '#ffdddd' : '#ffffff'}
        position={[0, 8, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </>
  );
}

// Volturiano Car Model with dynamic materials
function VolturianoCar({ bodyColor, rimColor, mode }) {
  const gltf = useGLTF(CAR_MODEL_URL, true);
  const group = useRef();

  // Idle animation
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();

    // Slow float
    group.current.position.y = Math.sin(t * 0.5) * 0.005;

    // Elegant slow rotation
    group.current.rotation.y = Math.sin(t * 0.6) * 0.05;

    // Micro vibration in sport mode
    if (mode === DRIVE_MODES.SPORT) {
      group.current.position.x = Math.sin(t * 30) * 0.0002;
    } else {
      group.current.position.x = 0;
    }
  });

  // Apply dynamic materials to car
  useEffect(() => {
    if (!gltf?.scene) return;

    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        const materialName = child.material?.name?.toLowerCase() || '';

        // Apply body color to body materials
        if (
          materialName.includes('body') ||
          materialName.includes('paint') ||
          materialName.includes('car')
        ) {
          child.material = new THREE.MeshPhysicalMaterial({
            color: bodyColor,
            metalness: 0.7,
            roughness: 0.2,
            clearcoat: 1,
            clearcoatRoughness: 0.1,
          });
        }

        // Apply rim color to wheel/rim materials
        if (materialName.includes('rim') || materialName.includes('wheel')) {
          child.material = new THREE.MeshStandardMaterial({
            color: rimColor,
            metalness: 1,
            roughness: 0.2,
          });
        }

        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [gltf, bodyColor, rimColor]);

  return (
    <group ref={group} dispose={null}>
      <primitive object={gltf.scene} scale={1.8} position={[0, -0.5, 0]} />
    </group>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[2, 0.5, 4]} />
      <meshStandardMaterial color="#333" />
    </mesh>
  );
}

// Main Scene export
export function Scene({ mode, carConfig, cameraView }) {
  return (
    <Canvas shadows dpr={[1, 2]} style={{ width: '100%', height: '100%' }}>
      <PerspectiveCamera makeDefault fov={45} position={[-4, 2.5, 4]} />
      <CameraController view={cameraView} />

      <color attach="background" args={['#111111']} />
      <fog attach="fog" args={['#111111', 5, 20]} />

      <Lights mode={mode} />

      <Suspense fallback={<LoadingFallback />}>
        <VolturianoCar
          bodyColor={carConfig.color}
          rimColor={carConfig.rimColor}
          mode={mode}
        />
      </Suspense>

      <ContactShadows
        resolution={1024}
        scale={20}
        blur={2}
        opacity={0.5}
        far={10}
        color="#000000"
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#111111" roughness={0.1} metalness={0.5} />
      </mesh>

      {/* <Environment files={studioEnv} background={false} environmentIntensity={0.5} /> */}
    </Canvas>
  );
}

// Preload the model
useGLTF.preload(CAR_MODEL_URL);

export default Scene;

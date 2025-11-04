import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

function PlaceholderCar() {
  return (
    <mesh>
      <boxGeometry args={[2, 0.5, 1]} />
      <meshStandardMaterial color="#1f2937" />
    </mesh>
  );
}

export function Viewer3D() {
  return (
    <div style={{aspectRatio:'16/9', borderRadius:'10px', overflow:'hidden'}}>
      <Canvas shadows dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 2]} intensity={1.2} castShadow />
        <PlaceholderCar />
        <Environment preset="city" />
        <OrbitControls enableDamping />
      </Canvas>
    </div>
  );
}


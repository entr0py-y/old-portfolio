'use client';

import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Scroll-driven camera controller
function ScrollCamera() {
    const { camera } = useThree();
    const cameraRef = useRef({
        x: 0,
        y: 0,
        z: 5,
        rotationY: 0,
    });

    useEffect(() => {
        // Create scroll-driven camera animation
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: 'body',
                start: 'top top',
                end: 'bottom bottom',
                scrub: 1.5, // Smooth scrubbing
            },
        });

        // Camera journey keyframes
        tl.to(cameraRef.current, {
            z: 8,
            duration: 0.2,
            ease: 'power2.inOut',
        })
            .to(cameraRef.current, {
                x: -2,
                rotationY: 0.15,
                duration: 0.2,
                ease: 'power2.inOut',
            })
            .to(cameraRef.current, {
                x: 0,
                z: 4,
                rotationY: 0,
                duration: 0.2,
                ease: 'power2.inOut',
            })
            .to(cameraRef.current, {
                z: 10,
                y: 1,
                duration: 0.2,
                ease: 'power2.inOut',
            })
            .to(cameraRef.current, {
                z: 6,
                y: 0,
                duration: 0.2,
                ease: 'power2.inOut',
            });

        return () => {
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, []);

    useFrame(() => {
        camera.position.x = cameraRef.current.x;
        camera.position.y = cameraRef.current.y;
        camera.position.z = cameraRef.current.z;
        camera.rotation.y = cameraRef.current.rotationY;
    });

    return null;
}

// Wireframe tesseract geometry
function Tesseract() {
    const groupRef = useRef<THREE.Group>(null);
    const timeRef = useRef(0);

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        timeRef.current += delta;

        // Slow, deliberate rotation
        groupRef.current.rotation.x = Math.sin(timeRef.current * 0.2) * 0.1;
        groupRef.current.rotation.y += delta * 0.15;
        groupRef.current.rotation.z = Math.cos(timeRef.current * 0.15) * 0.05;
    });

    // Create tesseract edges
    const edges = [];
    const size = 1.5;

    // Outer cube vertices
    const outerVertices = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ].map(v => v.map(c => c * size) as [number, number, number]);

    // Inner cube vertices (4D projection simulation)
    const innerSize = 0.6;
    const innerVertices = outerVertices.map(v =>
        v.map(c => c * innerSize) as [number, number, number]
    );

    // Create edge connections
    const edgeIndices = [
        [0, 1], [1, 2], [2, 3], [3, 0], // Front face
        [4, 5], [5, 6], [6, 7], [7, 4], // Back face
        [0, 4], [1, 5], [2, 6], [3, 7], // Connecting edges
    ];

    return (
        <group ref={groupRef}>
            {/* Outer cube edges */}
            {edgeIndices.map(([a, b], i) => (
                <line key={`outer-${i}`}>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={2}
                            array={new Float32Array([...outerVertices[a], ...outerVertices[b]])}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial color="#ffffff" transparent opacity={0.6} />
                </line>
            ))}

            {/* Inner cube edges */}
            {edgeIndices.map(([a, b], i) => (
                <line key={`inner-${i}`}>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={2}
                            array={new Float32Array([...innerVertices[a], ...innerVertices[b]])}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial color="#888888" transparent opacity={0.3} />
                </line>
            ))}

            {/* Diagonal connections */}
            {outerVertices.map((v, i) => (
                <line key={`diag-${i}`}>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={2}
                            array={new Float32Array([...v, ...innerVertices[i]])}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial color="#ffffff" transparent opacity={0.15} />
                </line>
            ))}

            {/* Vertex points */}
            {outerVertices.map((pos, i) => (
                <mesh key={`vertex-${i}`} position={pos}>
                    <sphereGeometry args={[0.03, 8, 8]} />
                    <meshBasicMaterial color="#ffffff" />
                </mesh>
            ))}
        </group>
    );
}

// Floating particle field
function ParticleField() {
    const particlesRef = useRef<THREE.Points>(null);
    const particleCount = 200;

    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }

    useFrame((state) => {
        if (!particlesRef.current) return;
        particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    });

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={particleCount}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                color="#ffffff"
                size={0.02}
                transparent
                opacity={0.4}
                sizeAttenuation
            />
        </points>
    );
}

// Main WebGL Scene
export default function WebGLScene() {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <Canvas
                camera={{ position: [0, 0, 5], fov: 50 }}
                gl={{ antialias: true, alpha: true }}
                style={{ background: 'transparent' }}
            >
                <ScrollCamera />

                {/* Lighting */}
                <ambientLight intensity={0.3} />
                <directionalLight position={[5, 5, 5]} intensity={0.5} />
                <pointLight position={[-5, -5, 5]} intensity={0.3} color="#4488ff" />

                {/* Scene objects */}
                <Tesseract />
                <ParticleField />

                {/* Post-processing */}
                <EffectComposer>
                    <Bloom
                        intensity={0.3}
                        luminanceThreshold={0.8}
                        luminanceSmoothing={0.9}
                        blendFunction={BlendFunction.ADD}
                    />
                    <ChromaticAberration
                        offset={new THREE.Vector2(0.0005, 0.0005)}
                        blendFunction={BlendFunction.NORMAL}
                    />
                </EffectComposer>
            </Canvas>
        </div>
    );
}

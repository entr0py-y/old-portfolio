import { useEffect, useRef, useCallback } from 'react';

interface Node3D {
    x: number;
    y: number;
    z: number;
    baseX: number;
    baseY: number;
    baseZ: number;
    targetX: number;
    targetY: number;
    targetZ: number;
}

interface Edge {
    from: number;
    to: number;
    distance: number;
}

type ShapeState = 'CHAOS' | 'SPHERE' | 'CUBE';

// Shape mapping per section: Identity=CHAOS, Skills=SPHERE, Projects=CUBE, Education=SPHERE, Connect=CHAOS
const SECTION_SHAPES: ShapeState[] = ['CHAOS', 'SPHERE', 'CUBE', 'SPHERE', 'CHAOS'];

const NetworkMesh: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const nodesRef = useRef<Node3D[]>([]);
    const edgesRef = useRef<Edge[]>([]);
    const mouseRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000 });
    const isMobileRef = useRef(false);
    const timeRef = useRef(0);
    const lastMouseMoveRef = useRef(0);
    const glowIntensityRef = useRef(0);
    const lastFrameTimeRef = useRef(0);
    const rotationRef = useRef({ x: 0, y: 0 });
    const shapeStateRef = useRef<ShapeState>('CHAOS');
    const lerpProgressRef = useRef(0);
    const edgeRecalcCounter = useRef(0);

    const TARGET_FPS_MOBILE = 30;
    const TARGET_FPS_DESKTOP = 60;
    const FRAME_INTERVAL_MOBILE = 1000 / TARGET_FPS_MOBILE;
    const FRAME_INTERVAL_DESKTOP = 1000 / TARGET_FPS_DESKTOP;

    const getNodeCount = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) return 50;
        return 120;
    };
    const CONNECTION_DISTANCE_3D = 250;
    const CONNECTION_DISTANCE_3D_MOBILE = 180;
    const GLOW_RADIUS = 200;
    const LERP_FACTOR = 0.08;
    const SHAPE_LERP_SPEED = 0.025;
    const FOCAL_LENGTH = 600;
    const SPREAD = 350;

    // Generate target positions for shapes
    const generateShapeTargets = useCallback((nodes: Node3D[], shape: ShapeState) => {
        const count = nodes.length;
        const radius = SPREAD * 0.8;

        for (let i = 0; i < count; i++) {
            const node = nodes[i];

            switch (shape) {
                case 'SPHERE': {
                    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
                    const y = 1 - (i / (count - 1)) * 2;
                    const radiusAtY = Math.sqrt(1 - y * y);
                    const theta = goldenAngle * i;

                    node.targetX = Math.cos(theta) * radiusAtY * radius;
                    node.targetY = y * radius;
                    node.targetZ = Math.sin(theta) * radiusAtY * radius;
                    break;
                }
                case 'CUBE': {
                    const face = i % 6;
                    const edge = radius * 0.75;
                    const randA = (Math.random() - 0.5) * 2 * edge;
                    const randB = (Math.random() - 0.5) * 2 * edge;

                    switch (face) {
                        case 0: node.targetX = edge;  node.targetY = randA; node.targetZ = randB; break;
                        case 1: node.targetX = -edge; node.targetY = randA; node.targetZ = randB; break;
                        case 2: node.targetX = randA;  node.targetY = edge;  node.targetZ = randB; break;
                        case 3: node.targetX = randA;  node.targetY = -edge; node.targetZ = randB; break;
                        case 4: node.targetX = randA;  node.targetY = randB; node.targetZ = edge;  break;
                        case 5: node.targetX = randA;  node.targetY = randB; node.targetZ = -edge; break;
                    }
                    break;
                }
                case 'CHAOS':
                default: {
                    node.targetX = (Math.random() - 0.5) * SPREAD * 2;
                    node.targetY = (Math.random() - 0.5) * SPREAD * 2;
                    node.targetZ = (Math.random() - 0.5) * SPREAD * 2;
                    break;
                }
            }
        }
    }, []);

    // Initialize nodes in 3D space
    const initNodes = useCallback(() => {
        const nodes: Node3D[] = [];
        const NODE_COUNT = getNodeCount();

        for (let i = 0; i < NODE_COUNT; i++) {
            const x = (Math.random() - 0.5) * SPREAD * 2;
            const y = (Math.random() - 0.5) * SPREAD * 2;
            const z = (Math.random() - 0.5) * SPREAD * 2;

            nodes.push({
                x, y, z,
                baseX: x, baseY: y, baseZ: z,
                targetX: x, targetY: y, targetZ: z,
            });
        }

        return nodes;
    }, []);

    // Project 3D to 2D with perspective
    const project = useCallback((x: number, y: number, z: number, centerX: number, centerY: number) => {
        const scale = FOCAL_LENGTH / (FOCAL_LENGTH + z);
        return {
            screenX: x * scale + centerX,
            screenY: y * scale + centerY,
            scale,
            depth: z,
        };
    }, []);

    // Rotate point around Y and X axes
    const rotate3D = useCallback((x: number, y: number, z: number, rotX: number, rotY: number) => {
        let cosA = Math.cos(rotY);
        let sinA = Math.sin(rotY);
        let rx = x * cosA - z * sinA;
        let rz = x * sinA + z * cosA;

        cosA = Math.cos(rotX);
        sinA = Math.sin(rotX);
        const ry = y * cosA - rz * sinA;
        rz = y * sinA + rz * cosA;

        return { x: rx, y: ry, z: rz };
    }, []);

    // Calculate edges based on 3D distance
    const calculateEdges3D = useCallback((nodes: Node3D[], isMobile: boolean) => {
        const edges: Edge[] = [];
        const maxDist = isMobile ? CONNECTION_DISTANCE_3D_MOBILE : CONNECTION_DISTANCE_3D;

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dz = nodes[i].z - nodes[j].z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (distance < maxDist) {
                    edges.push({ from: i, to: j, distance });
                }
            }
        }

        return edges;
    }, []);

    // Draw the 3D mesh
    const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const nodes = nodesRef.current;
        const time = timeRef.current;
        const isMobile = isMobileRef.current;
        const centerX = width / 2;
        const centerY = height / 2;

        ctx.clearRect(0, 0, width, height);

        mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * LERP_FACTOR;
        mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * LERP_FACTOR;

        const timeSinceMove = Date.now() - lastMouseMoveRef.current;
        const targetIntensity = timeSinceMove < 3000 ? 1 : Math.max(0, 1 - (timeSinceMove - 3000) / 2000);
        glowIntensityRef.current += (targetIntensity - glowIntensityRef.current) * 0.05;

        // Slow auto-rotation
        rotationRef.current.y += 0.002;
        rotationRef.current.x = Math.sin(time * 0.0003) * 0.15;

        const rotX = rotationRef.current.x;
        const rotY = rotationRef.current.y;

        // Lerp nodes towards shape targets
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];

            node.baseX += (node.targetX - node.baseX) * SHAPE_LERP_SPEED;
            node.baseY += (node.targetY - node.baseY) * SHAPE_LERP_SPEED;
            node.baseZ += (node.targetZ - node.baseZ) * SHAPE_LERP_SPEED;

            const driftX = Math.sin(time * 0.0005 + i * 0.5) * 8;
            const driftY = Math.cos(time * 0.0006 + i * 0.3) * 8;
            const driftZ = Math.sin(time * 0.0004 + i * 0.7) * 8;

            node.x = node.baseX + driftX;
            node.y = node.baseY + driftY;
            node.z = node.baseZ + driftZ;
        }

        // Recalculate edges every ~2 seconds
        edgeRecalcCounter.current++;
        if (edgeRecalcCounter.current % 120 === 0) {
            edgesRef.current = calculateEdges3D(nodes, isMobile);
        }

        const edges = edgesRef.current;
        const mouseX = mouseRef.current.x;
        const mouseY = mouseRef.current.y;

        const pulse = 1 + Math.sin(time * 0.002) * 0.08;
        const microFlicker = 1 + (Math.random() - 0.5) * 0.02;

        // Draw edges with depth
        for (const edge of edges) {
            const nodeA = nodes[edge.from];
            const nodeB = nodes[edge.to];

            const rA = rotate3D(nodeA.x, nodeA.y, nodeA.z, rotX, rotY);
            const rB = rotate3D(nodeB.x, nodeB.y, nodeB.z, rotX, rotY);

            const pA = project(rA.x, rA.y, rA.z, centerX, centerY);
            const pB = project(rB.x, rB.y, rB.z, centerX, centerY);

            if (pA.depth < -FOCAL_LENGTH + 50 || pB.depth < -FOCAL_LENGTH + 50) continue;

            const avgDepth = (rA.z + rB.z) / 2;
            const depthFade = Math.max(0.05, Math.min(1, 1 - (avgDepth + SPREAD) / (SPREAD * 2.5)));

            const midScreenX = (pA.screenX + pB.screenX) / 2;
            const midScreenY = (pA.screenY + pB.screenY) / 2;

            const distToMouse = Math.sqrt(
                (midScreenX - mouseX) ** 2 + (midScreenY - mouseY) ** 2
            );

            const glowFactor = isMobile
                ? 0.03
                : Math.max(0, 1 - distToMouse / GLOW_RADIUS) * glowIntensityRef.current;

            if (glowFactor > 0.01 && !isMobile) {
                const glowOpacity = glowFactor * 0.8 * pulse * microFlicker * depthFade;

                ctx.beginPath();
                ctx.moveTo(pA.screenX, pA.screenY);
                ctx.lineTo(pB.screenX, pB.screenY);
                ctx.strokeStyle = `rgba(255, 255, 255, ${glowOpacity.toFixed(3)})`;
                ctx.lineWidth = (1 + glowFactor * 2) * Math.min(pA.scale, pB.scale);

                if (glowFactor > 0.4) {
                    ctx.shadowBlur = 18 * glowFactor;
                    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
                }

                ctx.stroke();
                ctx.shadowBlur = 0;
            } else {
                const baseOpacity = 0.15 * depthFade;
                ctx.beginPath();
                ctx.moveTo(pA.screenX, pA.screenY);
                ctx.lineTo(pB.screenX, pB.screenY);
                ctx.strokeStyle = `rgba(255, 255, 255, ${baseOpacity.toFixed(3)})`;
                ctx.lineWidth = 0.8 * Math.min(pA.scale, pB.scale);
                ctx.stroke();
            }
        }

        // Draw nodes as dots with depth cues
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const r = rotate3D(node.x, node.y, node.z, rotX, rotY);
            const p = project(r.x, r.y, r.z, centerX, centerY);

            if (r.z < -FOCAL_LENGTH + 50) continue;

            const depthFade = Math.max(0.1, Math.min(1, 1 - (r.z + SPREAD) / (SPREAD * 2.5)));
            const nodeSize = Math.max(0.5, 2 * p.scale * depthFade);

            const distToMouse = Math.sqrt(
                (p.screenX - mouseX) ** 2 + (p.screenY - mouseY) ** 2
            );

            const nodeGlow = isMobile ? 0 : Math.max(0, 1 - distToMouse / (GLOW_RADIUS * 0.8)) * glowIntensityRef.current;

            ctx.beginPath();
            ctx.arc(p.screenX, p.screenY, nodeSize + nodeGlow * 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${((0.3 + nodeGlow * 0.7) * depthFade).toFixed(3)})`;

            if (nodeGlow > 0.3) {
                ctx.shadowBlur = 12 * nodeGlow;
                ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            }

            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }, [project, rotate3D, calculateEdges3D]);

    // Animation loop
    const animate = useCallback((timestamp: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const frameInterval = isMobileRef.current ? FRAME_INTERVAL_MOBILE : FRAME_INTERVAL_DESKTOP;
        const elapsed = timestamp - lastFrameTimeRef.current;

        if (elapsed >= frameInterval) {
            lastFrameTimeRef.current = timestamp - (elapsed % frameInterval);
            timeRef.current += isMobileRef.current ? 33 : 16;
            draw(ctx, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
        }

        animationRef.current = requestAnimationFrame(animate);
    }, [draw]);

    // Initialize and event handlers
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        isMobileRef.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            const ctx = canvas.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);

            isMobileRef.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;

            if (nodesRef.current.length === 0) {
                nodesRef.current = initNodes();
                generateShapeTargets(nodesRef.current, shapeStateRef.current);
                edgesRef.current = calculateEdges3D(nodesRef.current, isMobileRef.current);
            }
        };

        // Listen for section changes to morph shape
        const handleSectionChange = (e: Event) => {
            const sectionIndex = (e as CustomEvent).detail as number;
            const newShape = SECTION_SHAPES[sectionIndex] || 'CHAOS';

            if (newShape !== shapeStateRef.current) {
                shapeStateRef.current = newShape;
                lerpProgressRef.current = 0;
                generateShapeTargets(nodesRef.current, newShape);
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current.targetX = e.clientX - rect.left;
            mouseRef.current.targetY = e.clientY - rect.top;
            lastMouseMoveRef.current = Date.now();
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                mouseRef.current.targetX = e.touches[0].clientX;
                mouseRef.current.targetY = e.touches[0].clientY;
                lastMouseMoveRef.current = Date.now();
            }
        };

        const handleMouseLeave = () => {
            mouseRef.current.targetX = -1000;
            mouseRef.current.targetY = -1000;
        };

        const initTimeout = setTimeout(() => {
            resize();
            requestAnimationFrame(animate);
        }, 100);

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('sectionChange', handleSectionChange);

        return () => {
            clearTimeout(initTimeout);
            cancelAnimationFrame(animationRef.current);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('sectionChange', handleSectionChange);
        };
    }, [animate, initNodes, calculateEdges3D, generateShapeTargets]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                top: '-15%',
                left: '-15%',
                width: '130%',
                height: '130%',
                zIndex: -1,
                pointerEvents: 'none',
            }}
        />
    );
};

export default NetworkMesh;

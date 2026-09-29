import { useEffect, useRef, useCallback } from 'react';

interface Node {
    x: number;
    y: number;
    baseX: number;
    baseY: number;
}

interface Edge {
    from: number;
    to: number;
    distance: number;
}

const NetworkMesh: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const nodesRef = useRef<Node[]>([]);
    const edgesRef = useRef<Edge[]>([]);
    const mouseRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000 });
    const isMobileRef = useRef(false);
    const timeRef = useRef(0);
    const lastMouseMoveRef = useRef(0);
    const glowIntensityRef = useRef(0);
    const lastFrameTimeRef = useRef(0);

    // Frame rate control - 30fps on mobile, 60fps on desktop
    const TARGET_FPS_MOBILE = 30;
    const TARGET_FPS_DESKTOP = 60;
    const FRAME_INTERVAL_MOBILE = 1000 / TARGET_FPS_MOBILE;
    const FRAME_INTERVAL_DESKTOP = 1000 / TARGET_FPS_DESKTOP;

    // Configuration - Dense coverage with more nodes
    // Mobile gets significantly fewer nodes for better performance and less visual clutter
    const getNodeCount = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            return 40; // Much sparser on mobile
        }
        return 120;
    };
    const CONNECTION_DISTANCE_DESKTOP = 160;
    const CONNECTION_DISTANCE_MOBILE = 120;
    const GLOW_RADIUS = 200;
    const DRIFT_SPEED = 0.15;
    const DRIFT_AMPLITUDE = 30;
    const LERP_FACTOR = 0.08;

    // Initialize nodes - Grid-based distribution with jitter for even spread
    const initNodes = useCallback((width: number, height: number) => {
        const nodes: Node[] = [];
        const NODE_COUNT = getNodeCount();

        // Calculate grid dimensions for even distribution
        const aspectRatio = width / height;
        const cols = Math.ceil(Math.sqrt(NODE_COUNT * aspectRatio));
        const rows = Math.ceil(NODE_COUNT / cols);

        const cellWidth = width / cols;
        const cellHeight = height / rows;
        const jitter = 0.6; // More randomness for organic spread

        let count = 0;
        for (let row = 0; row < rows && count < NODE_COUNT; row++) {
            for (let col = 0; col < cols && count < NODE_COUNT; col++) {
                // Center of cell + jitter
                const x = (col + 0.5 + (Math.random() - 0.5) * jitter) * cellWidth;
                const y = (row + 0.5 + (Math.random() - 0.5) * jitter) * cellHeight;

                nodes.push({
                    x,
                    y,
                    baseX: x,
                    baseY: y,
                });
                count++;
            }
        }

        return nodes;
    }, []);

    // Calculate edges (connections between nearby nodes)
    const calculateEdges = useCallback((nodes: Node[], isMobile: boolean) => {
        const edges: Edge[] = [];
        const CONNECTION_DISTANCE = isMobile ? CONNECTION_DISTANCE_MOBILE : CONNECTION_DISTANCE_DESKTOP;

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < CONNECTION_DISTANCE) {
                    edges.push({ from: i, to: j, distance });
                }
            }
        }

        return edges;
    }, []);

    // Draw the mesh
    const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const nodes = nodesRef.current;
        const time = timeRef.current;
        const isMobile = isMobileRef.current;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Smooth mouse position interpolation (lerp)
        mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * LERP_FACTOR;
        mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * LERP_FACTOR;

        // Glow intensity fades when cursor stops moving
        const timeSinceMove = Date.now() - lastMouseMoveRef.current;
        const targetIntensity = timeSinceMove < 3000 ? 1 : Math.max(0, 1 - (timeSinceMove - 3000) / 2000);
        glowIntensityRef.current += (targetIntensity - glowIntensityRef.current) * 0.05;

        // Subtle pulse for organic feel
        const pulse = 1 + Math.sin(time * 0.002) * 0.08;
        const microFlicker = 1 + (Math.random() - 0.5) * 0.02;

        // Update node positions (organic drift)
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const driftX = Math.sin(time * 0.001 + i * 0.5) * DRIFT_AMPLITUDE;
            const driftY = Math.cos(time * 0.0012 + i * 0.3) * DRIFT_AMPLITUDE;

            node.x = node.baseX + driftX * DRIFT_SPEED;
            node.y = node.baseY + driftY * DRIFT_SPEED;

            // Wrap around edges
            if (node.x < -50) node.baseX = width + 50;
            if (node.x > width + 50) node.baseX = -50;
            if (node.y < -50) node.baseY = height + 50;
            if (node.y > height + 50) node.baseY = -50;
        }

        // Recalculate edges periodically for performance
        if (Math.floor(time) % 60 === 0) {
            edgesRef.current = calculateEdges(nodes, isMobile);
        }

        const edges = edgesRef.current;
        const mouseX = mouseRef.current.x;
        const mouseY = mouseRef.current.y;

        // WHITE NEON COLORS - Increased visibility
        const lineBase = 'rgba(255, 255, 255, 0.18)';
        const lineGlow = 'rgba(255, 255, 255, ';  // White glow

        // Draw edges
        for (const edge of edges) {
            const nodeA = nodes[edge.from];
            const nodeB = nodes[edge.to];

            const midX = (nodeA.x + nodeB.x) / 2;
            const midY = (nodeA.y + nodeB.y) / 2;

            // Distance from mouse to line midpoint
            const distToMouse = Math.sqrt(
                (midX - mouseX) * (midX - mouseX) +
                (midY - mouseY) * (midY - mouseY)
            );

            // Calculate glow factor based on distance
            const glowFactor = isMobile
                ? 0.03 // Greatly reduced on mobile
                : Math.max(0, 1 - distToMouse / GLOW_RADIUS) * glowIntensityRef.current;

            if (glowFactor > 0.01 && !isMobile) {
                // Glowing line near cursor - WHITE NEON
                const glowOpacity = glowFactor * 0.8 * pulse * microFlicker;

                ctx.beginPath();
                ctx.moveTo(nodeA.x, nodeA.y);
                ctx.lineTo(nodeB.x, nodeB.y);
                ctx.strokeStyle = `${lineGlow}${glowOpacity.toFixed(3)})`;
                ctx.lineWidth = 1 + glowFactor * 2;

                // Apply shadow blur for very close lines - WHITE GLOW
                if (glowFactor > 0.4) {
                    ctx.shadowBlur = 18 * glowFactor;
                    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
                }

                ctx.stroke();

                // Reset shadow
                ctx.shadowBlur = 0;
            } else {
                // Base line (subtle)
                ctx.beginPath();
                ctx.moveTo(nodeA.x, nodeA.y);
                ctx.lineTo(nodeB.x, nodeB.y);
                ctx.strokeStyle = lineBase;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    }, [calculateEdges]);

    // Animation loop with frame rate throttling
    const animate = useCallback((timestamp: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Frame rate throttling - especially important on mobile
        const frameInterval = isMobileRef.current ? FRAME_INTERVAL_MOBILE : FRAME_INTERVAL_DESKTOP;
        const elapsed = timestamp - lastFrameTimeRef.current;

        if (elapsed >= frameInterval) {
            lastFrameTimeRef.current = timestamp - (elapsed % frameInterval);
            timeRef.current += isMobileRef.current ? 33 : 16; // ~30fps or ~60fps
            draw(ctx, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
        }

        animationRef.current = requestAnimationFrame(animate);
    }, [draw]);

    // Initialize and resize handler
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Check if mobile
        isMobileRef.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(dpr, dpr);
            }

            // Check if mobile on resize
            isMobileRef.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;

            // Reinitialize nodes on resize
            nodesRef.current = initNodes(rect.width, rect.height);
            edgesRef.current = calculateEdges(nodesRef.current, isMobileRef.current);
        };

        // Mouse move handler - adjust for canvas offset
        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            // Adjust mouse position relative to the offset canvas
            mouseRef.current.targetX = e.clientX - rect.left;
            mouseRef.current.targetY = e.clientY - rect.top;
            lastMouseMoveRef.current = Date.now();
        };

        // Touch move handler (reduced effect)
        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                mouseRef.current.targetX = e.touches[0].clientX;
                mouseRef.current.targetY = e.touches[0].clientY;
                lastMouseMoveRef.current = Date.now();
            }
        };

        // Mouse leave handler
        const handleMouseLeave = () => {
            mouseRef.current.targetX = -1000;
            mouseRef.current.targetY = -1000;
        };

        // Initialize after a brief delay to avoid blocking render
        const initTimeout = setTimeout(() => {
            resize();
            requestAnimationFrame(animate);
        }, 100);

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            clearTimeout(initTimeout);
            cancelAnimationFrame(animationRef.current);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [animate, initNodes, calculateEdges]);

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

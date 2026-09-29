import React, { useEffect, useRef } from 'react';

export default function CursorTrail() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();

    // State refs to avoid frequent re-renders
    const cursorRef = useRef({ x: 0, y: 0 });
    const penRef = useRef({ x: 0, y: 0 });
    const pointsRef = useRef<{ x: number; y: number; age: number }[]>([]);
    const isMovingRef = useRef(false);
    const moveTimeoutRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        // Configuration
        const TRAIL_LENGTH = 35;       // Number of points
        const LINE_WIDTH = 1.0;        // Hairline thickness
        const INERTIA = 0.25;          // Lower = more drag/lazier (0.0 to 1.0)
        const FADE_RATE = 0.2;         // How fast points age

        // Check for reduced motion preference
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const shouldDisable = mediaQuery.matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (shouldDisable) return;

        // Initialize pen position
        penRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        cursorRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

        const handleResize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;

            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.scale(dpr, dpr);
        };

        const handleMouseMove = (e: MouseEvent) => {
            cursorRef.current.x = e.clientX;
            cursorRef.current.y = e.clientY;
            isMovingRef.current = true;

            // Reset stop detection
            if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
            moveTimeoutRef.current = window.setTimeout(() => {
                isMovingRef.current = false;
            }, 100);
        };

        // Detect hover over interactive elements to reduce trail opacity
        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'BUTTON' ||
                target.tagName === 'A' ||
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.closest('button') ||
                target.closest('a')
            ) {
                canvas.style.opacity = '0.3'; // Fade out trail
            } else {
                canvas.style.opacity = '1.0'; // distinct
            }
        };

        // Use transition for smooth opacity change
        canvas.style.transition = 'opacity 0.3s ease';

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('mouseover', handleMouseOver, { passive: true });

        handleResize();

        const animate = () => {
            // 1. Physics: Move 'pen' towards 'cursor' with inertia
            // Standard lerp: target + (current - target) * factor? No, lerp(a, b, t) = a + (b-a)*t
            const dx = cursorRef.current.x - penRef.current.x;
            const dy = cursorRef.current.y - penRef.current.y;

            penRef.current.x += dx * INERTIA;
            penRef.current.y += dy * INERTIA;

            // 2. Add new point to history
            // Only if moved enough to avoid bunching up points effectively
            // But for a smooth time-based trail, we usually just push every frame or every N distance
            // Let's stick to time-based for smooth "flowing ribbon" even when slow
            pointsRef.current.push({
                x: penRef.current.x,
                y: penRef.current.y,
                age: 0
            });

            // 3. Remove old points
            if (pointsRef.current.length > TRAIL_LENGTH) {
                pointsRef.current.shift();
            }

            // Age points (optional, if we want them to "die" in place)
            // For a trail that follows, we usually just manage length.
            // But let's check readability - we want trail to fade out.

            ctx.clearRect(0, 0, canvas.width, canvas.height); // Note: using raw dims if styled?
            // actually clearRect needs scaled coords if we haven't transformed...
            // wait, ctx.scale(dpr, dpr) handles drawing coords.
            // clearRect usually works on local space too.
            // Easiest is to clear the whole logical space
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            // 4. Draw Path
            if (pointsRef.current.length > 2) {
                ctx.beginPath();
                ctx.lineWidth = LINE_WIDTH;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Styling: Create a gradient stroke along the path?
                // Canvas cannot easily gradient *along* a complex path stroke seamlessly without complexity.
                // Simple trick: draw segments with varying opacity.
                // Or create a linear gradient from head to tail if roughly linear.
                // Segment approach is safest for curves.

                // Let's implement Quadratic Bezier path for smoothness
                // We will draw it as one continuous stroke for best visuals,
                // but set strokeStyle to a gradient?
                // Actually, for a fading trail, strokeStyle gradient only works if start/end points known.
                // Let's try drawing connected segments with varying Alpha.

                let p1 = pointsRef.current[0];

                for (let i = 1; i < pointsRef.current.length; i++) {
                    const p2 = pointsRef.current[i];

                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);

                    // Midpoint for Quadratic curve usually requires jumping sets of points.
                    // Simple lines with high point density look smooth enough if density is high (60fps).
                    // If 60fps, we have 60 points per sec. Very smooth.
                    // Let's just do lineTo for simplicity in segment drawing unless jagged.
                    ctx.lineTo(p2.x, p2.y);

                    // Opacity based on index (newest = 1.0, oldest = 0.0)
                    const opacity = i / pointsRef.current.length;
                    // Apply a subtle ease to opacity so tail fades faster?
                    // or just linear

                    // "Pure white or soft off-white"
                    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.6})`; // Max opacity 0.6 for subtlety
                    ctx.stroke();

                    p1 = p2;
                }
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseover', handleMouseOver);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{
                zIndex: 50, // Above backgrounds, below critical UI inputs
                mixBlendMode: 'screen'
            }}
        />
    );
}

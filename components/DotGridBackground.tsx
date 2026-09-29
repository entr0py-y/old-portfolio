import React, { useEffect, useRef } from 'react';

interface DotGridBackgroundProps {
    isInverted?: boolean;
}

export default function DotGridBackground({ isInverted = false }: DotGridBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    const animationRef = useRef<number>();
    const isInvertedRef = useRef(isInverted);
    const transitionProgress = useRef(isInverted ? 1 : 0); // 0 = normal, 1 = inverted

    // Update ref when prop changes
    useEffect(() => {
        isInvertedRef.current = isInverted;
    }, [isInverted]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Configuration - optimized for performance
        const dotSpacing = 130;
        const dotRadius = 0.8;
        const waveSpeed = 0.0012; // Faster wave animation
        const waveAmplitude = 4; // More noticeable movement
        const cursorRadius = 100;
        const cursorStrength = 8;
        const transitionSpeed = 0.02;
        const targetFPS = 45;
        const frameTime = 1000 / targetFPS;

        let cols = 0;
        let rows = 0;
        let dots: { baseX: number; baseY: number }[] = [];
        let width = 0;
        let height = 0;
        let lastFrameTime = 0;

        const noise = (x: number, y: number, t: number) => {
            return (
                Math.sin(x * 0.015 + t) * 0.5 +
                Math.sin(y * 0.015 + t * 0.6) * 0.5 +
                Math.sin((x + y) * 0.008 + t * 0.4) * 0.3
            );
        };

        // Lerp function for smooth interpolation
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio, 1.5); // Cap DPR for performance
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.scale(dpr, dpr);

            // Add extra columns and rows to ensure full coverage beyond screen edges
            cols = Math.ceil(width / dotSpacing) + 2;
            rows = Math.ceil(height / dotSpacing) + 2;

            // Offset to center the grid and extend beyond edges
            const offsetX = -dotSpacing / 2;
            const offsetY = -dotSpacing / 2;

            dots = [];
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    dots.push({
                        baseX: offsetX + col * dotSpacing,
                        baseY: offsetY + row * dotSpacing,
                    });
                }
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current.x = e.clientX;
            mouseRef.current.y = e.clientY;
        };

        const handleMouseLeave = () => {
            mouseRef.current.x = -1000;
            mouseRef.current.y = -1000;
        };

        let startTime = Date.now();

        const animate = (currentTime: number) => {
            // FPS limiting
            if (currentTime - lastFrameTime < frameTime) {
                animationRef.current = requestAnimationFrame(animate);
                return;
            }
            lastFrameTime = currentTime;

            const elapsed = (Date.now() - startTime) * waveSpeed;
            const targetProgress = isInvertedRef.current ? 1 : 0;

            // Smooth transition towards target
            transitionProgress.current += (targetProgress - transitionProgress.current) * transitionSpeed;
            const progress = transitionProgress.current;

            // Create dynamic gradient background (moving fog)
            const gradient = ctx.createLinearGradient(0, 0, 0, height);

            // Animate gradient colors with more pronounced breathing effect
            const t = elapsed * 0.8; // Faster color breathing
            const breathe = Math.sin(t) * 8; // Larger breathing amplitude
            const breathe2 = Math.sin(t * 0.7 + 1) * 6;
            const breathe3 = Math.sin(t * 0.5 + 2) * 5;

            // Subtle hue shift for more life
            const hueShift = Math.sin(t * 0.3) * 5;

            // Lerp between normal and inverted theme colors based on progress
            // DARKER: Normal: dark grey (35/30/20), Inverted: darker grey (30/25/18)
            const topLightness = lerp(35 + breathe, 30 + breathe * 0.7, progress);
            const midLightness = lerp(30 + breathe2, 25 + breathe2 * 0.7, progress);
            const botLightness = lerp(20 + breathe3, 18 + breathe3 * 0.7, progress);
            const saturation = lerp(15 + Math.sin(t) * 3, 12 + Math.sin(t) * 2, progress);

            const topColor = `hsl(${220 + hueShift}, ${saturation}%, ${topLightness}%)`;
            const midColor = `hsl(${225 + hueShift}, ${saturation}%, ${midLightness}%)`;
            const botColor = `hsl(${220 + hueShift}, ${saturation}%, ${botLightness}%)`;

            gradient.addColorStop(0, topColor);
            gradient.addColorStop(0.5, midColor);
            gradient.addColorStop(1, botColor);

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // Draw organic cloud patches - irregular shapes that blend into background
            const cloudTime = elapsed * 0.2;

            // Multiple overlapping ellipses create irregular organic shapes
            const cloudPatches = [
                { baseX: 0.2, baseY: 0.3, scaleX: 1.8, scaleY: 0.6, size: 350, speed: 0.15, phase: 0 },
                { baseX: 0.7, baseY: 0.2, scaleX: 0.7, scaleY: 1.5, size: 280, speed: 0.12, phase: 1.5 },
                { baseX: 0.5, baseY: 0.7, scaleX: 1.4, scaleY: 0.8, size: 320, speed: 0.1, phase: 3 },
                { baseX: 0.15, baseY: 0.8, scaleX: 1.2, scaleY: 1.6, size: 260, speed: 0.18, phase: 4.5 },
                { baseX: 0.85, baseY: 0.5, scaleX: 0.9, scaleY: 1.3, size: 300, speed: 0.14, phase: 2.2 },
                { baseX: 0.4, baseY: 0.15, scaleX: 1.6, scaleY: 0.5, size: 240, speed: 0.11, phase: 5.8 },
            ];

            cloudPatches.forEach((cloud, i) => {
                // Slow drifting motion
                const driftX = Math.sin(cloudTime * cloud.speed + cloud.phase) * width * 0.08;
                const driftY = Math.cos(cloudTime * cloud.speed * 0.7 + cloud.phase) * height * 0.05;

                const cx = cloud.baseX * width + driftX;
                const cy = cloud.baseY * height + driftY;
                const radius = cloud.size + Math.sin(cloudTime * 0.5 + i) * 30;

                // Save context for ellipse transform
                ctx.save();
                ctx.translate(cx, cy);
                ctx.scale(cloud.scaleX, cloud.scaleY);

                // Very subtle radial gradient - almost invisible
                const cloudGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
                const cloudBrightness = lerp(42, 38, progress) + Math.sin(cloudTime * 0.4 + i * 0.7) * 3;

                // Very low opacity for seamless blending
                cloudGradient.addColorStop(0, `hsla(${220 + hueShift}, 10%, ${cloudBrightness}%, 0.12)`);
                cloudGradient.addColorStop(0.4, `hsla(${222 + hueShift}, 8%, ${cloudBrightness - 3}%, 0.06)`);
                cloudGradient.addColorStop(0.7, `hsla(${218 + hueShift}, 6%, ${cloudBrightness - 5}%, 0.02)`);
                cloudGradient.addColorStop(1, 'transparent');

                ctx.fillStyle = cloudGradient;
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            });

            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;

            // Draw dots - always white on all slides with glow
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
            ctx.shadowBlur = 12;

            dots.forEach((dot, i) => {
                // Calculate wave displacement
                const noiseVal = noise(dot.baseX, dot.baseY, elapsed);
                const waveX = Math.cos(elapsed * 0.5 + dot.baseY * 0.01) * waveAmplitude;
                const waveY = Math.sin(elapsed * 0.5 + dot.baseX * 0.01) * waveAmplitude;

                // Calculate distance to cursor
                const dx = mouseRef.current.x - dot.baseX;
                const dy = mouseRef.current.y - dot.baseY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Breathing/Pulsing Effect (Randomized per dot)
                // Use a combination of elapsed time and dot index/position for pseudo-random pulsing
                // This ensures all dots pulse, not just visible ones
                const randomOffset = (dot.baseX * 13 + dot.baseY * 19);
                const pulseT = elapsed * 0.5 + randomOffset;

                // Base opacity pulsing: 0.4 to 0.9 (increased for more glow)
                const currentOpacity = 0.4 + (Math.sin(pulseT) * 0.5 + 0.5) * 0.5;

                // Smaller dots: Base 1.5px (slightly larger)
                let currentRadius = 1.5;

                // Magnification near cursor (only applies if close)
                let shiftX = 0, shiftY = 0;

                if (dist < cursorRadius) {
                    const magFactor = (1 - dist / cursorRadius); // 0 to 1
                    currentRadius += magFactor * 4; // Add up to 4px
                    // Increase glow near cursor
                    ctx.shadowBlur = 12 + magFactor * 15;

                    // Push effect
                    const force = (cursorRadius - dist) / cursorRadius;
                    const angle = Math.atan2(dy, dx);
                    shiftX = Math.cos(angle) * force * cursorStrength;
                    shiftY = Math.sin(angle) * force * cursorStrength;
                } else {
                    ctx.shadowBlur = 12;
                }

                const drawX = dot.baseX + waveX + shiftX;
                const drawY = dot.baseY + waveY + shiftY;

                ctx.globalAlpha = Math.max(0, Math.min(1, currentOpacity));
                ctx.beginPath();
                ctx.arc(drawX, drawY, Math.max(0, currentRadius), 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1; // Reset alpha
            ctx.shadowBlur = 0; // Reset shadow
            animationRef.current = requestAnimationFrame(animate);
        };

        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-[-1] pointer-events-none transition-colors duration-500"
            aria-hidden="true"
        />
    );
}

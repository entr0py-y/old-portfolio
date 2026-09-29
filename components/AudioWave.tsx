import React, { useEffect, useRef, useCallback } from 'react';

interface AudioWaveProps {
    isPlaying: boolean;
    analyserNode: AnalyserNode | null;
}

// Simple noise function for organic wave motion
const noise = (() => {
    const permutation = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
    }
    const p = [...permutation, ...permutation];

    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a: number, b: number, t: number) => a + t * (b - a);
    const grad = (hash: number, x: number) => (hash & 1 ? x : -x);

    return (x: number): number => {
        const X = Math.floor(x) & 255;
        const xf = x - Math.floor(x);
        return lerp(grad(p[X], xf), grad(p[X + 1], xf - 1), fade(xf));
    };
})();

const AudioWave: React.FC<AudioWaveProps> = ({ isPlaying, analyserNode }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const timeRef = useRef(0);
    const waveAmplitudeRef = useRef(0);
    const targetAmplitudeRef = useRef(0);
    const clickBoostRef = useRef(0);
    const glowIntensityRef = useRef(0);
    const prefersReducedMotionRef = useRef(false);
    const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

    // Configuration
    const CONFIG = {
        baseAmplitude: 0,
        musicAmplitude: 20,
        clickBoostStrength: 12,
        clickBoostDuration: 150,
        transitionDuration: 500,
        glowMin: 0.2,
        glowMax: 0.6,
        waveSegments: 120,
        noiseSpeed: 0.003,
        noiseScale: 0.08,
    };

    // Handle click events for pulse effect
    useEffect(() => {
        const handleClick = () => {
            clickBoostRef.current = CONFIG.clickBoostStrength;
        };

        window.addEventListener('audioWavePulse', handleClick);
        document.addEventListener('click', handleClick, true);

        return () => {
            window.removeEventListener('audioWavePulse', handleClick);
            document.removeEventListener('click', handleClick, true);
        };
    }, []);

    // Check for reduced motion preference
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            prefersReducedMotionRef.current = mediaQuery.matches;

            const handleChange = (e: MediaQueryListEvent) => {
                prefersReducedMotionRef.current = e.matches;
            };

            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, []);

    // Initialize frequency data array when analyser is available
    useEffect(() => {
        if (analyserNode) {
            frequencyDataRef.current = new Uint8Array(analyserNode.frequencyBinCount) as Uint8Array<ArrayBuffer>;
        }
    }, [analyserNode]);

    // Draw function
    const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const time = timeRef.current;
        const reducedMotion = prefersReducedMotionRef.current;

        // Update target amplitude based on music state
        targetAmplitudeRef.current = isPlaying && !reducedMotion ? CONFIG.musicAmplitude : CONFIG.baseAmplitude;

        // Smooth amplitude transition (power2.inOut feel)
        const ampDiff = targetAmplitudeRef.current - waveAmplitudeRef.current;
        const ampSpeed = 0.04; // Controls transition smoothness
        waveAmplitudeRef.current += ampDiff * ampSpeed;

        // Decay click boost smoothly (slower, longer effect)
        clickBoostRef.current *= 0.96;
        if (clickBoostRef.current < 0.01) clickBoostRef.current = 0;

        // Get audio frequency data if available and playing
        let audioLevel = 0;
        if (isPlaying && analyserNode && frequencyDataRef.current) {
            analyserNode.getByteFrequencyData(frequencyDataRef.current as any);
            // Average of bass and mid frequencies for more reactive feel
            const bassSum = frequencyDataRef.current.slice(0, 10).reduce((a, b) => a + b, 0);
            const midSum = frequencyDataRef.current.slice(10, 30).reduce((a, b) => a + b, 0);
            audioLevel = (bassSum / 10 + midSum / 20) / 255; // Normalized 0-1
        }

        // Calculate total amplitude
        const baseWave = waveAmplitudeRef.current;
        const audioBoost = audioLevel * 8;
        const clickPulse = clickBoostRef.current;
        const totalAmplitude = baseWave + audioBoost + clickPulse;

        // Update glow intensity
        const targetGlow = isPlaying ? CONFIG.glowMax : CONFIG.glowMin;
        glowIntensityRef.current += (targetGlow - glowIntensityRef.current) * 0.05;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Wave parameters
        const centerX = width / 2;
        const waveHeight = height * 0.7;
        const startY = (height - waveHeight) / 2;
        const segments = CONFIG.waveSegments;

        // Draw wave path
        ctx.beginPath();

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const y = startY + t * waveHeight;

            // Taper amplitude at edges (still for ~20% at each end)
            const edgeThreshold = 0.2;
            let edgeFade = 1;
            if (t < edgeThreshold) {
                edgeFade = Math.pow(t / edgeThreshold, 2); // Smooth ease-in at start
            } else if (t > 1 - edgeThreshold) {
                edgeFade = Math.pow((1 - t) / edgeThreshold, 2); // Smooth ease-out at end
            }

            // Perlin noise for organic movement
            const noiseVal = noise(t * 3 + time * CONFIG.noiseSpeed);
            const noiseOffset = noiseVal * CONFIG.noiseScale * totalAmplitude * 3 * edgeFade;

            // Sin wave for smooth oscillation (curvy, fewer but larger waves)
            const sinOffset = Math.sin(t * Math.PI * 6 + time * 0.002) * totalAmplitude * 0.8 * edgeFade;

            // Combined offset
            const xOffset = (noiseOffset + sinOffset) * (reducedMotion ? 0 : 1);

            if (i === 0) {
                ctx.moveTo(centerX + xOffset, y);
            } else {
                ctx.lineTo(centerX + xOffset, y);
            }
        }

        // Style the wave
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Apply glow effect
        const glowIntensity = glowIntensityRef.current;
        ctx.shadowColor = `rgba(255, 255, 255, ${glowIntensity})`;
        ctx.shadowBlur = 8 + glowIntensity * 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.stroke();

        // Draw a second pass for stronger glow when music is on
        if (isPlaying && !reducedMotion) {
            ctx.shadowBlur = 4;
            ctx.globalAlpha = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Reset shadow
        ctx.shadowBlur = 0;
    }, [isPlaying, analyserNode]);

    // Animation loop
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        timeRef.current += 16.67; // ~60fps increment
        draw(ctx, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
        animationRef.current = requestAnimationFrame(animate);
    }, [draw]);

    // Initialize canvas and start animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(dpr, dpr);
            }
        };

        resize();
        window.addEventListener('resize', resize);
        animationRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationRef.current);
        };
    }, [animate]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: '55%',
                right: '3.5rem',
                width: '80px',
                height: '640px',
                transform: 'translateY(-50%)',
                zIndex: 9998,
                pointerEvents: 'none',
            }}
            aria-hidden="true"
        />
    );
};

export default AudioWave;

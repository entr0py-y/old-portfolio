'use client';

import { useEffect, useRef, ReactNode } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface SmoothScrollProps {
    children: ReactNode;
}

export default function SmoothScroll({ children }: SmoothScrollProps) {
    const lenisRef = useRef<Lenis | null>(null);

    useEffect(() => {
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            // Fallback: use native scroll
            return;
        }

        // Initialize Lenis smooth scroll
        lenisRef.current = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential easing
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 2,
        });

        // Sync Lenis with GSAP ScrollTrigger
        lenisRef.current.on('scroll', ScrollTrigger.update);

        // Add Lenis to GSAP ticker for synchronized updates
        gsap.ticker.add((time) => {
            lenisRef.current?.raf(time * 1000);
        });

        // Ensure GSAP ticker uses RAF
        gsap.ticker.lagSmoothing(0);

        return () => {
            lenisRef.current?.destroy();
            gsap.ticker.remove((time) => {
                lenisRef.current?.raf(time * 1000);
            });
        };
    }, []);

    return <>{children}</>;
}

// Export Lenis instance getter for external use
export function useLenis() {
    return null; // Will be implemented with context if needed
}

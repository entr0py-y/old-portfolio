import React, { useEffect, useRef } from 'react';

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const intensityRef = useRef(0.5);
  const isMovingRef = useRef(false);
  const animationRef = useRef<number>();

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) return;

    const glow = glowRef.current;
    const dot = dotRef.current;
    if (!glow || !dot) return;

    let lastMoveTime = 0;
    let moveTimeout: number;

    const handleMouseMove = (e: MouseEvent) => {
      positionRef.current.x = e.clientX;
      positionRef.current.y = e.clientY;
      lastMoveTime = performance.now();
      isMovingRef.current = true;

      clearTimeout(moveTimeout);
      moveTimeout = window.setTimeout(() => {
        isMovingRef.current = false;
      }, 150);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Single RAF loop for all cursor updates
    const animate = () => {
      const pos = positionRef.current;

      // Smooth intensity transition
      const targetIntensity = isMovingRef.current ? 0.8 : 0.5;
      intensityRef.current += (targetIntensity - intensityRef.current) * 0.15;
      const intensity = intensityRef.current;

      // Update positions using transform (GPU accelerated)
      glow.style.transform = `translate3d(${pos.x - 30}px, ${pos.y - 30}px, 0)`;
      glow.style.opacity = String(intensity);

      dot.style.transform = `translate3d(${pos.x - 3}px, ${pos.y - 3}px, 0)`;

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(moveTimeout);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Check for mobile on mount
  if (typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    return null;
  }

  return (
    <>
      <div
        ref={glowRef}
        className="fixed pointer-events-none z-50 mix-blend-multiply"
        style={{
          width: '60px',
          height: '60px',
          willChange: 'transform, opacity',
          left: 0,
          top: 0,
        }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.1) 30%, rgba(0, 0, 0, 0.02) 60%, transparent 80%)',
            filter: 'blur(15px)',
            boxShadow: '0 0 40px rgba(0, 0, 0, 0.15), 0 0 80px rgba(0, 0, 0, 0.07)',
          }}
        />
      </div>

      <div
        ref={dotRef}
        className="fixed pointer-events-none z-50"
        style={{
          width: '6px',
          height: '6px',
          willChange: 'transform',
          left: 0,
          top: 0,
        }}
      >
        <div className="w-full h-full rounded-full bg-white" />
      </div>
    </>
  );
}

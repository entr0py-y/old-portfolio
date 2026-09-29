import React, { useEffect, useRef } from 'react';

export default function FollowCube() {
  const cubeRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  const [isMobile, setIsMobile] = React.useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const cube = cubeRef.current;
    if (!cube) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const animate = () => {
      // Smooth follow with easing
      const ease = 0.08;
      currentPosRef.current.x += (mouseRef.current.x - currentPosRef.current.x) * ease;
      currentPosRef.current.y += (mouseRef.current.y - currentPosRef.current.y) * ease;

      // Use transform3d for GPU acceleration
      cube.style.transform = `translate3d(${currentPosRef.current.x - 50}px, ${currentPosRef.current.y - 50}px, 0)`;

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []); // Run effect always, but can exit early if isMobile inside?
  // Actually, better to just let it run or add isMobile dependency. 
  // But strictly, simply returning null at the end is safest for Hook rules.

  if (isMobile) return null;

  return (
    <div
      ref={cubeRef}
      className="fixed pointer-events-none z-0"
      style={{
        width: '100px',
        height: '100px',
        willChange: 'transform',
        left: 0,
        top: 0,
      }}
    >
      <div
        className="w-full h-full animate-spin"
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          border: '2px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 0 20px rgba(255, 255, 255, 0.4)',
          animationDuration: '4s',
        }}
      />
    </div>
  );
}

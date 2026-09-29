import React, { useEffect, useRef } from 'react';

interface Bar {
  id: number;
  x: number;
  y: number;
  startTime: number;
  direction: number;
}

export default function RedBars() {
  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<Bar[]>([]);
  const animationRef = useRef<number>();
  const barIdRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
      const now = performance.now();

      // Create 4 bars going in all directions
      for (let i = 0; i < 4; i++) {
        barsRef.current.push({
          id: barIdRef.current++,
          x: clientX,
          y: clientY,
          startTime: now,
          direction: i
        });
      }

      // Limit total bars
      if (barsRef.current.length > 20) {
        barsRef.current = barsRef.current.slice(-20);
      }
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('touchstart', handleClick, { passive: true });

    // Animation loop
    const animate = (timestamp: number) => {
      // Remove expired bars
      barsRef.current = barsRef.current.filter(bar => timestamp - bar.startTime < 1500);

      // Update DOM
      let html = '';
      for (const bar of barsRef.current) {
        const elapsed = timestamp - bar.startTime;
        const scaleProgress = Math.min(elapsed / 600, 1);
        const opacityProgress = Math.min(elapsed / 1500, 1);
        const opacity = 0.8 * (1 - opacityProgress);

        let style = '';
        let transform = '';

        if (bar.direction === 0) {
          // Right
          style = `left:${bar.x}px;top:${bar.y - 1}px;height:2px;width:100vw;transform-origin:0 center;`;
          transform = `scaleX(${scaleProgress})`;
        } else if (bar.direction === 1) {
          // Left
          style = `right:${window.innerWidth - bar.x}px;top:${bar.y - 1}px;height:2px;width:100vw;transform-origin:100% center;`;
          transform = `scaleX(${scaleProgress})`;
        } else if (bar.direction === 2) {
          // Up
          style = `left:${bar.x - 1}px;bottom:${window.innerHeight - bar.y}px;width:2px;height:100vh;transform-origin:center 100%;`;
          transform = `scaleY(${scaleProgress})`;
        } else {
          // Down
          style = `left:${bar.x - 1}px;top:${bar.y}px;width:2px;height:100vh;transform-origin:center 0;`;
          transform = `scaleY(${scaleProgress})`;
        }

        const gradient = bar.direction < 2
          ? 'linear-gradient(90deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.8) 80%, transparent 100%)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.8) 80%, transparent 100%)';

        html += `<div style="position:absolute;${style}transform:${transform};opacity:${opacity};will-change:transform,opacity;">
          <div style="width:100%;height:100%;background:${gradient};box-shadow:0 0 10px 2px rgba(255,255,255,0.6), 0 0 20px 4px rgba(255,255,255,0.3);"></div>
        </div>`;
      }

      container.innerHTML = html;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('touchstart', handleClick);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
    />
  );
}

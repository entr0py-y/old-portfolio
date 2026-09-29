import React, { useEffect, useRef, useMemo } from 'react';

interface ClickTesseractProps {
  x: number;
  y: number;
}

export default function ClickTesseract({ x, y }: ClickTesseractProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef({ xy: 0, xz: 0, xw: 0, yz: 0, yw: 0, zw: 0 });
  const animationRef = useRef<number>();
  const startTime = useRef(0);

  // Pre-calculate vertices and edges once
  const { vertices4D, edges } = useMemo(() => {
    const verts: number[][] = [];
    for (let i = 0; i < 16; i++) {
      verts.push([
        (i & 1) ? 0.5 : -0.5,
        (i & 2) ? 0.5 : -0.5,
        (i & 4) ? 0.5 : -0.5,
        (i & 8) ? 0.5 : -0.5,
      ]);
    }

    const edgeList: number[][] = [];
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        let diff = 0;
        for (let k = 0; k < 4; k++) {
          if (verts[i][k] !== verts[j][k]) diff++;
        }
        if (diff === 1) edgeList.push([i, j]);
      }
    }

    return { vertices4D: verts, edges: edgeList };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const size = 200;
    canvas.width = size;
    canvas.height = size;
    startTime.current = performance.now();

    // Pre-allocate array
    const transformedVertices: number[][] = new Array(16).fill(null).map(() => [0, 0]);

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / 800, 1);

      // Speed up rotation and fade out
      const speedMultiplier = 1 + progress * 4;
      const rot = rotationRef.current;
      rot.xy += 0.03 * speedMultiplier;
      rot.xz += 0.02 * speedMultiplier;
      rot.xw += 0.025 * speedMultiplier;
      rot.yz += 0.02 * speedMultiplier;
      rot.yw += 0.03 * speedMultiplier;
      rot.zw += 0.025 * speedMultiplier;

      ctx.clearRect(0, 0, size, size);

      const scale = 40 * (1 + progress * 0.5);
      const halfSize = size / 2;

      // Transform all vertices
      for (let i = 0; i < 16; i++) {
        const v = vertices4D[i];
        let vx = v[0], vy = v[1], vz = v[2], vw = v[3];

        // Inline rotations for performance
        let cos = Math.cos(rot.xy), sin = Math.sin(rot.xy);
        let nx = vx * cos - vy * sin, ny = vx * sin + vy * cos;
        vx = nx; vy = ny;

        cos = Math.cos(rot.xz); sin = Math.sin(rot.xz);
        nx = vx * cos - vz * sin;
        let nz = vx * sin + vz * cos;
        vx = nx; vz = nz;

        cos = Math.cos(rot.xw); sin = Math.sin(rot.xw);
        nx = vx * cos - vw * sin;
        let nw = vx * sin + vw * cos;
        vx = nx; vw = nw;

        cos = Math.cos(rot.yz); sin = Math.sin(rot.yz);
        ny = vy * cos - vz * sin;
        nz = vy * sin + vz * cos;
        vy = ny; vz = nz;

        cos = Math.cos(rot.yw); sin = Math.sin(rot.yw);
        ny = vy * cos - vw * sin;
        nw = vy * sin + vw * cos;
        vy = ny; vw = nw;

        cos = Math.cos(rot.zw); sin = Math.sin(rot.zw);
        nz = vz * cos - vw * sin;
        vz = nz;

        // Project 4D -> 3D -> 2D
        const f4 = 2 / (2 - vw);
        const px = vx * f4, py = vy * f4, pz = vz * f4;
        const f3 = 3 / (3 - pz);

        transformedVertices[i][0] = halfSize + px * f3 * scale;
        transformedVertices[i][1] = halfSize + py * f3 * scale;
      }

      // Draw edges
      const opacity = 1 - progress;
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
      ctx.lineWidth = 2;

      ctx.beginPath();
      for (let i = 0; i < edges.length; i++) {
        const [a, b] = edges[i];
        ctx.moveTo(transformedVertices[a][0], transformedVertices[a][1]);
        ctx.lineTo(transformedVertices[b][0], transformedVertices[b][1]);
      }
      ctx.stroke();

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [vertices4D, edges]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed pointer-events-none z-50"
      style={{
        left: x - 100,
        top: y - 100,
        willChange: 'transform',
      }}
    />
  );
}

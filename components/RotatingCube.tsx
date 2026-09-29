import React, { useEffect, useRef, useMemo } from 'react';

interface RotatingCubeProps {
  isInverted?: boolean;
}

export default function RotatingCube({ isInverted = false }: RotatingCubeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ xy: 0, xz: 0, xw: 0, yz: 0, yw: 0, zw: 0 });
  const animationRef = useRef<number>();
  const isInvertedRef = useRef(isInverted);

  // Update ref when prop changes
  useEffect(() => {
    isInvertedRef.current = isInverted;
  }, [isInverted]);

  // Pre-calculate vertices and edges once
  const { vertices4D, edges } = useMemo(() => {
    const verts: number[][] = [];
    for (let i = 0; i < 16; i++) {
      verts.push([
        (i & 1) ? 1 : -1,
        (i & 2) ? 1 : -1,
        (i & 4) ? 1 : -1,
        (i & 8) ? 1 : -1
      ]);
    }

    const edgeList: number[][] = [];
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        const diff = i ^ j;
        if (diff && !(diff & (diff - 1))) {
          edgeList.push([i, j]);
        }
      }
    }

    return { vertices4D: verts, edges: edgeList };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Throttled mouse handler
    let lastMouseUpdate = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastMouseUpdate < 16) return; // ~60fps throttle
      lastMouseUpdate = now;
      mouseRef.current = {
        x: (e.clientX / width) * 2 - 1,
        y: (e.clientY / height) * 2 - 1
      };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Pre-allocate arrays for performance
    const projectedVertices: number[][] = new Array(16).fill(null).map(() => [0, 0, 0]);
    const rotated = [0, 0, 0, 0];
    const proj3D = [0, 0, 0];

    // Optimized 4D rotation - inline calculations
    const rotate4DAndProject = (vIdx: number, centerX: number, centerY: number, scale: number) => {
      const v = vertices4D[vIdx];
      let x = v[0], y = v[1], z = v[2], w = v[3];
      const angles = rotationRef.current;

      // XY rotation
      let cos = Math.cos(angles.xy), sin = Math.sin(angles.xy);
      let nx = x * cos - y * sin, ny = x * sin + y * cos;
      x = nx; y = ny;

      // XZ rotation
      cos = Math.cos(angles.xz); sin = Math.sin(angles.xz);
      nx = x * cos - z * sin;
      let nz = x * sin + z * cos;
      x = nx; z = nz;

      // XW rotation
      cos = Math.cos(angles.xw); sin = Math.sin(angles.xw);
      nx = x * cos - w * sin;
      let nw = x * sin + w * cos;
      x = nx; w = nw;

      // YZ rotation
      cos = Math.cos(angles.yz); sin = Math.sin(angles.yz);
      ny = y * cos - z * sin;
      nz = y * sin + z * cos;
      y = ny; z = nz;

      // YW rotation
      cos = Math.cos(angles.yw); sin = Math.sin(angles.yw);
      ny = y * cos - w * sin;
      nw = y * sin + w * cos;
      y = ny; w = nw;

      // ZW rotation
      cos = Math.cos(angles.zw); sin = Math.sin(angles.zw);
      nz = z * cos - w * sin;
      nw = z * sin + w * cos;
      z = nz; w = nw;

      // Project 4D to 3D
      const factor4D = 2 / (2 - w);
      const px = x * factor4D, py = y * factor4D, pz = z * factor4D;

      // Project 3D to 2D
      const factor3D = 3 / (3 - pz);
      projectedVertices[vIdx][0] = centerX + px * factor3D * scale;
      projectedVertices[vIdx][1] = centerY + py * factor3D * scale;
      projectedVertices[vIdx][2] = pz;
    };

    let lastFrame = 0;
    const targetFrameTime = 1000 / 60; // 60fps

    // Lerp function and transition state
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    let transitionProgress = isInvertedRef.current ? 1 : 0;
    const transitionSpeed = 0.03;

    const drawTesseract = (timestamp: number) => {
      // Frame limiting for consistent 60fps
      const deltaTime = timestamp - lastFrame;
      if (deltaTime < targetFrameTime * 0.9) {
        animationRef.current = requestAnimationFrame(drawTesseract);
        return;
      }
      lastFrame = timestamp;

      // Smooth theme transition
      const targetProgress = isInvertedRef.current ? 1 : 0;
      transitionProgress += (targetProgress - transitionProgress) * transitionSpeed;
      const progress = transitionProgress;

      // Lerp color value: 0 = inverted (black), 1 = normal (white)
      // Note: For tesseract, we want white when normal (progress=0), black when inverted (progress=1)
      const colorValue = Math.round(lerp(255, 0, progress));

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const size = Math.min(width, height) * 0.2;

      // Smooth rotation updates
      const rot = rotationRef.current;
      const mouse = mouseRef.current;
      rot.xy += (mouse.x * 0.3 - rot.xy) * 0.05;
      rot.xz += (mouse.y * 0.3 - rot.xz) * 0.05;
      rot.xw += (mouse.x * 0.2 - rot.xw) * 0.05;
      rot.yz += 0.005;
      rot.yw += 0.003;
      rot.zw += 0.002;

      // Project all vertices
      for (let i = 0; i < 16; i++) {
        rotate4DAndProject(i, centerX, centerY, size);
      }

      // Draw edges (skip sorting for performance - use simple depth check)
      ctx.lineWidth = 2;
      for (let i = 0; i < edges.length; i++) {
        const [a, b] = edges[i];
        const avgZ = (projectedVertices[a][2] + projectedVertices[b][2]) / 2;
        const opacity = 0.2 + (avgZ + 1) * 0.15;

        ctx.strokeStyle = `rgba(${colorValue},${colorValue},${colorValue},${opacity})`;
        ctx.beginPath();
        ctx.moveTo(projectedVertices[a][0], projectedVertices[a][1]);
        ctx.lineTo(projectedVertices[b][0], projectedVertices[b][1]);
        ctx.stroke();
      }

      // Draw vertices with batched fills
      for (let i = 0; i < 16; i++) {
        const [x, y, z] = projectedVertices[i];
        const radius = Math.max(1, 3 + (z + 1) * 2);
        const opacity = Math.max(0.1, Math.min(0.7, 0.3 + (z + 1) * 0.2));

        ctx.fillStyle = `rgba(${colorValue},${colorValue},${colorValue},${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw coordinate text
        if (opacity > 0.15) {
          // Smaller font size calculation
          const fontSize = Math.max(6, 8 + (z + 1) * 2);
          ctx.font = `${fontSize}px "Space Mono", monospace`;
          // Text color - lerp between dark grey (50) and light grey (200)
          const greyVal = Math.round(lerp(50, 200, progress));
          ctx.fillStyle = `rgba(${greyVal}, ${greyVal}, ${greyVal}, ${opacity * 0.8})`;
          ctx.fillText(`[${Math.round(x)}, ${Math.round(y)}]`, x + radius + 4, y + 4);
        }
      }

      animationRef.current = requestAnimationFrame(drawTesseract);
    };

    animationRef.current = requestAnimationFrame(drawTesseract);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [vertices4D, edges]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ willChange: 'transform' }}
    />
  );
}


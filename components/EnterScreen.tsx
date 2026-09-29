import React, { useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamic imports to avoid SSR issues
const RotatingCube = dynamic(() => import('./RotatingCube'), { ssr: false });
const NetworkMesh = dynamic(() => import('./NetworkMesh'), { ssr: false });

interface EnterScreenProps {
    onEnter: () => void;
}

export default function EnterScreen({ onEnter }: EnterScreenProps) {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    return (
        <motion.div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-end pb-16 cursor-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            onMouseMove={handleMouseMove}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
        >
            {/* Web-like structure - Bottom layer */}
            <NetworkMesh />

            {/* Tesseract with coordinates - Background */}
            <RotatingCube />

            {/* Full overlay */}
            <div className="absolute inset-0 bg-black/40" />

            {/* User Quote */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full max-w-2xl px-6 pointer-events-none select-none">
                <p className="font-space-mono text-white text-lg md:text-xl glow-white leading-relaxed mb-6 tracking-wide">
                    "The optimist thinks this is the best of all possible worlds; the pessimist fears it is true."
                </p>
                <p className="font-space-mono text-white/80 text-sm md:text-base glow-white tracking-widest">
                    - J. Robert Oppenheimer
                </p>
            </div>

            {/* Custom cursor - dot with circle */}
            <div
                className="fixed pointer-events-none z-[10000] transition-transform duration-150"
                style={{
                    left: mousePos.x,
                    top: mousePos.y,
                    transform: 'translate(-50%, -50%)',
                }}
            >
                {/* Inner dot */}
                <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${isHovering ? 'bg-white' : 'bg-white'} transition-colors duration-200`} />
                {/* Outer circle */}
                <div
                    className={`w-8 h-8 rounded-full border ${isHovering ? 'border-white scale-125' : 'border-white/50'} transition-all duration-200`}
                />
            </div>

            {/* Enter text at bottom */}
            <span
                onClick={onEnter}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="cursor-none relative z-10 font-space-mono text-xs tracking-[0.2em] text-white/70 hover:text-white transition-colors duration-300"
            >
                &lt;ENTER PORTFOLIO/&gt;
            </span>
        </motion.div>
    );
}

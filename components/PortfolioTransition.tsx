import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface PortfolioTransitionProps {
    isActive: boolean;
    onComplete?: () => void;
    children: React.ReactNode;
}

// Staggered build-in configuration for UI elements
const buildInVariants = {
    hidden: {
        opacity: 0,
        y: 30,
        filter: 'blur(4px)',
    },
    visible: (delay: number) => ({
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: {
            duration: 0.6,
            delay: delay,
            ease: [0.22, 1, 0.36, 1], // Premium cubic-bezier easing
        },
    }),
};

// Container that orchestrates the full transition
export default function PortfolioTransition({
    isActive,
    onComplete,
    children
}: PortfolioTransitionProps) {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setPrefersReducedMotion(
                window.matchMedia('(prefers-reduced-motion: reduce)').matches
            );
        }
    }, []);

    useEffect(() => {
        if (isActive && onComplete) {
            // Call onComplete after the full transition duration
            const timer = setTimeout(onComplete, prefersReducedMotion ? 0 : 900);
            return () => clearTimeout(timer);
        }
    }, [isActive, onComplete, prefersReducedMotion]);

    // Reduced motion: instant reveal
    if (prefersReducedMotion) {
        return <>{children}</>;
    }

    return (
        <motion.div
            initial="hidden"
            animate={isActive ? "visible" : "hidden"}
            className="w-full h-full"
        >
            {children}
        </motion.div>
    );
}

// Wrapper component for individual elements with staggered build-in
interface TransitionElementProps {
    children: React.ReactNode;
    order: number; // 0-based order for stagger timing
    className?: string;
}

export function TransitionElement({ children, order, className = '' }: TransitionElementProps) {
    const delay = 0.15 + order * 0.1; // Base delay + stagger

    return (
        <motion.div
            variants={buildInVariants}
            custom={delay}
            className={className}
            style={{
                willChange: 'opacity, transform, filter',
                display: 'contents' // Prevents layout breakage by making wrapper invisible to layout
            }}
        >
            {/* Inner wrapper for animation since display:contents can't animate transforms */}
            <motion.div
                initial={{ opacity: 0, y: 30, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                    duration: 0.6,
                    delay: delay,
                    ease: [0.22, 1, 0.36, 1],
                }}
            >
                {children}
            </motion.div>
        </motion.div>
    );
}

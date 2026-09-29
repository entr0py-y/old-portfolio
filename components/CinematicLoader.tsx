import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CinematicLoaderProps {
    onComplete: () => void;
    onEnter?: () => void;
}

// Fake process messages - easily editable
const LOADING_MESSAGES = [
    'Initializing experience',
    'Loading portfolio',
    'Implementing effects',
    'Calibrating audio',
    'Preparing interface',
];

// CRITICAL: Fixed minimum duration - NON-NEGOTIABLE
const MINIMUM_DURATION = 2000; // 2 seconds - MUST always complete
const MESSAGE_INTERVAL = 350; // ~350ms per message = ~1750ms total for 5 messages
const EXIT_ANIMATION_DURATION = 600; // Exit transition duration

export default function CinematicLoader({ onComplete, onEnter }: CinematicLoaderProps) {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [isExiting, setIsExiting] = useState(false);
    const [showEnterPrompt, setShowEnterPrompt] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    // Refs to track completion state
    const hasCompletedRef = useRef(false);
    const timerCompleteRef = useRef(false);

    // Check for reduced motion preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    // Handler for user tap/click to enter
    const handleEnter = () => {
        if (!timerCompleteRef.current || hasCompletedRef.current) return;

        hasCompletedRef.current = true;
        setIsExiting(true);

        // Trigger immediate entry (for music/audio context)
        onEnter?.();

        // Wait for exit animation before calling onComplete
        setTimeout(() => {
            onComplete();
        }, EXIT_ANIMATION_DURATION);
    };

    // CRITICAL: Fixed 2000ms minimum timer - NON-NEGOTIABLE
    useEffect(() => {
        // This timer MUST complete before showing enter prompt
        const minimumTimer = setTimeout(() => {
            timerCompleteRef.current = true;
            setShowEnterPrompt(true);
        }, MINIMUM_DURATION);

        return () => clearTimeout(minimumTimer);
    }, []);

    // Cycle through messages - fits within the 2000ms window
    useEffect(() => {
        if (prefersReducedMotion) return;
        if (isExiting || showEnterPrompt) return;

        const messageInterval = setInterval(() => {
            setCurrentMessageIndex((prev) => {
                if (prev < LOADING_MESSAGES.length - 1) {
                    return prev + 1;
                }
                return prev; // Stay on last message
            });
        }, MESSAGE_INTERVAL);

        return () => clearInterval(messageInterval);
    }, [prefersReducedMotion, isExiting, showEnterPrompt]);

    // For reduced motion: show static text, still respect 2000ms duration
    if (prefersReducedMotion) {
        return (
            <motion.div
                className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center cursor-pointer"
                initial={{ opacity: 1 }}
                animate={{ opacity: isExiting ? 0 : 1 }}
                transition={{ duration: EXIT_ANIMATION_DURATION / 1000 }}
                onClick={handleEnter}
            >
                <p className="font-space-mono text-sm md:text-lg tracking-[0.3em] text-white uppercase text-center px-6">
                    {showEnterPrompt ? 'Tap to enter' : LOADING_MESSAGES[currentMessageIndex]}
                </p>
            </motion.div>
        );
    }

    return (
        <motion.div
            className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center select-none ${showEnterPrompt ? 'cursor-pointer' : 'cursor-none'}`}
            initial={{ opacity: 1 }}
            animate={{
                opacity: isExiting ? 0 : 1,
                y: isExiting ? -30 : 0,
            }}
            transition={{
                duration: EXIT_ANIMATION_DURATION / 1000,
                ease: [0.22, 1, 0.36, 1]
            }}
            onClick={handleEnter}
        >
            {/* Removed subtle gradient overlay to ensure text visibility */}

            {/* Message container */}
            <div className="relative flex items-center justify-center min-h-[100px]">
                <AnimatePresence mode="wait">
                    {!showEnterPrompt ? (
                        <motion.p
                            key={currentMessageIndex}
                            className="font-space-mono text-sm md:text-lg tracking-[0.3em] text-white uppercase absolute whitespace-nowrap"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{
                                duration: 0.3,
                                ease: "easeInOut"
                            }}
                        >
                            {LOADING_MESSAGES[currentMessageIndex]}
                        </motion.p>
                    ) : (
                        <motion.p
                            key="enter-prompt"
                            className="font-space-mono text-lg md:text-2xl tracking-[0.4em] text-white uppercase absolute whitespace-nowrap drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{
                                opacity: [0.4, 1, 0.4],
                                scale: 1
                            }}
                            transition={{
                                opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                                scale: { duration: 0.5, ease: 'easeOut' }
                            }}
                        >
                            Tap to enter
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>

            {/* Subtle bottom indicator line - grows over 2 seconds */}
            <motion.div
                className="absolute bottom-20 left-1/2 -translate-x-1/2 h-px bg-white/30"
                initial={{ width: 0 }}
                animate={{ width: showEnterPrompt ? 100 : 80 }}
                transition={{
                    width: { duration: MINIMUM_DURATION / 1000, ease: 'linear' }
                }}
            />
        </motion.div>
    );
}

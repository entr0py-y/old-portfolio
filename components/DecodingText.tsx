import React, { useState, useEffect, useRef, useCallback } from 'react';

interface DecodingTextProps {
    text: string;
    className?: string;
    duration?: number;
    delay?: number;
    trigger?: boolean;
    onComplete?: () => void;
    as?: React.ElementType;
}

// Clean alphanumeric character set that renders well with Valorant font
const DECODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export default function DecodingText({
    text,
    className = '',
    duration = 600,
    delay = 0,
    trigger = true,
    onComplete,
    as: Component = 'span'
}: DecodingTextProps) {
    const [displayText, setDisplayText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const rafRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const hasStartedRef = useRef(false);
    const prefersReducedMotion = useRef(false);

    // Check for reduced motion preference
    useEffect(() => {
        if (typeof window !== 'undefined') {
            prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }
    }, []);

    const getRandomChar = useCallback(() => {
        return DECODE_CHARS[Math.floor(Math.random() * DECODE_CHARS.length)];
    }, []);

    const animate = useCallback((timestamp: number) => {
        if (!startTimeRef.current) {
            startTimeRef.current = timestamp;
        }

        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Calculate how many characters should be revealed
        const totalChars = text.length;
        const revealedCount = Math.floor(progress * totalChars);

        // Build the display text
        let result = '';
        for (let i = 0; i < totalChars; i++) {
            if (text[i] === ' ') {
                result += ' ';
            } else if (i < revealedCount) {
                // This character is fully revealed
                result += text[i];
            } else if (i === revealedCount && progress < 1) {
                // Current character being decoded - cycle through random chars
                // Add some variance based on time for organic feel
                const charCycleProgress = (elapsed % 80) / 80;
                if (charCycleProgress < 0.7) {
                    result += getRandomChar();
                } else {
                    result += text[i];
                }
            } else {
                // Characters not yet reached - show random symbols
                result += getRandomChar();
            }
        }

        setDisplayText(result);

        if (progress < 1) {
            rafRef.current = requestAnimationFrame(animate);
        } else {
            // Ensure final text is exactly correct
            setDisplayText(text);
            setIsComplete(true);
            if (onComplete) {
                onComplete();
            }
        }
    }, [text, duration, getRandomChar, onComplete]);

    const startAnimation = useCallback(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        // Initial scrambled state
        let initialScramble = '';
        for (let i = 0; i < text.length; i++) {
            if (text[i] === ' ') {
                initialScramble += ' ';
            } else {
                initialScramble += getRandomChar();
            }
        }
        setDisplayText(initialScramble);

        // Start the decode animation
        setTimeout(() => {
            rafRef.current = requestAnimationFrame(animate);
        }, 50);
    }, [text, getRandomChar, animate]);

    useEffect(() => {
        if (!trigger) {
            hasStartedRef.current = false;
            startTimeRef.current = null;
            setDisplayText('');
            setIsComplete(false);
            return;
        }

        // Reduced motion: instant reveal
        if (prefersReducedMotion.current) {
            setDisplayText(text);
            setIsComplete(true);
            if (onComplete) onComplete();
            return;
        }

        // Start with delay
        const timeoutId = setTimeout(startAnimation, delay);

        return () => {
            clearTimeout(timeoutId);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [trigger, delay, text, startAnimation, onComplete]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    return (
        <Component
            className={className}
            style={{
                willChange: isComplete ? 'auto' : 'contents',
                fontVariantNumeric: 'tabular-nums' // Prevent layout shift with numbers
            }}
        >
            {displayText || text}
        </Component>
    );
}

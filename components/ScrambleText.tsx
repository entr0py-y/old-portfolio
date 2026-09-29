import React, { useState, useEffect, useRef } from 'react';

interface ScrambleTextProps {
    text: string;
    className?: string;
    duration?: number; // ms, default 500
    as?: React.ElementType; // h1, h2, span, p, etc.
}

export default function ScrambleText({ text, className = '', duration = 500, as: Component = 'span' }: ScrambleTextProps) {
    const [displayText, setDisplayText] = useState(text);
    const isHoveringRef = useRef(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const glitchChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

    const scramble = () => {
        // Clear existing timers
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const startTime = Date.now();

        intervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;

            if (elapsed >= duration) {
                // Stop and reset
                if (intervalRef.current) clearInterval(intervalRef.current);
                setDisplayText(text);
                return;
            }

            // Randomize text
            const scrambled = text.split('').map((char) => {
                if (char === ' ') return ' ';
                // Higher probability of showing original char as we near end?
                // Or just pure chaos? User said "same effect", current effect is random chaos.
                // Let's do pure chaos but preserve length
                return glitchChars[Math.floor(Math.random() * glitchChars.length)];
            }).join('');

            setDisplayText(scrambled);
        }, 50); // Update every 50ms

        // Safety timeout to ensure reset
        timeoutRef.current = setTimeout(() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setDisplayText(text);
        }, duration);
    };

    const handleMouseEnter = () => {
        isHoveringRef.current = true;
        scramble();
    };

    const handleMouseLeave = () => {
        isHoveringRef.current = false;
        // We don't necessarily stop immediately, let it finish the 0.5s burst?
        // User said "for 0.5 seconds", implies fixed duration burst.
        // So we let it run.
    };

    // If prop text changes, update display
    useEffect(() => {
        setDisplayText(text);
    }, [text]);

    return (
        <Component
            className={className}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {displayText}
        </Component>
    );
}

'use client';

import { useEffect, useRef, ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ScrollSectionProps {
    children: ReactNode;
    id: string;
    className?: string;
}

export default function ScrollSection({ children, id, className = '' }: ScrollSectionProps) {
    const sectionRef = useRef<HTMLElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!sectionRef.current || !contentRef.current) return;

        const section = sectionRef.current;
        const content = contentRef.current;

        // Create scroll-triggered animation for this section
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: section,
                start: 'top 80%',
                end: 'top 20%',
                scrub: 1,
            },
        });

        // Content fade and slide in
        tl.fromTo(
            content,
            {
                opacity: 0,
                y: 60,
            },
            {
                opacity: 1,
                y: 0,
                duration: 1,
                ease: 'power2.out',
            }
        );

        // Create exit animation
        gsap.timeline({
            scrollTrigger: {
                trigger: section,
                start: 'bottom 80%',
                end: 'bottom 20%',
                scrub: 1,
            },
        }).to(content, {
            opacity: 0,
            y: -40,
            duration: 1,
            ease: 'power2.in',
        });

        return () => {
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, []);

    return (
        <section
            ref={sectionRef}
            id={id}
            className={`min-h-screen flex items-center justify-center relative ${className}`}
        >
            <div ref={contentRef} className="w-full">
                {children}
            </div>
        </section>
    );
}

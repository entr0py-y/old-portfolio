import React, { useEffect, useRef, useState, useCallback } from 'react';
import ScrambleText from './ScrambleText';

interface BackgroundMusicProps {
    shouldPlay: boolean;
    isInverted?: boolean;
    onAnalyserReady?: (analyser: AnalyserNode | null) => void;
    onPlayingChange?: (isPlaying: boolean) => void;
}

export default function BackgroundMusic({ shouldPlay, isInverted = false, onAnalyserReady, onPlayingChange }: BackgroundMusicProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    // Default to ON - music should play by default
    const [isPlaying, setIsPlaying] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const hasTriedAutoplayRef = useRef(false);
    const wasPlayingRef = useRef(false);

    // Initialize audio on mount
    useEffect(() => {
        const audio = new Audio('/audio/a-dream-about-you.mp3');
        audio.loop = true;
        audio.volume = 0.3;
        audio.preload = 'auto';

        audio.addEventListener('play', () => setIsPlaying(true));
        audio.addEventListener('pause', () => setIsPlaying(false));
        audio.addEventListener('canplaythrough', () => setIsLoaded(true));
        audio.addEventListener('error', (e) => console.error('Audio error:', e));

        audioRef.current = audio;

        return () => {
            audio.pause();
            audio.src = '';
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    // Setup AudioContext and Analyser
    const setupAudioContext = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || audioContextRef.current) return;

        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const source = ctx.createMediaElementSource(audio);
        sourceRef.current = source;
        source.connect(analyser);
        analyser.connect(ctx.destination);

        onAnalyserReady?.(analyser);
    }, [onAnalyserReady]);

    // Play music function
    const playMusic = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !isLoaded) return;

        setupAudioContext();

        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }

        if (audio.currentTime === 0 || audio.currentTime < 5) {
            audio.currentTime = 5;
        }

        audio.volume = 0;
        audio.play()
            .then(() => {
                let vol = 0;
                const fadeIn = setInterval(() => {
                    vol += 0.02;
                    if (vol >= 0.3) {
                        audio.volume = 0.3;
                        clearInterval(fadeIn);
                    } else {
                        audio.volume = vol;
                    }
                }, 50);
            })
            .catch((err) => {
                console.log('Play failed:', err);
            });
    }, [isLoaded, setupAudioContext]);

    // Pause music function - instant
    const pauseMusic = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.pause();
        audio.volume = 0;
    }, []);

    // Start music on first user interaction (required by browsers)
    useEffect(() => {
        if (!shouldPlay || !isLoaded || hasTriedAutoplayRef.current) return;

        hasTriedAutoplayRef.current = true;

        // Set up listener for first user interaction
        const startMusic = () => {
            playMusic();
            document.removeEventListener('click', startMusic);
            document.removeEventListener('touchstart', startMusic);
            document.removeEventListener('keydown', startMusic);
        };

        // Add listeners for any user interaction
        document.addEventListener('click', startMusic);
        document.addEventListener('touchstart', startMusic);
        document.addEventListener('keydown', startMusic);

        // Also try immediate play (might work if user already interacted)
        playMusic();

        return () => {
            document.removeEventListener('click', startMusic);
            document.removeEventListener('touchstart', startMusic);
            document.removeEventListener('keydown', startMusic);
        };
    }, [shouldPlay, isLoaded, playMusic]);

    // Notify parent of playing state changes
    useEffect(() => {
        onPlayingChange?.(isPlaying);
    }, [isPlaying, onPlayingChange]);

    // Handle section visibility on mobile
    useEffect(() => {
        const handleSectionChange = (e: CustomEvent) => {
            if (window.innerWidth < 768) {
                setIsVisible(e.detail === 0);
            } else {
                setIsVisible(true);
            }
        };

        window.addEventListener('sectionChange', handleSectionChange as EventListener);
        return () => window.removeEventListener('sectionChange', handleSectionChange as EventListener);
    }, []);

    // Pause/resume based on tab visibility
    useEffect(() => {
        const handleVisibilityChange = () => {
            const audio = audioRef.current;
            if (!audio) return;

            if (document.hidden) {
                if (!audio.paused) {
                    wasPlayingRef.current = true;
                    audio.pause();
                }
            } else {
                if (wasPlayingRef.current && shouldPlay) {
                    wasPlayingRef.current = false;
                    audio.play().catch(console.error);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [shouldPlay]);

    // Toggle function
    const handleToggle = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (!audio.paused) {
            pauseMusic();
        } else {
            playMusic();
        }
    }, [playMusic, pauseMusic]);

    if (!shouldPlay) return null;

    const baseClasses = `fixed top-8 right-8 md:top-auto md:bottom-[6.5rem] md:right-8 z-[9999] cursor-pointer font-space-mono text-xs md:text-sm tracking-[0.3em] transition-all duration-500 bg-transparent border-none outline-none select-none`;
    const visibilityClasses = isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none';

    const colorClasses = isPlaying
        ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] hover:text-gray-200'
        : 'text-black hover:text-gray-700';

    return (
        <button
            onClick={handleToggle}
            className={`${baseClasses} ${visibilityClasses} ${colorClasses}`}
        >
            {isPlaying ?
                <ScrambleText text="<MUSIC ON/>" as="span" duration={250} /> :
                <ScrambleText text="<MUSIC OFF/>" as="span" duration={250} />
            }
        </button>
    );
}

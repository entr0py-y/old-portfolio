import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import CursorGlow from '@/components/CursorGlow';
import RotatingCube from '@/components/RotatingCube';
import FollowCube from '@/components/FollowCube';
import ClickTesseract from '@/components/ClickTesseract';
import ScrollPrism from '@/components/ScrollPrism';
import ScrambleText from '@/components/ScrambleText';
import DecodingText from '@/components/DecodingText';

// Dynamic import for NetworkMesh to avoid SSR issues
const NetworkMesh = dynamic(() => import('@/components/NetworkMesh'), { ssr: false });

const RESUME_DATA = {
  name: "PUSHKAR JHA",
  role: "ML & DATA SCIENCE UNDERGRADUATE",
  tagline: "Data-driven developer & researcher in progress",
  education: [
    {
      title: "B.TECH IN COMPUTER SCIENCE (DATA SCIENCE)",
      institution: "Indraprastha University, New Delhi",
      year: "2025 - 2029",
      status: "IN PROGRESS"
    },
    {
      title: "SECONDARY SCHOOLING (10TH & 12TH)",
      institution: "Jawahar Navodaya Vidyalaya (JNV), Delhi-2",
      year: "COMPLETED",
      status: "DONE"
    }
  ],
  skills: [
    { id: "01", name: "PYTHON / DATA SCIENCE", desc: "ML pipelines, Pandas, NumPy, Scikit-learn", category: "ML/AI", percent: "85%" },
    { id: "02", name: "TENSORFLOW / DL", desc: "Neural Networks, Computer Vision, Model Training", category: "ML/AI", percent: "80%" },
    { id: "03", name: "REACT / NEXT.JS", desc: "Component-based UI, SSR, Interactive Frontends", category: "FRONTEND", percent: "75%" },
    { id: "04", name: "TYPESCRIPT / JS", desc: "Core logic, async programming, type safety", category: "LANGUAGES", percent: "82%" },
    { id: "05", name: "SQL / DATABASES", desc: "Query optimization, schema design, data storage", category: "BACKEND", percent: "78%" },
    { id: "06", name: "GIT / GITHUB", desc: "Version control, collaboration flows", category: "TOOLS", percent: "90%" }
  ],
  stats: {
    level: "YR 1",
    focus: "ML & DS",
    status: "ONLINE"
  }
};

export default function Home({ hasEntered, isInverted = false, isTransitioning = false }: { hasEntered?: boolean; isInverted?: boolean; isTransitioning?: boolean }) {
  /* Simple Vertical Navigation State */
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const sectionsList = ['identity', 'skills', 'projects', 'education', 'connect'];

  /* Track if initial entry transition is complete */
  const [entryComplete, setEntryComplete] = useState(false);

  /* Click Effect State */
  const [clickEffect, setClickEffect] = useState<{ x: number, y: number, id: number } | null>(null);

  /* Name text - always show original, glitch effect is separate */
  const [nameText, setNameText] = useState(RESUME_DATA.name);
  const originalName = RESUME_DATA.name;

  const glitchChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  useEffect(() => {
    // Only run ambient glitch after entry transition completes
    if (!entryComplete) return;

    // Ensure name starts as original
    setNameText(originalName);

    let glitchTimeoutId: NodeJS.Timeout | null = null;
    let isGlitching = false;

    const nameGlitchInterval = setInterval(() => {
      // Don't start a new glitch if one is in progress
      if (isGlitching) return;

      if (Math.random() < 0.12) { // 12% chance to glitch
        isGlitching = true;

        const glitchedName = originalName.split('').map((char) => {
          if (char === ' ') return ' '; // Preserve spaces
          if (Math.random() < 0.25) { // 25% chance each letter glitches
            return glitchChars[Math.floor(Math.random() * glitchChars.length)];
          }
          return char;
        }).join('');

        setNameText(glitchedName);

        // Always reset to original name after glitch
        glitchTimeoutId = setTimeout(() => {
          setNameText(originalName);
          isGlitching = false;
        }, 60);
      }
    }, 200);

    return () => {
      clearInterval(nameGlitchInterval);
      if (glitchTimeoutId) clearTimeout(glitchTimeoutId);
      // Ensure name is reset on cleanup
      setNameText(originalName);
    };
  }, [entryComplete, originalName]);

  // Dispatch sectionChange event whenever currentSectionIndex changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sectionChange', { detail: currentSectionIndex }));
  }, [currentSectionIndex]);

  // Backup: ensure entryComplete is true after animation should have finished
  useEffect(() => {
    if (hasEntered && !entryComplete) {
      const timer = setTimeout(() => {
        setEntryComplete(true);
      }, 600); // 350ms decode + 100ms delay + buffer
      return () => clearTimeout(timer);
    }
  }, [hasEntered, entryComplete]);

  const handleGlobalClick = (e: React.MouseEvent) => {
    setClickEffect({ x: e.clientX, y: e.clientY, id: Date.now() });
  };

  const scrollToSection = (id: string) => {
    const index = sectionsList.indexOf(id);
    if (index !== -1) {
      setCurrentSectionIndex(index);
    }
  };

  // Navigate to next/previous section (one at a time)
  const goToNextSection = () => {
    setCurrentSectionIndex(prev => Math.min(prev + 1, sectionsList.length - 1));
  };

  const goToPrevSection = () => {
    setCurrentSectionIndex(prev => Math.max(prev - 1, 0));
  };

  const goToFirstSection = () => {
    setCurrentSectionIndex(0);
  };

  // Handle wheel (desktop) and touch/swipe gestures (mobile) for section navigation
  useEffect(() => {
    let touchStartY = 0;
    let touchEndY = 0;
    let isTransitioning = false;
    const transitionDuration = 1000; // Match CSS transition duration

    // Handle mouse wheel on desktop
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (!hasEntered || isTransitioning) return;

      // Threshold to prevent accidental triggers
      const threshold = 30;

      if (Math.abs(e.deltaY) > threshold) {
        isTransitioning = true;

        if (e.deltaY > 0) {
          // Scroll down - go to next section
          setCurrentSectionIndex(prev => Math.min(prev + 1, sectionsList.length - 1));
        } else {
          // Scroll up - go to previous section
          setCurrentSectionIndex(prev => Math.max(prev - 1, 0));
        }

        // Prevent multiple transitions
        setTimeout(() => {
          isTransitioning = false;
        }, transitionDuration);
      }
    };

    // Handle touch gestures on mobile
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!hasEntered || isTransitioning) return;

      touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      const threshold = 50; // Minimum swipe distance

      if (Math.abs(deltaY) > threshold) {
        isTransitioning = true;

        if (deltaY > 0) {
          // Swipe up - go to next section
          setCurrentSectionIndex(prev => Math.min(prev + 1, sectionsList.length - 1));
        } else {
          // Swipe down - go to previous section
          setCurrentSectionIndex(prev => Math.max(prev - 1, 0));
        }

        // Prevent multiple transitions
        setTimeout(() => {
          isTransitioning = false;
        }, transitionDuration);
      }
    };

    // Prevent default touchmove scroll
    const preventTouchMove = (e: TouchEvent) => e.preventDefault();

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', preventTouchMove, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', preventTouchMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [sectionsList.length, hasEntered]);
  return (
    <div
      className="h-[100vh] w-full bg-transparent font-space-mono relative no-scrollbar cursor-none overflow-hidden"
      onClick={handleGlobalClick}
    >
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <NetworkMesh />
        <RotatingCube />
        <FollowCube />
        <CursorGlow />
      </div>

      {/* Click Effect */}
      {clickEffect && <ClickTesseract key={clickEffect.id} x={clickEffect.x} y={clickEffect.y} />}

      {/* Scroll Indicator Prism */}
      <ScrollPrism currentIndex={currentSectionIndex} totalSections={sectionsList.length} isInverted={isInverted} />

      {/* Navigation Header */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] w-full px-6 md:pl-32 pr-8 py-8 flex justify-between items-start pointer-events-none transition-colors duration-500 ${isInverted ? 'text-black' : 'text-white mix-blend-difference'}`}>
        <div className={`font-bold tracking-widest text-lg md:text-3xl leading-none pointer-events-auto cursor-default transition-all duration-500 ${currentSectionIndex === 0 ? 'opacity-100' : 'opacity-0'}`}>
          <span className={isInverted ? 'text-black' : 'text-white'}>&lt;</span>
          <span className={`font-space-mono inline-flex ${isInverted ? 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]' : 'text-black'}`}>
            <ScrambleText text="PORTFOLIO" as="span" duration={250} />
          </span>
          <span className={isInverted ? 'text-black' : 'text-white'}>/&gt;</span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex flex-col items-end gap-2 text-sm tracking-wider pt-2 pointer-events-auto">
          {sectionsList.map((item, index) => {
            const isActive = currentSectionIndex === index;

            // Consistent styling: active = white with glow, inactive = black
            let itemClasses = 'transition-all duration-500 relative group uppercase text-right py-1 cursor-pointer ';
            itemClasses += isActive
              ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]'
              : 'text-black hover:text-white hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]';

            return (
              <button
                key={item}
                onClick={() => scrollToSection(item)}
                className={itemClasses}
              >
                <span className={`mr-2 ${isActive ? 'opacity-80' : 'opacity-50'}`}>0{index + 1}.</span>
                <ScrambleText text={item} as="span" duration={250} />
                <span className={`absolute bottom-0 right-0 h-px transition-all duration-300 bg-white ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`} />
              </button>
            );
          })}
        </div>
      </nav>

      {/* Up Arrow - Return to First Slide (visible on non-first slides, mobile) */}
      {currentSectionIndex > 0 && (
        <button
          onClick={goToFirstSection}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] md:hidden pointer-events-auto"
          aria-label="Go to top"
        >
          <svg
            width="56"
            height="56"
            viewBox="0 0 32 32"
            fill="none"
            className={`transition-colors duration-500 drop-shadow-lg ${isInverted ? 'text-white' : 'text-black'}`}
            style={{ display: 'block' }}
          >
            <path
              d="M8 22L16 12L24 22"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Content Wrapper - Vertical Stacked Sections */}
      <div
        className="absolute top-0 left-0 w-full transition-transform duration-[933ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          height: `${sectionsList.length * 100}vh`,
          transform: `translateY(-${currentSectionIndex * 100}vh)`
        }}
      >

        {/* Section 1: Identity */}
        <section
          id="identity"
          className="w-full h-[100vh] flex flex-col items-center md:items-start justify-center px-4 pb-24 md:pb-6 md:pl-32 relative z-10 overflow-hidden"
        >
          <motion.div
            className="w-full max-w-5xl relative text-left"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: currentSectionIndex === 0 ? 1 : 0.3, y: currentSectionIndex === 0 ? 0 : 20 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex flex-col justify-center relative items-center md:items-start text-center md:text-left">
              <h2 className="text-base md:text-xl text-black tracking-wide mb-3 md:mb-4 font-bold font-space-mono">
                <DecodingText text="Hi, I'm" trigger={hasEntered} duration={200} delay={50} />
              </h2>
              <h1 className="text-4xl md:text-9xl font-bold tracking-tighter mb-4 md:mb-6 text-white font-valorant drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">
                {entryComplete ? (
                  nameText
                ) : (
                  <DecodingText
                    text={RESUME_DATA.name}
                    trigger={hasEntered}
                    duration={350}
                    delay={100}
                    onComplete={() => setEntryComplete(true)}
                  />
                )}
              </h1>
              <div className="h-px w-24 bg-black mb-4 md:mb-8" />
              <p className="text-lg md:text-2xl text-white/90 tracking-wide font-light mb-2 md:mb-4 drop-shadow-[0_0_4px_rgba(255,255,255,0.25)]">
                <DecodingText text={RESUME_DATA.role} trigger={hasEntered} duration={250} delay={200} />
              </p>
              <p className="text-white/60 tracking-wide max-w-2xl text-sm md:text-lg mb-8 md:mb-12 drop-shadow-[0_0_3px_rgba(255,255,255,0.2)]">
                <DecodingText text={RESUME_DATA.tagline} trigger={hasEntered} duration={250} delay={250} />
              </p>

              <div className="flex flex-col md:flex-row gap-4 md:gap-8 w-full max-w-md">
                <button
                  onClick={(e) => { e.stopPropagation(); scrollToSection('education'); }}
                  className="bg-transparent border border-white text-white w-full py-4 text-sm tracking-[0.2em] hover:bg-white hover:text-black transition-all duration-300 dot-matrix font-bold cursor-pointer"
                >
                  <ScrambleText text="MY EDUCATION" as="span" duration={250} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); scrollToSection('connect'); }}
                  className="bg-transparent border border-white text-white w-full py-4 text-sm tracking-[0.2em] transition-all duration-300 dot-matrix font-bold hover:bg-white hover:text-black cursor-pointer"
                >
                  <ScrambleText text="GET IN TOUCH" as="span" duration={250} />
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Section 2: Skills */}
        <section
          id="skills"
          className="w-full h-[100vh] flex flex-col items-center md:items-start justify-center px-4 pb-24 md:pb-6 md:pl-32 relative z-10 overflow-hidden"
        >
          {/* 3D Object */}
          <div className="absolute right-20 top-1/2 -translate-y-1/2 hidden md:block pointer-events-none opacity-40">
            <RotatingCube />
          </div>

          <div className="w-full max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: currentSectionIndex === 1 ? 1 : 0.3, y: currentSectionIndex === 1 ? 0 : 20 }}
              transition={{ duration: 0.8 }}
              className="text-left w-full"
            >
              <div className="mb-6 md:mb-12 text-center md:text-left">
                <ScrambleText
                  text="SKILLS & EXPERTISE"
                  as="h3"
                  duration={250}
                  className="text-2xl md:text-4xl font-bold tracking-wider mb-2 text-black font-valorant"
                />
                <p className="text-white/60 text-sm tracking-widest font-mono drop-shadow-[0_0_2px_rgba(255,255,255,0.2)]">
                  &gt; Technologies I actively work with
                </p>
              </div>

              <div className="flex flex-col gap-8 w-full">
                {RESUME_DATA.skills.map((skill, index) => (
                  <div key={index} className="w-full group">
                    <div className="flex items-end justify-between mb-2">
                      <div className="flex items-center gap-4">
                        <span className="text-black/60 font-mono text-sm">[{skill.id}]</span>
                        <div className="">
                          <h4 className="text-xl md:text-2xl text-white font-bold tracking-wide group-hover:text-black transition-colors drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]">{skill.name}</h4>
                          <p className="text-white/40 text-xs tracking-wider uppercase hidden md:block drop-shadow-[0_0_2px_rgba(255,255,255,0.15)]">{skill.desc}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-white/40 text-xs tracking-widest mb-1 drop-shadow-[0_0_2px_rgba(255,255,255,0.15)]">{skill.category}</span>
                        <span className="text-black font-bold font-mono">{skill.percent}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-white/10 relative overflow-hidden">
                      <motion.div
                        className="absolute top-0 left-0 h-full bg-black"
                        initial={{ width: 0 }}
                        animate={{ width: currentSectionIndex === 1 ? skill.percent : 0 }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: index * 0.1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 3: Projects */}
        <section
          id="projects"
          className="w-full h-[100vh] flex flex-col items-center md:items-start justify-center px-4 pb-24 md:pb-6 md:pl-32 relative z-10 overflow-hidden"
        >
          {/* 3D Object */}
          <div className="absolute right-20 top-1/2 -translate-y-1/2 hidden md:block pointer-events-none opacity-40">
            <RotatingCube isInverted={isInverted} />
          </div>

          <div className="w-full max-w-4xl text-left">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: currentSectionIndex === 2 ? 1 : 0.3, y: currentSectionIndex === 2 ? 0 : 20 }}
              transition={{ duration: 0.8 }}
            >
              <ScrambleText
                text="PROJECT MODULE"
                as="h2"
                duration={250}
                className="text-2xl md:text-4xl font-bold tracking-wider mb-8 md:mb-12 text-black font-valorant text-center md:text-left"
              />
              <div className="py-12 md:py-24 border-y border-white/10 w-full text-center md:text-left">
                <ol className="list-decimal list-inside text-lg md:text-2xl font-light space-y-4">
                  <li>
                    <span className="text-white/90 drop-shadow-[0_0_3px_rgba(255,255,255,0.2)]">Portfolio:</span> <a href="https://endeavor-tan.vercel.app" target="_blank" rel="noopener noreferrer" className="text-black underline hover:text-white transition-colors duration-300">https://endeavor-tan.vercel.app</a>
                  </li>
                </ol>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 4: Education */}
        <section
          id="education"
          className="w-full h-[100vh] flex flex-col items-center md:items-start justify-center px-4 pb-24 md:pb-6 md:pl-32 relative z-10 overflow-hidden"
        >
          {/* 3D Object */}
          <div className="absolute right-20 top-1/2 -translate-y-1/2 hidden md:block pointer-events-none opacity-40">
            <RotatingCube />
          </div>

          <div className="w-full max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: currentSectionIndex === 3 ? 1 : 0.3, y: currentSectionIndex === 3 ? 0 : 20 }}
              transition={{ duration: 0.8 }}
            >
              <ScrambleText
                text="EDUCATION LOGS"
                as="h2"
                duration={250}
                className="text-2xl md:text-4xl font-bold tracking-wider mb-8 md:mb-16 text-black font-valorant text-center md:text-left"
              />
              <div className="flex flex-col gap-12">
                {RESUME_DATA.education.map((edu, index) => (
                  <div key={index} className="flex flex-col md:flex-row justify-between items-start border-b border-white/20 pb-8 hover:border-black transition-colors group w-full">
                    <div className="text-left">
                      <h3 className="text-xl md:text-3xl font-bold tracking-wide text-white group-hover:text-black transition-colors font-space-mono mb-2 drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]">
                        {edu.institution}
                      </h3>
                      <p className="text-white/80 text-lg tracking-wider drop-shadow-[0_0_3px_rgba(255,255,255,0.2)]">{edu.title}</p>
                    </div>
                    <div className="mt-4 md:mt-0 text-left md:text-right w-full md:w-auto">
                      <span className="block text-black text-sm tracking-widest mb-1">{edu.status}</span>
                      <p className="text-white/40 text-sm font-mono drop-shadow-[0_0_2px_rgba(255,255,255,0.15)]">{edu.year}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 5: Connect */}
        <section
          id="connect"
          className="w-full h-[100vh] flex flex-col items-center md:items-start justify-center px-4 pb-24 md:pb-6 md:pl-32 relative z-10 overflow-hidden"
        >
          {/* 3D Object */}
          <div className="absolute right-20 top-1/2 -translate-y-1/2 hidden md:block pointer-events-none opacity-40">
            <RotatingCube />
          </div>

          <div className="w-full max-w-5xl h-full flex flex-col justify-center py-20">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: currentSectionIndex === 4 ? 1 : 0.3, y: currentSectionIndex === 4 ? 0 : 20 }}
              transition={{ duration: 0.8 }}
              className="flex-1 flex flex-col justify-center items-center md:items-start"
            >
              <ScrambleText
                text="CONNECT MODULE"
                as="h2"
                duration={250}
                className="text-2xl md:text-4xl font-bold tracking-wider mb-12 md:mb-24 text-black font-valorant text-center md:text-left"
              />

              <div className="flex flex-col gap-16 items-start justify-start w-full">
                <a href="https://instagram.com/endeavv0r" target="_blank" rel="noopener noreferrer" className="group text-left flex items-center gap-8">
                  <div className="w-24 h-24 rounded-full border border-white/20 flex items-center justify-center group-hover:border-black group-hover:bg-black/10 transition-all duration-500">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </div>
                  <div>
                    <ScrambleText
                      text="INSTAGRAM"
                      as="h3"
                      duration={250}
                      className="text-3xl font-bold tracking-widest text-white group-hover:text-black transition-colors font-space-mono drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]"
                    />
                    <p className="text-white/40 text-sm mt-2 tracking-wider drop-shadow-[0_0_2px_rgba(255,255,255,0.15)]">@endeavv0r</p>
                  </div>
                </a>

                <a href="https://www.linkedin.com/in/pushkar-jha-4a1258381" target="_blank" rel="noopener noreferrer" className="group text-left flex items-center gap-8">
                  <div className="w-24 h-24 rounded-full border border-white/20 flex items-center justify-center group-hover:border-black group-hover:bg-black/10 transition-all duration-500">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                      <rect x="2" y="9" width="4" height="12"></rect>
                      <circle cx="4" cy="4" r="2"></circle>
                    </svg>
                  </div>
                  <div>
                    <ScrambleText
                      text="LINKEDIN"
                      as="h3"
                      duration={250}
                      className="text-3xl font-bold tracking-widest text-white group-hover:text-black transition-colors font-space-mono drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]"
                    />
                    <p className="text-white/40 text-sm mt-2 tracking-wider drop-shadow-[0_0_2px_rgba(255,255,255,0.15)]">Connect Professionally</p>
                  </div>
                </a>
              </div>
            </motion.div>

            <div className="mt-auto text-left pt-12">
              <p className="text-black/80 text-xs tracking-[0.3em]">
                DESIGNED BY PUSHKAR JHA
              </p>
            </div>
          </div>
        </section>

      </div >

    </div >
  );
}

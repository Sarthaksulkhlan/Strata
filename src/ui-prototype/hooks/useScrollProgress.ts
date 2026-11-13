import { useCallback, useEffect, useRef, useState } from 'react';

export interface ScrollProgressSnapshot {
  /** Global page scroll progress [0..1] */
  globalProgress: number;
  /** Smoothed global progress [0..1] for butter-smooth canvas interpolation */
  smoothedGlobalProgress: number;
  /** Target section progress [0..1] (e.g. for the 4-stage storytelling section) */
  sectionProgress: number;
  /** Smoothed section progress [0..1] */
  smoothedSectionProgress: number;
  /** Current scroll direction ('down' | 'up') */
  direction: 'down' | 'up';
  /** Raw scrollY in pixels */
  scrollY: number;
  /** Signed scroll velocity */
  velocity: number;
}

export interface UseScrollProgressOptions {
  /** Optional ref to a specific section element to compute local [0..1] progress */
  targetRef?: React.RefObject<HTMLElement | null>;
  /** Debounce window in ms for settling React state updates (default: 16ms frame-aligned) */
  debounceMs?: number;
}

export interface UseScrollProgressReturn {
  /** Mutable ref read directly by 60fps Canvas/WebGL loops with zero React re-renders */
  scrollStateRef: React.MutableRefObject<ScrollProgressSnapshot>;
  /** Discrete active stage index (0, 1, 2, 3) for the 4-stage storytelling timeline */
  activeStageIndex: 0 | 1 | 2 | 3;
  /** Milestone percentage indicator (25, 50, 75, 100) */
  milestonePct: 25 | 50 | 75 | 100;
  /** Current scroll direction ('down' | 'up') */
  direction: 'down' | 'up';
  /** Programmatically set section progress (e.g. when user clicks a stage button) */
  setManualSectionProgress: (progress: number) => void;
}

/**
 * Custom `useScrollProgress` hook that debounces and rAF-batches scroll events to eliminate
 * React re-render lag while providing frame-perfect synchronization between `InteractiveBackground`
 * and the 4-stage storytelling elements.
 */
export function useScrollProgress(
  options: UseScrollProgressOptions = {}
): UseScrollProgressReturn {
  const { targetRef, debounceMs = 16 } = options;

  const scrollStateRef = useRef<ScrollProgressSnapshot>({
    globalProgress: 0,
    smoothedGlobalProgress: 0,
    sectionProgress: 0,
    smoothedSectionProgress: 0,
    direction: 'down',
    scrollY: 0,
    velocity: 0,
  });

  const [activeStageIndex, setActiveStageIndex] = useState<0 | 1 | 2 | 3>(0);
  const [milestonePct, setMilestonePct] = useState<25 | 50 | 75 | 100>(25);
  const [direction, setDirection] = useState<'down' | 'up'>('down');

  const setManualSectionProgress = useCallback((progress: number) => {
    const clamped = Math.max(0, Math.min(1, progress));
    scrollStateRef.current.sectionProgress = clamped;
    scrollStateRef.current.smoothedSectionProgress = clamped;

    const nextStage: 0 | 1 | 2 | 3 =
      clamped >= 0.75 ? 3 : clamped >= 0.5 ? 2 : clamped >= 0.25 ? 1 : 0;
    const nextMilestone: 25 | 50 | 75 | 100 =
      nextStage === 3 ? 100 : nextStage === 2 ? 75 : nextStage === 1 ? 50 : 25;

    setActiveStageIndex((prev) => (prev !== nextStage ? nextStage : prev));
    setMilestonePct((prev) => (prev !== nextMilestone ? nextMilestone : prev));
  }, []);

  useEffect(() => {
    let rafId = 0;
    let debounceTimer = 0;
    let lastScrollY = window.scrollY || 0;

    const measureScroll = () => {
      rafId = 0;
      const currentY = window.scrollY || 0;
      const deltaY = currentY - lastScrollY;

      let nextDirection = scrollStateRef.current.direction;
      if (Math.abs(deltaY) > 0.5) {
        nextDirection = deltaY > 0 ? 'down' : 'up';
      }
      lastScrollY = currentY;

      const docHeight = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const globalProgress = Math.max(0, Math.min(1, currentY / docHeight));

      let sectionProgress = scrollStateRef.current.sectionProgress;
      const el = targetRef?.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const viewportH = window.innerHeight || 900;
        const scrollable = Math.max(1, rect.height - viewportH);
        sectionProgress = Math.max(0, Math.min(1, -rect.top / scrollable));
      } else {
        sectionProgress = globalProgress;
      }

      const snap = scrollStateRef.current;
      snap.scrollY = currentY;
      snap.velocity = deltaY;
      snap.direction = nextDirection;
      snap.globalProgress = globalProgress;
      snap.sectionProgress = sectionProgress;
      // Exponential smoothing for immediate consumers
      snap.smoothedGlobalProgress += (globalProgress - snap.smoothedGlobalProgress) * 0.35;
      snap.smoothedSectionProgress += (sectionProgress - snap.smoothedSectionProgress) * 0.35;

      const nextStage: 0 | 1 | 2 | 3 =
        sectionProgress >= 0.75
          ? 3
          : sectionProgress >= 0.5
          ? 2
          : sectionProgress >= 0.25
          ? 1
          : 0;
      const nextMilestone: 25 | 50 | 75 | 100 =
        nextStage === 3 ? 100 : nextStage === 2 ? 75 : nextStage === 1 ? 50 : 25;

      // Update discrete milestone state immediately when stage boundary crosses, and debounce direction settling
      setActiveStageIndex((prev) => (prev !== nextStage ? nextStage : prev));
      setMilestonePct((prev) => (prev !== nextMilestone ? nextMilestone : prev));

      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        snap.smoothedGlobalProgress = snap.globalProgress;
        snap.smoothedSectionProgress = snap.sectionProgress;
        snap.velocity = 0;
        setDirection((prev) => (prev !== snap.direction ? snap.direction : prev));
      }, debounceMs);
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(measureScroll);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    measureScroll();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.clearTimeout(debounceTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [targetRef, debounceMs]);

  return {
    scrollStateRef,
    activeStageIndex,
    milestonePct,
    direction,
    setManualSectionProgress,
  };
}

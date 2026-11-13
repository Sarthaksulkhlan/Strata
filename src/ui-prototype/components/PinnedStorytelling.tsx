import React, { useEffect, useRef } from 'react';
import { BRAND_CONFIG, STORY_CHAPTERS } from '../data/mockCricketData';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { DataLandscapeCanvas } from './DataLandscapeCanvas';

export const PinnedStorytelling: React.FC = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const verticalProgressLineRef = useRef<HTMLDivElement | null>(null);
  const topProgressBarRef = useRef<HTMLDivElement | null>(null);

  // Use custom debounced & rAF-synchronized useScrollProgress hook
  const {
    scrollStateRef,
    activeStageIndex,
    milestonePct,
    direction,
    setManualSectionProgress,
  } = useScrollProgress({
    targetRef: sectionRef,
    debounceMs: 16,
  });

  // Animate the thin vertical progress spine continuously at 60fps via DOM ref
  useEffect(() => {
    let rafId = 0;
    let isDisposed = false;

    const syncProgressLine = () => {
      if (isDisposed) return;
      const p = scrollStateRef.current.sectionProgress;
      // Scale from 0.25 at stage 1 up to 1.00 at stage 4
      const scaleY = Math.max(0.25, Math.min(1, 0.25 + p * 0.75));
      if (verticalProgressLineRef.current) {
        verticalProgressLineRef.current.style.transform = `scaleY(${scaleY.toFixed(4)})`;
      }
      if (topProgressBarRef.current) {
        topProgressBarRef.current.style.transform = `scaleX(${scaleY.toFixed(4)})`;
      }
      rafId = requestAnimationFrame(syncProgressLine);
    };

    rafId = requestAnimationFrame(syncProgressLine);
    return () => {
      isDisposed = true;
      cancelAnimationFrame(rafId);
    };
  }, [scrollStateRef]);

  const jumpToChapter = (chapterIndex: 0 | 1 | 2 | 3) => {
    const stageTargets = [0.1, 0.38, 0.64, 0.95] as const;
    const targetProgress = stageTargets[chapterIndex];
    setManualSectionProgress(targetProgress);

    const el = sectionRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;
      const scrollableDistance = Math.max(
        1,
        el.offsetHeight - window.innerHeight
      );
      window.scrollTo({
        top: absoluteTop + scrollableDistance * targetProgress,
        behavior: 'auto',
      });
    }
  };

  const activeChapter = STORY_CHAPTERS[activeStageIndex];

  return (
    <section
      id="storytelling"
      ref={sectionRef}
      aria-label="Four-Stage Cricket Intelligence Narrative"
      data-active-chapter={activeChapter.numberLabel}
      data-milestone-pct={milestonePct}
      className="relative z-10 h-[320vh] border-b border-[#0A1128]/12 bg-[#F7F4EE]/92"
    >
      {/* Sticky Viewport Container */}
      <div className="sticky top-0 min-h-screen w-full flex flex-col justify-center py-6 lg:py-8 overflow-hidden">
        <div className="max-w-[1380px] mx-auto w-full px-6 lg:px-12">
          {/* Top Chapter Progress Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#0A1128]/12">
            <div className="flex items-center gap-3">
              <span className="font-mono-tabular text-xs uppercase tracking-widest text-[#1D4ED8] font-semibold">
                {BRAND_CONFIG.name} · CONTINUOUS INTELLIGENCE JOURNEY
              </span>
              <span aria-hidden="true" className="text-[#94A3B8]">
                ·
              </span>
              <span className="font-mono-tabular text-xs text-[#334155]">
                {activeChapter.numberLabel} — {activeChapter.title}
              </span>
            </div>

            {/* Milestone Percentage Indicator: 25%, 50%, 75%, 100% */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 font-mono-tabular text-xs">
                <span className="text-[#64748B]">STAGE PROGRESS</span>
                <span
                  data-testid="storytelling-milestone-pct"
                  className="text-[#1D4ED8] font-semibold tabular-nums"
                >
                  {milestonePct}%
                </span>
                <span className="text-[#94A3B8]">·</span>
                <span className="text-[#334155] uppercase">
                  {direction === 'up' ? '↑ REVERSE' : '↓ FORWARD'}
                </span>
              </div>
              <div className="w-36 h-1 bg-[#DFDAD0] overflow-hidden">
                <div
                  ref={topProgressBarRef}
                  className="h-full bg-[#1D4ED8] origin-left will-change-transform"
                  style={{ transform: 'scaleX(0.25)' }}
                />
              </div>
            </div>
          </div>

          {/* Main Pinned 2-Column Stage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch pt-6">
            {/* LEFT SIDE: Unboxed Vertical Storytelling Spine with Animated Connecting Progress Line */}
            <div className="lg:col-span-5 flex flex-col justify-between py-1">
              <div className="relative pl-7 sm:pl-9 flex flex-col justify-between h-full space-y-5">
                {/* Thin Vertical Connecting Track Line */}
                <div
                  aria-hidden="true"
                  className="absolute left-[11px] top-3 bottom-3 w-px bg-[#0A1128]/18"
                />

                {/* Animated Royal Blue Vertical Progress Line */}
                <div
                  aria-hidden="true"
                  ref={verticalProgressLineRef}
                  className="absolute left-[11px] top-3 bottom-3 w-[2px] bg-[#1D4ED8] origin-top will-change-transform"
                  style={{ transform: 'scaleY(0.25)' }}
                />

                {STORY_CHAPTERS.map((chapter) => {
                  const isActive = chapter.index === activeStageIndex;
                  const isCompleted = chapter.index <= activeStageIndex;

                  return (
                    <button
                      key={chapter.id}
                      type="button"
                      onClick={() =>
                        jumpToChapter(chapter.index as 0 | 1 | 2 | 3)
                      }
                      aria-current={isActive ? 'step' : undefined}
                      className="relative group w-full text-left transition-opacity cursor-pointer focus:outline-none"
                    >
                      {/* Node Marker on the Vertical Spine */}
                      <span
                        aria-hidden="true"
                        className={`absolute -left-7 sm:-left-9 top-1.5 w-[23px] h-[23px] flex items-center justify-center border transition-colors ${
                          isActive
                            ? 'bg-[#1D4ED8] border-[#1D4ED8] text-[#F7F4EE]'
                            : isCompleted
                            ? 'bg-[#0A1128] border-[#0A1128] text-[#F7F4EE]'
                            : 'bg-[#F7F4EE] border-[#94A3B8] text-[#64748B]'
                        }`}
                      >
                        <span className="font-mono-tabular text-[9px] font-semibold">
                          {chapter.numberLabel}
                        </span>
                      </span>

                      {/* Stage Header Row: 01 — THE DATA + 25% / 50% / 75% / 100% Milestone */}
                      <div className="flex items-baseline justify-between gap-3 border-b border-[#0A1128]/10 pb-1.5">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span
                            className={`font-mono-tabular text-xs font-semibold shrink-0 ${
                              isActive ? 'text-[#1D4ED8]' : 'text-[#64748B]'
                            }`}
                          >
                            {chapter.numberLabel} —
                          </span>
                          <h2
                            className={`font-editorial text-xl sm:text-2xl font-semibold tracking-tight transition-colors ${
                              isActive
                                ? 'text-[#0A1128]'
                                : 'text-[#334155]/80 group-hover:text-[#0A1128]'
                            }`}
                          >
                            {chapter.title}
                          </h2>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 font-mono-tabular">
                          <span
                            className={`text-xs sm:text-sm font-semibold tabular-nums px-2 py-0.5 border ${
                              isActive
                                ? 'bg-[#1D4ED8] text-[#F7F4EE] border-[#1D4ED8]'
                                : 'bg-[#EFECE4] text-[#0A1128] border-[#0A1128]/15'
                            }`}
                          >
                            {chapter.milestonePct}%
                          </span>
                        </div>
                      </div>

                      {/* Stage Subtitle & Key Metric */}
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                        <p
                          className={`text-xs sm:text-sm font-medium transition-colors ${
                            isActive ? 'text-[#0A1128]' : 'text-[#64748B]'
                          }`}
                        >
                          {chapter.subtitle}
                        </p>
                        <span className="font-mono-tabular text-[11px] text-[#1D4ED8]">
                          {chapter.keyMetricValue}
                        </span>
                      </div>

                      {/* Expanded Narrative & Unboxed Evidence Links for Active Stage */}
                      {isActive && (
                        <div className="mt-2.5 space-y-2.5">
                          <p className="text-xs sm:text-sm text-[#334155] leading-relaxed">
                            {chapter.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono-tabular text-[#1D4ED8]">
                            {chapter.evidenceSources.map((src, idx) => (
                              <React.Fragment key={src}>
                                <span>{src}</span>
                                {idx < chapter.evidenceSources.length - 1 && (
                                  <span
                                    aria-hidden="true"
                                    className="text-[#94A3B8]"
                                  >
                                    ·
                                  </span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT SIDE: Evolving Interactive Data Landscape Viewport */}
            <div className="lg:col-span-7 flex flex-col">
              <div
                data-testid="topology-right-panel"
                className="relative flex-1 min-h-[450px] sm:min-h-[510px] bg-[#EFECE4] border border-[#0A1128]/15 p-4 sm:p-5 flex flex-col justify-between shadow-[0_14px_34px_rgba(10,17,40,0.06)]"
              >
                {/* Top Landscape Telemetry Header + Interactive Stage Pipeline Selector */}
                <div className="relative z-20 pb-3 border-b border-[#0A1128]/12 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-[#1D4ED8] animate-pulse" />
                      <span className="text-[#0A1128] font-semibold tracking-wider">
                        {activeChapter.monolithStateLabel}
                      </span>
                    </div>
                    <span className="text-[#1D4ED8] font-medium">
                      {activeChapter.coordinates}
                    </span>
                  </div>

                  {/* Interactive 4-Stage Pipeline Bar: DATA -> CONTEXT -> PRESSURE -> INTELLIGENCE */}
                  <div
                    className="grid grid-cols-4 gap-1.5 sm:gap-2"
                    data-testid="topology-stage-pipeline"
                  >
                    {[
                      {
                        idx: 0 as const,
                        code: '01',
                        short: 'DATA',
                        pct: '25%',
                        flow: '6 SOURCES →',
                      },
                      {
                        idx: 1 as const,
                        code: '02',
                        short: 'CONTEXT',
                        pct: '50%',
                        flow: '4 HUBS LINKED →',
                      },
                      {
                        idx: 2 as const,
                        code: '03',
                        short: 'PRESSURE',
                        pct: '75%',
                        flow: '2.4x WEIGHT →',
                      },
                      {
                        idx: 3 as const,
                        code: '04',
                        short: 'INTELLIGENCE',
                        pct: '100%',
                        flow: 'PRI ≥ 90 LOCKED',
                      },
                    ].map((step) => {
                      const isStepActive = activeStageIndex === step.idx;
                      const isStepReached = step.idx <= activeStageIndex;
                      return (
                        <button
                          key={step.code}
                          type="button"
                          onClick={() => jumpToChapter(step.idx)}
                          data-testid={`topology-step-${step.short.toLowerCase()}`}
                          className={`text-left px-2.5 py-1.5 border transition-all cursor-pointer font-mono-tabular ${
                            isStepActive
                              ? 'bg-[#0A1128] text-[#F7F4EE] border-[#1D4ED8] shadow-sm'
                              : isStepReached
                              ? 'bg-[#F7F4EE] text-[#0A1128] border-[#0A1128]/25 hover:border-[#1D4ED8]'
                              : 'bg-[#F7F4EE]/60 text-[#64748B] border-[#0A1128]/10 hover:border-[#0A1128]/25'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-[10px] font-bold tracking-wider ${
                                isStepActive
                                  ? 'text-[#60A5FA]'
                                  : isStepReached
                                  ? 'text-[#1D4ED8]'
                                  : 'text-[#64748B]'
                              }`}
                            >
                              {step.code} {step.short}
                            </span>
                            <span className="text-[10px] font-semibold tabular-nums">
                              {step.pct}
                            </span>
                          </div>
                          <div
                            className={`text-[9px] truncate mt-0.5 ${
                              isStepActive
                                ? 'text-[#CBD5E1]'
                                : 'text-[#64748B]'
                            }`}
                          >
                            {step.flow}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Continuous 60fps Canvas Data Landscape */}
                <div className="relative flex-1 w-full my-2">
                  <DataLandscapeCanvas scrollStateRef={scrollStateRef} />
                </div>

                {/* Bottom Stage Specification & Handoff Bar */}
                <div className="relative z-20 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 border-t border-[#0A1128]/12 font-mono-tabular">
                  <div>
                    <div className="text-[10px] text-[#64748B]">
                      ACTIVE TOPOLOGY STAGE
                    </div>
                    <div className="mt-0.5 text-sm font-editorial font-semibold text-[#0A1128]">
                      {activeChapter.milestonePct}% · {activeChapter.title}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#64748B]">
                      STAGE-TO-STAGE TRANSFORMATION
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-[#0A1128] tabular-nums">
                      {activeStageIndex === 0 &&
                        'DATA → CONTEXT (6 STREAMS CONVERGING)'}
                      {activeStageIndex === 1 &&
                        'CONTEXT → PRESSURE (4 HUBS WEIGHTED)'}
                      {activeStageIndex === 2 &&
                        'PRESSURE → INTELLIGENCE (10 ISOLATED)'}
                      {activeStageIndex === 3 &&
                        'INTELLIGENCE LOCKED (TOP 10 ARCHETYPES)'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#64748B]">
                      PRIMARY SIGNAL OUTPUT
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-[#1D4ED8] tabular-nums">
                      {activeChapter.keyMetricValue}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

import React, { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { TYPOMETER_STAGES } from '../data/mockCricketData';
import { computeTypometerMetrics } from '../lib/intelligenceEngine';

interface TypometerExperienceProps {
  activeStageIndex: 0 | 1 | 2 | 3;
  onSelectStage: (stageIndex: 0 | 1 | 2 | 3, manual?: boolean) => void;
  isAutoPlaying: boolean;
  onToggleAutoPlay: () => void;
  stageProgress01: number;
}

interface WordTokenSpec {
  word: string;
  rawFragment: string;
  metricTag: string;
  activeAtStage: 0 | 1 | 2 | 3;
  isPrimaryStageWord?: boolean;
}

const STATEMENT_WORDS: WordTokenSpec[] = [
  {
    word: 'Where',
    rawFragment: 'STREAM_01',
    metricTag: 'INGEST',
    activeAtStage: 0,
  },
  {
    word: 'raw',
    rawFragment: '1.42M_BALLS',
    metricTag: '25%_RAW',
    activeAtStage: 0,
    isPrimaryStageWord: true,
  },
  {
    word: 'cricket',
    rawFragment: '6_TABLES',
    metricTag: 'SCHEMA',
    activeAtStage: 1,
  },
  {
    word: 'records',
    rawFragment: 'VENUE+XI+TIER',
    metricTag: '50%_CONTEXT',
    activeAtStage: 1,
    isPrimaryStageWord: true,
  },
  {
    word: 'crystallize',
    rawFragment: 'RRR>11.5_2.4X',
    metricTag: '75%_PRESSURE',
    activeAtStage: 2,
    isPrimaryStageWord: true,
  },
  {
    word: 'into',
    rawFragment: 'BAYES_PRIOR',
    metricTag: 'SYNTHESIS',
    activeAtStage: 3,
  },
  {
    word: 'conviction.',
    rawFragment: 'PRI_94.6_LOCKED',
    metricTag: '100%_INTELLIGENCE',
    activeAtStage: 3,
    isPrimaryStageWord: true,
  },
];

/**
 * Fixed-size 4-Stage Visual Reference Strip below the Typometer headline.
 * All four stage visuals remain constant in size and layout so nothing resizes or shifts
 * while the Typometer progresses to the right from 25% -> 100% in a continuous loop.
 */
const StaticFourStageVisualStrip: React.FC = () => {
  return (
    <div
      className="bg-[#0A1128] text-[#F7F4EE] border border-[#0A1128] p-3"
      data-testid="typometer-visual-schematic"
    >
      <div className="grid grid-cols-4 gap-2">
        {/* Visual 1: 25% RAW */}
        <div className="bg-[#0F172A] border border-[#94A3B8]/20 p-2 flex flex-col justify-between h-[88px]">
          <div className="flex items-center justify-between font-mono-tabular text-[9px]">
            <span className="text-[#60A5FA] font-semibold">25% RAW</span>
            <span className="text-[#94A3B8]">1.42M</span>
          </div>
          <svg viewBox="0 0 100 32" className="w-full h-7 overflow-visible">
            {[6, 13, 20, 27].map((y, i) => (
              <g key={y}>
                <line
                  x1={4}
                  y1={y}
                  x2={96}
                  y2={y}
                  stroke={i % 2 === 0 ? '#3B82F6' : '#64748B'}
                  strokeWidth={1.4}
                />
                <circle
                  cx={22 + i * 20}
                  cy={y}
                  r={2.2}
                  fill="#60A5FA"
                />
              </g>
            ))}
          </svg>
          <div className="font-mono-tabular text-[8.5px] text-[#CBD5E1] truncate">
            6 Data Streams
          </div>
        </div>

        {/* Visual 2: 50% CONTEXT */}
        <div className="bg-[#0F172A] border border-[#94A3B8]/20 p-2 flex flex-col justify-between h-[88px]">
          <div className="flex items-center justify-between font-mono-tabular text-[9px]">
            <span className="text-[#60A5FA] font-semibold">50% CONTEXT</span>
            <span className="text-[#94A3B8]">±28.4%</span>
          </div>
          <svg viewBox="0 0 100 32" className="w-full h-7 overflow-visible">
            <line x1={18} y1={8} x2={50} y2={16} stroke="#3B82F6" strokeWidth={1.3} />
            <line x1={18} y1={24} x2={50} y2={16} stroke="#3B82F6" strokeWidth={1.3} />
            <line x1={50} y1={16} x2={82} y2={8} stroke="#60A5FA" strokeWidth={1.3} />
            <line x1={50} y1={16} x2={82} y2={24} stroke="#60A5FA" strokeWidth={1.3} />
            <rect x={40} y={10} width={20} height={12} fill="#1D4ED8" stroke="#60A5FA" strokeWidth={1} />
            <circle cx={18} cy={8} r={2.5} fill="#CBD5E1" />
            <circle cx={18} cy={24} r={2.5} fill="#CBD5E1" />
            <circle cx={82} cy={8} r={2.5} fill="#CBD5E1" />
            <circle cx={82} cy={24} r={2.5} fill="#CBD5E1" />
          </svg>
          <div className="font-mono-tabular text-[8.5px] text-[#CBD5E1] truncate">
            Venue · XI · Tier
          </div>
        </div>

        {/* Visual 3: 75% PRESSURE */}
        <div className="bg-[#0F172A] border border-[#94A3B8]/20 p-2 flex flex-col justify-between h-[88px]">
          <div className="flex items-center justify-between font-mono-tabular text-[9px]">
            <span className="text-[#60A5FA] font-semibold">75% PRESSURE</span>
            <span className="text-[#94A3B8]">2.4x</span>
          </div>
          <svg viewBox="0 0 100 32" className="w-full h-7 overflow-visible">
            <circle cx={50} cy={16} r={13} fill="none" stroke="#334155" strokeWidth={1.1} strokeDasharray="2 2" />
            <circle cx={50} cy={16} r={8} fill="none" stroke="#2563EB" strokeWidth={1.3} />
            <path
              d="M 6 16 Q 24 16, 36 16 T 46 6 T 54 26 T 64 16 Q 78 16, 94 16"
              fill="none"
              stroke="#60A5FA"
              strokeWidth={1.5}
            />
          </svg>
          <div className="font-mono-tabular text-[8.5px] text-[#CBD5E1] truncate">
            RRR &gt; 11.5 Stress
          </div>
        </div>

        {/* Visual 4: 100% INTELLIGENCE */}
        <div className="bg-[#0F172A] border border-[#94A3B8]/20 p-2 flex flex-col justify-between h-[88px]">
          <div className="flex items-center justify-between font-mono-tabular text-[9px]">
            <span className="text-[#60A5FA] font-semibold">100% INTEL</span>
            <span className="text-[#94A3B8]">PRI 95</span>
          </div>
          <svg viewBox="0 0 100 32" className="w-full h-7 overflow-visible">
            <polygon
              points="50,3 76,16 50,29 24,16"
              fill="rgba(29,78,216,0.28)"
              stroke="#60A5FA"
              strokeWidth={1.4}
            />
            <line x1={24} y1={16} x2={76} y2={16} stroke="#3B82F6" strokeWidth={1} />
            <line x1={50} y1={3} x2={50} y2={29} stroke="#3B82F6" strokeWidth={1} />
            <circle cx={50} cy={16} r={3} fill="#F8FAFC" />
          </svg>
          <div className="font-mono-tabular text-[8.5px] text-[#CBD5E1] truncate">
            Top 20 Conviction
          </div>
        </div>
      </div>
    </div>
  );
};

export const TypometerExperience: React.FC<TypometerExperienceProps> = ({
  activeStageIndex,
  onSelectStage,
  isAutoPlaying,
  onToggleAutoPlay,
  stageProgress01,
}) => {
  const activeStage = TYPOMETER_STAGES[activeStageIndex];
  const [displayPct, setDisplayPct] = useState<number>(activeStage.pct);

  // Smoothly and rapidly interpolate the displayed percentage toward the active stage's target (25 -> 50 -> 75 -> 100)
  useEffect(() => {
    const target = activeStage.pct;
    let raf = 0;
    const step = () => {
      setDisplayPct((prev) => {
        const diff = target - prev;
        if (Math.abs(diff) < 0.5) return target;
        return prev + diff * 0.36;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [activeStage.pct]);

  const roundedPct = Math.round(displayPct);
  const metrics = computeTypometerMetrics(activeStage.pct);

  // Continuous left-to-right progress percentage (25% -> 100%)
  const continuousRightSweepPct = Math.min(
    100,
    Math.max(25, (activeStageIndex + 1) * 25)
  );

  return (
    <div
      className="relative h-full bg-[#EFECE4] border border-[#0A1128]/18 p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 select-none"
      data-testid="typometer-experience"
    >
      {/* Top Engraved Typometer Scale Ruler Moving Left-to-Right (25% -> 100%) */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular">
          <div className="flex items-center gap-2">
            <span className="text-[#0A1128] font-semibold tracking-wider">
              STRATA OPTICAL TYPOMETER
            </span>
            <span aria-hidden="true" className="text-[#94A3B8]">
              ·
            </span>
            <span
              className="px-2 py-0.5 bg-[#1D4ED8] text-[#F7F4EE] font-semibold"
              data-testid="typometer-stage-code"
            >
              {activeStage.code}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-[#334155] tabular-nums">
            <span>SCALE {metrics.opticalScalePt}pt</span>
            <span aria-hidden="true" className="text-[#94A3B8]">
              /
            </span>
            <span
              className="text-[#0A1128] font-semibold"
              data-testid="typometer-percentage"
            >
              {activeStage.pct}% ({activeStage.shortName})
            </span>
          </div>
        </div>

        {/* Left-to-Right Vernier Ruler with Continuous Rightward Progress Bar */}
        <div className="relative h-7 bg-[#F7F4EE] border border-[#0A1128]/15 overflow-hidden">
          {/* Smooth Left-to-Right Fill Bar */}
          <div
            className="absolute inset-y-0 left-0 bg-[#1D4ED8]/12 transition-all duration-300 ease-linear pointer-events-none"
            style={{ width: `${continuousRightSweepPct}%` }}
          />

          <div className="relative z-10 inset-x-0 top-0.5 flex justify-between px-2.5 text-[9px] font-mono-tabular whitespace-nowrap">
            {TYPOMETER_STAGES.map((st) => {
              const isCurrent = st.stageIndex === activeStageIndex;
              const isReached = st.stageIndex <= activeStageIndex;
              return (
                <span
                  key={st.code}
                  className={
                    isCurrent
                      ? 'text-[#1D4ED8] font-bold'
                      : isReached
                      ? 'text-[#0A1128] font-medium'
                      : 'text-[#64748B]'
                  }
                >
                  {st.pct}%<span className="hidden sm:inline"> — {st.shortName}</span> →
                </span>
              );
            })}
          </div>

          <div className="absolute inset-x-0 bottom-0 h-2 flex items-end justify-between px-1">
            {Array.from({ length: 41 }).map((_, idx) => {
              const tickPct = (idx / 40) * 100;
              const isMajor = idx % 10 === 0;
              const isPassed = tickPct <= roundedPct;
              return (
                <span
                  key={idx}
                  className={`w-px transition-colors duration-200 ${
                    isMajor ? 'h-2.5' : 'h-1'
                  } ${isPassed ? 'bg-[#1D4ED8]' : 'bg-[#94A3B8]/60'}`}
                />
              );
            })}
          </div>

          {/* Smoothly Animated Left-to-Right Vernier Hairline Cursor */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#1D4ED8] transition-all duration-300 ease-linear pointer-events-none"
            style={{
              left: `${Math.max(4, Math.min(98, continuousRightSweepPct))}%`,
            }}
          />
        </div>
      </div>

      {/* Main Typographic Crystallization Specimen Stage (Left-to-Right Sweep) */}
      <div className="relative bg-[#F7F4EE] border border-[#0A1128]/15 px-4 py-3.5 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 border-y border-dashed border-[#0A1128]/10"
        />

        {/* Vernier Lens Highlight Moving Smoothly to the Right */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0 w-28 bg-gradient-to-r from-transparent via-[#1D4ED8]/12 to-transparent border-x border-[#1D4ED8]/25 transition-all duration-300 ease-linear"
          style={{
            left: `${activeStageIndex * 24 + 4}%`,
          }}
        />

        <h1
          aria-label="Where raw cricket records crystallize into conviction."
          className="relative z-10 font-editorial text-2xl sm:text-3xl lg:text-[2.35rem] font-semibold leading-[1.1] tracking-tight text-[#0A1128] flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5"
        >
          {STATEMENT_WORDS.map((token) => {
            const isCurrentStageWord = token.activeAtStage === activeStageIndex;
            const isCrystallized = token.activeAtStage <= activeStageIndex;
            const isHighlightedWord =
              isCurrentStageWord && token.isPrimaryStageWord;

            return (
              <span
                key={token.word}
                onClick={() => onSelectStage(token.activeAtStage, true)}
                data-highlighted={isHighlightedWord ? 'true' : 'false'}
                className="relative inline-flex flex-col items-start cursor-pointer"
              >
                <span
                  aria-hidden="true"
                  className={`font-mono-tabular text-[8.5px] uppercase tracking-widest leading-none mb-1 px-1 py-0.5 transition-colors duration-200 ${
                    isHighlightedWord
                      ? 'bg-[#1D4ED8] text-[#F7F4EE] font-semibold'
                      : isCurrentStageWord
                      ? 'text-[#1D4ED8] font-semibold'
                      : isCrystallized
                      ? 'text-[#0A1128]/70'
                      : 'text-[#94A3B8]'
                  }`}
                >
                  {isCrystallized ? token.metricTag : token.rawFragment}
                </span>

                <span
                  className={`transition-colors duration-200 ${
                    isHighlightedWord
                      ? 'text-[#1D4ED8] italic'
                      : isCurrentStageWord
                      ? 'text-[#0A1128]'
                      : isCrystallized
                      ? 'text-[#0A1128]'
                      : 'text-[#334155]/55'
                  }`}
                >
                  {token.word}
                </span>

                <span
                  aria-hidden="true"
                  className={`mt-1 h-0.5 transition-all duration-300 ${
                    isHighlightedWord
                      ? 'w-full bg-[#1D4ED8]'
                      : isCrystallized
                      ? 'w-3/4 bg-[#0A1128]/35'
                      : 'w-1/3 bg-[#94A3B8]/40'
                  }`}
                />
              </span>
            );
          })}
        </h1>
      </div>

      {/* Fixed-Size 4-Stage Visual Strip (Does NOT change size or jump during loop) */}
      <StaticFourStageVisualStrip />

      {/* Bottom 4-Stage Selector Bar Moving Left-to-Right (25% -> 100%) */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div
          role="group"
          aria-label="Typometer 4-Stage Progression"
          className="grid grid-cols-4 gap-1 flex-1 bg-[#DFDAD0] p-1"
        >
          {TYPOMETER_STAGES.map((stage) => {
            const isSelected = stage.stageIndex === activeStageIndex;
            return (
              <button
                key={stage.code}
                type="button"
                data-testid={`typometer-preset-${stage.pct}`}
                onClick={() => onSelectStage(stage.stageIndex, true)}
                className={`relative overflow-hidden px-1.5 py-1.5 text-left font-mono-tabular transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#0A1128] text-[#F7F4EE]'
                    : 'bg-[#F7F4EE]/75 text-[#334155] hover:bg-[#F7F4EE] hover:text-[#0A1128]'
                }`}
              >
                <div className="flex items-center justify-between gap-0.5 text-[9px] sm:text-[9.5px] tracking-tight font-semibold whitespace-nowrap">
                  <span>{stage.pct}%</span>
                  <span
                    className={
                      isSelected ? 'text-[#60A5FA]' : 'text-[#1D4ED8]'
                    }
                  >
                    {stage.shortName}
                  </span>
                </div>
                <div className="mt-1 w-full h-0.5 bg-[#94A3B8]/30 overflow-hidden">
                  <div
                    className="h-full bg-[#2563EB] transition-all duration-150"
                    style={{
                      width: isSelected
                        ? `${Math.max(20, Math.round(stageProgress01 * 100))}%`
                        : stage.stageIndex < activeStageIndex
                        ? '100%'
                        : '0%',
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onToggleAutoPlay}
          data-testid="typometer-autoplay-toggle"
          className="inline-flex items-center gap-1 px-2.5 py-2 border border-[#0A1128]/20 bg-[#F7F4EE] hover:border-[#1D4ED8] text-[10px] font-mono-tabular text-[#0A1128] transition-colors cursor-pointer shrink-0"
          title={
            isAutoPlaying
              ? 'Pause automatic stage progression'
              : 'Resume automatic stage progression'
          }
        >
          {isAutoPlaying ? (
            <>
              <Pause className="w-3 h-3 text-[#1D4ED8]" />
              <span>AUTO</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 text-[#1D4ED8]" />
              <span>PAUSED</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

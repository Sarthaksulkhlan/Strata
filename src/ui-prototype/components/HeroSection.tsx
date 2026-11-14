import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowDownRight, RotateCw, Upload } from 'lucide-react';
import {
  BRAND_CONFIG,
  HERO_PRISM_FACES,
} from '../data/mockCricketData';
import { MonolithCanvas } from './MonolithCanvas';
import { TypometerExperience } from './TypometerExperience';

interface HeroSectionProps {
  onEnterStorytelling: () => void;
  onExploreRankings: () => void;
  onOpenLiveConsole?: () => void;
}

// Complete one full 4-stage cycle (25% RAW -> 50% CONTEXT -> 75% PRESSURE -> 100% INTELLIGENCE) in ~2.6 seconds (650ms per stage)
const STAGE_DURATION_MS = 650;

const STATIC_HERO_SPECS = [
  { label: 'INGESTED VOLUME', val: '1.42M', sub: 'Multi-source cricket records' },
  { label: 'CONTEXT & STRESS', val: '2.4x', sub: 'Venue · XI · RRR > 11.5 weight' },
  { label: 'AUCTION OUTPUT', val: 'PRI 95.4', sub: 'Top 10 Batsmen & Bowlers' },
] as const;

export const HeroSection: React.FC<HeroSectionProps> = ({
  onEnterStorytelling,
  onExploreRankings,
  onOpenLiveConsole,
}) => {
  // Typometer automatic fast-looping 4-stage progression state (0: 25% RAW, 1: 50% CONTEXT, 2: 75% PRESSURE, 3: 100% INTELLIGENCE)
  const [typometerStageIndex, setTypometerStageIndex] = useState<0 | 1 | 2 | 3>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);
  const [stageProgress01, setStageProgress01] = useState<number>(0);

  // 3D Hero Object state: null = continuous 360-degree fluid rotation; 0 | 1 | 2 | 3 = inspect specific face
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<0 | 1 | 2 | 3 | null>(
    null
  );
  const [customPlayerImageUrl, setCustomPlayerImageUrl] = useState<string | null>(
    null
  );
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fast continuous rightward loop across the 4 Typometer stages (~2.6 seconds per full cycle, 650ms per stage)
  useEffect(() => {
    if (!isAutoPlaying) return;

    const startTs = performance.now();
    const intervalId = window.setInterval(() => {
      const elapsed = performance.now() - startTs;
      const p = Math.min(1, elapsed / STAGE_DURATION_MS);
      setStageProgress01(p);

      if (elapsed >= STAGE_DURATION_MS) {
        setStageProgress01(0);
        setTypometerStageIndex((prev) => ((prev + 1) % 4) as 0 | 1 | 2 | 3);
      }
    }, 45);

    return () => window.clearInterval(intervalId);
  }, [isAutoPlaying, typometerStageIndex]);

  const handleSelectTypometerStage = (
    stageIdx: 0 | 1 | 2 | 3,
    manual = false
  ) => {
    setTypometerStageIndex(stageIdx);
    setStageProgress01(manual ? 1 : 0);
  };

  // Keep the 3D Prism header completely independent of the Typometer loop so it never jumps or changes size
  const activeFaceSpec =
    selectedFaceIndex !== null
      ? HERO_PRISM_FACES[selectedFaceIndex]
      : HERO_PRISM_FACES[0];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCustomPlayerImageUrl(objectUrl);
    setCustomFileName(file.name);
    setSelectedFaceIndex(0);
  };

  return (
    <section
      id="hero"
      className="relative z-10 flex flex-col justify-between border-b border-[#0A1128]/12 pt-2 pb-4 lg:py-3"
    >
      <div className="max-w-[1380px] mx-auto w-full px-4 sm:px-6 lg:px-10 space-y-3">
        {/* Compact Top Architectural Metadata Ribbon (Shifted Upward) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#0A1128]/12 text-[11px] font-mono-tabular text-[#334155]">
          <div className="flex items-center gap-2">
            <span className="text-[#0A1128] font-semibold tracking-wider">
              {BRAND_CONFIG.name} · DEEP LAYER OF CRICKET INTELLIGENCE
            </span>
            <span aria-hidden="true" className="text-[#94A3B8]">
              ·
            </span>
            <span>{BRAND_CONFIG.edition}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>FOUR-SIDED TELEMETRY PRISM</span>
            <span aria-hidden="true" className="text-[#94A3B8]">
              /
            </span>
            <span className="text-[#1D4ED8] font-medium">
              2 RR PHOTO FACES + 2 LIVE TELEMETRY FACES
            </span>
          </div>
        </div>

        {/* Side-by-Side Row: Typometer Box (Left 6 Cols) + Highlighted 360° Orbit Prism Box (Right 6 Cols) */}
        <div
          className="grid grid-cols-1 sm:grid-cols-12 gap-4 lg:gap-5 items-stretch"
          data-testid="hero-typometer"
          data-active-typometer-stage={typometerStageIndex}
        >
          {/* Left Box (6 Cols on sm+): Continuous Rightward-Looping Typometer Box */}
          <div className="sm:col-span-6 flex flex-col">
            <TypometerExperience
              activeStageIndex={typometerStageIndex}
              onSelectStage={handleSelectTypometerStage}
              isAutoPlaying={isAutoPlaying}
              onToggleAutoPlay={() => setIsAutoPlaying((prev) => !prev)}
              stageProgress01={stageProgress01}
            />
          </div>

          {/* Right Box (6 Cols on sm+): Enlarged & Highlighted STRATA 4-SIDED PRISM · 360° ORBIT Box */}
          <div className="sm:col-span-6 flex flex-col">
            <div
              data-testid="compact-prism-outer-frame"
              className="relative w-full h-full bg-[#EFECE4] border-2 border-[#1D4ED8]/45 shadow-[0_16px_38px_rgba(29,78,216,0.12)] ring-1 ring-[#0A1128]/10 flex flex-col justify-between p-3.5 sm:p-4"
            >
              {/* Top Royal Cobalt Accent Highlight Bar */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0A1128] via-[#1D4ED8] to-[#3B82F6]"
              />

              {/* Highlighted & Enlarged Spatial Telemetry Header */}
              <div className="space-y-1.5 pt-0.5">
                <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#0A1128]/15">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#0A1128] text-[#F7F4EE] border border-[#1D4ED8]">
                    <span className="w-2 h-2 rounded-full bg-[#60A5FA] animate-pulse" />
                    <span className="font-mono-tabular text-xs sm:text-[13px] font-bold tracking-wider text-[#F8FAFC]">
                      {selectedFaceIndex === null
                        ? 'STRATA 4-SIDED PRISM · 360° ORBIT'
                        : activeFaceSpec.telemetryTag}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-[#1D4ED8]/12 border border-[#1D4ED8]/30 text-[#1D4ED8] font-mono-tabular text-[10px] sm:text-[11px] font-semibold">
                    {customFileName
                      ? `PHOTO: ${customFileName}`
                      : '2 RR PHOTOS · 2 DATA FACES'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 py-1 border-b border-[#0A1128]/10 text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono-tabular text-[10.5px] text-[#1D4ED8] font-bold shrink-0">
                      {selectedFaceIndex === null ? 'ACTIVE ORBIT:' : `${activeFaceSpec.code}:`}
                    </span>
                    <span className="font-semibold text-[#0A1128] truncate">
                      {selectedFaceIndex === null
                        ? 'Rajasthan Royals Photos & Live Telemetry'
                        : activeFaceSpec.title}
                    </span>
                  </div>
                  <span className="font-mono-tabular text-[10px] text-[#1D4ED8] font-medium shrink-0">
                    {selectedFaceIndex !== null && activeFaceSpec.faceType === 'telemetry'
                      ? 'ILLUSTRATIVE DATA'
                      : '360° LIVE VIEW'}
                  </span>
                </div>
              </div>

              {/* Enlarged & Highlighted 3D Canvas Viewport */}
              <div className="relative w-full h-[275px] sm:h-[295px] flex items-center justify-center my-1 bg-gradient-to-b from-[#F7F4EE]/70 via-[#EFECE4]/40 to-[#F7F4EE]/70 border border-[#1D4ED8]/15">
                <MonolithCanvas
                  variant="hero"
                  targetState={{
                    activeFaceIndex: selectedFaceIndex,
                    targetAngleRadians:
                      selectedFaceIndex !== null
                        ? HERO_PRISM_FACES[selectedFaceIndex].targetAngleRadians
                        : undefined,
                    customPlayerImageUrl,
                  }}
                />
              </div>

              {/* Bottom Control Dock for Inspecting the 4 Faces */}
              <div className="relative z-20 pt-2 border-t border-[#0A1128]/12 flex flex-wrap items-center justify-between gap-1.5">
                <div
                  role="group"
                  aria-label="Inspect 4-Sided Hero Structure Faces"
                  className="flex flex-wrap items-center gap-1 bg-[#DFDAD0] p-1"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedFaceIndex(null)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10.5px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedFaceIndex === null
                        ? 'bg-[#1D4ED8] text-[#F7F4EE]'
                        : 'text-[#334155] hover:text-[#0A1128]'
                    }`}
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>360° Orbit</span>
                  </button>
                  {HERO_PRISM_FACES.map((face) => {
                    const isActive = selectedFaceIndex === face.faceIndex;
                    return (
                      <button
                        key={face.code}
                        type="button"
                        data-testid={`hero-face-btn-${face.faceIndex}`}
                        onClick={() => setSelectedFaceIndex(face.faceIndex)}
                        className={`px-2 py-1 text-[10.5px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'bg-[#0A1128] text-[#F7F4EE]'
                            : 'text-[#334155] hover:text-[#0A1128]'
                        }`}
                      >
                        {face.shortLabel}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    aria-label="Upload Custom Player Photograph"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#0A1128]/20 bg-[#F7F4EE] hover:border-[#1D4ED8] text-[10.5px] font-mono-tabular text-[#0A1128] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Upload className="w-3 h-3 text-[#1D4ED8]" />
                    <span>Photo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Bottom Action & Functional Scroll-Down Bar (Shifted Upward, Static Height) */}
        <div
          className="pt-2.5 border-t border-[#0A1128]/12 flex flex-wrap items-center justify-between gap-4"
          data-testid="synchronized-left-storytelling"
        >
          {/* Functional Action Buttons + "Scroll down for more details" */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenLiveConsole && (
              <button
                type="button"
                onClick={onOpenLiveConsole}
                data-testid="hero-open-live-console-btn"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1D4ED8] text-[#F7F4EE] text-xs sm:text-sm font-mono-tabular font-bold hover:bg-[#2563EB] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>OPEN LIVE CONSOLE</span>
                <ArrowDownRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onEnterStorytelling}
              data-testid="scroll-down-details-btn"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A1128] text-[#F7F4EE] text-xs sm:text-sm font-medium hover:bg-[#1D4ED8] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Scroll down for more details</span>
              <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
            </button>

            <button
              type="button"
              onClick={onExploreRankings}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#0A1128]/25 text-[#0A1128] text-xs sm:text-sm font-medium hover:border-[#1D4ED8] hover:text-[#1D4ED8] bg-[#EFECE4]/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Inspect Top 20 Archetypes</span>
              <ArrowDownRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Static Architectural Specifications Strip (Does Not Resize or Jump) */}
          <div className="flex items-center gap-5 sm:gap-7">
            {STATIC_HERO_SPECS.map((item) => (
              <div key={item.label} className="flex items-baseline gap-2">
                <span className="font-mono-tabular text-[10px] text-[#64748B]">
                  {item.label}:
                </span>
                <span className="font-editorial text-base sm:text-lg font-semibold text-[#0A1128] tabular-nums">
                  {item.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

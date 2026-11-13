import React, { useState } from 'react';
import { Download, RotateCcw, Trash2, X } from 'lucide-react';
import {
  BRAND_CONFIG,
  ILLUSTRATIVE_TOP_BATSMEN,
  ILLUSTRATIVE_TOP_BOWLERS,
} from './data/mockCricketData';
import { computeShortlistSummary } from './lib/intelligenceEngine';
import { useScrollProgress } from './hooks/useScrollProgress';
import { InteractiveBackground } from './components/InteractiveBackground';
import { HeroSection } from './components/HeroSection';
import { PinnedStorytelling } from './components/PinnedStorytelling';
import { EcosystemSection } from './components/EcosystemSection';
import { RankingsAndProfilesSection } from './components/RankingsAndProfilesSection';
import { MatchAndMethodologySection } from './components/MatchAndMethodologySection';

export const WeavePrototypeApp: React.FC = () => {
  const { scrollStateRef } = useScrollProgress({ debounceMs: 12 });
  const [shortlistIds, setShortlistIds] = useState<string[]>([
    'bat-01',
    'bat-02',
    'bwl-01',
  ]);
  const [totalPurseCr, setTotalPurseCr] = useState<number>(45.0);
  const [isShortlistOpen, setIsShortlistOpen] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handleToggleShortlist = (playerId: string) => {
    setShortlistIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const summary = computeShortlistSummary(
    shortlistIds,
    ILLUSTRATIVE_TOP_BATSMEN,
    ILLUSTRATIVE_TOP_BOWLERS,
    totalPurseCr
  );

  const selectedBatsmen = ILLUSTRATIVE_TOP_BATSMEN.filter((b) =>
    shortlistIds.includes(b.id)
  );
  const selectedBowlers = ILLUSTRATIVE_TOP_BOWLERS.filter((w) =>
    shortlistIds.includes(w.id)
  );

  const handleExportShortlist = () => {
    const payload = {
      platform: BRAND_CONFIG.name,
      edition: BRAND_CONFIG.edition,
      disclaimer: BRAND_CONFIG.disclaimer,
      summary,
      batsmen: selectedBatsmen.map((b) => ({
        code: b.code,
        archetype: b.archetypeName,
        pressureRating: b.pressureRating,
        auctionBandCr: b.auctionBandCr,
      })),
      bowlers: selectedBowlers.map((w) => ({
        code: w.code,
        archetype: w.archetypeName,
        pressureRating: w.pressureRating,
        auctionBandCr: w.auctionBandCr,
      })),
    };

    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'strata-ipl2027-illustrative-shortlist.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback in restricted environments
    }
    setExportStatus('Exported illustrative shortlist JSON');
    setTimeout(() => setExportStatus(null), 3000);
  };

  return (
    <div className="relative min-h-screen bg-[#F7F4EE] text-[#0A1128] flex flex-col">
      {/* Scroll-Responsive Interactive Background Layer */}
      <InteractiveBackground scrollStateRef={scrollStateRef} />

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#F7F4EE]/95 border-b border-[#0A1128]/12">
        <div className="max-w-[1380px] mx-auto flex items-center justify-between gap-8 px-6 lg:px-12 h-16">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#hero"
            className="font-editorial text-2xl font-bold tracking-tight text-[#0A1128] whitespace-nowrap shrink-0"
          >
            {BRAND_CONFIG.name}
          </a>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#334155]"
          >
            <a
              href="#storytelling"
              className="hover:text-[#1D4ED8] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Landscape
            </a>
            <a
              href="#ecosystem"
              className="hover:text-[#1D4ED8] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Ecosystem
            </a>
            <a
              href="#rankings"
              className="hover:text-[#1D4ED8] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Rankings
            </a>
            <a
              href="#match-intelligence"
              className="hover:text-[#1D4ED8] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Match Lab
            </a>
            <a
              href="#methodology"
              className="hover:text-[#1D4ED8] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Methodology
            </a>
          </nav>

          {/* Zone 3: 1 primary action button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setIsShortlistOpen(true)}
              className="px-4 py-2 text-xs font-mono-tabular font-medium text-[#F7F4EE] bg-[#0A1128] hover:bg-[#1D4ED8] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Shortlist ({summary.totalSelected})
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Flow */}
      <main className="relative z-10 flex-1">
        <HeroSection
          onEnterStorytelling={() => scrollToSection('storytelling')}
          onExploreRankings={() => scrollToSection('rankings')}
        />

        <PinnedStorytelling />

        <EcosystemSection />

        <RankingsAndProfilesSection
          shortlistIds={shortlistIds}
          onToggleShortlist={handleToggleShortlist}
        />

        <MatchAndMethodologySection
          onOpenShortlistDrawer={() => setIsShortlistOpen(true)}
          shortlistCount={summary.totalSelected}
        />
      </main>

      {/* Interactive IPL 2027 Auction Shortlist Drawer */}
      {isShortlistOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="IPL 2027 Auction Shortlist Builder"
          className="fixed inset-0 z-50 flex justify-end bg-[#0A1128]/55"
        >
          <div className="w-full max-w-xl bg-[#F7F4EE] h-full border-l border-[#0A1128]/20 flex flex-col justify-between overflow-y-auto p-6 sm:p-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#0A1128]/12 pb-4">
                <div>
                  <span className="font-mono-tabular text-xs text-[#1D4ED8] font-medium">
                    IPL 2027 AUCTION SIMULATOR
                  </span>
                  <h2 className="font-editorial text-3xl font-semibold text-[#0A1128]">
                    Illustrative Shortlist Dossier
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsShortlistOpen(false)}
                  aria-label="Close Shortlist Drawer"
                  className="p-2 border border-[#0A1128]/20 hover:bg-[#EFECE4] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Purse Calibration Control */}
              <div className="p-4 bg-[#EFECE4] border border-[#0A1128]/12 space-y-3">
                <div className="flex items-center justify-between font-mono-tabular text-xs">
                  <label htmlFor="purse-slider" className="text-[#64748B]">
                    AVAILABLE AUCTION PURSE (CRORES)
                  </label>
                  <span className="text-[#0A1128] font-semibold tabular-nums">
                    ₹{totalPurseCr.toFixed(1)} Cr
                  </span>
                </div>
                <input
                  id="purse-slider"
                  type="range"
                  min={20}
                  max={85}
                  step={2.5}
                  value={totalPurseCr}
                  onChange={(e) => setTotalPurseCr(Number(e.target.value))}
                  className="w-full accent-[#1D4ED8] cursor-pointer"
                />

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#0A1128]/10 text-center font-mono-tabular">
                  <div>
                    <div className="text-[10px] text-[#64748B]">ALLOCATED</div>
                    <div className="text-sm font-semibold text-[#0A1128] tabular-nums">
                      ₹{summary.totalAllocatedCr.toFixed(1)} Cr
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#64748B]">REMAINING</div>
                    <div
                      className={`text-sm font-semibold tabular-nums ${
                        summary.isOverBudget ? 'text-red-700' : 'text-[#1D4ED8]'
                      }`}
                    >
                      ₹{summary.remainingPurseCr.toFixed(1)} Cr
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#64748B]">AVG PRESSURE</div>
                    <div className="text-sm font-semibold text-[#0A1128] tabular-nums">
                      {summary.averagePressureRating.toFixed(1)}
                    </div>
                  </div>
                </div>

                {summary.isOverBudget && (
                  <p className="text-xs font-mono-tabular text-red-700 bg-red-50 border border-red-300 px-3 py-2">
                    Purse Alert: Allocated archetypes exceed available purse by ₹
                    {Math.abs(summary.remainingPurseCr).toFixed(1)} Cr.
                  </p>
                )}
              </div>

              {/* Selected Archetypes List */}
              {summary.totalSelected === 0 ? (
                <div className="p-8 border border-[#0A1128]/12 text-center space-y-3">
                  <p className="text-sm text-[#64748B]">
                    No illustrative archetypes currently shortlisted.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShortlistIds(['bat-01', 'bat-02', 'bwl-01'])}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0A1128] text-[#F7F4EE] text-xs font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Default Sample Trio</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="font-mono-tabular text-xs text-[#64748B]">
                    SELECTED ARCHETYPES ({summary.batsmenCount} BATSMEN ·{' '}
                    {summary.bowlersCount} BOWLERS)
                  </div>
                  {[...selectedBatsmen, ...selectedBowlers].map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-[#EFECE4]/75 border border-[#0A1128]/12 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-mono-tabular text-[#1D4ED8]">
                          {item.code} · {item.sampleLabel}
                        </div>
                        <div className="font-medium text-sm text-[#0A1128]">
                          {item.archetypeName}
                        </div>
                        <div className="text-xs text-[#64748B]">
                          Pressure Index {item.pressureRating.toFixed(1)} · ₹
                          {item.auctionBandCr.toFixed(1)} Cr
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleShortlist(item.id)}
                        aria-label={`Remove ${item.code}`}
                        className="p-2 text-[#64748B] hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-[#0A1128]/12 space-y-3">
              {exportStatus && (
                <p className="text-xs font-mono-tabular text-[#1D4ED8]">
                  {exportStatus}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShortlistIds([])}
                  className="px-4 py-2.5 border border-[#0A1128]/25 text-xs font-mono-tabular text-[#0A1128] hover:bg-[#EFECE4] cursor-pointer"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={handleExportShortlist}
                  disabled={summary.totalSelected === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A1128] text-[#F7F4EE] text-xs font-mono-tabular hover:bg-[#1D4ED8] disabled:opacity-40 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Evaluation Brief (.JSON)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

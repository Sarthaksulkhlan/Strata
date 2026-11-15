import React from 'react';
import { BRAND_CONFIG } from './data/mockCricketData';
import { useScrollProgress } from './hooks/useScrollProgress';
import { InteractiveBackground } from './components/InteractiveBackground';
import { HeroSection } from './components/HeroSection';
import { PinnedStorytelling } from './components/PinnedStorytelling';
import { EcosystemSection } from './components/EcosystemSection';
import { RankingsAndProfilesSection } from './components/RankingsAndProfilesSection';
import { MatchAndMethodologySection } from './components/MatchAndMethodologySection';

export const WeavePrototypeApp: React.FC = () => {
  const { scrollStateRef } = useScrollProgress({ debounceMs: 12 });
  const openLiveConsole = () => {
    window.location.hash = '#/live-console';
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const scroll = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="relative min-h-screen bg-[#F7F4EE] text-[#0A1128] flex flex-col">
      <InteractiveBackground scrollStateRef={scrollStateRef} />
      <header className="sticky top-0 z-40 bg-[#F7F4EE]/95 border-b border-[#0A1128]/12 backdrop-blur-sm">
        <div className="max-w-[1380px] mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-12 h-16">
          <a
            href="#hero"
            className="font-editorial text-2xl font-bold tracking-tight whitespace-nowrap shrink-0"
          >
            {BRAND_CONFIG.name}
          </a>
          <nav
            aria-label="Primary platform navigation"
            className="hidden md:flex items-center gap-4 lg:gap-6 text-xs lg:text-sm font-medium text-[#334155]"
          >
            <a href="#storytelling" className="hover:text-[#0A1128] transition-colors whitespace-nowrap shrink-0">
              Landscape
            </a>
            <a href="#ecosystem" className="hover:text-[#0A1128] transition-colors whitespace-nowrap shrink-0">
              Ecosystem
            </a>
            <a href="#rankings" className="hover:text-[#0A1128] transition-colors whitespace-nowrap shrink-0">
              Rankings
            </a>
            <a
              href="#top-10-batsmen"
              data-testid="nav-top-10-batsmen"
              className="px-2 py-1 bg-[#EFECE4] hover:bg-[#1D4ED8] text-[#0A1128] hover:text-[#F7F4EE] border border-[#0A1128]/15 font-mono-tabular text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Top 10 Batsmen
            </a>
            <a
              href="#top-10-bowlers"
              data-testid="nav-top-10-bowlers"
              className="px-2 py-1 bg-[#EFECE4] hover:bg-[#1D4ED8] text-[#0A1128] hover:text-[#F7F4EE] border border-[#0A1128]/15 font-mono-tabular text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Top 10 Bowlers
            </a>
            <a href="#match-intelligence" className="hover:text-[#0A1128] transition-colors whitespace-nowrap shrink-0">
              Match Lab
            </a>
            <a href="#methodology" className="hover:text-[#0A1128] transition-colors whitespace-nowrap shrink-0">
              Methodology
            </a>
          </nav>
          <button
            type="button"
            onClick={openLiveConsole}
            data-testid="header-open-live-console-btn"
            className="px-3.5 sm:px-4 py-2 text-xs font-mono-tabular font-bold text-[#F7F4EE] bg-[#1D4ED8] hover:bg-[#2563EB] border border-[#0A1128]/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            OPEN LIVE CONSOLE
          </button>
        </div>
        {/* Mobile Quick Jump Strip */}
        <div className="md:hidden border-t border-[#0A1128]/10 bg-[#EFECE4]/90 px-4 py-1.5 flex items-center gap-3 overflow-x-auto text-[11px] font-mono-tabular text-[#334155]">
          <a href="#storytelling" className="whitespace-nowrap hover:text-[#0A1128]">Landscape</a>
          <span aria-hidden="true">·</span>
          <a href="#ecosystem" className="whitespace-nowrap hover:text-[#0A1128]">Ecosystem</a>
          <span aria-hidden="true">·</span>
          <a href="#rankings" className="whitespace-nowrap hover:text-[#0A1128]">Rankings</a>
          <span aria-hidden="true">·</span>
          <a href="#top-10-batsmen" className="whitespace-nowrap font-semibold text-[#1D4ED8]">Top 10 Batsmen</a>
          <span aria-hidden="true">·</span>
          <a href="#top-10-bowlers" className="whitespace-nowrap font-semibold text-[#1D4ED8]">Top 10 Bowlers</a>
          <span aria-hidden="true">·</span>
          <a href="#match-intelligence" className="whitespace-nowrap hover:text-[#0A1128]">Match Lab</a>
          <span aria-hidden="true">·</span>
          <a href="#methodology" className="whitespace-nowrap hover:text-[#0A1128]">Methodology</a>
        </div>
      </header>
      <main className="relative z-10 flex-1">
        <HeroSection
          onEnterStorytelling={() => scroll('storytelling')}
          onExploreRankings={() => scroll('rankings')}
          onOpenLiveConsole={openLiveConsole}
        />
        <PinnedStorytelling />
        <EcosystemSection />
        <RankingsAndProfilesSection />
        <MatchAndMethodologySection />
      </main>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { BRAND_CONFIG } from './data/mockCricketData';
import { useScrollProgress } from './hooks/useScrollProgress';
import { InteractiveBackground } from './components/InteractiveBackground';
import { HeroSection } from './components/HeroSection';
import { PinnedStorytelling } from './components/PinnedStorytelling';
import { EcosystemSection } from './components/EcosystemSection';
import { RankingsAndProfilesSection } from './components/RankingsAndProfilesSection';
import { MatchAndMethodologySection } from './components/MatchAndMethodologySection';
import { LiveConsolePage } from './components/live-console/LiveConsolePage';

export const WeavePrototypeApp: React.FC = () => {
  const { scrollStateRef } = useScrollProgress({ debounceMs: 12 });
  const [activeView, setActiveView] = useState<'landing' | 'live-console'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (
        window.location.hash === '#/live-console' ||
        params.get('view') === 'live-console'
      ) {
        return 'live-console';
      }
    }
    return 'landing';
  });

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === '#/live-console') {
        setActiveView('live-console');
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else if (window.location.hash === '#/landing') {
        setActiveView('landing');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const openLiveConsole = () => {
    window.location.hash = '#/live-console';
    setActiveView('live-console');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const backToLanding = () => {
    window.location.hash = '#/landing';
    setActiveView('landing');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const scroll = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  if (activeView === 'live-console') {
    return <LiveConsolePage onBackToLanding={backToLanding} />;
  }

  return (
    <div className="relative min-h-screen bg-[#F7F4EE] text-[#0A1128] flex flex-col">
      <InteractiveBackground scrollStateRef={scrollStateRef} />
      <header className="sticky top-0 z-40 bg-[#F7F4EE]/95 border-b border-[#0A1128]/12">
        <div className="max-w-[1380px] mx-auto flex items-center justify-between gap-8 px-6 lg:px-12 h-16">
          <a
            href="#hero"
            className="font-editorial text-2xl font-bold tracking-tight whitespace-nowrap shrink-0"
          >
            {BRAND_CONFIG.name}
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#334155]">
            <a href="#storytelling" className="hover:text-[#0A1128] transition-colors whitespace-nowrap shrink-0">
              Landscape
            </a>
            <a href="#ecosystem" className="hover:text-[#0A1128] transition-colors whitespace-nowrap shrink-0">
              Ecosystem
            </a>
            <a href="#rankings" className="hover:text-[#0A1128] transition-colors whitespace-nowrap shrink-0">
              Rankings
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
            className="px-4 py-2 text-xs font-mono-tabular font-bold text-[#F7F4EE] bg-[#1D4ED8] hover:bg-[#2563EB] border border-[#0A1128]/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            OPEN LIVE CONSOLE
          </button>
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

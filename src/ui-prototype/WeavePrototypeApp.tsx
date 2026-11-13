import React from 'react';
import { BRAND_CONFIG } from './data/mockCricketData';
import { useScrollProgress } from './hooks/useScrollProgress';
import { InteractiveBackground } from './components/InteractiveBackground';
import { HeroSection } from './components/HeroSection';
import { PinnedStorytelling } from './components/PinnedStorytelling';
import { EcosystemSection } from './components/EcosystemSection';
import { RankingsAndProfilesSection } from './components/RankingsAndProfilesSection';
import { MatchAndMethodologySection } from './components/MatchAndMethodologySection';

export const WeavePrototypeApp: React.FC=()=>{const{scrollStateRef}=useScrollProgress({debounceMs:12});const scroll=(id:string)=>document.getElementById(id)?.scrollIntoView({behavior:'smooth'});return <div className="relative min-h-screen bg-[#F7F4EE] text-[#0A1128] flex flex-col"><InteractiveBackground scrollStateRef={scrollStateRef}/><header className="sticky top-0 z-40 bg-[#F7F4EE]/95 border-b border-[#0A1128]/12"><div className="max-w-[1380px] mx-auto flex items-center justify-between gap-8 px-6 lg:px-12 h-16"><a href="#hero" className="font-editorial text-2xl font-bold tracking-tight">{BRAND_CONFIG.name}</a><nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#334155]"><a href="#storytelling">Landscape</a><a href="#ecosystem">Ecosystem</a><a href="#rankings">Rankings</a><a href="#match-intelligence">Match Lab</a><a href="#methodology">Methodology</a></nav><button disabled title="Auction intelligence is unavailable" className="px-4 py-2 text-xs font-mono-tabular text-[#64748B] bg-[#EFECE4] border border-[#0A1128]/12 cursor-not-allowed">Auction tools unavailable</button></div></header><main className="relative z-10 flex-1"><HeroSection onEnterStorytelling={()=>scroll('storytelling')} onExploreRankings={()=>scroll('rankings')}/><PinnedStorytelling/><EcosystemSection/><RankingsAndProfilesSection/><MatchAndMethodologySection/></main></div>};

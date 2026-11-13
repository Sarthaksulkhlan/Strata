import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { ArrowUpRight } from 'lucide-react';
import {
  BRAND_CONFIG,
  MATCH_SCENARIOS,
  MatchScenarioPreset,
} from '../data/mockCricketData';
import { simulateScenarioWithStress } from '../lib/intelligenceEngine';

interface MatchAndMethodologySectionProps {
  onOpenShortlistDrawer: () => void;
  shortlistCount: number;
}

const METHODOLOGY_STEPS = [
  {
    step: '01',
    title: 'Relational Entity Linking',
    formula: 'G = (V_ball ∪ V_match ∪ V_xi ∪ V_comp, E_context)',
    summary:
      'Every ball record is joined with official Playing XI sheets, venue boundary geometry, competition tier coefficients, and player bio-mechanical metadata.',
  },
  {
    step: '02',
    title: 'Environmental & Opposition Normalization',
    formula: 'ΔRun_adj = Run_raw − E[Run | VenuePar, Dew, OppElo]',
    summary:
      'Adjusts raw scoring and economy rates for surface deterioration, dew bias, and the Elo percentile of the opposing bowler or batter.',
  },
  {
    step: '03',
    title: 'Situational Leverage & Stress Weighting',
    formula: 'W_pressure = 1 + α·(RRR_spike) + β·(WicketCluster) + γ·(DeathMargin)',
    summary:
      'Applies non-linear leverage weights when Required Run Rate climbs above 11.5 RPO, wickets fall in consecutive overs, or fewer than 12 deliveries remain.',
  },
  {
    step: '04',
    title: 'SupeRR Selector Auction Reliability Index',
    formula: 'PRI = ∑ (W_pressure · ControlSignal · ΔRun_adj) / ShrinkagePrior',
    summary:
      'Produces a Bayesian-shrunk 0–100 reliability index paired with cap-efficiency bands for IPL 2027 squad construction.',
  },
];

export const MatchAndMethodologySection: React.FC<
  MatchAndMethodologySectionProps
> = ({ onOpenShortlistDrawer, shortlistCount }) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    MATCH_SCENARIOS[0].id
  );
  const [stressMultiplier, setStressMultiplier] = useState<number>(1.0);

  const activeScenario: MatchScenarioPreset =
    MATCH_SCENARIOS.find((s) => s.id === selectedScenarioId) || MATCH_SCENARIOS[0];

  const simulation = simulateScenarioWithStress(activeScenario, stressMultiplier);

  return (
    <>
      {/* MATCH INTELLIGENCE SECTION */}
      <section
        id="match-intelligence"
        className="relative z-10 py-20 lg:py-28 border-b border-[#0A1128]/12 bg-[#EFECE4]/65"
      >
        <div className="max-w-[1380px] mx-auto px-6 lg:px-12 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end border-b border-[#0A1128]/12 pb-8">
            <div className="lg:col-span-7 space-y-3">
              <p className="font-mono-tabular text-xs uppercase tracking-widest text-[#1D4ED8] font-medium">
                05 / Match Intelligence &amp; Scenario Lab
              </p>
              <h2 className="font-editorial text-4xl sm:text-5xl text-[#0A1128] font-semibold leading-[1.06] tracking-tight text-balance">
                Simulating control retention when the equation fractures.
              </h2>
            </div>
            <div className="lg:col-span-5">
              <p className="text-sm sm:text-base text-[#334155] leading-relaxed">
                Select an illustrative high-pressure match state and adjust the situational stress multiplier to inspect how top STRATA archetypes preserve shot control and dot-ball discipline compared to the league average.
              </p>
            </div>
          </div>

          {/* Scenario Preset Buttons + Stress Slider */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="font-mono-tabular text-xs text-[#64748B]">
                  SELECT ILLUSTRATIVE MATCH SITUATION
                </div>
                {MATCH_SCENARIOS.map((scen) => {
                  const isSelected = scen.id === activeScenario.id;
                  return (
                    <button
                      key={scen.id}
                      type="button"
                      onClick={() => setSelectedScenarioId(scen.id)}
                      className={`w-full text-left p-5 border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#0A1128] text-[#F7F4EE] border-[#0A1128]'
                          : 'bg-[#F7F4EE] text-[#0A1128] border-[#0A1128]/12 hover:border-[#1D4ED8]/45'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono-tabular text-xs">
                        <span className={isSelected ? 'text-[#60A5FA]' : 'text-[#1D4ED8]'}>
                          {scen.code}
                        </span>
                        <span className="tabular-nums">
                          BASE STRESS {scen.basePressureIndex}/100
                        </span>
                      </div>
                      <h3 className="mt-1.5 font-editorial text-xl font-semibold">
                        {scen.title}
                      </h3>
                      <p
                        className={`mt-1 text-xs ${
                          isSelected ? 'text-[#CBD5E1]' : 'text-[#64748B]'
                        }`}
                      >
                        {scen.equationSummary}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Interactive Stress Multiplier Control */}
              <div className="p-5 bg-[#F7F4EE] border border-[#0A1128]/12 space-y-3">
                <div className="flex items-center justify-between font-mono-tabular text-xs">
                  <label htmlFor="stress-multiplier" className="text-[#64748B]">
                    SITUATIONAL STRESS MULTIPLIER
                  </label>
                  <span className="text-[#1D4ED8] font-semibold tabular-nums">
                    {stressMultiplier.toFixed(2)}x · INDEX {simulation.adjustedPressureIndex}
                  </span>
                </div>
                <input
                  id="stress-multiplier"
                  type="range"
                  min={0.85}
                  max={1.25}
                  step={0.05}
                  value={stressMultiplier}
                  onChange={(e) => setStressMultiplier(Number(e.target.value))}
                  className="w-full accent-[#1D4ED8] cursor-pointer"
                />
                <div className="flex justify-between font-mono-tabular text-[11px] text-[#64748B]">
                  <span>0.85x (Moderate)</span>
                  <span>1.00x (Baseline)</span>
                  <span>1.25x (Extreme Crunch)</span>
                </div>
              </div>
            </div>

            {/* Right 7 Cols: Scenario Telemetry & Recharts Trajectory */}
            <div className="lg:col-span-7 bg-[#F7F4EE] border border-[#0A1128]/15 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#0A1128]/10 pb-4">
                <div>
                  <div className="font-mono-tabular text-xs text-[#1D4ED8] font-medium">
                    {activeScenario.venueContext}
                  </div>
                  <h3 className="mt-1 font-editorial text-2xl sm:text-3xl font-semibold text-[#0A1128]">
                    {activeScenario.title}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="font-mono-tabular text-[10px] text-[#64748B]">
                    CONTROL RETENTION ADVANTAGE
                  </div>
                  <div className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1D4ED8] tabular-nums">
                    +{simulation.controlAdvantage}% vs League Avg
                  </div>
                </div>
              </div>

              <div className="w-full h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={simulation.adjustedTimeline}
                    margin={{ top: 10, right: 20, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#0A1128" strokeOpacity={0.1} />
                    <XAxis
                      dataKey="over"
                      tick={{ fill: '#334155', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    />
                    <YAxis
                      domain={[30, 100]}
                      tick={{ fill: '#334155', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0A1128',
                        color: '#F7F4EE',
                        border: '1px solid #1D4ED8',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="controlProbability"
                      name="STRATA Archetype Control %"
                      stroke="#1D4ED8"
                      strokeWidth={2.5}
                      fill="#1D4ED8"
                      fillOpacity={0.16}
                    />
                    <Area
                      type="monotone"
                      dataKey="leagueAvgControl"
                      name="League Avg Control %"
                      stroke="#64748B"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fill="#64748B"
                      fillOpacity={0.08}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <p className="text-xs sm:text-sm text-[#334155] leading-relaxed bg-[#EFECE4] p-4 border border-[#0A1128]/10">
                {activeScenario.tacticalInsight}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#0A1128]/10 font-mono-tabular text-xs">
                <div>
                  <span className="text-[#64748B]">OPTIMAL BATSMAN ARCHETYPE: </span>
                  <strong className="text-[#0A1128]">{activeScenario.recommendedBatsmanCode}</strong>
                </div>
                <div>
                  <span className="text-[#64748B]">OPTIMAL BOWLER ARCHETYPE: </span>
                  <strong className="text-[#1D4ED8]">{activeScenario.recommendedBowlerCode}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METHODOLOGY SECTION */}
      <section
        id="methodology"
        className="relative z-10 py-20 lg:py-28 border-b border-[#0A1128]/12 bg-[#F7F4EE]/90"
      >
        <div className="max-w-[1380px] mx-auto px-6 lg:px-12 space-y-12">
          <div className="max-w-3xl space-y-3">
            <p className="font-mono-tabular text-xs uppercase tracking-widest text-[#1D4ED8] font-medium">
              06 / Architectural Methodology
            </p>
            <h2 className="font-editorial text-4xl sm:text-5xl text-[#0A1128] font-semibold leading-[1.06] tracking-tight text-balance">
              Four mathematical stages from raw records to auction conviction.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {METHODOLOGY_STEPS.map((m) => (
              <div
                key={m.step}
                className="p-6 bg-[#EFECE4]/75 border border-[#0A1128]/12 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-3">
                  <div className="font-mono-tabular text-xs text-[#1D4ED8] font-semibold">
                    STAGE {m.step}
                  </div>
                  <h3 className="font-editorial text-2xl font-semibold text-[#0A1128]">
                    {m.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#334155] leading-relaxed">
                    {m.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#0A1128]/12 font-mono-tabular text-[11px] text-[#0A1128] bg-[#F7F4EE] p-2.5 border">
                  {m.formula}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section
        id="cta"
        className="relative z-10 py-20 lg:py-28 bg-[#0A1128] text-[#F7F4EE]"
      >
        <div className="max-w-[1380px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-4">
              <p className="font-mono-tabular text-xs uppercase tracking-widest text-[#60A5FA]">
                07 / Rajasthan Royals SupeRR Selector Season 2 · Prototype Ready
              </p>
              <h2 className="font-editorial text-4xl sm:text-6xl font-semibold text-[#F7F4EE] leading-[1.04] tracking-tight text-balance">
                Build your IPL 2027 pressure-tested auction shortlist.
              </h2>
              <p className="text-sm sm:text-base text-[#CBD5E1] max-w-2xl leading-relaxed">
                Review your selected illustrative batsman and bowler archetypes, test purse constraints, and export a structured evaluation brief.
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
              <button
                type="button"
                onClick={onOpenShortlistDrawer}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-4 bg-[#1D4ED8] text-[#F7F4EE] text-sm font-medium hover:bg-[#2563EB] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Open Auction Shortlist ({shortlistCount})</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <a
                href="#hero"
                className="inline-flex items-center justify-center px-6 py-3.5 border border-[#94A3B8]/30 text-xs font-mono-tabular text-[#CBD5E1] hover:text-white hover:border-[#94A3B8] transition-colors whitespace-nowrap shrink-0"
              >
                RETURN TO FOUR-SIDED PRISM ↑
              </a>
            </div>
          </div>

          <footer className="mt-16 pt-8 border-t border-white/12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono-tabular text-[#94A3B8]">
            <div>
              {BRAND_CONFIG.name} · {BRAND_CONFIG.edition}
            </div>
            <div>{BRAND_CONFIG.disclaimer}</div>
          </footer>
        </div>
      </section>
    </>
  );
};

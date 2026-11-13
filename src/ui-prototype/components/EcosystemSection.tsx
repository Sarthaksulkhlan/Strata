import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  BRAND_CONFIG,
  DataSourceNode,
  ECOSYSTEM_NODES,
  ILLUSTRATIVE_TOP_BATSMEN,
  ILLUSTRATIVE_TOP_BOWLERS,
  MatchPhase,
} from '../data/mockCricketData';

const PHASE_ANALYTICS_SUMMARY: Record<
  MatchPhase,
  {
    label: string;
    sampleSizeLabel: string;
    leagueAvgControlPct: number;
    weaveTop10ControlPct: number;
    falseShotReductionPct: number;
    auctionValueEfficiencyDelta: string;
    chartData: Array<{
      tier: string;
      controlPct: number;
      pressureIndex: number;
      strikeOrEconScore: number;
    }>;
  }
> = {
  all: {
    label: 'All Match Phases (Overs 1–20)',
    sampleSizeLabel: 'Illustrative Multi-Source Sample · 6 Joined Tables',
    leagueAvgControlPct: 64.2,
    weaveTop10ControlPct: 81.1,
    falseShotReductionPct: 31.4,
    auctionValueEfficiencyDelta: '+18.6% Win-Prob Added / Cr',
    chartData: [
      { tier: 'B01 / W01', controlPct: 84.5, pressureIndex: 95.0, strikeOrEconScore: 94 },
      { tier: 'B02 / W02', controlPct: 83.8, pressureIndex: 93.0, strikeOrEconScore: 92 },
      { tier: 'B03 / W03', controlPct: 81.2, pressureIndex: 91.5, strikeOrEconScore: 90 },
      { tier: 'B04 / W04', controlPct: 82.0, pressureIndex: 90.2, strikeOrEconScore: 89 },
      { tier: 'B05 / W05', controlPct: 79.4, pressureIndex: 89.0, strikeOrEconScore: 91 },
      { tier: 'League Med', controlPct: 64.2, pressureIndex: 71.0, strikeOrEconScore: 68 },
    ],
  },
  powerplay: {
    label: 'Powerplay Surge & Early Wicket Shock (Overs 1–6)',
    sampleSizeLabel: 'Illustrative Sample · Hard New Ball & Swing Context',
    leagueAvgControlPct: 66.8,
    weaveTop10ControlPct: 82.9,
    falseShotReductionPct: 28.9,
    auctionValueEfficiencyDelta: '+16.2% Win-Prob Added / Cr',
    chartData: [
      { tier: 'B03 (PP)', controlPct: 82.4, pressureIndex: 95.1, strikeOrEconScore: 93 },
      { tier: 'W03 (PP)', controlPct: 85.1, pressureIndex: 95.8, strikeOrEconScore: 95 },
      { tier: 'B08 (PP)', controlPct: 79.8, pressureIndex: 90.8, strikeOrEconScore: 89 },
      { tier: 'W09 (PP)', controlPct: 84.0, pressureIndex: 91.5, strikeOrEconScore: 90 },
      { tier: 'B06 (PP)', controlPct: 86.4, pressureIndex: 89.2, strikeOrEconScore: 86 },
      { tier: 'League Med', controlPct: 66.8, pressureIndex: 72.5, strikeOrEconScore: 70 },
    ],
  },
  middle: {
    label: 'Middle-Overs Spin Choke & Reconstruction (Overs 7–15)',
    sampleSizeLabel: 'Illustrative Sample · High Turn & Cluster Wicket States',
    leagueAvgControlPct: 68.1,
    weaveTop10ControlPct: 84.6,
    falseShotReductionPct: 33.8,
    auctionValueEfficiencyDelta: '+21.4% Win-Prob Added / Cr',
    chartData: [
      { tier: 'B02 (Mid)', controlPct: 84.9, pressureIndex: 95.4, strikeOrEconScore: 94 },
      { tier: 'W02 (Mid)', controlPct: 86.9, pressureIndex: 96.2, strikeOrEconScore: 96 },
      { tier: 'W04 (Mid)', controlPct: 89.2, pressureIndex: 93.5, strikeOrEconScore: 92 },
      { tier: 'B04 (Mid)', controlPct: 83.2, pressureIndex: 92.0, strikeOrEconScore: 90 },
      { tier: 'B07 (Mid)', controlPct: 82.0, pressureIndex: 91.0, strikeOrEconScore: 88 },
      { tier: 'League Med', controlPct: 68.1, pressureIndex: 73.0, strikeOrEconScore: 71 },
    ],
  },
  death: {
    label: 'Death-Overs Steep Equations (Overs 16–20)',
    sampleSizeLabel: 'Illustrative Sample · RRR > 12.0 & Narrow Margins',
    leagueAvgControlPct: 56.4,
    weaveTop10ControlPct: 79.2,
    falseShotReductionPct: 35.1,
    auctionValueEfficiencyDelta: '+24.8% Win-Prob Added / Cr',
    chartData: [
      { tier: 'B01 (Death)', controlPct: 81.4, pressureIndex: 96.8, strikeOrEconScore: 97 },
      { tier: 'W01 (Death)', controlPct: 88.4, pressureIndex: 97.8, strikeOrEconScore: 98 },
      { tier: 'B05 (Death)', controlPct: 76.5, pressureIndex: 94.8, strikeOrEconScore: 95 },
      { tier: 'W05 (Death)', controlPct: 84.7, pressureIndex: 93.9, strikeOrEconScore: 92 },
      { tier: 'W08 (Death)', controlPct: 84.0, pressureIndex: 91.0, strikeOrEconScore: 89 },
      { tier: 'League Med', controlPct: 56.4, pressureIndex: 66.2, strikeOrEconScore: 61 },
    ],
  },
};

export const EcosystemSection: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(ECOSYSTEM_NODES[0].id);
  const [analyticsPhase, setAnalyticsPhase] = useState<MatchPhase>('all');

  const selectedNode: DataSourceNode =
    ECOSYSTEM_NODES.find((n) => n.id === selectedNodeId) || ECOSYSTEM_NODES[0];
  const currentAnalytics = PHASE_ANALYTICS_SUMMARY[analyticsPhase];

  return (
    <section
      id="ecosystem"
      className="relative z-10 py-20 lg:py-28 border-b border-[#0A1128]/12 bg-[#F7F4EE]/90"
    >
      <div className="max-w-[1380px] mx-auto px-6 lg:px-12 space-y-20">
        {/* Part 1: Platform Introduction & Multi-Source Data Architecture */}
        <div className="space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end border-b border-[#0A1128]/12 pb-8">
            <div className="lg:col-span-7 space-y-3">
              <p className="font-mono-tabular text-xs uppercase tracking-widest text-[#1D4ED8] font-medium">
                01 / Comprehensive Cricket Ecosystem
              </p>
              <h2 className="font-editorial text-4xl sm:text-5xl text-[#0A1128] font-semibold leading-[1.06] tracking-tight text-balance">
                Why ball-by-ball statistics alone misprice auction talent.
              </h2>
            </div>
            <div className="lg:col-span-5">
              <p className="text-sm sm:text-base text-[#334155] leading-relaxed">
                A raw strike rate or economy figure strips away the surrounding architecture of a cricket match.{' '}
                <strong className="font-semibold text-[#0A1128]">{BRAND_CONFIG.name}</strong> treats ball-by-ball telemetry as just one input—cross-referencing five contextual and structural registries before grading a single delivery.
              </p>
            </div>
          </div>

          {/* 6-Node Interactive Ecosystem Grid + Detail Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left 7 Cols: 6 Interconnected Source Cards */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ECOSYSTEM_NODES.map((node) => {
                const isSelected = node.id === selectedNode.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`text-left p-5 border transition-colors cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#0A1128] text-[#F7F4EE] border-[#0A1128]'
                        : 'bg-[#EFECE4]/75 text-[#0A1128] border-[#0A1128]/12 hover:border-[#1D4ED8]/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 font-mono-tabular text-xs">
                        <span className={isSelected ? 'text-[#60A5FA]' : 'text-[#1D4ED8]'}>
                          {node.code} · {node.category}
                        </span>
                        <span className="tabular-nums opacity-80">
                          WT {node.weightPct}%
                        </span>
                      </div>
                      <h3 className="mt-2 font-editorial text-xl font-semibold leading-snug">
                        {node.title}
                      </h3>
                      <p
                        className={`mt-2 text-xs leading-relaxed ${
                          isSelected ? 'text-[#CBD5E1]' : 'text-[#334155]'
                        }`}
                      >
                        {node.summary}
                      </p>
                    </div>

                    <div
                      className={`mt-4 pt-3 border-t flex items-center justify-between font-mono-tabular text-[11px] ${
                        isSelected
                          ? 'border-white/15 text-[#93C5FD]'
                          : 'border-[#0A1128]/10 text-[#64748B]'
                      }`}
                    >
                      <span>{node.illustrativeRecords}</span>
                      <span>{isSelected ? 'INSPECTING →' : 'SELECT LAYER'}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right 5 Cols: Active Data Layer Schema & Linkage Dossier */}
            <div className="lg:col-span-5 bg-[#EFECE4] border border-[#0A1128]/15 p-6 sm:p-8 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-[#0A1128]/12 pb-4 font-mono-tabular text-xs">
                  <span className="text-[#1D4ED8] font-semibold">
                    ACTIVE SCHEMA NODE · {selectedNode.code}
                  </span>
                  <span className="text-[#64748B] tabular-nums">
                    MODEL WEIGHT: {selectedNode.weightPct}%
                  </span>
                </div>

                <div>
                  <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#0A1128]">
                    {selectedNode.title}
                  </h3>
                  <p className="mt-2 text-sm text-[#334155] leading-relaxed">
                    {selectedNode.whyItMatters}
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="font-mono-tabular text-xs text-[#64748B]">
                    KEY RELATIONAL FIELDS &amp; SIGNALS
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedNode.fields.map((field, idx) => (
                      <div
                        key={field}
                        className="flex items-center justify-between px-3.5 py-2 bg-[#F7F4EE] border border-[#0A1128]/10 font-mono-tabular text-xs"
                      >
                        <span className="text-[#0A1128] font-medium">{field}</span>
                        <span className="text-[#1D4ED8]">
                          LINK_0{idx + 1} · VERIFIED
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[#0A1128]/12 flex items-center justify-between text-xs font-mono-tabular text-[#64748B]">
                <span>ILLUSTRATIVE ARCHITECTURE</span>
                <span className="text-[#0A1128] font-semibold">
                  {selectedNode.illustrativeRecords}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Part 2: Analytics Overview with Clearly Labelled Illustrative Sample Values */}
        <div id="analytics" className="pt-8 border-t border-[#0A1128]/12 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-mono-tabular text-xs text-[#1D4ED8]">
                <span className="font-medium">02 / Illustrative Analytics Overview</span>
                <span aria-hidden="true" className="text-[#94A3B8]">
                  ·
                </span>
                <span className="text-[#64748B]">SAMPLE DEMONSTRATION METRICS</span>
              </div>
              <h3 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#0A1128]">
                Pressure resilience across match phases.
              </h3>
            </div>

            {/* Interactive Phase Selector */}
            <div
              role="group"
              aria-label="Analytics Phase Filter"
              className="flex flex-wrap items-center gap-1 bg-[#DFDAD0] p-1"
            >
              {(
                [
                  { id: 'all', label: 'All Phases' },
                  { id: 'powerplay', label: 'Powerplay (1–6)' },
                  { id: 'middle', label: 'Middle (7–15)' },
                  { id: 'death', label: 'Death (16–20)' },
                ] as { id: MatchPhase; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAnalyticsPhase(tab.id)}
                  className={`px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    analyticsPhase === tab.id
                      ? 'bg-[#0A1128] text-[#F7F4EE]'
                      : 'text-[#334155] hover:text-[#0A1128]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Explicit Illustrative Sample Disclaimer Banner */}
          <div className="px-4 py-3 bg-[#EFECE4] border border-[#0A1128]/15 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular text-[#334155]">
            <span>{BRAND_CONFIG.disclaimer}</span>
            <span className="text-[#1D4ED8] font-semibold">
              {currentAnalytics.sampleSizeLabel}
            </span>
          </div>

          {/* 4-Metric KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-[#EFECE4]/75 border border-[#0A1128]/12">
              <div className="font-mono-tabular text-xs text-[#64748B]">
                TOP 10 ARCHETYPE CONTROL %
              </div>
              <div className="mt-2 font-editorial text-3xl sm:text-4xl font-semibold text-[#0A1128] tabular-nums">
                {currentAnalytics.weaveTop10ControlPct}%
              </div>
              <div className="mt-1 text-xs text-[#334155]">
                vs {currentAnalytics.leagueAvgControlPct}% illustrative league median
              </div>
            </div>

            <div className="p-5 bg-[#EFECE4]/75 border border-[#0A1128]/12">
              <div className="font-mono-tabular text-xs text-[#64748B]">
                FALSE-SHOT SUPPRESSION
              </div>
              <div className="mt-2 font-editorial text-3xl sm:text-4xl font-semibold text-[#1D4ED8] tabular-nums">
                -{currentAnalytics.falseShotReductionPct}%
              </div>
              <div className="mt-1 text-xs text-[#334155]">
                Lower error rate in top-decile stress overs
              </div>
            </div>

            <div className="p-5 bg-[#EFECE4]/75 border border-[#0A1128]/12">
              <div className="font-mono-tabular text-xs text-[#64748B]">
                EVALUATED SAMPLE ARCHETYPES
              </div>
              <div className="mt-2 font-editorial text-3xl sm:text-4xl font-semibold text-[#0A1128] tabular-nums">
                {ILLUSTRATIVE_TOP_BATSMEN.length + ILLUSTRATIVE_TOP_BOWLERS.length} Profiles
              </div>
              <div className="mt-1 text-xs text-[#334155]">
                10 Batsmen · 10 Bowlers (Illustrative)
              </div>
            </div>

            <div className="p-5 bg-[#EFECE4]/75 border border-[#0A1128]/12">
              <div className="font-mono-tabular text-xs text-[#64748B]">
                AUCTION EFFICIENCY GAIN
              </div>
              <div className="mt-2 font-editorial text-2xl sm:text-3xl font-semibold text-[#0A1128] tabular-nums">
                {currentAnalytics.auctionValueEfficiencyDelta}
              </div>
              <div className="mt-1 text-xs text-[#334155]">
                Context-adjusted valuation vs raw averages
              </div>
            </div>
          </div>

          {/* Illustrative Recharts Visualization */}
          <div className="p-6 bg-[#EFECE4] border border-[#0A1128]/12">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-[#0A1128]/10">
              <div>
                <h4 className="font-editorial text-xl font-semibold text-[#0A1128]">
                  {currentAnalytics.label} — Control % vs Composite Pressure Index
                </h4>
                <p className="text-xs text-[#334155]">
                  Comparing illustrative STRATA Top Archetypes against the League Median benchmark
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono-tabular">
                <span className="text-[#0A1128]">■ Pressure Index (Midnight Navy)</span>
                <span className="text-[#1D4ED8]">● Control % Under Stress (Royal Cobalt)</span>
              </div>
            </div>

            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={currentAnalytics.chartData}
                  margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#0A1128" strokeOpacity={0.1} />
                  <XAxis
                    dataKey="tier"
                    tick={{ fill: '#334155', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis
                    domain={[45, 100]}
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
                  <Bar
                    dataKey="pressureIndex"
                    name="Composite Pressure Index"
                    fill="#0A1128"
                    barSize={38}
                  />
                  <Line
                    type="monotone"
                    dataKey="controlPct"
                    name="Control % Under Stress"
                    stroke="#1D4ED8"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#1D4ED8' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

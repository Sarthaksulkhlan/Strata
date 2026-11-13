import React, { useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import {
  BatsmanEvaluation,
  BowlerEvaluation,
  ILLUSTRATIVE_TOP_BATSMEN,
  ILLUSTRATIVE_TOP_BOWLERS,
  MatchPhase,
} from '../data/mockCricketData';
import {
  BatsmanSortField,
  BowlerSortField,
  filterAndRankBatsmen,
  filterAndRankBowlers,
} from '../lib/intelligenceEngine';

interface RankingsAndProfilesSectionProps {
  shortlistIds: string[];
  onToggleShortlist: (playerId: string) => void;
}

export const RankingsAndProfilesSection: React.FC<
  RankingsAndProfilesSectionProps
> = ({ shortlistIds, onToggleShortlist }) => {
  const [phaseFilter, setPhaseFilter] = useState<MatchPhase>('all');
  const [minPressureRating, setMinPressureRating] = useState<number>(80);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [batsmanSort, setBatsmanSort] = useState<BatsmanSortField>('pressureRating');
  const [bowlerSort, setBowlerSort] = useState<BowlerSortField>('pressureRating');

  const [selectedBatsmanId, setSelectedBatsmanId] = useState<string>(
    ILLUSTRATIVE_TOP_BATSMEN[0].id
  );
  const [selectedBowlerId, setSelectedBowlerId] = useState<string>(
    ILLUSTRATIVE_TOP_BOWLERS[0].id
  );

  const rankedBatsmen = filterAndRankBatsmen(
    ILLUSTRATIVE_TOP_BATSMEN,
    phaseFilter,
    minPressureRating,
    searchQuery,
    batsmanSort
  );

  const rankedBowlers = filterAndRankBowlers(
    ILLUSTRATIVE_TOP_BOWLERS,
    phaseFilter,
    minPressureRating,
    searchQuery,
    bowlerSort
  );

  const inspectedBatsman: BatsmanEvaluation =
    ILLUSTRATIVE_TOP_BATSMEN.find((b) => b.id === selectedBatsmanId) ||
    ILLUSTRATIVE_TOP_BATSMEN[0];

  const inspectedBowler: BowlerEvaluation =
    ILLUSTRATIVE_TOP_BOWLERS.find((w) => w.id === selectedBowlerId) ||
    ILLUSTRATIVE_TOP_BOWLERS[0];

  const resetFilters = () => {
    setPhaseFilter('all');
    setMinPressureRating(80);
    setSearchQuery('');
    setBatsmanSort('pressureRating');
    setBowlerSort('pressureRating');
  };

  return (
    <section
      id="rankings"
      className="relative z-10 py-20 lg:py-28 border-b border-[#0A1128]/12 bg-[#F7F4EE]/90"
    >
      <div className="max-w-[1380px] mx-auto px-6 lg:px-12 space-y-20">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#0A1128]/12 pb-8">
          <div className="space-y-3">
            <p className="font-mono-tabular text-xs uppercase tracking-widest text-[#1D4ED8] font-medium">
              03 / Top 10 Batsmen &amp; Top 10 Bowlers Under Pressure
            </p>
            <h2 className="font-editorial text-4xl sm:text-5xl text-[#0A1128] font-semibold leading-[1.06] tracking-tight text-balance">
              Illustrative IPL 2027 Auction Evaluation Matrices.
            </h2>
          </div>
          <p className="text-sm text-[#334155] max-w-md">
            All rankings below use clearly labelled illustrative archetype data to demonstrate multi-source pressure evaluation without claiming real player rankings.
          </p>
        </div>

        {/* Interactive Filter & Calibration Toolbar */}
        <div className="p-5 bg-[#EFECE4] border border-[#0A1128]/12 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Phase Segmented Control */}
          <div className="md:col-span-5 flex flex-col gap-1.5">
            <span className="font-mono-tabular text-[11px] text-[#64748B]">
              FILTER BY PRIMARY MATCH PHASE
            </span>
            <div
              role="group"
              aria-label="Rankings Phase Filter"
              className="flex flex-wrap items-center gap-1 bg-[#DFDAD0] p-1"
            >
              {(
                [
                  { id: 'all', label: 'All (10)' },
                  { id: 'powerplay', label: 'Powerplay' },
                  { id: 'middle', label: 'Middle' },
                  { id: 'death', label: 'Death' },
                ] as { id: MatchPhase; label: string }[]
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPhaseFilter(p.id)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    phaseFilter === p.id
                      ? 'bg-[#0A1128] text-[#F7F4EE]'
                      : 'text-[#334155] hover:text-[#0A1128]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="md:col-span-4 flex flex-col gap-1.5">
            <label
              htmlFor="archetype-search"
              className="font-mono-tabular text-[11px] text-[#64748B]"
            >
              SEARCH ARCHETYPE OR TACTICAL ROLE
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="archetype-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. Finisher, Wrist Spin, BAT-01..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#F7F4EE] border border-[#0A1128]/15 text-xs text-[#0A1128] focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          {/* Minimum Pressure Threshold Slider */}
          <div className="md:col-span-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between font-mono-tabular text-[11px]">
              <label htmlFor="min-pressure-slider" className="text-[#64748B]">
                MIN PRESSURE INDEX
              </label>
              <span className="text-[#0A1128] font-semibold tabular-nums">
                ≥ {minPressureRating}
              </span>
            </div>
            <input
              id="min-pressure-slider"
              type="range"
              min={75}
              max={94}
              step={1}
              value={minPressureRating}
              onChange={(e) => setMinPressureRating(Number(e.target.value))}
              className="w-full accent-[#1D4ED8] cursor-pointer"
            />
          </div>
        </div>

        {/* TOP 10 BATSMEN TABLE */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-mono-tabular text-xs text-[#1D4ED8] font-medium">
                TABLE A · BATTING RELIABILITY UNDER PRESSURE
              </span>
              <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#0A1128]">
                Top 10 Batsmen (Illustrative Sample Profiles)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="batsman-sort"
                className="font-mono-tabular text-xs text-[#64748B]"
              >
                Sort Metric:
              </label>
              <select
                id="batsman-sort"
                value={batsmanSort}
                onChange={(e) => setBatsmanSort(e.target.value as BatsmanSortField)}
                className="px-3 py-1.5 bg-[#EFECE4] border border-[#0A1128]/15 text-xs font-mono-tabular text-[#0A1128]"
              >
                <option value="pressureRating">Composite Pressure Index</option>
                <option value="controlPctUnderPressure">Control % Under Stress</option>
                <option value="strikeRateUnderPressure">Strike Rate Under Pressure</option>
                <option value="boundaryResilience">Boundary Resilience %</option>
              </select>
            </div>
          </div>

          {rankedBatsmen.length === 0 ? (
            <div className="p-8 bg-[#EFECE4]/50 border border-[#0A1128]/12 text-center space-y-3">
              <p className="text-sm text-[#334155]">
                No batsman archetypes match the current phase and minimum pressure threshold (≥ {minPressureRating}).
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 bg-[#0A1128] text-[#F7F4EE] text-xs font-medium cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#0A1128]/12 bg-[#F7F4EE]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#0A1128]/12 bg-[#EFECE4] font-mono-tabular text-[11px] text-[#64748B]">
                    <th className="py-3 px-4">RANK</th>
                    <th className="py-3 px-4">ILLUSTRATIVE ARCHETYPE</th>
                    <th className="py-3 px-4">TACTICAL ROLE</th>
                    <th className="py-3 px-4 text-right">PRESSURE INDEX</th>
                    <th className="py-3 px-4 text-right">CONTROL %</th>
                    <th className="py-3 px-4 text-right">PRESSURE SR</th>
                    <th className="py-3 px-4 text-right">BOUNDARY RES.</th>
                    <th className="py-3 px-4 text-right">AUCTION BAND</th>
                    <th className="py-3 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0A1128]/8 text-xs sm:text-sm">
                  {rankedBatsmen.map((bat, idx) => {
                    const isInspected = bat.id === inspectedBatsman.id;
                    const isShortlisted = shortlistIds.includes(bat.id);
                    return (
                      <tr
                        key={bat.id}
                        onClick={() => setSelectedBatsmanId(bat.id)}
                        className={`transition-colors cursor-pointer ${
                          isInspected
                            ? 'bg-[#1D4ED8]/8'
                            : 'hover:bg-[#EFECE4]/70'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[#0A1128] tabular-nums">
                          #{String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#0A1128]">
                            {bat.archetypeName}
                          </div>
                          <div className="font-mono-tabular text-[11px] text-[#64748B]">
                            {bat.code} · {bat.handedness} · {bat.sampleLabel}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#334155]">
                          {bat.role}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[#1D4ED8] tabular-nums">
                          {bat.pressureRating.toFixed(1)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular tabular-nums">
                          {bat.controlPctUnderPressure.toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular tabular-nums">
                          {bat.strikeRateUnderPressure.toFixed(1)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular tabular-nums">
                          {bat.boundaryResilience.toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular tabular-nums">
                          ₹{bat.auctionBandCr.toFixed(1)} Cr
                        </td>
                        <td
                          className="py-3.5 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => onToggleShortlist(bat.id)}
                            aria-label={
                              isShortlisted
                                ? `Remove ${bat.code} from Auction Shortlist`
                                : `Add ${bat.code} to Auction Shortlist`
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono-tabular border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              isShortlisted
                                ? 'bg-[#0A1128] text-[#F7F4EE] border-[#0A1128]'
                                : 'bg-transparent text-[#0A1128] border-[#0A1128]/25 hover:border-[#1D4ED8]'
                            }`}
                          >
                            {isShortlisted ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Shortlisted</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Shortlist</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* TOP 10 BOWLERS TABLE */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-mono-tabular text-xs text-[#1D4ED8] font-medium">
                TABLE B · BOWLING CONTAINMENT &amp; STRIKE UNDER PRESSURE
              </span>
              <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#0A1128]">
                Top 10 Bowlers (Illustrative Sample Profiles)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="bowler-sort"
                className="font-mono-tabular text-xs text-[#64748B]"
              >
                Sort Metric:
              </label>
              <select
                id="bowler-sort"
                value={bowlerSort}
                onChange={(e) => setBowlerSort(e.target.value as BowlerSortField)}
                className="px-3 py-1.5 bg-[#EFECE4] border border-[#0A1128]/15 text-xs font-mono-tabular text-[#0A1128]"
              >
                <option value="pressureRating">Composite Pressure Index</option>
                <option value="dotBallPctUnderPressure">Dot Ball % Under Stress</option>
                <option value="economyUnderPressure">Economy Under Pressure (Asc)</option>
                <option value="falseShotInducedPct">False Shot Induced %</option>
              </select>
            </div>
          </div>

          {rankedBowlers.length === 0 ? (
            <div className="p-8 bg-[#EFECE4]/50 border border-[#0A1128]/12 text-center space-y-3">
              <p className="text-sm text-[#334155]">
                No bowler archetypes match the current phase and minimum pressure threshold (≥ {minPressureRating}).
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 bg-[#0A1128] text-[#F7F4EE] text-xs font-medium cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#0A1128]/12 bg-[#F7F4EE]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#0A1128]/12 bg-[#EFECE4] font-mono-tabular text-[11px] text-[#64748B]">
                    <th className="py-3 px-4">RANK</th>
                    <th className="py-3 px-4">ILLUSTRATIVE ARCHETYPE</th>
                    <th className="py-3 px-4">STYLE &amp; ROLE</th>
                    <th className="py-3 px-4 text-right">PRESSURE INDEX</th>
                    <th className="py-3 px-4 text-right">DOT BALL %</th>
                    <th className="py-3 px-4 text-right">PRESSURE ECON</th>
                    <th className="py-3 px-4 text-right">FALSE SHOT %</th>
                    <th className="py-3 px-4 text-right">AUCTION BAND</th>
                    <th className="py-3 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0A1128]/8 text-xs sm:text-sm">
                  {rankedBowlers.map((bwl, idx) => {
                    const isInspected = bwl.id === inspectedBowler.id;
                    const isShortlisted = shortlistIds.includes(bwl.id);
                    return (
                      <tr
                        key={bwl.id}
                        onClick={() => setSelectedBowlerId(bwl.id)}
                        className={`transition-colors cursor-pointer ${
                          isInspected
                            ? 'bg-[#1D4ED8]/8'
                            : 'hover:bg-[#EFECE4]/70'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[#0A1128] tabular-nums">
                          #{String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#0A1128]">
                            {bwl.archetypeName}
                          </div>
                          <div className="font-mono-tabular text-[11px] text-[#64748B]">
                            {bwl.code} · {bwl.sampleLabel}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#334155]">
                          <div>{bwl.role}</div>
                          <div className="text-[11px] text-[#64748B]">{bwl.style}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[#1D4ED8] tabular-nums">
                          {bwl.pressureRating.toFixed(1)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular tabular-nums">
                          {bwl.dotBallPctUnderPressure.toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular tabular-nums">
                          {bwl.economyUnderPressure.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular tabular-nums">
                          {bwl.falseShotInducedPct.toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular tabular-nums">
                          ₹{bwl.auctionBandCr.toFixed(1)} Cr
                        </td>
                        <td
                          className="py-3.5 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => onToggleShortlist(bwl.id)}
                            aria-label={
                              isShortlisted
                                ? `Remove ${bwl.code} from Auction Shortlist`
                                : `Add ${bwl.code} to Auction Shortlist`
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono-tabular border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              isShortlisted
                                ? 'bg-[#0A1128] text-[#F7F4EE] border-[#0A1128]'
                                : 'bg-transparent text-[#0A1128] border-[#0A1128]/25 hover:border-[#1D4ED8]'
                            }`}
                          >
                            {isShortlisted ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Shortlisted</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Shortlist</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PLAYER PROFILE PREVIEW CARDS (Deep-Dive Dossiers) */}
        <div id="profiles" className="pt-8 border-t border-[#0A1128]/12 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="font-mono-tabular text-xs uppercase tracking-widest text-[#1D4ED8] font-medium">
                04 / Player Profile Preview Dossiers
              </p>
              <h3 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#0A1128]">
                Multi-Source Dossier Comparison (Click any table row above to inspect).
              </h3>
            </div>
            <p className="font-mono-tabular text-xs text-[#64748B]">
              CURRENTLY INSPECTING: {inspectedBatsman.code} &amp; {inspectedBowler.code}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Batsman Preview Dossier Card */}
            <article className="bg-[#EFECE4] border border-[#0A1128]/15 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#0A1128]/12 pb-3 font-mono-tabular text-xs text-[#64748B]">
                  <span>BATSMAN EVALUATION DOSSIER · {inspectedBatsman.code}</span>
                  <span className="text-[#1D4ED8] font-semibold">
                    {inspectedBatsman.sampleLabel}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#0A1128]">
                      {inspectedBatsman.archetypeName}
                    </h4>
                    <p className="mt-1 text-xs font-mono-tabular text-[#64748B]">
                      {inspectedBatsman.role} · {inspectedBatsman.handedness} · Illustrative Valuation ₹{inspectedBatsman.auctionBandCr.toFixed(1)} Cr
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-tabular text-[10px] text-[#64748B]">
                      PRESSURE INDEX
                    </div>
                    <div className="font-editorial text-3xl sm:text-4xl font-semibold text-[#1D4ED8] tabular-nums">
                      {inspectedBatsman.pressureRating.toFixed(1)}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-[#334155] leading-relaxed">
                  {inspectedBatsman.narrativeSummary}
                </p>

                {/* Phase Breakdown Bars */}
                <div className="pt-2 space-y-2.5">
                  <div className="font-mono-tabular text-xs text-[#64748B]">
                    PHASE-BY-PHASE PRESSURE ELASTICITY
                  </div>
                  {(
                    [
                      { label: 'Powerplay (1–6)', val: inspectedBatsman.phaseRatings.powerplay },
                      { label: 'Middle Overs (7–15)', val: inspectedBatsman.phaseRatings.middle },
                      { label: 'Death Overs (16–20)', val: inspectedBatsman.phaseRatings.death },
                    ] as const
                  ).map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between font-mono-tabular text-xs">
                        <span>{item.label}</span>
                        <span className="tabular-nums font-medium">{item.val.toFixed(1)} / 100</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#CBD5E1]">
                        <div
                          className="h-full bg-[#0A1128]"
                          style={{ width: `${item.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Multi-Source Signal Contribution */}
                <div className="pt-3 border-t border-[#0A1128]/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 bg-[#F7F4EE] border border-[#0A1128]/10">
                    <div className="font-mono-tabular text-[10px] text-[#64748B]">BALL-BY-BALL</div>
                    <div className="mt-0.5 font-mono-tabular text-sm font-semibold tabular-nums">
                      {inspectedBatsman.sourceBreakdown.ballByBall}
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#F7F4EE] border border-[#0A1128]/10">
                    <div className="font-mono-tabular text-[10px] text-[#64748B]">MATCH PAR</div>
                    <div className="mt-0.5 font-mono-tabular text-sm font-semibold tabular-nums">
                      {inspectedBatsman.sourceBreakdown.matchContext}
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#F7F4EE] border border-[#0A1128]/10">
                    <div className="font-mono-tabular text-[10px] text-[#64748B]">OPP QUALITY</div>
                    <div className="mt-0.5 font-mono-tabular text-sm font-semibold tabular-nums">
                      {inspectedBatsman.sourceBreakdown.oppositionQuality}
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#F7F4EE] border border-[#0A1128]/10">
                    <div className="font-mono-tabular text-[10px] text-[#64748B]">LEVERAGE</div>
                    <div className="mt-0.5 font-mono-tabular text-sm font-semibold text-[#1D4ED8] tabular-nums">
                      {inspectedBatsman.sourceBreakdown.situationalLeverage}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#0A1128]/12 flex items-center justify-between gap-4">
                <div className="font-mono-tabular text-xs text-[#64748B]">
                  SR DELTA: +{(inspectedBatsman.strikeRateUnderPressure - inspectedBatsman.baselineStrikeRate).toFixed(1)} vs Baseline
                </div>
                <button
                  type="button"
                  onClick={() => onToggleShortlist(inspectedBatsman.id)}
                  className="px-4 py-2 bg-[#0A1128] text-[#F7F4EE] text-xs font-medium hover:bg-[#1D4ED8] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {shortlistIds.includes(inspectedBatsman.id)
                    ? 'Remove from Auction Shortlist'
                    : 'Add Batsman to Shortlist'}
                </button>
              </div>
            </article>

            {/* Bowler Preview Dossier Card */}
            <article className="bg-[#EFECE4] border border-[#0A1128]/15 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#0A1128]/12 pb-3 font-mono-tabular text-xs text-[#64748B]">
                  <span>BOWLER EVALUATION DOSSIER · {inspectedBowler.code}</span>
                  <span className="text-[#1D4ED8] font-semibold">
                    {inspectedBowler.sampleLabel}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#0A1128]">
                      {inspectedBowler.archetypeName}
                    </h4>
                    <p className="mt-1 text-xs font-mono-tabular text-[#64748B]">
                      {inspectedBowler.style} · Illustrative Valuation ₹{inspectedBowler.auctionBandCr.toFixed(1)} Cr
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-tabular text-[10px] text-[#64748B]">
                      PRESSURE INDEX
                    </div>
                    <div className="font-editorial text-3xl sm:text-4xl font-semibold text-[#1D4ED8] tabular-nums">
                      {inspectedBowler.pressureRating.toFixed(1)}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-[#334155] leading-relaxed">
                  {inspectedBowler.narrativeSummary}
                </p>

                {/* Phase Breakdown Bars */}
                <div className="pt-2 space-y-2.5">
                  <div className="font-mono-tabular text-xs text-[#64748B]">
                    PHASE-BY-PHASE CONTAINMENT &amp; STRIKE RATING
                  </div>
                  {(
                    [
                      { label: 'Powerplay (1–6)', val: inspectedBowler.phaseRatings.powerplay },
                      { label: 'Middle Overs (7–15)', val: inspectedBowler.phaseRatings.middle },
                      { label: 'Death Overs (16–20)', val: inspectedBowler.phaseRatings.death },
                    ] as const
                  ).map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between font-mono-tabular text-xs">
                        <span>{item.label}</span>
                        <span className="tabular-nums font-medium">{item.val.toFixed(1)} / 100</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#CBD5E1]">
                        <div
                          className="h-full bg-[#1D4ED8]"
                          style={{ width: `${item.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Multi-Source Signal Contribution */}
                <div className="pt-3 border-t border-[#0A1128]/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 bg-[#F7F4EE] border border-[#0A1128]/10">
                    <div className="font-mono-tabular text-[10px] text-[#64748B]">BALL-BY-BALL</div>
                    <div className="mt-0.5 font-mono-tabular text-sm font-semibold tabular-nums">
                      {inspectedBowler.sourceBreakdown.ballByBall}
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#F7F4EE] border border-[#0A1128]/10">
                    <div className="font-mono-tabular text-[10px] text-[#64748B]">MATCH PAR</div>
                    <div className="mt-0.5 font-mono-tabular text-sm font-semibold tabular-nums">
                      {inspectedBowler.sourceBreakdown.matchContext}
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#F7F4EE] border border-[#0A1128]/10">
                    <div className="font-mono-tabular text-[10px] text-[#64748B]">OPP QUALITY</div>
                    <div className="mt-0.5 font-mono-tabular text-sm font-semibold tabular-nums">
                      {inspectedBowler.sourceBreakdown.oppositionQuality}
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#F7F4EE] border border-[#0A1128]/10">
                    <div className="font-mono-tabular text-[10px] text-[#64748B]">LEVERAGE</div>
                    <div className="mt-0.5 font-mono-tabular text-sm font-semibold text-[#1D4ED8] tabular-nums">
                      {inspectedBowler.sourceBreakdown.situationalLeverage}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#0A1128]/12 flex items-center justify-between gap-4">
                <div className="font-mono-tabular text-xs text-[#64748B]">
                  ECON SAVINGS: {(inspectedBowler.baselineEconomy - inspectedBowler.economyUnderPressure).toFixed(2)} RPO Under Stress
                </div>
                <button
                  type="button"
                  onClick={() => onToggleShortlist(inspectedBowler.id)}
                  className="px-4 py-2 bg-[#0A1128] text-[#F7F4EE] text-xs font-medium hover:bg-[#1D4ED8] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {shortlistIds.includes(inspectedBowler.id)
                    ? 'Remove from Auction Shortlist'
                    : 'Add Bowler to Shortlist'}
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
};

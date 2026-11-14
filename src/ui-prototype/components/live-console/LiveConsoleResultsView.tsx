import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ComposedChart,
  Line,
} from 'recharts';
import {
  Download,
  RotateCcw,
  Search,
  Award,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import type { LiveConsoleAnalysisResults } from '../../../api/clutchiq';
import {
  filterBallEvidence,
  filterPlayerResults,
  formatFileSize,
  generateResultsCsv,
  ResultsFilterState,
} from '../../../lib/csvPreviewAndExport';

interface LiveConsoleResultsViewProps {
  results: LiveConsoleAnalysisResults;
  onUploadAnother: () => void;
}

export const LiveConsoleResultsView: React.FC<LiveConsoleResultsViewProps> = ({
  results,
  onUploadAnother,
}) => {
  const [filters, setFilters] = useState<ResultsFilterState>({
    playerQuery: '',
    team: 'all',
    matchId: 'all',
    innings: 'all',
    roleFilter: 'all',
  });

  const filteredBatters = useMemo(
    () =>
      filterPlayerResults(results.all_batters, {
        ...filters,
        roleFilter: 'batting',
      }),
    [results.all_batters, filters]
  );

  const filteredBowlers = useMemo(
    () =>
      filterPlayerResults(results.all_bowlers, {
        ...filters,
        roleFilter: 'bowling',
      }),
    [results.all_bowlers, filters]
  );

  const top10Batters = useMemo(() => filteredBatters.slice(0, 10), [filteredBatters]);
  const top10Bowlers = useMemo(() => filteredBowlers.slice(0, 10), [filteredBowlers]);

  const combinedDetailedPlayers = useMemo(() => {
    const all = [... results.all_batters, ...results.all_bowlers];
    return filterPlayerResults(all, filters).sort(
      (a, b) => b.pressure_score - a.pressure_score
    );
  }, [results.all_batters, results.all_bowlers, filters]);

  const filteredEvidence = useMemo(
    () => filterBallEvidence(results.ball_evidence, filters),
    [results.ball_evidence, filters]
  );

  const bestBatter = top10Batters[0] || results.best_batter;
  const bestBowler = top10Bowlers[0] || results.best_bowler;

  const handleDownloadCsv = () => {
    const csvContent = generateResultsCsv(filteredBatters, filteredBowlers);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanName = results.filename.replace(/\.csv$/i, '');
    link.setAttribute('download', `${cleanName}_pressure_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setFilters({
      playerQuery: '',
      team: 'all',
      matchId: 'all',
      innings: 'all',
      roleFilter: 'all',
    });
  };

  const batterChartData = top10Batters.map((b) => ({
    name: b.player_name.split(' ').slice(-1)[0],
    fullName: b.player_name,
    pressureScore: b.pressure_score,
    strikeRate: b.pressure_strike_rate,
    runs: b.pressure_runs,
  }));

  const bowlerChartData = top10Bowlers.map((bw) => ({
    name: bw.player_name.split(' ').slice(-1)[0],
    fullName: bw.player_name,
    pressureScore: bw.pressure_score,
    economy: bw.pressure_economy,
    wickets: bw.pressure_wickets,
  }));

  return (
    <div data-testid="live-results-view" className="space-y-10">
      {/* Results Top Action & Summary Ribbon */}
      <div className="bg-[#0A1128] text-[#F7F4EE] p-6 sm:p-8 border border-[#1D4ED8]/50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-xs text-[#60A5FA]">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span>ANALYSIS COMPLETE · {results.filename}</span>
            <span aria-hidden="true">·</span>
            <span>{formatFileSize(results.file_size)}</span>
            <span aria-hidden="true">·</span>
            <span>{results.summary.total_records.toLocaleString()} DELIVERIES EVALUATED</span>
          </div>
          <h2 className="font-editorial text-3xl sm:text-4xl font-semibold">
            Live Pressure Evaluation &amp; Player Rankings
          </h2>
          <p className="text-xs sm:text-sm text-[#CBD5E1] max-w-2xl">
            Identified {results.summary.pressure_records.toLocaleString()} high-pressure
            situations ({results.summary.pressure_density_pct}% density) across{' '}
            {results.summary.total_matches} matches and {results.summary.total_teams} teams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDownloadCsv}
            data-testid="download-results-csv-btn"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1D4ED8] hover:bg-[#2563EB] text-[#F7F4EE] text-xs font-mono-tabular font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Download Results as CSV</span>
          </button>

          <button
            type="button"
            onClick={onUploadAnother}
            data-testid="upload-another-dataset-btn"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#EFECE4] hover:bg-white text-[#0A1128] text-xs font-mono-tabular font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-4 h-4 text-[#1D4ED8]" />
            <span>Upload Another Dataset</span>
          </button>
        </div>
      </div>

      {/* Best Batter & Best Bowler Under Pressure Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {bestBatter && (
          <div
            data-testid="best-batter-card"
            className="bg-[#EFECE4] border-2 border-[#0A1128] p-6 sm:p-7 flex flex-col justify-between space-y-5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#0A1128]/12 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 font-mono-tabular text-xs text-[#1D4ED8] font-bold">
                  <Award className="w-4 h-4" />
                  <span>BEST BATTER UNDER PRESSURE</span>
                </div>
                <h3 className="mt-1 font-editorial text-3xl sm:text-4xl font-bold text-[#0A1128]">
                  {bestBatter.player_name}
                </h3>
                <p className="font-mono-tabular text-xs text-[#334155] mt-0.5">
                  {bestBatter.team} · Rank #{bestBatter.rank} · {bestBatter.evidence_level}{' '}
                  evidence
                </p>
              </div>
              <div className="text-right">
                <div className="font-mono-tabular text-[10px] text-[#64748B]">
                  PRESSURE SCORE
                </div>
                <div className="font-editorial text-4xl font-bold text-[#1D4ED8] tabular-nums">
                  {bestBatter.pressure_score.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono-tabular">
              <div className="p-3 bg-[#F7F4EE] border border-[#0A1128]/10">
                <div className="text-[10px] text-[#64748B]">PRESSURE RUNS</div>
                <div className="text-base font-bold text-[#0A1128] tabular-nums">
                  {bestBatter.pressure_runs} ({bestBatter.pressure_balls}b)
                </div>
              </div>
              <div className="p-3 bg-[#F7F4EE] border border-[#0A1128]/10">
                <div className="text-[10px] text-[#64748B]">PRESSURE SR</div>
                <div className="text-base font-bold text-[#1D4ED8] tabular-nums">
                  {bestBatter.pressure_strike_rate.toFixed(1)}
                </div>
              </div>
              <div className="p-3 bg-[#F7F4EE] border border-[#0A1128]/10">
                <div className="text-[10px] text-[#64748B]">TOTAL RUNS</div>
                <div className="text-base font-bold text-[#0A1128] tabular-nums">
                  {bestBatter.runs} ({bestBatter.balls}b)
                </div>
              </div>
              <div className="p-3 bg-[#F7F4EE] border border-[#0A1128]/10">
                <div className="text-[10px] text-[#64748B]">CONTROL %</div>
                <div className="text-base font-bold text-[#0A1128] tabular-nums">
                  {bestBatter.control_pct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {bestBowler && (
          <div
            data-testid="best-bowler-card"
            className="bg-[#EFECE4] border-2 border-[#1D4ED8] p-6 sm:p-7 flex flex-col justify-between space-y-5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#0A1128]/12 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 font-mono-tabular text-xs text-[#1D4ED8] font-bold">
                  <Award className="w-4 h-4" />
                  <span>BEST BOWLER UNDER PRESSURE</span>
                </div>
                <h3 className="mt-1 font-editorial text-3xl sm:text-4xl font-bold text-[#0A1128]">
                  {bestBowler.player_name}
                </h3>
                <p className="font-mono-tabular text-xs text-[#334155] mt-0.5">
                  {bestBowler.team} · Rank #{bestBowler.rank} · {bestBowler.evidence_level}{' '}
                  evidence
                </p>
              </div>
              <div className="text-right">
                <div className="font-mono-tabular text-[10px] text-[#64748B]">
                  PRESSURE SCORE
                </div>
                <div className="font-editorial text-4xl font-bold text-[#1D4ED8] tabular-nums">
                  {bestBowler.pressure_score.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono-tabular">
              <div className="p-3 bg-[#F7F4EE] border border-[#0A1128]/10">
                <div className="text-[10px] text-[#64748B]">PRESSURE WKTS</div>
                <div className="text-base font-bold text-[#0A1128] tabular-nums">
                  {bestBowler.pressure_wickets} ({bestBowler.pressure_balls}b)
                </div>
              </div>
              <div className="p-3 bg-[#F7F4EE] border border-[#0A1128]/10">
                <div className="text-[10px] text-[#64748B]">PRESSURE ECON</div>
                <div className="text-base font-bold text-[#1D4ED8] tabular-nums">
                  {bestBowler.pressure_economy.toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-[#F7F4EE] border border-[#0A1128]/10">
                <div className="text-[10px] text-[#64748B]">DOT BALL %</div>
                <div className="text-base font-bold text-[#0A1128] tabular-nums">
                  {bestBowler.dot_ball_pct.toFixed(1)}%
                </div>
              </div>
              <div className="p-3 bg-[#F7F4EE] border border-[#0A1128]/10">
                <div className="text-[10px] text-[#64748B]">TOTAL FIGURES</div>
                <div className="text-base font-bold text-[#0A1128] tabular-nums">
                  {bestBowler.wickets}/{bestBowler.runs}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Dataset Filter Bar (Player, Team, Match, Innings) */}
      <div className="bg-[#EFECE4] border border-[#0A1128]/15 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0A1128]/10 pb-3">
          <div className="flex items-center gap-2 font-mono-tabular text-xs font-semibold text-[#0A1128]">
            <Filter className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <span>FILTER EVALUATIONS &amp; BALL-LEVEL EVIDENCE</span>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="font-mono-tabular text-xs text-[#1D4ED8] hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label
              htmlFor="console-filter-player"
              className="block font-mono-tabular text-[11px] text-[#64748B] mb-1"
            >
              PLAYER OR TEAM SEARCH
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="console-filter-player"
                type="text"
                value={filters.playerQuery}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, playerQuery: e.target.value }))
                }
                placeholder="Filter by player name…"
                className="w-full pl-8 pr-3 py-2 bg-[#F7F4EE] border border-[#0A1128]/20 text-xs font-mono-tabular"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="console-filter-team"
              className="block font-mono-tabular text-[11px] text-[#64748B] mb-1"
            >
              TEAM ({results.available_filters.teams.length})
            </label>
            <select
              id="console-filter-team"
              value={filters.team}
              onChange={(e) => setFilters((prev) => ({ ...prev, team: e.target.value }))}
              className="w-full px-3 py-2 bg-[#F7F4EE] border border-[#0A1128]/20 text-xs font-mono-tabular"
            >
              <option value="all">All Teams</option>
              {results.available_filters.teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="console-filter-match"
              className="block font-mono-tabular text-[11px] text-[#64748B] mb-1"
            >
              MATCH ({results.available_filters.matches.length})
            </label>
            <select
              id="console-filter-match"
              value={filters.matchId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, matchId: e.target.value }))
              }
              className="w-full px-3 py-2 bg-[#F7F4EE] border border-[#0A1128]/20 text-xs font-mono-tabular"
            >
              <option value="all">All Matches</option>
              {results.available_filters.matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="console-filter-innings"
              className="block font-mono-tabular text-[11px] text-[#64748B] mb-1"
            >
              INNINGS ({results.available_filters.innings.length})
            </label>
            <select
              id="console-filter-innings"
              value={filters.innings}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, innings: e.target.value }))
              }
              className="w-full px-3 py-2 bg-[#F7F4EE] border border-[#0A1128]/20 text-xs font-mono-tabular"
            >
              <option value="all">All Innings</option>
              {results.available_filters.innings.map((inn) => (
                <option key={inn} value={String(inn)}>
                  Innings {inn}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Top 10 Batters & Top 10 Bowlers Under Pressure Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top 10 Batters */}
        <div className="space-y-4" data-testid="top-10-batters-section">
          <div className="border-b border-[#0A1128]/12 pb-3">
            <span className="font-mono-tabular text-xs text-[#1D4ED8] font-semibold">
              BATTING PRESSURE RANKINGS
            </span>
            <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#0A1128]">
              Top 10 Batters Under Pressure
            </h3>
          </div>

          <div className="overflow-x-auto border border-[#0A1128]/15 bg-[#F7F4EE]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#0A1128]/12 bg-[#EFECE4] font-mono-tabular text-[11px] text-[#64748B]">
                  <th className="py-2.5 px-3">RANK</th>
                  <th className="py-2.5 px-3">BATTER</th>
                  <th className="py-2.5 px-3">TEAM</th>
                  <th className="py-2.5 px-3 text-right">SCORE</th>
                  <th className="py-2.5 px-3 text-right">RUNS (B)</th>
                  <th className="py-2.5 px-3 text-right">PRESS. SR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0A1128]/8 text-xs font-mono-tabular">
                {top10Batters.map((b) => (
                  <tr key={b.player_name} className="hover:bg-[#EFECE4]/60">
                    <td className="py-2.5 px-3 font-semibold text-[#64748B]">
                      #{String(b.rank).padStart(2, '0')}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-[#0A1128]">
                      {b.player_name}
                    </td>
                    <td className="py-2.5 px-3 text-[#334155]">{b.team}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#1D4ED8] tabular-nums">
                      {b.pressure_score.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {b.runs} ({b.balls})
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {b.pressure_strike_rate.toFixed(1)}
                    </td>
                  </tr>
                ))}
                {top10Batters.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#64748B]">
                      No batters match the active filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 10 Bowlers */}
        <div className="space-y-4" data-testid="top-10-bowlers-section">
          <div className="border-b border-[#0A1128]/12 pb-3">
            <span className="font-mono-tabular text-xs text-[#1D4ED8] font-semibold">
              BOWLING PRESSURE RANKINGS
            </span>
            <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#0A1128]">
              Top 10 Bowlers Under Pressure
            </h3>
          </div>

          <div className="overflow-x-auto border border-[#0A1128]/15 bg-[#F7F4EE]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#0A1128]/12 bg-[#EFECE4] font-mono-tabular text-[11px] text-[#64748B]">
                  <th className="py-2.5 px-3">RANK</th>
                  <th className="py-2.5 px-3">BOWLER</th>
                  <th className="py-2.5 px-3">TEAM</th>
                  <th className="py-2.5 px-3 text-right">SCORE</th>
                  <th className="py-2.5 px-3 text-right">WKTS / RUNS</th>
                  <th className="py-2.5 px-3 text-right">PRESS. ECON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0A1128]/8 text-xs font-mono-tabular">
                {top10Bowlers.map((bw) => (
                  <tr key={bw.player_name} className="hover:bg-[#EFECE4]/60">
                    <td className="py-2.5 px-3 font-semibold text-[#64748B]">
                      #{String(bw.rank).padStart(2, '0')}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-[#0A1128]">
                      {bw.player_name}
                    </td>
                    <td className="py-2.5 px-3 text-[#334155]">{bw.team}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#1D4ED8] tabular-nums">
                      {bw.pressure_score.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {bw.wickets}/{bw.runs} ({bw.balls}b)
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {bw.pressure_economy.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {top10Bowlers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#64748B]">
                      No bowlers match the active filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Visualizations: Batting & Bowling Pressure Score Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-6 bg-[#EFECE4] border border-[#0A1128]/15 space-y-4">
          <div className="border-b border-[#0A1128]/10 pb-3">
            <div className="font-mono-tabular text-xs text-[#1D4ED8] font-semibold">
              VISUALIZATION 01 · BATTING TELEMETRY
            </div>
            <h4 className="font-editorial text-xl font-semibold text-[#0A1128]">
              Top Batters: Pressure Score vs Pressure Strike Rate
            </h4>
          </div>
          <div className="w-full h-[270px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={batterChartData} margin={{ top: 10, right: 15, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0A1128" strokeOpacity={0.1} />
                <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis yAxisId="left" domain={[0, 100]} tick={{ fill: '#0A1128', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#1D4ED8', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0A1128',
                    color: '#F7F4EE',
                    border: '1px solid #1D4ED8',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '11px',
                  }}
                />
                <Bar yAxisId="left" dataKey="pressureScore" name="Pressure Score" fill="#0A1128" barSize={28} />
                <Line yAxisId="right" type="monotone" dataKey="strikeRate" name="Pressure SR" stroke="#1D4ED8" strokeWidth={2.5} dot={{ r: 3.5, fill: '#1D4ED8' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 bg-[#EFECE4] border border-[#0A1128]/15 space-y-4">
          <div className="border-b border-[#0A1128]/10 pb-3">
            <div className="font-mono-tabular text-xs text-[#1D4ED8] font-semibold">
              VISUALIZATION 02 · BOWLING TELEMETRY
            </div>
            <h4 className="font-editorial text-xl font-semibold text-[#0A1128]">
              Top Bowlers: Pressure Score &amp; Pressure Economy
            </h4>
          </div>
          <div className="w-full h-[270px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bowlerChartData} margin={{ top: 10, right: 15, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0A1128" strokeOpacity={0.1} />
                <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#0A1128', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0A1128',
                    color: '#F7F4EE',
                    border: '1px solid #1D4ED8',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="pressureScore" name="Pressure Score" fill="#1D4ED8" barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Complete Player Analysis Table */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#0A1128]/12 pb-3">
          <div>
            <span className="font-mono-tabular text-xs text-[#1D4ED8] font-semibold">
              COMPREHENSIVE PERFORMANCE LEDGER
            </span>
            <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#0A1128]">
              Detailed Player Pressure Metrics ({combinedDetailedPlayers.length})
            </h3>
          </div>
          <div className="flex items-center gap-1 bg-[#DFDAD0] p-1">
            {(['all', 'batting', 'bowling'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, roleFilter: r }))}
                className={`px-3 py-1.5 text-xs font-mono-tabular font-medium transition-colors cursor-pointer ${
                  filters.roleFilter === r
                    ? 'bg-[#0A1128] text-[#F7F4EE]'
                    : 'text-[#334155] hover:text-[#0A1128]'
                }`}
              >
                {r === 'all' ? 'All Roles' : r === 'batting' ? 'Batters' : 'Bowlers'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border border-[#0A1128]/15 bg-[#F7F4EE]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#0A1128]/12 bg-[#EFECE4] font-mono-tabular text-[11px] text-[#64748B]">
                <th className="py-3 px-3">ROLE</th>
                <th className="py-3 px-3">RANK</th>
                <th className="py-3 px-3">PLAYER</th>
                <th className="py-3 px-3">TEAM</th>
                <th className="py-3 px-3 text-right">PRESSURE SCORE</th>
                <th className="py-3 px-3 text-right">RUNS</th>
                <th className="py-3 px-3 text-right">BALLS</th>
                <th className="py-3 px-3 text-right">WICKETS</th>
                <th className="py-3 px-3 text-right">PRESS. SR / ECON</th>
                <th className="py-3 px-3 text-right">DOT %</th>
                <th className="py-3 px-3 text-right">CONTROL %</th>
                <th className="py-3 px-3">EVIDENCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0A1128]/8 text-xs font-mono-tabular">
              {combinedDetailedPlayers.map((p) => (
                <tr key={`${p.role}-${p.player_name}`} className="hover:bg-[#EFECE4]/60">
                  <td className="py-2.5 px-3 uppercase text-[#1D4ED8] font-semibold">
                    {p.role}
                  </td>
                  <td className="py-2.5 px-3">#{String(p.rank).padStart(2, '0')}</td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-[#0A1128]">
                    {p.player_name}
                  </td>
                  <td className="py-2.5 px-3 text-[#334155]">{p.team}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-[#1D4ED8] tabular-nums">
                    {p.pressure_score.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{p.runs}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{p.balls}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{p.wickets}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {p.role === 'batting'
                      ? `${p.pressure_strike_rate.toFixed(1)} SR`
                      : `${p.pressure_economy.toFixed(2)} ECON`}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {p.dot_ball_pct.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {p.control_pct.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 uppercase text-[#334155]">
                    {p.evidence_level}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Match and Ball-Level Evidence Supporting Results */}
      <div className="space-y-4" data-testid="ball-level-evidence-section">
        <div className="border-b border-[#0A1128]/12 pb-3">
          <span className="font-mono-tabular text-xs text-[#1D4ED8] font-semibold">
            GRANULAR DELIVERY AUDIT
          </span>
          <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#0A1128]">
            Match &amp; Ball-Level Pressure Evidence ({filteredEvidence.length} High-Leverage Deliveries)
          </h3>
        </div>

        <div className="overflow-x-auto border border-[#0A1128]/15 bg-[#F7F4EE]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#0A1128]/12 bg-[#EFECE4] font-mono-tabular text-[11px] text-[#64748B]">
                <th className="py-2.5 px-3">MATCH / INN</th>
                <th className="py-2.5 px-3">OVER</th>
                <th className="py-2.5 px-3">PHASE</th>
                <th className="py-2.5 px-3">BATTER vs BOWLER</th>
                <th className="py-2.5 px-3 text-right">SCORE</th>
                <th className="py-2.5 px-3 text-right">OUTCOME</th>
                <th className="py-2.5 px-3 text-right">PRESSURE IDX</th>
                <th className="py-2.5 px-3">PRESSURE TRIGGERS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0A1128]/8 text-xs font-mono-tabular">
              {filteredEvidence.slice(0, 25).map((ev) => (
                <tr key={ev.record_id} className="hover:bg-[#EFECE4]/60">
                  <td className="py-2.5 px-3 text-[#334155]">
                    {ev.match_id} · Inn {ev.innings}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#0A1128] tabular-nums">
                    {ev.over_ball_label}
                  </td>
                  <td className="py-2.5 px-3 text-[#334155]">{ev.phase}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="font-semibold text-[#0A1128]">{ev.batter}</span>{' '}
                    <span className="text-[#64748B]">vs</span>{' '}
                    <span className="font-medium text-[#334155]">{ev.bowler}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{ev.score_snapshot}</td>
                  <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                    {ev.is_wicket ? (
                      <span className="text-red-700">WICKET ({ev.wicket_type})</span>
                    ) : (
                      <span className="text-[#0A1128]">{ev.total_runs} RUNS</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-[#1D4ED8] tabular-nums">
                    {ev.pressure_index.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-3 text-[#334155]">
                    {ev.pressure_reasons.join(' · ')}
                  </td>
                </tr>
              ))}
              {filteredEvidence.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-[#64748B]">
                    No ball-level pressure records match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

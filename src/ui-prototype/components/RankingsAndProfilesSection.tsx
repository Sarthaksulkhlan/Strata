import { approvedRankings } from '../../api/approvedRankings';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pin, Search, ShieldCheck, User } from 'lucide-react';
import {
  clutchIqApi,
  PlayerEvidenceResponse,
  Ranking,
  Role,
} from '../../api/clutchiq';
import {
  getPlayerInitials,
  getPlayerProfileMeta,
  preloadPlayerPortraits,
} from '../../lib/playerProfileCatalog';
import { PlayerHoverProfileCard } from './PlayerHoverProfileCard';

type Loadable = {
  data: Ranking[];
  loading: boolean;
  error: string | null;
};

interface TableProps {
  role: Role;
  state: Loadable;
  query: string;
  activeHoverKey: string | null;
  pinnedKey: string | null;
  onHoverStart: (row: Ranking, anchorEl: HTMLElement) => void;
  onHoverEnd: () => void;
  onTogglePinCard: (row: Ranking, anchorEl: HTMLElement) => void;
}

function Table({
  role,
  state,
  query,
  activeHoverKey,
  pinnedKey,
  onHoverStart,
  onHoverEnd,
  onTogglePinCard,
}: TableProps) {
  // Preserve exact backend ranking order; only filter when user explicitly searches
  const trimmedQuery = query.trim().toLowerCase();
  const rows = trimmedQuery
    ? state.data.filter((x) => x.player.name.toLowerCase().includes(trimmedQuery))
    : state.data;

  const title = role === 'batting' ? 'Batters' : 'Bowlers';
  const sectionAnchorId = role === 'batting' ? 'top-10-batsmen' : 'top-10-bowlers';

  return (
    <div
      id={sectionAnchorId}
      className="space-y-4 scroll-mt-24"
      data-testid={`rankings-section-${role}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <span className="font-mono-tabular text-xs text-[#1D4ED8]">
            VERIFIED {role.toUpperCase()} EVIDENCE
          </span>
          <h3 className="font-editorial text-2xl sm:text-3xl font-semibold">
            Top 10 {title} Under Pressure
          </h3>
        </div>
        <span className="font-mono-tabular text-[11px] text-[#64748B]">
          Hover any player name for floating profile · Click to pin open
        </span>
      </div>

      {state.loading && (
        <div
          data-testid={`rankings-loading-${role}`}
          className="p-8 border border-[#0A1128]/12 text-sm"
        >
          Loading verified aggregate evidence…
        </div>
      )}

      {state.error && (
        <div
          data-testid={`rankings-error-${role}`}
          className="p-8 border border-red-300 bg-red-50 text-sm text-red-800"
        >
          Ranking data is unavailable: {state.error}
        </div>
      )}

      {!state.loading && !state.error && !rows.length && (
        <div className="p-8 border border-[#0A1128]/12 text-sm">
          No verified players match this search.
        </div>
      )}

      {!state.loading && !state.error && !!rows.length && (
        <div className="overflow-x-auto border border-[#0A1128]/12 bg-[#F7F4EE]">
          <table
            data-testid={`rankings-table-${role}`}
            className="w-full text-left border-collapse"
          >
            <thead>
              <tr className="border-b border-[#0A1128]/12 bg-[#EFECE4] font-mono-tabular text-[11px] text-[#64748B]">
                <th className="py-3 px-4">RANK</th>
                <th className="py-3 px-4">PLAYER</th>
                <th className="py-3 px-4 text-right">SCORE</th>
                <th className="py-3 px-4 text-right">EXPOSURES</th>
                <th className="py-3 px-4 text-right">MATCHES</th>
                <th className="py-3 px-4 text-right">CI HALF-WIDTH</th>
                <th className="py-3 px-4">EVIDENCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0A1128]/8 text-xs sm:text-sm">
              {rows.map((row) => {
                const rowKey = `${role}-${row.player.id}`;
                const isCardOpen = activeHoverKey === rowKey;
                const isPinned = pinnedKey === rowKey;
                const meta = getPlayerProfileMeta(row.player.id, row.player.name, role);
                const initials = getPlayerInitials(row.player.name);

                return (
                  <tr
                    key={rowKey}
                    data-testid={`ranking-row-${role}-${row.rank}`}
                    onClick={(e) => {
                      const trigger = e.currentTarget.querySelector<HTMLElement>(
                        `[data-testid="player-hover-trigger-${role}-${row.rank}"]`
                      );
                      onTogglePinCard(row, trigger || e.currentTarget);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isCardOpen ? 'bg-[#EFECE4]' : 'hover:bg-[#EFECE4]/70'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono-tabular">
                      #{String(row.rank).padStart(2, '0')}
                    </td>
                    <td className="py-2.5 px-4 font-medium">
                      <div className="inline-flex items-center gap-2.5">
                        <button
                          type="button"
                          data-testid={`player-hover-trigger-${role}-${row.rank}`}
                          aria-expanded={isCardOpen}
                          aria-haspopup="dialog"
                          onMouseEnter={(e) => onHoverStart(row, e.currentTarget)}
                          onMouseLeave={onHoverEnd}
                          onFocus={(e) => onHoverStart(row, e.currentTarget)}
                          onBlur={onHoverEnd}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePinCard(row, e.currentTarget);
                          }}
                          className="group inline-flex items-center gap-2.5 text-left font-medium text-[#0A1128] hover:text-[#1D4ED8] focus:text-[#1D4ED8] focus:outline-none transition-colors cursor-pointer"
                        >
                          {/* Verified Calibrated Portrait Thumbnail */}
                          <span
                            data-testid={`player-table-thumb-${role}-${row.rank}`}
                            className={`relative w-8 h-9 shrink-0 rounded overflow-hidden border block ${
                              meta.rrVerified
                                ? 'bg-gradient-to-b from-[#3A1C4A] to-[#0A1128] border-[#EC4899]/50'
                                : 'bg-gradient-to-b from-[#1E293B] to-[#0A1128] border-[#0A1128]/25'
                            }`}
                          >
                            {meta.photoUrl ? (
                              <img
                                src={meta.photoUrl}
                                alt={row.player.name}
                                data-testid={`player-table-img-${role}-${row.rank}`}
                                style={{
                                  objectFit: meta.cropConfig.objectFit,
                                  objectPosition: meta.cropConfig.objectPosition,
                                  transform: `scale(${meta.cropConfig.scale})`,
                                  transformOrigin: meta.cropConfig.transformOrigin,
                                }}
                                className="w-full h-full block select-none"
                              />
                            ) : (
                              <span className="w-full h-full flex items-center justify-center font-mono-tabular text-[10px] text-[#F7F4EE]">
                                <User className="w-3.5 h-3.5 text-[#60A5FA]" />
                                <span className="sr-only">{initials}</span>
                              </span>
                            )}
                          </span>

                          <span className="underline decoration-[#0A1128]/25 group-hover:decoration-[#1D4ED8] underline-offset-4">
                            {row.player.name}
                          </span>
                        </button>

                        {meta.rrVerified && (
                          <span
                            title={meta.rrAssociation}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono-tabular bg-[#EC4899]/12 text-[#BE185D] border border-[#EC4899]/30"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            RR
                          </span>
                        )}

                        {isPinned && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono-tabular bg-[#1D4ED8]/10 text-[#1D4ED8] border border-[#1D4ED8]/30">
                            <Pin className="w-2.5 h-2.5" />
                            PINNED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-[#1D4ED8]">
                      {row.pressure_score.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular">{row.exposures}</td>
                    <td className="py-3 px-4 text-right font-mono-tabular">{row.matches}</td>
                    <td className="py-3 px-4 text-right font-mono-tabular">
                      {row.uncertainty.ci_half_width.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 border border-[#1D4ED8]/30 text-[#1D4ED8]">
                        {row.evidence_level}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const RankingsAndProfilesSection: React.FC = () => {
  const batting: Loadable = { data: approvedRankings.batting, loading: false, error: null };
  const bowling: Loadable = { data: approvedRankings.bowling, loading: false, error: null };
  const [query, setQuery] = useState('');

  // Floating hover & click-to-pin profile state
  const [hoveredRow, setHoveredRow] = useState<Ranking | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const anchorElRef = useRef<HTMLElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  // Cache of /api/v1/players/{id}?role={role}&definition=rules_pressure responses
  const [evidenceCache, setEvidenceCache] = useState<
    Record<string, PlayerEvidenceResponse['data']>
  >({});
  const [loadingEvidenceKey, setLoadingEvidenceKey] = useState<string | null>(null);

  useEffect(() => {
    preloadPlayerPortraits();
  }, []);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const ensurePlayerEvidence = useCallback(
    async (row: Ranking) => {
      const key = `${row.role}-${row.player.id}`;
      if (evidenceCache[key]) return;
      setLoadingEvidenceKey(key);
      try {
        const response = await clutchIqApi.player(row.player.id, row.role);
        setEvidenceCache((prev) => ({ ...prev, [key]: response.data }));
      } catch {
        // Primary evaluation metrics are already present on `row`
      } finally {
        setLoadingEvidenceKey((prev) => (prev === key ? null : prev));
      }
    },
    [evidenceCache]
  );

  const handleHoverStart = useCallback(
    (row: Ranking, anchorEl: HTMLElement) => {
      if (pinnedKey) return;
      clearTimers();
      openTimerRef.current = window.setTimeout(() => {
        anchorElRef.current = anchorEl;
        setAnchorRect(anchorEl.getBoundingClientRect());
        setHoveredRow(row);
        void ensurePlayerEvidence(row);
      }, 75);
    },
    [clearTimers, ensurePlayerEvidence, pinnedKey]
  );

  const handleHoverEnd = useCallback(() => {
    if (pinnedKey) return;
    clearTimers();
    closeTimerRef.current = window.setTimeout(() => {
      setHoveredRow(null);
      setAnchorRect(null);
      anchorElRef.current = null;
    }, 160);
  }, [clearTimers, pinnedKey]);

  const handleCardMouseEnter = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  const handleCardMouseLeave = useCallback(() => {
    handleHoverEnd();
  }, [handleHoverEnd]);

  const handleTogglePinCard = useCallback(
    (row: Ranking, anchorEl: HTMLElement) => {
      clearTimers();
      const key = `${row.role}-${row.player.id}`;
      if (pinnedKey === key) {
        setPinnedKey(null);
        setHoveredRow(null);
        setAnchorRect(null);
        anchorElRef.current = null;
      } else {
        setPinnedKey(key);
        anchorElRef.current = anchorEl;
        setAnchorRect(anchorEl.getBoundingClientRect());
        setHoveredRow(row);
        void ensurePlayerEvidence(row);
      }
    },
    [clearTimers, ensurePlayerEvidence, pinnedKey]
  );

  const handleCloseCard = useCallback(() => {
    clearTimers();
    setPinnedKey(null);
    setHoveredRow(null);
    setAnchorRect(null);
    anchorElRef.current = null;
  }, [clearTimers]);

  // Keep floating card aligned with its anchor on scroll/resize and allow Escape or outside click to dismiss
  useEffect(() => {
    if (!hoveredRow) return;
    const updateRect = () => {
      if (anchorElRef.current) {
        setAnchorRect(anchorElRef.current.getBoundingClientRect());
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseCard();
      }
    };
    const onDocumentPointerDown = (e: MouseEvent) => {
      if (!pinnedKey) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-testid="player-hover-profile-card"]')) return;
      if (target.closest('[data-testid^="ranking-row-"]')) return;
      handleCloseCard();
    };
    window.addEventListener('scroll', updateRect, { passive: true });
    window.addEventListener('resize', updateRect, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onDocumentPointerDown);
    return () => {
      window.removeEventListener('scroll', updateRect);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onDocumentPointerDown);
    };
  }, [hoveredRow, pinnedKey, handleCloseCard]);

  const activeHoverKey = hoveredRow ? `${hoveredRow.role}-${hoveredRow.player.id}` : null;

  return (
    <section
      id="rankings"
      className="relative z-10 py-20 lg:py-28 border-b border-[#0A1128]/12 bg-[#F7F4EE]/90"
    >
      <div className="max-w-[1380px] mx-auto px-6 lg:px-12 space-y-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#0A1128]/12 pb-8">
          <div className="space-y-3">
            <p className="font-mono-tabular text-xs uppercase tracking-widest text-[#1D4ED8]">
              03 / Phase 7A Rankings · Phase 7B Reviewed
            </p>
            <h2 className="font-editorial text-4xl sm:text-5xl font-semibold">
              Top 10 performance evidence under pressure.
            </h2>
          </div>
          <p className="text-sm text-[#334155] max-w-md">
            Aggregate pressure-performance evidence only. Not auction suitability, eligibility, or a
            player dossier.
          </p>
        </div>

        {/* Direct Top 10 Batsmen & Top 10 Bowlers Section Navigation Cards */}
        <div
          data-testid="rankings-direct-jump-bar"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <a
            href="#top-10-batsmen"
            data-testid="jump-card-top-10-batsmen"
            className="group p-4 sm:p-5 bg-[#EFECE4] hover:bg-[#0A1128] text-[#0A1128] hover:text-[#F7F4EE] border border-[#0A1128]/15 hover:border-[#1D4ED8] transition-colors flex items-center justify-between gap-4"
          >
            <div className="space-y-1 min-w-0">
              <div className="font-mono-tabular text-[10px] uppercase tracking-widest text-[#1D4ED8] group-hover:text-[#60A5FA]">
                DIRECT SECTION · BATTING COHORT
              </div>
              <div className="font-editorial text-2xl font-semibold">
                Top 10 Batsmen Under Pressure
              </div>
              <div className="font-mono-tabular text-xs text-[#475569] group-hover:text-[#CBD5E1] truncate">
                {batting.data[0]
                  ? `#01 Leader: ${batting.data[0].player.name} (${batting.data[0].pressure_score.toFixed(2)})`
                  : 'Batting evidence loading or unavailable'}
              </div>
            </div>
            <span className="px-3 py-1.5 bg-[#1D4ED8] text-[#F7F4EE] font-mono-tabular text-xs font-semibold shrink-0">
              View Batsmen ↓
            </span>
          </a>

          <a
            href="#top-10-bowlers"
            data-testid="jump-card-top-10-bowlers"
            className="group p-4 sm:p-5 bg-[#EFECE4] hover:bg-[#0A1128] text-[#0A1128] hover:text-[#F7F4EE] border border-[#0A1128]/15 hover:border-[#1D4ED8] transition-colors flex items-center justify-between gap-4"
          >
            <div className="space-y-1 min-w-0">
              <div className="font-mono-tabular text-[10px] uppercase tracking-widest text-[#1D4ED8] group-hover:text-[#60A5FA]">
                DIRECT SECTION · BOWLING COHORT
              </div>
              <div className="font-editorial text-2xl font-semibold">
                Top 10 Bowlers Under Pressure
              </div>
              <div className="font-mono-tabular text-xs text-[#475569] group-hover:text-[#CBD5E1] truncate">
                {bowling.data[0]
                  ? `#01 Leader: ${bowling.data[0].player.name} (${bowling.data[0].pressure_score.toFixed(2)})`
                  : 'Bowling evidence loading or unavailable'}
              </div>
            </div>
            <span className="px-3 py-1.5 bg-[#1D4ED8] text-[#F7F4EE] font-mono-tabular text-xs font-semibold shrink-0">
              View Bowlers ↓
            </span>
          </a>
        </div>

        <div className="p-5 bg-[#EFECE4] border border-[#0A1128]/12">
          <label
            htmlFor="player-search"
            className="font-mono-tabular text-[11px] text-[#64748B]"
          >
            SEARCH VERIFIED PLAYER
          </label>
          <div className="relative mt-1">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="player-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search player name…"
              className="w-full pl-8 pr-3 py-2 bg-[#F7F4EE] border border-[#0A1128]/15 text-xs"
            />
          </div>
        </div>

        <Table
          role="batting"
          state={batting}
          query={query}
          activeHoverKey={activeHoverKey}
          pinnedKey={pinnedKey}
          onHoverStart={handleHoverStart}
          onHoverEnd={handleHoverEnd}
          onTogglePinCard={handleTogglePinCard}
        />

        <Table
          role="bowling"
          state={bowling}
          query={query}
          activeHoverKey={activeHoverKey}
          pinnedKey={pinnedKey}
          onHoverStart={handleHoverStart}
          onHoverEnd={handleHoverEnd}
          onTogglePinCard={handleTogglePinCard}
        />

        <p className="text-xs font-mono-tabular text-[#64748B]">
          Approved snapshot rankings load instantly. Evidence bands and intervals accompany every result; detailed player evidence connects to the API.
        </p>
      </div>

      {hoveredRow && (
        <PlayerHoverProfileCard
          ranking={hoveredRow}
          anchorRect={anchorRect}
          playerEvidence={
            activeHoverKey ? evidenceCache[activeHoverKey] || null : null
          }
          loadingEvidence={loadingEvidenceKey === activeHoverKey}
          isPinned={Boolean(pinnedKey && pinnedKey === activeHoverKey)}
          onMouseEnterCard={handleCardMouseEnter}
          onMouseLeaveCard={handleCardMouseLeave}
          onClose={handleCloseCard}
        />
      )}
    </section>
  );
};

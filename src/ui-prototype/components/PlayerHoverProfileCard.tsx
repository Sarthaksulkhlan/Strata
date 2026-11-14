import React, { useEffect, useState } from 'react';
import { Pin, ShieldCheck, User, X } from 'lucide-react';
import type { PlayerEvidenceResponse, Ranking } from '../../api/clutchiq';
import {
  buildEvidenceSummary,
  getPlayerInitials,
  getPlayerProfileMeta,
} from '../../lib/playerProfileCatalog';

export interface PlayerHoverProfileCardProps {
  ranking: Ranking;
  anchorRect: DOMRect | null;
  playerEvidence?: PlayerEvidenceResponse['data'] | null;
  loadingEvidence?: boolean;
  isPinned?: boolean;
  onMouseEnterCard: () => void;
  onMouseLeaveCard: () => void;
  onClose: () => void;
}

export const PlayerHoverProfileCard: React.FC<PlayerHoverProfileCardProps> = ({
  ranking,
  anchorRect,
  playerEvidence,
  loadingEvidence = false,
  isPinned = false,
  onMouseEnterCard,
  onMouseLeaveCard,
  onClose,
}) => {
  const meta = getPlayerProfileMeta(ranking.player.id, ranking.player.name, ranking.role);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [ranking.player.id, meta.photoUrl]);

  const showPhoto = Boolean(meta.photoUrl) && !imageError;
  const initials = getPlayerInitials(ranking.player.name);
  const evidenceSummary = buildEvidenceSummary(ranking, playerEvidence?.sensitivity);

  // Compute compact viewport-safe floating position near the hovered player name
  const computePositionStyle = (): React.CSSProperties => {
    const cardWidth = 328;
    const estimatedCardHeight = 352;

    if (typeof window === 'undefined' || !anchorRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: `${cardWidth}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 60,
      };
    }

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const stickyHeaderOffset = 68;

    // Mobile / compact viewport: float cleanly inside the viewport near the tapped player
    if (viewportW < 768) {
      const mobileWidth = Math.min(viewportW - 24, 328);
      const left = Math.max(12, Math.round((viewportW - mobileWidth) / 2));
      const spaceBelow = viewportH - anchorRect.bottom - 12;
      const top =
        spaceBelow >= estimatedCardHeight
          ? Math.round(anchorRect.bottom + 8)
          : Math.max(
              stickyHeaderOffset,
              Math.min(
                Math.round(anchorRect.top - estimatedCardHeight - 8),
                viewportH - estimatedCardHeight - 12
              )
            );
      return {
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${mobileWidth}px`,
        zIndex: 60,
      };
    }

    const horizontalGap = 14;
    let left = Math.round(anchorRect.right + horizontalGap);
    if (left + cardWidth > viewportW - 16) {
      const leftCandidate = Math.round(anchorRect.left - cardWidth - horizontalGap);
      if (leftCandidate >= 16) {
        left = leftCandidate;
      } else {
        left = Math.max(16, viewportW - cardWidth - 16);
      }
    }

    let top = Math.round(anchorRect.top - 12);
    if (top + estimatedCardHeight > viewportH - 12) {
      top = Math.max(stickyHeaderOffset, viewportH - estimatedCardHeight - 12);
    }
    if (top < stickyHeaderOffset) {
      top = stickyHeaderOffset;
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
      zIndex: 60,
    };
  };

  const rateLabel = ranking.role === 'batting' ? 'RAW SR' : 'RAW ECON';
  const primaryCountLabel = ranking.role === 'batting' ? 'RUNS / OUT' : 'WKTS / RUNS';
  const primaryCountValue =
    ranking.role === 'batting'
      ? `${ranking.runs} / ${ranking.wickets}`
      : `${ranking.wickets}W / ${ranking.runs}R`;

  return (
    <aside
      role="dialog"
      aria-label={`${ranking.player.name} pressure profile card`}
      data-testid="player-hover-profile-card"
      data-player-id={ranking.player.id}
      data-player-role={ranking.role}
      data-pinned={isPinned ? 'true' : 'false'}
      style={computePositionStyle()}
      onMouseEnter={onMouseEnterCard}
      onMouseLeave={onMouseLeaveCard}
      className="overflow-hidden bg-[#0A1128] text-[#F7F4EE] border border-[#1D4ED8]/70 shadow-[0_20px_50px_rgba(10,17,40,0.65)] rounded-md transition-opacity duration-150"
    >
      {/* Compact Top Authority Strip */}
      <div className="flex items-center justify-between gap-1.5 px-3 py-1.5 bg-[#111C3D] border-b border-[#F7F4EE]/12">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            data-testid="hover-card-rank-badge"
            className="px-1.5 py-0.5 bg-[#1D4ED8] text-[#F7F4EE] font-mono-tabular text-[10px] font-semibold tracking-wider shrink-0"
          >
            RANK #{String(ranking.rank).padStart(2, '0')} · {ranking.role.toUpperCase()}
          </span>
          <span className="font-mono-tabular text-[9px] uppercase tracking-wider text-[#93C5FD] truncate">
            {ranking.evidence_level.toUpperCase()} EVIDENCE
          </span>
          {isPinned && (
            <span
              data-testid="hover-card-pinned-badge"
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#EC4899]/20 border border-[#EC4899]/40 text-[#F9A8D4] font-mono-tabular text-[8.5px] uppercase tracking-wider shrink-0"
            >
              <Pin className="w-2.5 h-2.5" />
              PINNED
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close player profile card"
          data-testid="hover-card-close-btn"
          className="p-0.5 text-[#94A3B8] hover:text-[#F7F4EE] transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Top Section: Portrait Photograph (Full Facial Visibility) + Identity + RR Association */}
        <div className="flex items-start gap-2.5">
          <div
            data-testid="hover-card-photo-container"
            className={`relative w-16 h-[72px] shrink-0 rounded border overflow-hidden ${
              meta.rrVerified
                ? 'bg-gradient-to-b from-[#3A1C4A] to-[#0A1128] border-[#EC4899]/45'
                : 'bg-gradient-to-b from-[#1E293B] to-[#0A1128] border-[#F7F4EE]/20'
            }`}
          >
            {showPhoto ? (
              <img
                src={meta.photoUrl!}
                alt={`${ranking.player.name} verified cricket portrait`}
                data-testid="hover-card-player-photo"
                onError={() => setImageError(true)}
                style={{
                  objectFit: meta.cropConfig.objectFit,
                  objectPosition: meta.cropConfig.objectPosition,
                  transform: `scale(${meta.cropConfig.scale})`,
                  transformOrigin: meta.cropConfig.transformOrigin,
                }}
                className="w-full h-full block select-none"
              />
            ) : (
              <div
                data-testid="hover-card-photo-placeholder"
                className="w-full h-full flex flex-col items-center justify-center p-1.5 text-center"
              >
                <User className="w-4 h-4 text-[#60A5FA] mb-0.5" />
                <span className="font-mono-tabular text-[10px] font-semibold text-[#F7F4EE]">
                  {initials}
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono-tabular text-[9px] uppercase tracking-wider text-[#60A5FA] truncate">
                ID #{ranking.player.id} · {ranking.definition}
              </span>
            </div>
            <h4
              data-testid="hover-card-player-name"
              className="font-editorial text-lg font-semibold leading-tight text-[#F7F4EE] truncate"
            >
              {ranking.player.name}
            </h4>
            <p
              data-testid="hover-card-player-role"
              className="text-[11px] text-[#CBD5E1] leading-tight truncate"
            >
              {meta.shortRole}
            </p>
            <div
              data-testid="hover-card-rr-association"
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[9px] font-mono-tabular leading-tight max-w-full ${
                meta.rrVerified
                  ? 'bg-[#EC4899]/15 border-[#EC4899]/50 text-[#F9A8D4]'
                  : 'bg-[#1E293B]/80 border-[#F7F4EE]/15 text-[#94A3B8]'
              }`}
            >
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span className="truncate">{meta.rrAssociation}</span>
            </div>
          </div>
        </div>

        {/* Performance Section: Compact 3x2 STRATA Pressure Metrics Grid */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="px-2 py-1.5 bg-[#111C3D] border border-[#F7F4EE]/10">
            <div className="font-mono-tabular text-[8.5px] uppercase tracking-wider text-[#94A3B8]">
              PRESSURE SCORE
            </div>
            <div
              data-testid="hover-card-pressure-score"
              className="font-mono-tabular text-sm font-bold text-[#60A5FA] leading-snug"
            >
              {ranking.pressure_score.toFixed(2)}
            </div>
            <div className="font-mono-tabular text-[8.5px] text-[#94A3B8]">
              Shrink {(ranking.shrink_weight * 100).toFixed(0)}%
            </div>
          </div>

          <div className="px-2 py-1.5 bg-[#111C3D] border border-[#F7F4EE]/10">
            <div className="font-mono-tabular text-[8.5px] uppercase tracking-wider text-[#94A3B8]">
              95% CI BAND
            </div>
            <div className="font-mono-tabular text-[11px] font-semibold text-[#F7F4EE] leading-snug">
              {ranking.uncertainty.ci95_low.toFixed(1)}–{ranking.uncertainty.ci95_high.toFixed(1)}
            </div>
            <div className="font-mono-tabular text-[8.5px] text-[#94A3B8]">
              ±{ranking.uncertainty.ci_half_width.toFixed(2)} width
            </div>
          </div>

          <div className="px-2 py-1.5 bg-[#111C3D] border border-[#F7F4EE]/10">
            <div className="font-mono-tabular text-[8.5px] uppercase tracking-wider text-[#94A3B8]">
              SAMPLE VOLUME
            </div>
            <div className="font-mono-tabular text-[11px] font-semibold text-[#F7F4EE] leading-snug">
              {ranking.exposures}b · {ranking.matches}m
            </div>
            <div className="font-mono-tabular text-[8.5px] text-[#94A3B8]">
              {ranking.seasons} {ranking.seasons === 1 ? 'season' : 'seasons'}
            </div>
          </div>

          <div className="px-2 py-1 bg-[#0F172A] border border-[#F7F4EE]/10">
            <div className="font-mono-tabular text-[8.5px] uppercase tracking-wider text-[#94A3B8]">
              {primaryCountLabel}
            </div>
            <div className="font-mono-tabular text-[11px] font-semibold text-[#F7F4EE]">
              {primaryCountValue}
            </div>
          </div>

          <div className="px-2 py-1 bg-[#0F172A] border border-[#F7F4EE]/10">
            <div className="font-mono-tabular text-[8.5px] uppercase tracking-wider text-[#94A3B8]">
              {rateLabel}
            </div>
            <div className="font-mono-tabular text-[11px] font-semibold text-[#F7F4EE]">
              {ranking.rate.toFixed(2)}
            </div>
          </div>

          <div className="px-2 py-1 bg-[#0F172A] border border-[#F7F4EE]/10">
            <div className="font-mono-tabular text-[8.5px] uppercase tracking-wider text-[#94A3B8]">
              EB ADJ RATE
            </div>
            <div className="font-mono-tabular text-[11px] font-semibold text-[#F7F4EE]">
              {ranking.adjusted_rate.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Single-Line Definition Sensitivity Row */}
        {playerEvidence?.sensitivity && playerEvidence.sensitivity.length > 0 && (
          <div
            data-testid="hover-card-sensitivity-row"
            className="flex items-center justify-between gap-1 px-2 py-1 bg-[#111C3D]/80 border border-[#F7F4EE]/10 font-mono-tabular text-[9px]"
          >
            <span className="text-[#93C5FD] uppercase shrink-0">SENSITIVITY</span>
            <div className="flex items-center gap-1.5 truncate">
              {playerEvidence.sensitivity.map((item) => (
                <span key={item.definition} className="text-[#E2E8F0]">
                  <span className="text-[#94A3B8]">{item.definition.replace('rules_', '')}:</span>{' '}
                  <strong className="text-[#F7F4EE]">#{String(item.rank).padStart(2, '0')}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
        {loadingEvidence && !playerEvidence && (
          <div className="px-2 py-1 bg-[#111C3D]/50 border border-[#F7F4EE]/10 font-mono-tabular text-[9px] text-[#94A3B8]">
            Syncing sensitivity definitions…
          </div>
        )}

        {/* Bottom Section: Concise Evidence-Based Performance Summary */}
        <div className="px-2.5 py-1.5 bg-[#111C3D]/90 border-l-2 border-[#60A5FA]">
          <p
            data-testid="hover-card-evidence-summary"
            className="text-[10.5px] text-[#E2E8F0] leading-snug"
          >
            {evidenceSummary}
          </p>
        </div>
      </div>
    </aside>
  );
};

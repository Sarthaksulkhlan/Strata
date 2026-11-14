import type { PlayerEvidenceResponse, Ranking, Role } from '../api/clutchiq';

export interface PlayerPhotoCropConfig {
  objectFit: 'cover' | 'contain';
  objectPosition: string;
  scale: number;
  transformOrigin: string;
}

export interface VerifiedPlayerProfileMeta {
  playerId: number;
  playerName: string;
  roleLabel: string;
  shortRole: string;
  rrVerified: boolean;
  rrJerseyPhoto: boolean;
  rrAssociation: string;
  photoUrl: string | null;
  /**
   * Preserved alias for backwards compatibility with existing callers/tests.
   */
  rrJerseyPhotoUrl: string | null;
  cropConfig: PlayerPhotoCropConfig;
}

interface CatalogEntry {
  playerName: string;
  shortRole: string;
  roleSpecification: string;
  rrVerified: boolean;
  rrJerseyPhoto: boolean;
  rrAssociation: string;
  photoUrl: string;
  cropConfig: PlayerPhotoCropConfig;
}

const DEFAULT_CROP_CONFIG: PlayerPhotoCropConfig = {
  objectFit: 'cover',
  objectPosition: '50% 12%',
  scale: 1.04,
  transformOrigin: '50% 12%',
};

/**
 * Central verified player photograph & profile metadata catalog indexed by
 * authoritative STRATA production player ID (covering all 19 unique players
 * across Top 10 Batters and Top 10 Bowlers).
 *
 * Every photograph has been visually inspected to ensure:
 * - Authentic identity (never a different player or AI-generated image)
 * - Official Rajasthan Royals jersey portrait where available
 * - Calibrated head-and-shoulders framing so the entire face, forehead, and chin are visible
 */
export const VERIFIED_PLAYER_CATALOG: Record<number, CatalogEntry> = {
  // === TOP 10 BATTERS ===
  152: {
    playerName: 'Ravindra Jadeja',
    shortRole: 'All-Rounder · LHB / SLA Spin',
    roleSpecification: 'All-Rounder · Left-Hand Bat / Slow Left-Arm Orthodox',
    rrVerified: true,
    rrJerseyPhoto: true,
    rrAssociation: 'Rajasthan Royals · IPL 2008–09, 2026',
    photoUrl: '/assets/players/player_152_ravindra_jadeja.png',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 0%',
      scale: 1.62,
      transformOrigin: '50% 3%',
    },
  },
  6460: {
    playerName: 'Ayush Badoni',
    shortRole: 'Finisher · RHB / Off-Spin',
    roleSpecification: 'Middle-Order Finisher · Right-Hand Bat / Off-Break',
    rrVerified: false,
    rrJerseyPhoto: false,
    rrAssociation: 'Lucknow Super Giants · T20 Cohort',
    photoUrl: '/assets/players/player_6460_ayush_badoni.png',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 0%',
      scale: 1.58,
      transformOrigin: '50% 3%',
    },
  },
  4260: {
    playerName: 'Heinrich Klaasen',
    shortRole: 'WK-Batter · Right-Hand Bat',
    roleSpecification: 'Wicketkeeper-Batter · Right-Hand Middle-Order Power Hitter',
    rrVerified: true,
    rrJerseyPhoto: false,
    rrAssociation: 'Rajasthan Royals · IPL 2018 Stint',
    photoUrl: '/assets/players/player_4260_heinrich_klaasen.png',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 100%',
      scale: 1.05,
      transformOrigin: '50% 50%',
    },
  },
  2984: {
    playerName: 'Sikandar Raza',
    shortRole: 'All-Rounder · RHB / Off-Spin',
    roleSpecification: 'Batting All-Rounder · Right-Hand Bat / Right-Arm Off-Spin',
    rrVerified: false,
    rrJerseyPhoto: false,
    rrAssociation: 'Zimbabwe / PBKS · T20 Cohort',
    photoUrl: '/assets/players/player_2984_sikandar_raza.png',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 0%',
      scale: 1.55,
      transformOrigin: '50% 3%',
    },
  },
  4101: {
    playerName: 'Mitchell Santner',
    shortRole: 'All-Rounder · LHB / SLA Spin',
    roleSpecification: 'Spin Bowling All-Rounder · Left-Hand Bat / Slow Left-Arm Orthodox',
    rrVerified: false,
    rrJerseyPhoto: false,
    rrAssociation: 'New Zealand / MI · Dual Top-10',
    photoUrl: '/assets/players/player_4101_mitchell_santner.png',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 0%',
      scale: 1.66,
      transformOrigin: '48% 5%',
    },
  },
  7897: {
    playerName: 'Namboori Tilak Varma',
    shortRole: 'Middle-Order Batter · LHB',
    roleSpecification: 'Middle-Order Batter · Left-Hand Bat / Part-Time Off-Spin',
    rrVerified: false,
    rrJerseyPhoto: false,
    rrAssociation: 'India / Mumbai Indians · T20 Cohort',
    photoUrl: '/assets/players/player_7897_tilak_varma.png',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 0%',
      scale: 1.58,
      transformOrigin: '50% 3%',
    },
  },
  2490: {
    playerName: 'Mohammad Nawaz',
    shortRole: 'All-Rounder · LHB / SLA Spin',
    roleSpecification: 'All-Rounder · Left-Hand Bat / Slow Left-Arm Orthodox',
    rrVerified: false,
    rrJerseyPhoto: false,
    rrAssociation: 'Pakistan Int’l · T20 Pressure Cohort',
    photoUrl: '/assets/players/player_2490_mohammad_nawaz.png',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 100%',
      scale: 1.05,
      transformOrigin: '50% 50%',
    },
  },
  4986: {
    playerName: 'Rovman Powell',
    shortRole: 'Power Finisher · RHB / Pace',
    roleSpecification: 'Middle-Order Power Batter · Right-Hand Bat / Medium-Fast',
    rrVerified: true,
    rrJerseyPhoto: true,
    rrAssociation: 'Rajasthan Royals · IPL 2024 Stint',
    photoUrl: '/assets/players/player_4986_rovman_powell.png',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 0%',
      scale: 1.58,
      transformOrigin: '50% 3%',
    },
  },
  21790: {
    playerName: 'Tashinga Musekiwa',
    shortRole: 'Death-Overs Finisher · RHB',
    roleSpecification: 'Middle-Order Batter · Right-Hand Death-Overs Finisher',
    rrVerified: false,
    rrJerseyPhoto: false,
    rrAssociation: 'Zimbabwe Int’l · T20 Pressure Cohort',
    photoUrl: '/assets/players/player_21790_tashinga_musekiwa.png',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 100%',
      scale: 1.05,
      transformOrigin: '50% 50%',
    },
  },
  20702: {
    playerName: 'Tristan Stubbs',
    shortRole: 'WK-Finisher · Right-Hand Bat',
    roleSpecification: 'Wicketkeeper-Batter · Right-Hand Finisher / Off-Break',
    rrVerified: false,
    rrJerseyPhoto: false,
    rrAssociation: 'South Africa / DC · T20 Cohort',
    photoUrl: '/assets/players/player_20702_tristan_stubbs.png',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 0%',
      scale: 1.58,
      transformOrigin: '50% 3%',
    },
  },

  // === TOP 10 BOWLERS ===
  4692: {
    playerName: 'Lockie Ferguson',
    shortRole: 'Express Pace · Right-Arm Fast',
    roleSpecification: 'Strike Pace Bowler · Right-Arm Express Fast',
    rrVerified: false,
    rrJerseyPhoto: false,
    rrAssociation: 'New Zealand / PBKS · T20 Cohort',
    photoUrl: '/assets/players/player_4692_lockie_ferguson.png',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 0%',
      scale: 1.56,
      transformOrigin: '50% 3%',
    },
  },
  781: {
    playerName: 'Sunil Narine',
    shortRole: 'Mystery Spin · Off-Break / LHB',
    roleSpecification: 'Spin All-Rounder · Right-Arm Mystery Off-Break / LHB',
    rrVerified: false,
    rrJerseyPhoto: false,
    rrAssociation: 'West Indies / KKR · T20 Cohort',
    photoUrl: '/assets/players/player_781_sunil_narine.png',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 0%',
      scale: 1.58,
      transformOrigin: '50% 3%',
    },
  },
  2417: {
    playerName: 'Akeal Hosein',
    shortRole: 'Control Spin · Slow Left-Arm',
    roleSpecification: 'Control & Powerplay Spinner · Slow Left-Arm Orthodox',
    rrVerified: false,
    rrJerseyPhoto: false,
    rrAssociation: 'West Indies Int’l · T20 Cohort',
    photoUrl: '/assets/players/player_2417_mykhel.webp',
    cropConfig: {
      objectFit: 'cover',
      objectPosition: '50% 14%',
      scale: 1.02,
      transformOrigin: '50% 20%',
    },
  },
  2633: {
    playerName: 'Jason Holder',
    shortRole: 'All-Rounder · Right-Arm Fast-Med',
    roleSpecification: 'Bowling All-Rounder · Right-Arm Fast-Medium / RHB',
    rrVerified: true,
    rrJerseyPhoto: true,
    rrAssociation: 'Rajasthan Royals · IPL 2023 Stint',
    photoUrl: '/assets/players/player_2633_jason_holder.png',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 0%',
      scale: 1.58,
      transformOrigin: '50% 3%',
    },
  },
  4373: {
    playerName: 'Mustafizur Rahman',
    shortRole: 'Pace · Left-Arm Fast-Medium',
    roleSpecification: 'Death-Overs Specialist · Left-Arm Fast-Medium Cutters',
    rrVerified: true,
    rrJerseyPhoto: true,
    rrAssociation: 'Rajasthan Royals · IPL 2021 Stint',
    photoUrl: '/assets/players/player_4373_mustafizur_rahman_solo.jpg',
    cropConfig: {
      objectFit: 'cover',
      objectPosition: '50% 10%',
      scale: 1.0,
      transformOrigin: '50% 15%',
    },
  },
  5979: {
    playerName: 'Abrar Ahmed',
    shortRole: 'Mystery Spin · Leg-Break Googly',
    roleSpecification: 'Spin Bowler · Right-Arm Mystery Leg-Break / Googly',
    rrVerified: false,
    rrJerseyPhoto: false,
    rrAssociation: 'Pakistan Int’l · T20 Pressure Cohort',
    photoUrl: '/assets/players/player_5979_abrar_ahmed.png',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 100%',
      scale: 1.05,
      transformOrigin: '50% 50%',
    },
  },
  8661: {
    playerName: 'Matheesha Pathirana',
    shortRole: 'Death Pace · Right-Arm Sling Fast',
    roleSpecification: 'Death-Overs Specialist · Right-Arm Sling-Action Fast',
    rrVerified: false,
    rrJerseyPhoto: false,
    rrAssociation: 'Sri Lanka / CSK · T20 Cohort',
    photoUrl: '/assets/players/player_8661_mykhel.webp',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 100%',
      scale: 1.04,
      transformOrigin: '50% 50%',
    },
  },
  5944: {
    playerName: 'Mohammed Siraj',
    shortRole: 'Strike Pace · Right-Arm Fast',
    roleSpecification: 'Strike Seam Bowler · Right-Arm Fast',
    rrVerified: false,
    rrJerseyPhoto: false,
    rrAssociation: 'India / Gujarat Titans · T20 Cohort',
    photoUrl: '/assets/players/player_5944_mohammed_siraj.png',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 0%',
      scale: 1.58,
      transformOrigin: '50% 3%',
    },
  },
  2382: {
    playerName: 'Jamie Overton',
    shortRole: 'All-Rounder · Right-Arm Fast',
    roleSpecification: 'Bowling All-Rounder · Right-Arm Fast / Right-Hand Bat',
    rrVerified: false,
    rrJerseyPhoto: false,
    rrAssociation: 'England / CSK · T20 Cohort',
    photoUrl: '/assets/players/player_2382_mykhel.webp',
    cropConfig: {
      objectFit: 'contain',
      objectPosition: '50% 100%',
      scale: 1.04,
      transformOrigin: '50% 50%',
    },
  },
};

const preloadedUrls = new Set<string>();

/**
 * Preloads all 19 verified player portraits into browser memory so hover cards
 * and table thumbnails render with zero network flicker.
 */
export function preloadPlayerPortraits(): void {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return;
  for (const entry of Object.values(VERIFIED_PLAYER_CATALOG)) {
    if (entry.photoUrl && !preloadedUrls.has(entry.photoUrl)) {
      preloadedUrls.add(entry.photoUrl);
      const img = new Image();
      img.src = entry.photoUrl;
    }
  }
}

export function getPlayerProfileMeta(
  playerId: number,
  playerName: string,
  role: Role
): VerifiedPlayerProfileMeta {
  const defaultRolePrefix = role === 'batting' ? 'Batting' : 'Bowling';

  const entry = VERIFIED_PLAYER_CATALOG[playerId];
  if (entry) {
    return {
      playerId,
      playerName: playerName || entry.playerName,
      roleLabel: `${defaultRolePrefix} · ${entry.roleSpecification}`,
      shortRole: entry.shortRole,
      rrVerified: entry.rrVerified,
      rrJerseyPhoto: entry.rrJerseyPhoto,
      rrAssociation: entry.rrAssociation,
      photoUrl: entry.photoUrl,
      rrJerseyPhotoUrl: entry.photoUrl,
      cropConfig: entry.cropConfig,
    };
  }

  return {
    playerId,
    playerName,
    roleLabel: `${defaultRolePrefix} · Pressure Evaluation`,
    shortRole: `${defaultRolePrefix} · Pressure Evaluation`,
    rrVerified: false,
    rrJerseyPhoto: false,
    rrAssociation: 'STRATA Verified Pressure Cohort',
    photoUrl: null,
    rrJerseyPhotoUrl: null,
    cropConfig: DEFAULT_CROP_CONFIG,
  };
}

export function getPlayerInitials(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Generates a concise, factual, evidence-based performance summary derived strictly
 * from the authoritative STRATA production backend fields so it fits cleanly inside
 * the compact 320px floating profile card without scrolling.
 */
export function buildEvidenceSummary(
  ranking: Ranking,
  sensitivity?: PlayerEvidenceResponse['data']['sensitivity']
): string {
  const rankFormatted = `#${String(ranking.rank).padStart(2, '0')}`;
  const roleNoun = ranking.role === 'batting' ? 'batting' : 'bowling';
  const primaryOutcomeText =
    ranking.role === 'batting'
      ? `${ranking.runs} runs (${ranking.wickets} out) at ${ranking.rate.toFixed(2)} raw / ${ranking.adjusted_rate.toFixed(2)} EB-adj rate`
      : `${ranking.wickets}W for ${ranking.runs}R at ${ranking.rate.toFixed(2)} raw / ${ranking.adjusted_rate.toFixed(2)} EB-adj rate`;

  const shrinkPct = `${(ranking.shrink_weight * 100).toFixed(0)}%`;

  let sensitivityText = '';
  if (sensitivity && sensitivity.length > 1) {
    const altRanks = sensitivity
      .map((s) => `${s.definition.replace('rules_', '')}: #${s.rank}`)
      .join(', ');
    sensitivityText = ` Sensitivity (${altRanks}).`;
  }

  return `${rankFormatted} ${roleNoun} (${ranking.evidence_level} evidence, score ${ranking.pressure_score.toFixed(2)}, shrink ${shrinkPct}) across ${ranking.exposures} balls in ${ranking.matches} matches: ${primaryOutcomeText}.${sensitivityText}`;
}

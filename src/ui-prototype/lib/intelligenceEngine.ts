import {
  BatsmanEvaluation,
  BowlerEvaluation,
  MatchPhase,
  MatchScenarioPreset,
  TYPOMETER_STAGES,
} from '../data/mockCricketData';

export interface ChapterScrollState {
  activeChapterIndex: 0 | 1 | 2 | 3;
  milestonePct: 25 | 50 | 75 | 100;
  verticalLineScale: number;
  normalizedProgress: number;
  chapterLocalProgress: number;
  explosionFactor: number;
  coreGlow: number;
  ringTiltRadians: number;
  targetRotationY: number;
  latticeSpread: number;
  // Continuous Data Landscape weights (0.0 to 1.0)
  streamConvergence: number;
  contextDensity: number;
  pressureIntensity: number;
  intelligenceAlignment: number;
}

/**
 * Pure calculation mapping continuous scroll progress [0, 1] across the 4-stop storytelling track
 * into active chapter index, 25%/50%/75%/100% milestone, vertical progress line scale, and
 * continuous Data Landscape evolution weights.
 */
export function computeChapterFromProgress(rawProgress: number): ChapterScrollState {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(rawProgress) ? rawProgress : 0));

  let activeChapterIndex: 0 | 1 | 2 | 3 = 0;
  let milestonePct: 25 | 50 | 75 | 100 = 25;
  if (clamped >= 0.75) {
    activeChapterIndex = 3;
    milestonePct = 100;
  } else if (clamped >= 0.5) {
    activeChapterIndex = 2;
    milestonePct = 75;
  } else if (clamped >= 0.25) {
    activeChapterIndex = 1;
    milestonePct = 50;
  } else {
    activeChapterIndex = 0;
    milestonePct = 25;
  }

  const chapterStart = activeChapterIndex * 0.25;
  const chapterLocalProgress = Math.max(
    0,
    Math.min(1, (clamped - chapterStart) / 0.25)
  );

  // Smooth vertical progress line scale starting at 0.25 (Stage 1) and reaching 1.00 (Stage 4)
  const verticalLineScale = Number((0.25 + clamped * 0.75).toFixed(4));

  const explosionKeyframes = [0.04, 0.46, 0.88, 0.32];
  const glowKeyframes = [0.22, 0.52, 1.0, 0.78];
  const tiltKeyframes = [0.18, 0.68, 1.12, 0.42];
  const spreadKeyframes = [1.0, 1.35, 1.65, 1.18];

  const nextIdx = Math.min(3, activeChapterIndex + 1);
  const blend = activeChapterIndex === 3 ? 0 : chapterLocalProgress * 0.45;

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const smoothstep = (min: number, max: number, value: number) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  };

  // Continuous stage evolution curves for the Data Landscape
  const streamConvergence = Number(smoothstep(0.0, 0.35, clamped).toFixed(4));
  const contextDensity = Number(smoothstep(0.18, 0.55, clamped).toFixed(4));
  // Pressure peaks in Stage 3 (0.50 - 0.75) and stays embedded in Stage 4
  const pressureIntensity = Number(
    (smoothstep(0.42, 0.68, clamped) * (1 - 0.35 * smoothstep(0.76, 0.96, clamped))).toFixed(4)
  );
  const intelligenceAlignment = Number(smoothstep(0.68, 0.94, clamped).toFixed(4));

  return {
    activeChapterIndex,
    milestonePct,
    verticalLineScale,
    normalizedProgress: Number(clamped.toFixed(4)),
    chapterLocalProgress: Number(chapterLocalProgress.toFixed(4)),
    explosionFactor: Number(
      lerp(explosionKeyframes[activeChapterIndex], explosionKeyframes[nextIdx], blend).toFixed(4)
    ),
    coreGlow: Number(
      lerp(glowKeyframes[activeChapterIndex], glowKeyframes[nextIdx], blend).toFixed(4)
    ),
    ringTiltRadians: Number(
      lerp(tiltKeyframes[activeChapterIndex], tiltKeyframes[nextIdx], blend).toFixed(4)
    ),
    targetRotationY: Number((0.35 + clamped * Math.PI * 1.65).toFixed(4)),
    latticeSpread: Number(
      lerp(spreadKeyframes[activeChapterIndex], spreadKeyframes[nextIdx], blend).toFixed(4)
    ),
    streamConvergence,
    contextDensity,
    pressureIntensity,
    intelligenceAlignment,
  };
}

export interface BackgroundRibbonState {
  progress: number;
  direction: 'down' | 'up';
  flowSign: 1 | -1;
  initialAlignment: number; // Beginning (p ~ 0): vertical lines are organised, aligned & straight
  stage1Overlap: number; // Stage 1 (p ~ 0.18..0.38): vertical lines begin moving and overlapping
  entanglement: number; // Stage 2 (p ~ 0.38..0.64): lines intertwine and form a complex tangled 3D structure
  stage3Opening: number; // Stage 3 (p ~ 0.62..0.84): tangled structure starts opening and separating
  reorganisation: number; // Stage 4 (p ~ 0.80..1.00): lines become organised again into a clear resolved structure
  spreadAmplitude: number;
}

/**
 * Pure reversible calculation for the 3D vertical background lines and interconnected nodes.
 * Because it is a continuous function of scroll progress, scrolling UP naturally reverses
 * the 5-phase transformation (Resolved -> Opening -> Tangled -> Overlapping -> Straight).
 */
export function computeBackgroundRibbonState(
  rawProgress: number,
  direction: 'down' | 'up' = 'down'
): BackgroundRibbonState {
  const p = Math.max(0, Math.min(1, Number.isFinite(rawProgress) ? rawProgress : 0));
  const smoothstep = (min: number, max: number, value: number) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  };

  // Beginning (0.00 -> 0.25): Straight aligned vertical lines
  const initialAlignment = Number((1 - smoothstep(0.02, 0.28, p)).toFixed(4));

  // Stage 1 (0.08 -> 0.42): Lines begin moving laterally and overlapping
  const stage1Overlap = Number(
    (smoothstep(0.04, 0.24, p) * (1 - smoothstep(0.32, 0.54, p))).toFixed(4)
  );

  // Stage 2 (0.22 -> 0.72): Lines intertwine and form a complex tangled structure (peaks ~0.46)
  const rise = smoothstep(0.14, 0.44, p);
  const untangle = 1 - smoothstep(0.54, 0.86, p);
  const entanglement = Number((rise * untangle).toFixed(4));

  // Stage 3 (0.52 -> 0.88): Tangled structure starts opening and separating
  const stage3Opening = Number(
    (smoothstep(0.48, 0.68, p) * (1 - smoothstep(0.76, 0.94, p))).toFixed(4)
  );

  // Stage 4 (0.72 -> 1.00): Lines become organised again into a clear resolved structure
  const reorganisation = Number(smoothstep(0.68, 0.96, p).toFixed(4));

  const spreadAmplitude = Number(
    (
      0.08 +
      stage1Overlap * 0.42 +
      entanglement * 0.92 +
      stage3Opening * 0.55 +
      reorganisation * 0.18
    ).toFixed(4)
  );

  return {
    progress: Number(p.toFixed(4)),
    direction,
    flowSign: direction === 'up' ? -1 : 1,
    initialAlignment,
    stage1Overlap,
    entanglement,
    stage3Opening,
    reorganisation,
    spreadAmplitude,
  };
}

export interface TypometerMetrics {
  calibrationPct: number;
  milestonePct: 25 | 50 | 75 | 100;
  stageIndex: 0 | 1 | 2 | 3;
  stageCode:
    | '25% — RAW'
    | '50% — CONTEXT'
    | '75% — PRESSURE'
    | '100% — INTELLIGENCE';
  stageShortName: 'RAW' | 'CONTEXT' | 'PRESSURE' | 'INTELLIGENCE';
  stageTitle: string;
  highlightedWord: string;
  supportingHeadline: string;
  supportingDescription: string;
  opticalScalePt: number;
  trackingEm: number;
  signalToNoiseDb: number;
  varianceBandPct: number;
  convictionScore: number;
  activeEvidenceLabel: string;
}

/**
 * Pure calculation for the STRATA Interactive Typometer Experience around:
 * "Where raw cricket records crystallize into conviction."
 * Maps any percentage [0..100] to one of the 4 stages:
 * 25% — RAW, 50% — CONTEXT, 75% — PRESSURE, 100% — INTELLIGENCE.
 */
export function computeTypometerMetrics(rawCalibrationPct: number): TypometerMetrics {
  const pct = Math.max(
    0,
    Math.min(100, Number.isFinite(rawCalibrationPct) ? rawCalibrationPct : 0)
  );
  const norm = pct / 100;

  let stageIndex: 0 | 1 | 2 | 3 = 0;
  if (pct >= 85) {
    stageIndex = 3;
  } else if (pct >= 62) {
    stageIndex = 2;
  } else if (pct >= 37) {
    stageIndex = 1;
  } else {
    stageIndex = 0;
  }

  const spec = TYPOMETER_STAGES[stageIndex];

  return {
    calibrationPct: Math.round(pct),
    milestonePct: spec.pct,
    stageIndex,
    stageCode: spec.code,
    stageShortName: spec.shortName,
    stageTitle: spec.narrativeChainLabel,
    highlightedWord: spec.highlightedWord,
    supportingHeadline: spec.supportingHeadline,
    supportingDescription: spec.supportingDescription,
    opticalScalePt: Number((18 + norm * 54).toFixed(1)),
    trackingEm: Number((0.08 - norm * 0.1).toFixed(3)),
    signalToNoiseDb: Number((6.4 + norm * 31.8).toFixed(1)),
    varianceBandPct: Number((34.0 - norm * 29.8).toFixed(1)),
    convictionScore: Number((42.0 + norm * 54.4).toFixed(1)),
    activeEvidenceLabel: spec.evidenceSignal,
  };
}

export type BatsmanSortField =
  | 'pressureRating'
  | 'controlPctUnderPressure'
  | 'strikeRateUnderPressure'
  | 'boundaryResilience';

export function filterAndRankBatsmen(
  players: BatsmanEvaluation[],
  phase: MatchPhase,
  minPressureRating: number,
  searchQuery: string,
  sortBy: BatsmanSortField = 'pressureRating'
): BatsmanEvaluation[] {
  const q = searchQuery.trim().toLowerCase();

  const filtered = players.filter((p) => {
    const matchesPhase = phase === 'all' || p.primaryPhase === phase;
    const effectiveRating =
      phase === 'all' ? p.pressureRating : p.phaseRatings[phase];
    const matchesThreshold = effectiveRating >= minPressureRating;
    const matchesQuery =
      q.length === 0 ||
      p.archetypeName.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q);
    return matchesPhase && matchesThreshold && matchesQuery;
  });

  return [...filtered].sort((a, b) => {
    if (sortBy === 'pressureRating' && phase !== 'all') {
      return b.phaseRatings[phase] - a.phaseRatings[phase];
    }
    return b[sortBy] - a[sortBy];
  });
}

export type BowlerSortField =
  | 'pressureRating'
  | 'dotBallPctUnderPressure'
  | 'economyUnderPressure'
  | 'falseShotInducedPct';

export function filterAndRankBowlers(
  players: BowlerEvaluation[],
  phase: MatchPhase,
  minPressureRating: number,
  searchQuery: string,
  sortBy: BowlerSortField = 'pressureRating'
): BowlerEvaluation[] {
  const q = searchQuery.trim().toLowerCase();

  const filtered = players.filter((p) => {
    const matchesPhase = phase === 'all' || p.primaryPhase === phase;
    const effectiveRating =
      phase === 'all' ? p.pressureRating : p.phaseRatings[phase];
    const matchesThreshold = effectiveRating >= minPressureRating;
    const matchesQuery =
      q.length === 0 ||
      p.archetypeName.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q) ||
      p.style.toLowerCase().includes(q);
    return matchesPhase && matchesThreshold && matchesQuery;
  });

  return [...filtered].sort((a, b) => {
    if (sortBy === 'economyUnderPressure') {
      // Lower economy is better for bowlers
      return a.economyUnderPressure - b.economyUnderPressure;
    }
    if (sortBy === 'pressureRating' && phase !== 'all') {
      return b.phaseRatings[phase] - a.phaseRatings[phase];
    }
    return b[sortBy] - a[sortBy];
  });
}

export interface ShortlistSummary {
  totalSelected: number;
  batsmenCount: number;
  bowlersCount: number;
  totalAllocatedCr: number;
  remainingPurseCr: number;
  averagePressureRating: number;
  isOverBudget: boolean;
}

export function computeShortlistSummary(
  shortlistIds: string[],
  batsmen: BatsmanEvaluation[],
  bowlers: BowlerEvaluation[],
  totalPurseCr: number = 45.0
): ShortlistSummary {
  const selectedBatsmen = batsmen.filter((b) => shortlistIds.includes(b.id));
  const selectedBowlers = bowlers.filter((w) => shortlistIds.includes(w.id));

  const totalSelected = selectedBatsmen.length + selectedBowlers.length;
  const totalAllocatedCr = Number(
    (
      selectedBatsmen.reduce((sum, b) => sum + b.auctionBandCr, 0) +
      selectedBowlers.reduce((sum, w) => sum + w.auctionBandCr, 0)
    ).toFixed(1)
  );
  const remainingPurseCr = Number((totalPurseCr - totalAllocatedCr).toFixed(1));

  const combinedRatings = [
    ...selectedBatsmen.map((b) => b.pressureRating),
    ...selectedBowlers.map((w) => w.pressureRating),
  ];

  const averagePressureRating =
    combinedRatings.length > 0
      ? Number(
          (
            combinedRatings.reduce((acc, val) => acc + val, 0) /
            combinedRatings.length
          ).toFixed(1)
        )
      : 0;

  return {
    totalSelected,
    batsmenCount: selectedBatsmen.length,
    bowlersCount: selectedBowlers.length,
    totalAllocatedCr,
    remainingPurseCr,
    averagePressureRating,
    isOverBudget: remainingPurseCr < 0,
  };
}

export function simulateScenarioWithStress(
  scenario: MatchScenarioPreset,
  stressMultiplier: number // e.g. 0.8 to 1.3
) {
  const clampedMult = Math.max(0.8, Math.min(1.3, stressMultiplier));
  const adjustedPressureIndex = Math.min(
    99,
    Math.round(scenario.basePressureIndex * clampedMult)
  );

  const adjustedTimeline = scenario.overTimeline.map((pt) => {
    const scaledPressure = Math.min(99, Math.round(pt.pressureIndex * clampedMult));
    // League average degrades faster under extra stress than top WEAVE archetype
    const stressDelta = (clampedMult - 1) * 100;
    const adjustedArchetypeControl = Math.max(
      55,
      Math.min(95, Number((pt.controlProbability - stressDelta * 0.18).toFixed(1)))
    );
    const adjustedLeagueControl = Math.max(
      32,
      Math.min(88, Number((pt.leagueAvgControl - stressDelta * 0.45).toFixed(1)))
    );
    return {
      ...pt,
      requiredRate: Number((pt.requiredRate * clampedMult).toFixed(1)),
      pressureIndex: scaledPressure,
      controlProbability: adjustedArchetypeControl,
      leagueAvgControl: adjustedLeagueControl,
    };
  });

  return {
    adjustedPressureIndex,
    adjustedTimeline,
    controlAdvantage: Number(
      (
        adjustedTimeline.reduce(
          (acc, pt) => acc + (pt.controlProbability - pt.leagueAvgControl),
          0
        ) / adjustedTimeline.length
      ).toFixed(1)
    ),
  };
}

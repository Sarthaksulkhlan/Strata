export const BRAND_CONFIG = {
  name: 'STRATA',
  tagline: 'Deep Layer of Cricket Intelligence',
  edition: 'SupeRR Selector Season 2 · IPL 2027 Auction Intelligence',
  disclaimer:
    'ILLUSTRATIVE SAMPLE DATA FOR VISUAL DEMONSTRATION ONLY — Does not represent final audit outputs or real player rankings.',
};

export const HERO_PLAYER_PHOTO_CONFIG = {
  assetSlotPath: '/public/assets/aistudio/417595_e51c2249.webp',
  publicUrlPath: '/assets/aistudio/417595_e51c2249.webp',
  secondaryUrlPath: '/assets/aistudio/417503_c7695e7a.webp',
  secondaryFallbackUrl:
    'https://img1.hscicdn.com/image/upload/f_webp,t_ds_w_1200,q_80/lsci/db/PICTURES/CMS/417500/417503.jpg',
  tertiaryUrlPath: '/assets/aistudio/417572_cc1af740.webp',
  tertiaryFallbackUrl:
    'https://img1.hscicdn.com/image/upload/f_webp,t_ds_w_1200,q_80/lsci/db/PICTURES/CMS/417500/417572.jpg',
  slotLabel: 'OFFICIAL RAJASTHAN ROYALS MATCH PHOTOGRAPHS',
  instructions:
    'Displaying all three official Rajasthan Royals match photographs across the faces of the single 4-sided 3D hero prism with preserved aspect ratio, orientation, and quality.',
};

export interface HeroPrismFaceSpec {
  faceIndex: 0 | 1 | 2 | 3;
  code: string;
  shortLabel: string;
  faceType: 'photo' | 'telemetry';
  title: string;
  subtitle: string;
  photoUrl?: string;
  targetAngleRadians: number;
  telemetryTag: string;
}

export const HERO_PRISM_FACES: HeroPrismFaceSpec[] = [
  {
    faceIndex: 0,
    code: 'FACE 01',
    shortLabel: '01. RR Photo A',
    faceType: 'photo',
    title: 'Rajasthan Royals · Match Action Photograph I',
    subtitle:
      'High-leverage crease geometry and boundary strike execution captured in official match play.',
    photoUrl: '/assets/aistudio/417595_e51c2249.webp',
    targetAngleRadians: -0.24,
    telemetryTag: 'FACE 01 (0°) · RR PLAYER PHOTOGRAPH I',
  },
  {
    faceIndex: 1,
    code: 'FACE 02',
    shortLabel: '02. Bat Telemetry',
    faceType: 'telemetry',
    title: 'Batting Pressure Telemetry (Illustrative)',
    subtitle:
      'Animated strike rate surge (184.2), control retention (81.4%), and death-overs resilience.',
    targetAngleRadians: -Math.PI / 2 - 0.24,
    telemetryTag: 'FACE 02 (90°) · ILLUSTRATIVE BATTING ANALYTICS',
  },
  {
    faceIndex: 2,
    code: 'FACE 03',
    shortLabel: '03. RR Photo B',
    faceType: 'photo',
    title: 'Rajasthan Royals · Match Action Photograph II',
    subtitle:
      'Partnership synergy, official Playing XI context, and tournament composure under pressure.',
    photoUrl: '/assets/aistudio/417503_c7695e7a.webp',
    targetAngleRadians: -Math.PI - 0.24,
    telemetryTag: 'FACE 03 (180°) · RR PLAYER PHOTOGRAPH II',
  },
  {
    faceIndex: 3,
    code: 'FACE 04',
    shortLabel: '04. Bowl Telemetry',
    faceType: 'telemetry',
    title: 'Bowling Pressure & PRI Telemetry (Illustrative)',
    subtitle:
      'Animated death economy (7.12 RPO), dot-ball pressure (49.2%), and PRI 95.4 conviction.',
    targetAngleRadians: -(3 * Math.PI) / 2 - 0.24,
    telemetryTag: 'FACE 04 (270°) · ILLUSTRATIVE BOWLING ANALYTICS',
  },
];

export interface TypometerStageSpec {
  stageIndex: 0 | 1 | 2 | 3;
  pct: 25 | 50 | 75 | 100;
  code:
    | '25% — RAW'
    | '50% — CONTEXT'
    | '75% — PRESSURE'
    | '100% — INTELLIGENCE';
  shortName: 'RAW' | 'CONTEXT' | 'PRESSURE' | 'INTELLIGENCE';
  highlightedWord: string;
  narrativeChainLabel: string;
  supportingHeadline: string;
  supportingDescription: string;
  evidenceSignal: string;
  telemetryMetric: string;
}

export const TYPOMETER_STAGES: TypometerStageSpec[] = [
  {
    stageIndex: 0,
    pct: 25,
    code: '25% — RAW',
    shortName: 'RAW',
    highlightedWord: 'raw',
    narrativeChainLabel: 'STAGE 01 · 25% RAW',
    supportingHeadline:
      'Ingesting 1.42M unfiltered deliveries and multi-source match records.',
    supportingDescription:
      'Ball-by-ball statistics capture isolated outcomes, but raw averages treat a flat-track boundary and a crisis recovery knock as identical. STRATA begins by assembling the complete raw record stream.',
    evidenceSignal: '1.42M Deliveries · 6,180 Matches · Unfiltered Stream',
    telemetryMetric: 'SNR +14.2 dB · 25% RAW',
  },
  {
    stageIndex: 1,
    pct: 50,
    code: '50% — CONTEXT',
    shortName: 'CONTEXT',
    highlightedWord: 'records',
    narrativeChainLabel: 'STAGE 02 · 50% CONTEXT',
    supportingHeadline:
      'Linking every record to venue par, official Playing XI depth, and opposition quality.',
    supportingDescription:
      'Raw cricket records gain meaning only when joined with structural context: true surface par, dew bias, batting lineup depth, and the Elo tier of opposing bowlers and batters.',
    evidenceSignal: '6 Interlocked Schemas · ±28.4% Contextual Value Shift',
    telemetryMetric: 'SNR +22.8 dB · 50% CONTEXT',
  },
  {
    stageIndex: 2,
    pct: 75,
    code: '75% — PRESSURE',
    shortName: 'PRESSURE',
    highlightedWord: 'crystallize',
    narrativeChainLabel: 'STAGE 03 · 75% PRESSURE',
    supportingHeadline:
      'Isolating the top 18% high-leverage deliveries where match equations fracture.',
    supportingDescription:
      'When Required Run Rate climbs above 11.5 RPO or wickets fall in clusters, baseline metrics collapse. STRATA applies 2.4x leverage weighting to measure true control retention under stress.',
    evidenceSignal: 'Top 18% Leverage Balls · RRR > 11.5 · 2.4x Stress Weight',
    telemetryMetric: 'SNR +31.0 dB · 75% PRESSURE',
  },
  {
    stageIndex: 3,
    pct: 100,
    code: '100% — INTELLIGENCE',
    shortName: 'INTELLIGENCE',
    highlightedWord: 'conviction.',
    narrativeChainLabel: 'STAGE 04 · 100% INTELLIGENCE',
    supportingHeadline:
      'Resolving pressure-tested evidence into IPL 2027 auction intelligence.',
    supportingDescription:
      'Multi-source evidence crystallizes into the SupeRR Selector Pressure Reliability Index (PRI)—identifying the exact batsmen and bowlers built to win high-leverage moments for Rajasthan Royals.',
    evidenceSignal: 'PRI 94.6 Verified · Top 10 Batsmen & Top 10 Bowlers Ready',
    telemetryMetric: 'SNR +38.2 dB · 100% INTELLIGENCE',
  },
];

export type MatchPhase = 'all' | 'powerplay' | 'middle' | 'death';

export interface StoryChapter {
  index: number;
  numberLabel: string;
  milestonePct: number;
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  description: string;
  evidenceSources: string[];
  keyMetricLabel: string;
  keyMetricValue: string;
  monolithStateLabel: string;
  coordinates: string;
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    index: 0,
    numberLabel: '01',
    milestonePct: 25,
    id: 'the-data',
    kicker: '25% · Multi-Source Stream Inflow',
    title: 'THE DATA',
    subtitle: 'Multiple cricket data streams enter and begin connecting.',
    description:
      'Ball-by-ball telemetry is only a single thread. STRATA unifies match conditions, official playing XI sheets, tournament tier records, team tactical blueprints, and public historical archives into one coherent relational graph.',
    evidenceSources: [
      'Ball-by-Ball Delivery Stream',
      'Match & Venue Conditions',
      'Official Playing XI Sheets',
      'Competition & Tier Registry',
      'Team Tactical Records',
      'Public Cricket Archives',
    ],
    keyMetricLabel: 'Interconnected Relational Entities',
    keyMetricValue: '6 Core Streams · 42 Schema Links',
    monolithStateLabel: '25% — THE DATA · MULTI-STREAM TELEMETRY INFLOW',
    coordinates: 'TOPOLOGY: 6 INBOUND STREAMS · INITIAL LINKS FORMING',
  },
  {
    index: 1,
    numberLabel: '02',
    milestonePct: 50,
    id: 'the-context',
    kicker: '50% · Structural Relationship Mesh',
    title: 'THE CONTEXT',
    subtitle: 'Player, match, team and competition relationships form.',
    description:
      'A boundary struck on a flat 210-par surface carries different weight than 18 runs salvaged on a deteriorating pitch against elite spin. STRATA weaves incoming streams into a relational venue-par, Playing XI, and opposition quality network.',
    evidenceSources: [
      'True Venue Par & Pitch Deterioration',
      'Opposition Bowling Attack Quality Index',
      'Toss & Dew Factor Normalization',
      'Entry-Point Score & Wicket Context',
    ],
    keyMetricLabel: 'Contextual Adjustment Variance',
    keyMetricValue: '±28.4% Value Shift vs Raw Avg',
    monolithStateLabel: '50% — THE CONTEXT · RELATIONAL NETWORK GRAPH',
    coordinates: 'TOPOLOGY: PLAYER · MATCH · TEAM · COMPETITION LINKED',
  },
  {
    index: 2,
    numberLabel: '03',
    milestonePct: 75,
    id: 'the-pressure',
    kicker: '75% · High-Leverage Stress Contours',
    title: 'THE PRESSURE',
    subtitle: 'The visual landscape becomes denser, with pressure zones and important match situations emerging.',
    description:
      'When required run rates climb past 11.5, wickets fall in back-to-back overs, or a bowler must defend 11 runs in the 20th over, conventional averages collapse. STRATA isolates high-leverage pressure zones across the match landscape.',
    evidenceSources: [
      'Required Rate Spike (>11.5 RPO)',
      'Cluster Wicket Recovery Window',
      'Death-Over Margin (<12 Deliveries)',
      'Control % & False-Shot Suppression',
    ],
    keyMetricLabel: 'High-Leverage Sample Isolation',
    keyMetricValue: 'Top 18% Stress Deliveries Weighted 2.4x',
    monolithStateLabel: '75% — THE PRESSURE · HIGH-LEVERAGE STRESS TOPOLOGY',
    coordinates: 'TOPOLOGY: ACUTE PRESSURE ZONES · RRR > 11.5',
  },
  {
    index: 3,
    numberLabel: '04',
    milestonePct: 100,
    id: 'the-intelligence',
    kicker: '100% · Connected Player Conviction',
    title: 'THE INTELLIGENCE',
    subtitle: 'The visual structure resolves into clear, connected player intelligence.',
    description:
      'The dense pressure landscape resolves into a crystalline evaluation network—distilling millions of cross-referenced records into connected player intelligence, pressure reliability ratings, and IPL 2027 auction valuation bands.',
    evidenceSources: [
      'Composite Pressure Reliability Index',
      'Role-Specific Phase Elasticity',
      'Matchup Vulnerability Matrix',
      'IPL 2027 Auction Value Efficiency',
    ],
    keyMetricLabel: 'Decision Output Resolution',
    keyMetricValue: 'Top 10 Batsmen · Top 10 Bowlers',
    monolithStateLabel: '100% — THE INTELLIGENCE · RESOLVED PLAYER MATRIX',
    coordinates: 'TOPOLOGY: CONNECTED PLAYER INTELLIGENCE LOCKED',
  },
];

export interface DataSourceNode {
  id: string;
  code: string;
  title: string;
  category: string;
  weightPct: number;
  illustrativeRecords: string;
  summary: string;
  fields: string[];
  whyItMatters: string;
}

export const ECOSYSTEM_NODES: DataSourceNode[] = [
  {
    id: 'ball-by-ball',
    code: 'SRC-01',
    title: 'Ball-by-Ball Delivery Telemetry',
    category: 'Granular Execution Layer',
    weightPct: 26,
    illustrativeRecords: '1.42M Sample Deliveries',
    summary:
      'Captures trajectory, length/line proxies, scoring outcome, control response, and dismissal mechanics for every delivery.',
    fields: ['match_id', 'inning_over_ball', 'batter_control_flag', 'wagon_sector', 'scoring_delta'],
    whyItMatters:
      'Provides the raw execution signal, but requires outer context layers to distinguish genuine skill from pitch or matchup fortune.',
  },
  {
    id: 'match-venue',
    code: 'SRC-02',
    title: 'Match & Venue Environmental Records',
    category: 'Environmental Normalization',
    weightPct: 20,
    illustrativeRecords: '6,180 Sample Matches',
    summary:
      'Encodes venue boundary dimensions, historical first/second innings par scores, dew impact windows, and pitch abrasion profiles.',
    fields: ['venue_id', 'par_score_index', 'dew_bias_coeff', 'spin_turn_proxy', 'boundary_sq_m'],
    whyItMatters:
      'Normalizes a 145-run chase on a gripping surface against a 215-run shootout on a high-altitude flat deck.',
  },
  {
    id: 'playing-xi',
    code: 'SRC-03',
    title: 'Playing XI & Tactical Lineup Sheets',
    category: 'Structural Role Context',
    weightPct: 16,
    illustrativeRecords: '135K Lineup Slots',
    summary:
      'Maps exact batting order flexibility, remaining specialist batters in the shed, Impact Player substitutions, and bowling quota distribution.',
    fields: ['lineup_slot', 'wickets_in_hand_quality', 'impact_sub_status', 'bowling_resource_left'],
    whyItMatters:
      'Measures whether a batter accelerated with deep insurance at No. 7 & 8 or carried a fragile tail alone.',
  },
  {
    id: 'competition-tier',
    code: 'SRC-04',
    title: 'Competition & Opposition Quality Registry',
    category: 'Strength-of-Schedule Scaling',
    weightPct: 15,
    illustrativeRecords: '28 Global & Domestic T20 Leagues',
    summary:
      'Weights performance by tournament competitiveness, opposition bowler/batter Elo ratings, and knockout stage leverage.',
    fields: ['competition_tier', 'opp_attack_percentile', 'stage_leverage_wt', 'pace_spin_quality'],
    whyItMatters:
      'Prevents inflation from lower-tier domestic attacks and highlights repeatability against elite international-grade units.',
  },
  {
    id: 'team-tactics',
    code: 'SRC-05',
    title: 'Team & Phase Strategic Blueprints',
    category: 'Role Assignment Layer',
    weightPct: 13,
    illustrativeRecords: '410 Franchise-Season Profiles',
    summary:
      'Tracks role mandates such as powerplay tempo-setter, middle-overs spin disruptor, or death-overs defensive enforcer.',
    fields: ['assigned_role_id', 'entry_over_median', 'matchup_deployment_rate', 'tactical_intent_score'],
    whyItMatters:
      'Evaluates players against their tactical mandate rather than penalizing high-risk role specialists for raw dismissal counts.',
  },
  {
    id: 'public-intelligence',
    code: 'SRC-06',
    title: 'Public Cricket Intelligence & Bio-Mechanics',
    category: 'External Contextual Enrichment',
    weightPct: 10,
    illustrativeRecords: '3,800+ Player Dossiers',
    summary:
      'Integrates publicly documented handedness matchups, release-point variations, injury workload history, and auction role scarcity.',
    fields: ['arm_angle_profile', 'pace_band_kph', 'left_right_split_delta', 'auction_scarcity_tier'],
    whyItMatters:
      'Connects statistical reliability with practical squad construction and IPL 2027 auction scarcity.',
  },
];

export interface BatsmanEvaluation {
  id: string;
  rank: number;
  code: string;
  archetypeName: string;
  sampleLabel: string;
  role: string;
  handedness: 'LHB' | 'RHB';
  primaryPhase: MatchPhase;
  pressureRating: number; // 0-100 illustrative index
  controlPctUnderPressure: number; // %
  strikeRateUnderPressure: number;
  baselineStrikeRate: number;
  boundaryResilience: number; // % of pressure overs with >=1 boundary
  dotBallAvoidancePct: number; // %
  clutchInningsSample: number;
  auctionBandCr: number; // Illustrative Cr valuation
  phaseRatings: {
    powerplay: number;
    middle: number;
    death: number;
  };
  sourceBreakdown: {
    ballByBall: number;
    matchContext: number;
    oppositionQuality: number;
    situationalLeverage: number;
  };
  narrativeSummary: string;
}

export interface BowlerEvaluation {
  id: string;
  rank: number;
  code: string;
  archetypeName: string;
  sampleLabel: string;
  role: string;
  style: string;
  primaryPhase: MatchPhase;
  pressureRating: number; // 0-100 illustrative index
  dotBallPctUnderPressure: number; // %
  economyUnderPressure: number;
  baselineEconomy: number;
  falseShotInducedPct: number; // %
  boundarySuppressionPct: number; // %
  clutchSpellsSample: number;
  auctionBandCr: number; // Illustrative Cr valuation
  phaseRatings: {
    powerplay: number;
    middle: number;
    death: number;
  };
  sourceBreakdown: {
    ballByBall: number;
    matchContext: number;
    oppositionQuality: number;
    situationalLeverage: number;
  };
  narrativeSummary: string;
}

export const ILLUSTRATIVE_TOP_BATSMEN: BatsmanEvaluation[] = [
  {
    id: 'bat-01',
    rank: 1,
    code: 'BAT-01',
    archetypeName: 'Archetype B01 · Death-Overs Finisher',
    sampleLabel: 'Illustrative Profile #01',
    role: 'No. 5/6 High-Leverage Finisher',
    handedness: 'LHB',
    primaryPhase: 'death',
    pressureRating: 94.6,
    controlPctUnderPressure: 81.4,
    strikeRateUnderPressure: 184.2,
    baselineStrikeRate: 162.0,
    boundaryResilience: 78.5,
    dotBallAvoidancePct: 76.2,
    clutchInningsSample: 48,
    auctionBandCr: 14.5,
    phaseRatings: { powerplay: 79.0, middle: 88.4, death: 96.8 },
    sourceBreakdown: { ballByBall: 95, matchContext: 93, oppositionQuality: 94, situationalLeverage: 97 },
    narrativeSummary:
      'Maintains an +22.2 SR surge when Required Run Rate exceeds 12.0 RPO with <5 wickets in hand, supported by elite yorker-deflection control.',
  },
  {
    id: 'bat-02',
    rank: 2,
    code: 'BAT-02',
    archetypeName: 'Archetype B02 · Middle-Overs Spin Disruptor',
    sampleLabel: 'Illustrative Profile #02',
    role: 'No. 3/4 Tempo Controller',
    handedness: 'RHB',
    primaryPhase: 'middle',
    pressureRating: 92.8,
    controlPctUnderPressure: 84.9,
    strikeRateUnderPressure: 168.5,
    baselineStrikeRate: 154.1,
    boundaryResilience: 74.0,
    dotBallAvoidancePct: 81.0,
    clutchInningsSample: 62,
    auctionBandCr: 13.8,
    phaseRatings: { powerplay: 86.2, middle: 95.4, death: 89.5 },
    sourceBreakdown: { ballByBall: 92, matchContext: 94, oppositionQuality: 93, situationalLeverage: 92 },
    narrativeSummary:
      'Neutralizes wrist-spin choke phases (overs 7–15) after powerplay collapses, rotating strike on 81% of deliveries under high spin turn.',
  },
  {
    id: 'bat-03',
    rank: 3,
    code: 'BAT-03',
    archetypeName: 'Archetype B03 · Powerplay Pace Enforcer',
    sampleLabel: 'Illustrative Profile #03',
    role: 'Opening Steep-Chase Catalyst',
    handedness: 'LHB',
    primaryPhase: 'powerplay',
    pressureRating: 91.4,
    controlPctUnderPressure: 79.8,
    strikeRateUnderPressure: 176.0,
    baselineStrikeRate: 165.4,
    boundaryResilience: 82.1,
    dotBallAvoidancePct: 71.5,
    clutchInningsSample: 55,
    auctionBandCr: 13.0,
    phaseRatings: { powerplay: 95.1, middle: 87.0, death: 84.2 },
    sourceBreakdown: { ballByBall: 91, matchContext: 90, oppositionQuality: 93, situationalLeverage: 91 },
    narrativeSummary:
      'Sustains aggressive intent in 200+ target chases even after losing an opening partner inside the first 12 balls.',
  },
  {
    id: 'bat-04',
    rank: 4,
    code: 'BAT-04',
    archetypeName: 'Archetype B04 · 360° Chase Architect',
    sampleLabel: 'Illustrative Profile #04',
    role: 'No. 4 Multi-Phase Anchor-Accelerator',
    handedness: 'RHB',
    primaryPhase: 'middle',
    pressureRating: 90.1,
    controlPctUnderPressure: 83.2,
    strikeRateUnderPressure: 164.8,
    baselineStrikeRate: 151.0,
    boundaryResilience: 72.8,
    dotBallAvoidancePct: 79.4,
    clutchInningsSample: 59,
    auctionBandCr: 12.2,
    phaseRatings: { powerplay: 84.5, middle: 92.0, death: 91.2 },
    sourceBreakdown: { ballByBall: 90, matchContext: 91, oppositionQuality: 89, situationalLeverage: 90 },
    narrativeSummary:
      'Accesses V-behind-the-wicket pockets against wide death-over plans, reducing dot-ball clusters in second-innings chases.',
  },
  {
    id: 'bat-05',
    rank: 5,
    code: 'BAT-05',
    archetypeName: 'Archetype B05 · Death-Surge Power Hitter',
    sampleLabel: 'Illustrative Profile #05',
    role: 'No. 6/7 Lower-Order Closer',
    handedness: 'RHB',
    primaryPhase: 'death',
    pressureRating: 88.9,
    controlPctUnderPressure: 76.5,
    strikeRateUnderPressure: 191.4,
    baselineStrikeRate: 171.2,
    boundaryResilience: 84.0,
    dotBallAvoidancePct: 69.8,
    clutchInningsSample: 41,
    auctionBandCr: 11.5,
    phaseRatings: { powerplay: 72.0, middle: 83.4, death: 94.8 },
    sourceBreakdown: { ballByBall: 89, matchContext: 87, oppositionQuality: 88, situationalLeverage: 92 },
    narrativeSummary:
      'Delivers first-6-ball boundary impact when entering at overs 15–18 against >140 kph hard-length seamers.',
  },
  {
    id: 'bat-06',
    rank: 6,
    code: 'BAT-06',
    archetypeName: 'Archetype B06 · Collapse-Proof Stabilizer',
    sampleLabel: 'Illustrative Profile #06',
    role: 'No. 3 Crisis Reconstruction Specialist',
    handedness: 'LHB',
    primaryPhase: 'powerplay',
    pressureRating: 87.6,
    controlPctUnderPressure: 86.4,
    strikeRateUnderPressure: 149.5,
    baselineStrikeRate: 142.0,
    boundaryResilience: 67.4,
    dotBallAvoidancePct: 83.1,
    clutchInningsSample: 67,
    auctionBandCr: 10.4,
    phaseRatings: { powerplay: 89.2, middle: 88.5, death: 81.0 },
    sourceBreakdown: { ballByBall: 86, matchContext: 90, oppositionQuality: 88, situationalLeverage: 86 },
    narrativeSummary:
      'Highest control retention when walking in at 2 wickets down inside 3 overs on seaming or two-paced surfaces.',
  },
  {
    id: 'bat-07',
    rank: 7,
    code: 'BAT-07',
    archetypeName: 'Archetype B07 · Dual-Spin Sweep Specialist',
    sampleLabel: 'Illustrative Profile #07',
    role: 'No. 4/5 Turning-Track Tactician',
    handedness: 'RHB',
    primaryPhase: 'middle',
    pressureRating: 86.4,
    controlPctUnderPressure: 82.0,
    strikeRateUnderPressure: 158.9,
    baselineStrikeRate: 147.8,
    boundaryResilience: 71.2,
    dotBallAvoidancePct: 78.0,
    clutchInningsSample: 46,
    auctionBandCr: 9.6,
    phaseRatings: { powerplay: 78.4, middle: 91.0, death: 83.8 },
    sourceBreakdown: { ballByBall: 85, matchContext: 88, oppositionQuality: 86, situationalLeverage: 86 },
    narrativeSummary:
      'Forces defensive field spreads on gripping pitches via high-percentage conventional and reverse-sweep execution.',
  },
  {
    id: 'bat-08',
    rank: 8,
    code: 'BAT-08',
    archetypeName: 'Archetype B08 · High-Pace Counter-Puncher',
    sampleLabel: 'Illustrative Profile #08',
    role: 'Top-Order Pace-On Specialist',
    handedness: 'RHB',
    primaryPhase: 'powerplay',
    pressureRating: 85.2,
    controlPctUnderPressure: 78.9,
    strikeRateUnderPressure: 169.2,
    baselineStrikeRate: 158.0,
    boundaryResilience: 76.5,
    dotBallAvoidancePct: 73.4,
    clutchInningsSample: 51,
    auctionBandCr: 9.0,
    phaseRatings: { powerplay: 90.8, middle: 84.1, death: 79.5 },
    sourceBreakdown: { ballByBall: 86, matchContext: 84, oppositionQuality: 86, situationalLeverage: 85 },
    narrativeSummary:
      'Converts short-of-a-length body-line hostility into high-control square-boundary scoring during steep powerplay chases.',
  },
  {
    id: 'bat-09',
    rank: 9,
    code: 'BAT-09',
    archetypeName: 'Archetype B09 · Death-Overs Precision Manipulator',
    sampleLabel: 'Illustrative Profile #09',
    role: 'No. 5/6 Gap-Finding Closer',
    handedness: 'LHB',
    primaryPhase: 'death',
    pressureRating: 84.1,
    controlPctUnderPressure: 80.5,
    strikeRateUnderPressure: 166.4,
    baselineStrikeRate: 150.2,
    boundaryResilience: 70.9,
    dotBallAvoidancePct: 77.8,
    clutchInningsSample: 39,
    auctionBandCr: 8.2,
    phaseRatings: { powerplay: 74.5, middle: 83.0, death: 89.4 },
    sourceBreakdown: { ballByBall: 84, matchContext: 85, oppositionQuality: 83, situationalLeverage: 85 },
    narrativeSummary:
      'Pairs low false-shot rates with two-run conversion speed on large square boundaries when equations tighten.',
  },
  {
    id: 'bat-10',
    rank: 10,
    code: 'BAT-10',
    archetypeName: 'Archetype B10 · Impact-Sub Utility Striker',
    sampleLabel: 'Illustrative Profile #10',
    role: 'Floating No. 4–7 Momentum Shifter',
    handedness: 'RHB',
    primaryPhase: 'death',
    pressureRating: 82.9,
    controlPctUnderPressure: 77.2,
    strikeRateUnderPressure: 173.5,
    baselineStrikeRate: 160.1,
    boundaryResilience: 75.1,
    dotBallAvoidancePct: 72.0,
    clutchInningsSample: 34,
    auctionBandCr: 7.4,
    phaseRatings: { powerplay: 80.1, middle: 82.2, death: 86.5 },
    sourceBreakdown: { ballByBall: 83, matchContext: 82, oppositionQuality: 83, situationalLeverage: 84 },
    narrativeSummary:
      'High auction value-per-crore efficiency for dynamic Playing XI deployment across variable entry points.',
  },
];

export const ILLUSTRATIVE_TOP_BOWLERS: BowlerEvaluation[] = [
  {
    id: 'bwl-01',
    rank: 1,
    code: 'BWL-01',
    archetypeName: 'Archetype W01 · Death-Over Yorker & Deception Ace',
    sampleLabel: 'Illustrative Profile #01',
    role: 'Overs 16–20 Defensive & Wicket Enforcer',
    style: 'Right-Arm Fast · Sling/Low Release',
    primaryPhase: 'death',
    pressureRating: 95.4,
    dotBallPctUnderPressure: 49.2,
    economyUnderPressure: 7.12,
    baselineEconomy: 7.45,
    falseShotInducedPct: 38.6,
    boundarySuppressionPct: 88.4,
    clutchSpellsSample: 58,
    auctionBandCr: 15.2,
    phaseRatings: { powerplay: 92.4, middle: 94.0, death: 97.8 },
    sourceBreakdown: { ballByBall: 96, matchContext: 95, oppositionQuality: 95, situationalLeverage: 96 },
    narrativeSummary:
      'Concedes 0.33 fewer runs per over in high-leverage death overs than baseline, inducing 38.6% false shots even with heavy dew.',
  },
  {
    id: 'bwl-02',
    rank: 2,
    code: 'BWL-02',
    archetypeName: 'Archetype W02 · Middle-Overs Wrist-Spin Strike Threat',
    sampleLabel: 'Illustrative Profile #02',
    role: 'Overs 7–15 Partnership Breaker',
    style: 'Left-Arm Wrist Spin · High Revs',
    primaryPhase: 'middle',
    pressureRating: 93.1,
    dotBallPctUnderPressure: 44.8,
    economyUnderPressure: 6.84,
    baselineEconomy: 7.20,
    falseShotInducedPct: 36.2,
    boundarySuppressionPct: 86.9,
    clutchSpellsSample: 52,
    auctionBandCr: 14.0,
    phaseRatings: { powerplay: 78.5, middle: 96.2, death: 84.0 },
    sourceBreakdown: { ballByBall: 94, matchContext: 92, oppositionQuality: 93, situationalLeverage: 93 },
    narrativeSummary:
      'Breaks set 50+ run partnerships at 1.8x the league median rate while maintaining sub-7.00 RPO control against both LHB and RHB.',
  },
  {
    id: 'bwl-03',
    rank: 3,
    code: 'BWL-03',
    archetypeName: 'Archetype W03 · Powerplay Swing & Hard-Length Disruptor',
    sampleLabel: 'Illustrative Profile #03',
    role: 'New-Ball Strike + 18th Over Return',
    style: 'Left-Arm Fast-Medium · Late Swing',
    primaryPhase: 'powerplay',
    pressureRating: 91.7,
    dotBallPctUnderPressure: 53.5,
    economyUnderPressure: 7.38,
    baselineEconomy: 7.82,
    falseShotInducedPct: 35.0,
    boundarySuppressionPct: 85.1,
    clutchSpellsSample: 61,
    auctionBandCr: 13.4,
    phaseRatings: { powerplay: 95.8, middle: 85.0, death: 88.2 },
    sourceBreakdown: { ballByBall: 92, matchContext: 91, oppositionQuality: 92, situationalLeverage: 92 },
    narrativeSummary:
      'Generates 53.5% dot balls inside powerplays on flat tracks and transitions seamlessly to wide-line yorkers at the death.',
  },
  {
    id: 'bwl-04',
    rank: 4,
    code: 'BWL-04',
    archetypeName: 'Archetype W04 · High-Bounce Defensive Finger Spinner',
    sampleLabel: 'Illustrative Profile #04',
    role: 'Powerplay & Middle-Overs Clamp',
    style: 'Left-Arm Orthodox · Overspin & Seam',
    primaryPhase: 'middle',
    pressureRating: 90.3,
    dotBallPctUnderPressure: 46.1,
    economyUnderPressure: 6.65,
    baselineEconomy: 6.95,
    falseShotInducedPct: 31.8,
    boundarySuppressionPct: 89.2,
    clutchSpellsSample: 64,
    auctionBandCr: 12.0,
    phaseRatings: { powerplay: 88.4, middle: 93.5, death: 82.1 },
    sourceBreakdown: { ballByBall: 89, matchContext: 92, oppositionQuality: 90, situationalLeverage: 90 },
    narrativeSummary:
      'Suffocates scoring trajectories toward the shorter boundary side, forcing batters into low-percentage cross-batted risk.',
  },
  {
    id: 'bwl-05',
    rank: 5,
    code: 'BWL-05',
    archetypeName: 'Archetype W05 · Cutters & Into-The-Pitch Death Specialist',
    sampleLabel: 'Illustrative Profile #05',
    role: 'Overs 14–20 Pace-Off Closer',
    style: 'Right-Arm Fast-Medium · Heavy Off-Cutter',
    primaryPhase: 'death',
    pressureRating: 89.0,
    dotBallPctUnderPressure: 43.9,
    economyUnderPressure: 7.64,
    baselineEconomy: 8.15,
    falseShotInducedPct: 34.4,
    boundarySuppressionPct: 84.7,
    clutchSpellsSample: 49,
    auctionBandCr: 11.2,
    phaseRatings: { powerplay: 79.0, middle: 88.2, death: 93.9 },
    sourceBreakdown: { ballByBall: 88, matchContext: 90, oppositionQuality: 88, situationalLeverage: 90 },
    narrativeSummary:
      'Excels on two-paced and worn surfaces where deceptive 118 kph leg/off-cutters neutralize power hitters.',
  },
  {
    id: 'bwl-06',
    rank: 6,
    code: 'BWL-06',
    archetypeName: 'Archetype W06 · Express Hit-The-Deck Enforcer',
    sampleLabel: 'Illustrative Profile #06',
    role: 'Middle-to-Death High-Velocity Breaker',
    style: 'Right-Arm Express Pace (148+ kph)',
    primaryPhase: 'middle',
    pressureRating: 87.8,
    dotBallPctUnderPressure: 47.4,
    economyUnderPressure: 7.79,
    baselineEconomy: 8.20,
    falseShotInducedPct: 37.1,
    boundarySuppressionPct: 83.2,
    clutchSpellsSample: 44,
    auctionBandCr: 10.8,
    phaseRatings: { powerplay: 86.0, middle: 91.4, death: 85.2 },
    sourceBreakdown: { ballByBall: 89, matchContext: 86, oppositionQuality: 89, situationalLeverage: 87 },
    narrativeSummary:
      'Disrupts set batters with steep splice-seeking bounce in overs 8–16 when ball condition offers minimal lateral movement.',
  },
  {
    id: 'bwl-07',
    rank: 7,
    code: 'BWL-07',
    archetypeName: 'Archetype W07 · Mystery Carrom & Googly Tactician',
    sampleLabel: 'Illustrative Profile #07',
    role: 'Multi-Phase Spin Choke Specialist',
    style: 'Right-Arm Mystery Spin · Dual Turn',
    primaryPhase: 'middle',
    pressureRating: 86.9,
    dotBallPctUnderPressure: 45.2,
    economyUnderPressure: 6.92,
    baselineEconomy: 7.18,
    falseShotInducedPct: 33.9,
    boundarySuppressionPct: 87.5,
    clutchSpellsSample: 47,
    auctionBandCr: 10.0,
    phaseRatings: { powerplay: 85.2, middle: 90.8, death: 81.4 },
    sourceBreakdown: { ballByBall: 87, matchContext: 87, oppositionQuality: 86, situationalLeverage: 87 },
    narrativeSummary:
      'Maintains symmetric effectiveness against both left- and right-handers, immunizing the bowling attack against LHB/RHB pairing tactics.',
  },
  {
    id: 'bwl-08',
    rank: 8,
    code: 'BWL-08',
    archetypeName: 'Archetype W08 · Wide-Line Death Executioner',
    sampleLabel: 'Illustrative Profile #08',
    role: 'Overs 17–20 Margin Protector',
    style: 'Left-Arm Fast-Medium · Wide Tramline',
    primaryPhase: 'death',
    pressureRating: 85.5,
    dotBallPctUnderPressure: 42.6,
    economyUnderPressure: 7.88,
    baselineEconomy: 8.40,
    falseShotInducedPct: 32.5,
    boundarySuppressionPct: 84.0,
    clutchSpellsSample: 42,
    auctionBandCr: 9.2,
    phaseRatings: { powerplay: 81.0, middle: 82.4, death: 91.0 },
    sourceBreakdown: { ballByBall: 85, matchContext: 86, oppositionQuality: 85, situationalLeverage: 86 },
    narrativeSummary:
      'Disciplined wide-yorker and slow-bouncer execution when defending <22 runs in the final two overs.',
  },
  {
    id: 'bwl-09',
    rank: 9,
    code: 'BWL-09',
    archetypeName: 'Archetype W09 · Powerplay Seam & Wobble-Ball Specialist',
    sampleLabel: 'Illustrative Profile #09',
    role: 'Overs 1–6 Top-Order Extractor',
    style: 'Right-Arm Seam · Upright & Wobble Seam',
    primaryPhase: 'powerplay',
    pressureRating: 84.4,
    dotBallPctUnderPressure: 51.8,
    economyUnderPressure: 7.42,
    baselineEconomy: 7.75,
    falseShotInducedPct: 33.1,
    boundarySuppressionPct: 84.8,
    clutchSpellsSample: 53,
    auctionBandCr: 8.5,
    phaseRatings: { powerplay: 91.5, middle: 81.2, death: 76.8 },
    sourceBreakdown: { ballByBall: 85, matchContext: 84, oppositionQuality: 85, situationalLeverage: 83 },
    narrativeSummary:
      'High probability of taking a top-3 opposition wicket inside the first 18 deliveries, reshaping the entire chase curve.',
  },
  {
    id: 'bwl-10',
    rank: 10,
    code: 'BWL-10',
    archetypeName: 'Archetype W10 · High-Utility All-Phase Seam Anchor',
    sampleLabel: 'Illustrative Profile #10',
    role: 'Flexible 4-Over Tactical Completer',
    style: 'Right-Arm Medium-Fast · Skiddy Trajectory',
    primaryPhase: 'middle',
    pressureRating: 83.2,
    dotBallPctUnderPressure: 41.9,
    economyUnderPressure: 7.70,
    baselineEconomy: 7.98,
    falseShotInducedPct: 30.8,
    boundarySuppressionPct: 83.9,
    clutchSpellsSample: 40,
    auctionBandCr: 7.6,
    phaseRatings: { powerplay: 83.5, middle: 84.8, death: 81.9 },
    sourceBreakdown: { ballByBall: 83, matchContext: 84, oppositionQuality: 83, situationalLeverage: 83 },
    narrativeSummary:
      'Reliable floor-raiser across all three match phases, offering high cap-space value for squad balance.',
  },
];

export interface MatchScenarioPreset {
  id: string;
  code: string;
  title: string;
  venueContext: string;
  equationSummary: string;
  basePressureIndex: number;
  recommendedBatsmanCode: string;
  recommendedBowlerCode: string;
  tacticalInsight: string;
  overTimeline: Array<{
    over: string;
    requiredRate: number;
    pressureIndex: number;
    controlProbability: number;
    leagueAvgControl: number;
  }>;
}

export const MATCH_SCENARIOS: MatchScenarioPreset[] = [
  {
    id: 'chase-48-24',
    code: 'SIM-01',
    title: 'Death Chase · 48 Needed off 24 Balls',
    venueContext: 'Sawai Mansingh Archetype · 68m Square Boundaries · Moderate Dew',
    equationSummary: '12.00 RPO Required · 4 Wickets in Hand · 2 Pace + 1 Spin Overs Left',
    basePressureIndex: 89,
    recommendedBatsmanCode: 'BAT-01',
    recommendedBowlerCode: 'BWL-01',
    tacticalInsight:
      'When RRR crosses 12.0 with only 4 wickets intact, League Average control drops to 58.2%. Archetype B01 retains 81.4% control by targeting 45° behind square against yorker misses.',
    overTimeline: [
      { over: 'Ov 15', requiredRate: 10.4, pressureIndex: 72, controlProbability: 84, leagueAvgControl: 69 },
      { over: 'Ov 16', requiredRate: 11.2, pressureIndex: 79, controlProbability: 83, leagueAvgControl: 65 },
      { over: 'Ov 17', requiredRate: 12.0, pressureIndex: 86, controlProbability: 81, leagueAvgControl: 60 },
      { over: 'Ov 18', requiredRate: 12.8, pressureIndex: 91, controlProbability: 80, leagueAvgControl: 56 },
      { over: 'Ov 19', requiredRate: 13.5, pressureIndex: 95, controlProbability: 79, leagueAvgControl: 52 },
      { over: 'Ov 20', requiredRate: 14.0, pressureIndex: 98, controlProbability: 78, leagueAvgControl: 48 },
    ],
  },
  {
    id: 'spin-choke-middle',
    code: 'SIM-02',
    title: 'Middle-Overs Spin Squeeze · 64/3 after 9 Overs',
    venueContext: 'Dry Abrasive Pitch · 3.8° Average Turn · Zero Dew',
    equationSummary: 'Target 176 · 10.18 RPO Required · Dual Wrist/Mystery Spin Operating',
    basePressureIndex: 84,
    recommendedBatsmanCode: 'BAT-02',
    recommendedBowlerCode: 'BWL-02',
    tacticalInsight:
      'Cluster dot balls between overs 9 and 13 account for 63% of second-innings collapses on dry tracks. Archetype B02 suppresses dot-ball strings via low-risk sweep and back-foot punch rotation.',
    overTimeline: [
      { over: 'Ov 09', requiredRate: 9.8, pressureIndex: 76, controlProbability: 86, leagueAvgControl: 66 },
      { over: 'Ov 10', requiredRate: 10.2, pressureIndex: 81, controlProbability: 85, leagueAvgControl: 63 },
      { over: 'Ov 11', requiredRate: 10.6, pressureIndex: 85, controlProbability: 85, leagueAvgControl: 60 },
      { over: 'Ov 12', requiredRate: 10.9, pressureIndex: 87, controlProbability: 84, leagueAvgControl: 58 },
      { over: 'Ov 13', requiredRate: 11.1, pressureIndex: 88, controlProbability: 83, leagueAvgControl: 57 },
      { over: 'Ov 14', requiredRate: 11.4, pressureIndex: 90, controlProbability: 82, leagueAvgControl: 55 },
    ],
  },
  {
    id: 'powerplay-crisis',
    code: 'SIM-03',
    title: 'Powerplay Shock · 14/2 after 2.3 Overs',
    venueContext: 'Fresh Seam Deck · 1.9° Lateral Movement · High Carry',
    equationSummary: 'First Innings Par 188 · Two Top-Order Wickets Lost in 15 Deliveries',
    basePressureIndex: 82,
    recommendedBatsmanCode: 'BAT-06',
    recommendedBowlerCode: 'BWL-03',
    tacticalInsight:
      'Teams losing 2 wickets inside 15 balls suffer an average -24 run penalty on final totals unless the No. 3/4 pairing preserves both wicket equity and >135 SR through Over 6.',
    overTimeline: [
      { over: 'Ov 01', requiredRate: 9.4, pressureIndex: 62, controlProbability: 88, leagueAvgControl: 74 },
      { over: 'Ov 02', requiredRate: 9.6, pressureIndex: 78, controlProbability: 86, leagueAvgControl: 64 },
      { over: 'Ov 03', requiredRate: 9.9, pressureIndex: 88, controlProbability: 86, leagueAvgControl: 57 },
      { over: 'Ov 04', requiredRate: 9.7, pressureIndex: 84, controlProbability: 87, leagueAvgControl: 61 },
      { over: 'Ov 05', requiredRate: 9.5, pressureIndex: 80, controlProbability: 88, leagueAvgControl: 65 },
      { over: 'Ov 06', requiredRate: 9.4, pressureIndex: 76, controlProbability: 89, leagueAvgControl: 68 },
    ],
  },
];

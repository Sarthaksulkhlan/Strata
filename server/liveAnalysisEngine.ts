import crypto from 'node:crypto';
import type {
  BallEvidenceRecord,
  PlayerPressureResult,
} from '../src/lib/csvPreviewAndExport';

export interface AnalysisStageState {
  stage: number;
  title: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  detail: string;
}

export interface LiveJobStatus {
  job_id: string;
  filename: string;
  file_size: number;
  status: 'running' | 'completed' | 'failed';
  current_stage: number;
  current_stage_title: string;
  progress_pct: number;
  records_processed: number;
  total_records: number;
  status_message: string;
  stages: AnalysisStageState[];
  error: string | null;
  has_results: boolean;
}

export interface LiveAnalysisResults {
  job_id: string;
  filename: string;
  file_size: number;
  completed_at: string;
  summary: {
    total_records: number;
    pressure_records: number;
    pressure_density_pct: number;
    total_matches: number;
    total_teams: number;
    total_batters_evaluated: number;
    total_bowlers_evaluated: number;
  };
  best_batter: PlayerPressureResult | null;
  best_bowler: PlayerPressureResult | null;
  top_batters: PlayerPressureResult[];
  top_bowlers: PlayerPressureResult[];
  all_batters: PlayerPressureResult[];
  all_bowlers: PlayerPressureResult[];
  ball_evidence: BallEvidenceRecord[];
  available_filters: {
    teams: string[];
    matches: Array<{ id: string; label: string }>;
    innings: number[];
    players: string[];
  };
}

export interface CsvValidationResult {
  valid: boolean;
  filename: string;
  file_size: number;
  error: string | null;
  missing_columns: string[];
  detected_columns: string[];
  mapped_columns: Record<string, string>;
  row_count: number;
  message?: string;
}

export const STAGE_DEFINITIONS: Array<{ stage: number; title: string }> = [
  { stage: 1, title: 'Reading uploaded CSV.' },
  { stage: 2, title: 'Validating columns and data.' },
  { stage: 3, title: 'Processing match and ball-level records.' },
  { stage: 4, title: 'Identifying pressure situations.' },
  { stage: 5, title: 'Calculating batting performance under pressure.' },
  { stage: 6, title: 'Calculating bowling performance under pressure.' },
  { stage: 7, title: 'Comparing players and calculating rankings.' },
  { stage: 8, title: 'Generating final results.' },
];

const COLUMN_ALIASES: Record<string, string[]> = {
  match_id: ['match_id', 'id', 'match', 'game_id', 'match_no'],
  innings: ['innings', 'inning', 'innings_number', 'inn'],
  over: ['over', 'over_number', 'overs', 'ball_over'],
  ball: ['ball', 'ball_number', 'delivery', 'ball_in_over'],
  batter: ['batter', 'batsman', 'striker', 'batter_name', 'batsman_name'],
  bowler: ['bowler', 'bowler_name'],
  batting_team: ['batting_team', 'team_batting', 'team', 'batter_team'],
  bowling_team: ['bowling_team', 'team_bowling', 'opposition', 'bowler_team'],
  runs_off_bat: ['runs_off_bat', 'batsman_runs', 'batter_runs', 'runs_batter', 'runs'],
  extras: ['extras', 'extra_runs', 'runs_extras'],
  total_runs: ['total_runs', 'runs_total'],
  wicket: ['is_wicket', 'wicket', 'wicket_type', 'dismissal_kind', 'player_dismissed', 'out'],
  wicket_type: ['wicket_type', 'dismissal_kind'],
  player_dismissed: ['player_dismissed', 'dismissed_player', 'out_player'],
};

const REQUIRED_CONCEPTS = ['batter', 'bowler', 'runs_off_bat', 'over'] as const;

interface InternalJob extends LiveJobStatus {
  results: LiveAnalysisResults | null;
}

const jobsStore = new Map<string, InternalJob>();

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsvText(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const normalized = (csvText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) return { headers: [], rows: [] };
  const lines = normalized.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((c) => c === '')) continue;
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = cells[c] ?? '';
    }
    rows.push(obj);
  }
  return { headers, rows };
}

function resolveColumns(headers: string[]): {
  resolved: Record<string, string>;
  missing: string[];
} {
  const lowerMap = new Map<string, string>();
  for (const h of headers) {
    const trimmed = h.trim();
    if (trimmed) lowerMap.set(trimmed.toLowerCase(), trimmed);
  }
  const resolved: Record<string, string> = {};
  for (const [concept, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const found = lowerMap.get(alias);
      if (found) {
        resolved[concept] = found;
        break;
      }
    }
  }
  if (!resolved.over && resolved.ball) {
    resolved.over = resolved.ball;
  }
  const missing: string[] = [];
  for (const req of REQUIRED_CONCEPTS) {
    if (!resolved[req]) missing.push(req);
  }
  return { resolved, missing };
}

export function validateCsvPayload(
  filename: string,
  csvText: string,
  fileSize?: number
): CsvValidationResult {
  const computedSize = fileSize ?? Buffer.byteLength(csvText || '', 'utf8');
  if (!filename || !filename.toLowerCase().endsWith('.csv')) {
    return {
      valid: false,
      filename: filename || 'unknown',
      file_size: computedSize,
      error: 'Invalid file format. Please upload a valid .csv ball-by-ball cricket dataset.',
      missing_columns: [...REQUIRED_CONCEPTS],
      detected_columns: [],
      mapped_columns: {},
      row_count: 0,
    };
  }

  const trimmed = (csvText || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      filename,
      file_size: computedSize,
      error: 'The uploaded CSV file is empty.',
      missing_columns: [...REQUIRED_CONCEPTS],
      detected_columns: [],
      mapped_columns: {},
      row_count: 0,
    };
  }

  const { headers, rows } = parseCsvText(trimmed);
  if (headers.length === 0) {
    return {
      valid: false,
      filename,
      file_size: computedSize,
      error: 'Could not read CSV header row.',
      missing_columns: [...REQUIRED_CONCEPTS],
      detected_columns: [],
      mapped_columns: {},
      row_count: 0,
    };
  }

  const { resolved, missing } = resolveColumns(headers);
  if (missing.length > 0) {
    const friendlyMissing = missing.map(
      (m) => `${m} (e.g. ${COLUMN_ALIASES[m].slice(0, 3).join(', ')})`
    );
    return {
      valid: false,
      filename,
      file_size: computedSize,
      error: `Missing required ball-by-ball columns: ${friendlyMissing.join(', ')}.`,
      missing_columns: missing,
      detected_columns: headers,
      mapped_columns: resolved,
      row_count: rows.length,
    };
  }

  if (rows.length < 5) {
    return {
      valid: false,
      filename,
      file_size: computedSize,
      error: `Dataset contains only ${rows.length} rows. At least 5 ball-by-ball records are required for pressure analysis.`,
      missing_columns: [],
      detected_columns: headers,
      mapped_columns: resolved,
      row_count: rows.length,
    };
  }

  return {
    valid: true,
    filename,
    file_size: computedSize,
    error: null,
    missing_columns: [],
    detected_columns: headers,
    mapped_columns: resolved,
    row_count: rows.length,
    message: `Validated ${rows.length.toLocaleString()} ball-by-ball records across ${Object.keys(resolved).length} mapped schema fields.`,
  };
}

function safeInt(val: string | undefined, fallback = 0): number {
  if (!val) return fallback;
  const parsed = Number.parseInt(val.trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractWicketInfo(
  row: Record<string, string>,
  resolved: Record<string, string>
): { isWicket: boolean; wicketType: string; playerDismissed: string } {
  const wicketType = resolved.wicket_type ? (row[resolved.wicket_type] || '').trim() : '';
  const playerDismissed = resolved.player_dismissed
    ? (row[resolved.player_dismissed] || '').trim()
    : '';

  if (resolved.wicket) {
    const raw = (row[resolved.wicket] || '').trim().toLowerCase();
    if (['1', 'true', 'yes', 'out', 'w'].includes(raw)) {
      return {
        isWicket: true,
        wicketType: wicketType || 'dismissed',
        playerDismissed,
      };
    }
    if (raw && !['0', 'false', 'no', 'none', 'nan', 'null'].includes(raw)) {
      return {
        isWicket: true,
        wicketType: wicketType || raw,
        playerDismissed,
      };
    }
  }

  if (playerDismissed && !['none', 'nan', 'null', '0'].includes(playerDismissed.toLowerCase())) {
    return {
      isWicket: true,
      wicketType: wicketType || 'dismissed',
      playerDismissed,
    };
  }

  if (wicketType && !['none', 'nan', 'null', '0'].includes(wicketType.toLowerCase())) {
    return {
      isWicket: true,
      wicketType,
      playerDismissed,
    };
  }

  return { isWicket: false, wicketType: '', playerDismissed: '' };
}

function updateJob(
  jobId: string,
  stage: number,
  progressPct: number,
  recordsProcessed: number,
  statusMessage: string,
  status: 'running' | 'completed' | 'failed' = 'running',
  results: LiveAnalysisResults | null = null,
  error: string | null = null
): void {
  const job = jobsStore.get(jobId);
  if (!job) return;
  const clampedStage = Math.min(8, Math.max(1, stage));
  job.current_stage = clampedStage;
  job.current_stage_title = STAGE_DEFINITIONS[clampedStage - 1].title;
  job.progress_pct = progressPct;
  job.records_processed = recordsProcessed;
  job.status_message = statusMessage;
  job.status = status;
  if (error) job.error = error;
  if (results) {
    job.results = results;
    job.has_results = true;
  }

  for (const s of job.stages) {
    if (s.stage < clampedStage) {
      s.status = 'completed';
    } else if (s.stage === clampedStage) {
      s.status =
        status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'active';
      s.detail = statusMessage;
    } else {
      s.status = 'pending';
    }
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runAnalysisPipeline(
  jobId: string,
  filename: string,
  fileSize: number,
  csvText: string,
  stepDelayMs: number
): Promise<void> {
  try {
    // Stage 1: Reading uploaded CSV.
    updateJob(
      jobId,
      1,
      8,
      0,
      `Reading CSV byte stream from ${filename} (${fileSize.toLocaleString()} bytes)…`
    );
    if (stepDelayMs > 0) await delay(stepDelayMs);

    const { headers, rows: rawRows } = parseCsvText(csvText);
    const totalRecords = rawRows.length;
    const job = jobsStore.get(jobId);
    if (job) job.total_records = totalRecords;

    updateJob(
      jobId,
      1,
      14,
      totalRecords,
      `Read ${totalRecords.toLocaleString()} raw delivery rows across ${headers.length} columns.`
    );
    if (stepDelayMs > 0) await delay(stepDelayMs);

    // Stage 2: Validating columns and data.
    updateJob(
      jobId,
      2,
      22,
      totalRecords,
      'Validating ball-by-ball schema fields and data integrity…'
    );
    const validation = validateCsvPayload(filename, csvText, fileSize);
    if (!validation.valid) {
      updateJob(
        jobId,
        2,
        22,
        0,
        validation.error || 'Dataset validation failed.',
        'failed',
        null,
        validation.error
      );
      return;
    }

    const resolved = validation.mapped_columns;
    updateJob(
      jobId,
      2,
      28,
      totalRecords,
      `Verified ${Object.keys(resolved).length} core cricket telemetry fields.`
    );
    if (stepDelayMs > 0) await delay(stepDelayMs);

    // Stage 3: Processing match and ball-level records.
    updateJob(
      jobId,
      3,
      36,
      0,
      'Reconstructing match timelines, innings totals, and delivery sequences…'
    );

    interface ParsedDelivery {
      idx: number;
      match_id: string;
      innings: number;
      over: number;
      ball: number;
      batter: string;
      bowler: string;
      batting_team: string;
      bowling_team: string;
      runs_off_bat: number;
      extras: number;
      total_runs: number;
      is_wicket: boolean;
      wicket_type: string;
      player_dismissed: string;
      phase: string;
      pressure_index: number;
      is_pressure_ball: boolean;
      pressure_reasons: string[];
      required_rate: number | null;
      score_snapshot: string;
      over_ball_label: string;
    }

    const parsedDeliveries: ParsedDelivery[] = [];
    const inningsTotals = new Map<string, number>();

    for (let idx = 0; idx < rawRows.length; idx++) {
      const row = rawRows[idx];
      const matchId = (resolved.match_id ? row[resolved.match_id] : '') || 'MATCH_01';
      const innings = Math.max(1, safeInt(resolved.innings ? row[resolved.innings] : '1', 1));

      const rawOverStr = (resolved.over ? row[resolved.over] : '0') || '0';
      let overNum = 0;
      let ballNum = 1;
      if (rawOverStr.includes('.') && resolved.over === resolved.ball) {
        const [oPart, bPart] = rawOverStr.split('.');
        overNum = safeInt(oPart, 0);
        ballNum = Math.max(1, safeInt(bPart, 1));
      } else {
        overNum = safeInt(rawOverStr, 0);
        ballNum = Math.max(
          1,
          safeInt(resolved.ball ? row[resolved.ball] : '', (idx % 6) + 1)
        );
      }

      const batter = (row[resolved.batter] || '').trim() || 'Unknown Batter';
      const bowler = (row[resolved.bowler] || '').trim() || 'Unknown Bowler';
      const battingTeam =
        (resolved.batting_team ? row[resolved.batting_team] : '').trim() || 'Team A';
      const bowlingTeam =
        (resolved.bowling_team ? row[resolved.bowling_team] : '').trim() || 'Team B';

      const runsBat = safeInt(row[resolved.runs_off_bat], 0);
      const extras = safeInt(resolved.extras ? row[resolved.extras] : '0', 0);
      const totalRuns = safeInt(
        resolved.total_runs ? row[resolved.total_runs] : String(runsBat + extras),
        runsBat + extras
      );

      const { isWicket, wicketType, playerDismissed } = extractWicketInfo(row, resolved);
      const innKey = `${matchId}__${innings}`;
      inningsTotals.set(innKey, (inningsTotals.get(innKey) ?? 0) + totalRuns);

      parsedDeliveries.push({
        idx: idx + 1,
        match_id: matchId,
        innings,
        over: overNum,
        ball: ballNum,
        batter,
        bowler,
        batting_team: battingTeam,
        bowling_team: bowlingTeam,
        runs_off_bat: runsBat,
        extras,
        total_runs: totalRuns,
        is_wicket: isWicket,
        wicket_type: wicketType,
        player_dismissed: playerDismissed || (isWicket ? batter : ''),
        phase: '',
        pressure_index: 0,
        is_pressure_ball: false,
        pressure_reasons: [],
        required_rate: null,
        score_snapshot: '',
        over_ball_label: `${overNum}.${ballNum}`,
      });
    }

    updateJob(
      jobId,
      3,
      46,
      totalRecords,
      `Processed ${totalRecords.toLocaleString()} ball-level records across ${inningsTotals.size} innings.`
    );
    if (stepDelayMs > 0) await delay(stepDelayMs);

    // Stage 4: Identifying pressure situations.
    updateJob(
      jobId,
      4,
      54,
      totalRecords,
      'Evaluating required run rates, wicket clusters, and match phase leverage…'
    );

    const runningState = new Map<
      string,
      { runs: number; wickets: number; balls: number; recentWickets: number[] }
    >();
    const matchTeams = new Map<string, Set<string>>();
    let pressureBallsCount = 0;

    for (const d of parsedDeliveries) {
      if (!matchTeams.has(d.match_id)) {
        matchTeams.set(d.match_id, new Set());
      }
      matchTeams.get(d.match_id)!.add(d.batting_team);
      matchTeams.get(d.match_id)!.add(d.bowling_team);

      const stateKey = `${d.match_id}__${d.innings}`;
      if (!runningState.has(stateKey)) {
        runningState.set(stateKey, { runs: 0, wickets: 0, balls: 0, recentWickets: [] });
      }
      const st = runningState.get(stateKey)!;
      st.runs += d.total_runs;
      st.balls += 1;
      if (d.is_wicket) {
        st.wickets += 1;
        st.recentWickets.push(st.balls);
      }
      st.recentWickets = st.recentWickets.filter((b) => st.balls - b <= 18);

      const over1Based = d.over < 20 ? d.over + 1 : d.over;
      d.phase =
        over1Based <= 6
          ? 'Powerplay (1-6)'
          : over1Based <= 15
          ? 'Middle (7-15)'
          : 'Death (16-20)';

      const reasons: string[] = [];
      let basePressure = 38.0;

      if (over1Based >= 16) {
        basePressure += 26.0;
        reasons.push('Death Overs (16-20)');
      } else if (over1Based >= 13) {
        basePressure += 12.0;
      }

      if (st.recentWickets.length >= 2) {
        basePressure += 20.0;
        reasons.push(`Cluster Wickets (${st.recentWickets.length} in 3 overs)`);
      } else if (st.wickets >= 3 && over1Based <= 10) {
        basePressure += 18.0;
        reasons.push(`Top-Order Collapse (${st.wickets} wkts)`);
      } else if (st.wickets >= 5) {
        basePressure += 14.0;
        reasons.push(`Lower-Order Exposure (${st.wickets} wkts down)`);
      }

      let reqRate: number | null = null;
      if (d.innings >= 2) {
        const firstInnTotal = inningsTotals.get(`${d.match_id}__1`) ?? 175;
        const target = Math.max(firstInnTotal + 1, st.runs + 1);
        const ballsRem = Math.max(1, 120 - st.balls);
        const runsNeeded = Math.max(0, target - st.runs);
        reqRate = Number(((runsNeeded * 6.0) / ballsRem).toFixed(2));
        if (reqRate >= 11.5) {
          basePressure += 24.0;
          reasons.push(`Steep Chase RRR ${reqRate.toFixed(1)}`);
        } else if (reqRate >= 9.5) {
          basePressure += 14.0;
          reasons.push(`Elevated Chase RRR ${reqRate.toFixed(1)}`);
        }
      } else {
        const currRr = (st.runs * 6.0) / Math.max(1, st.balls);
        if (over1Based >= 15 && currRr < 8.0) {
          basePressure += 14.0;
          reasons.push('Late First-Innings Acceleration Stress');
        }
      }

      if (d.is_wicket || d.runs_off_bat >= 4) {
        basePressure += 5.0;
      }

      const pressureIndex = Number(Math.min(99.4, Math.max(22.0, basePressure)).toFixed(1));
      const isPressure = pressureIndex >= 62.0 || reasons.length > 0;
      if (isPressure && reasons.length === 0) {
        reasons.push('High Leverage Phase');
      }
      if (isPressure) {
        pressureBallsCount += 1;
      }

      d.pressure_index = pressureIndex;
      d.is_pressure_ball = isPressure;
      d.pressure_reasons = reasons;
      d.required_rate = reqRate;
      d.score_snapshot = `${st.runs}/${st.wickets}`;
    }

    updateJob(
      jobId,
      4,
      62,
      totalRecords,
      `Identified ${pressureBallsCount.toLocaleString()} high-pressure deliveries (${((pressureBallsCount / Math.max(1, totalRecords)) * 100).toFixed(1)}% of dataset).`
    );
    if (stepDelayMs > 0) await delay(stepDelayMs);

    // Stage 5: Calculating batting performance under pressure.
    updateJob(
      jobId,
      5,
      72,
      totalRecords,
      'Computing empirical-Bayes batting pressure scores, strike rates, and control metrics…'
    );

    const batterStats = new Map<
      string,
      {
        player_name: string;
        teams: Set<string>;
        matches: Set<string>;
        innings: Set<number>;
        runs: number;
        balls: number;
        dismissals: number;
        p_runs: number;
        p_balls: number;
        p_dismissals: number;
        p_dots: number;
        p_boundaries: number;
      }
    >();

    for (const d of parsedDeliveries) {
      if (!batterStats.has(d.batter)) {
        batterStats.set(d.batter, {
          player_name: d.batter,
          teams: new Set(),
          matches: new Set(),
          innings: new Set(),
          runs: 0,
          balls: 0,
          dismissals: 0,
          p_runs: 0,
          p_balls: 0,
          p_dismissals: 0,
          p_dots: 0,
          p_boundaries: 0,
        });
      }
      const st = batterStats.get(d.batter)!;
      st.teams.add(d.batting_team);
      st.matches.add(d.match_id);
      st.innings.add(d.innings);
      st.runs += d.runs_off_bat;
      st.balls += 1;
      if (d.is_wicket && (!d.player_dismissed || d.player_dismissed === d.batter)) {
        st.dismissals += 1;
      }

      if (d.is_pressure_ball) {
        st.p_runs += d.runs_off_bat;
        st.p_balls += 1;
        if (d.runs_off_bat === 0 && d.extras === 0) st.p_dots += 1;
        if (d.runs_off_bat >= 4) st.p_boundaries += 1;
        if (d.is_wicket && (!d.player_dismissed || d.player_dismissed === d.batter)) {
          st.p_dismissals += 1;
        }
      }
    }

    if (stepDelayMs > 0) await delay(stepDelayMs);

    // Stage 6: Calculating bowling performance under pressure.
    updateJob(
      jobId,
      6,
      82,
      totalRecords,
      'Computing bowling pressure economy, dot-ball suppression, and wicket impact…'
    );

    const bowlerStats = new Map<
      string,
      {
        player_name: string;
        teams: Set<string>;
        matches: Set<string>;
        innings: Set<number>;
        runs_conceded: number;
        balls: number;
        wickets: number;
        p_runs_conceded: number;
        p_balls: number;
        p_wickets: number;
        p_dots: number;
        p_boundaries_conceded: number;
      }
    >();

    for (const d of parsedDeliveries) {
      if (!bowlerStats.has(d.bowler)) {
        bowlerStats.set(d.bowler, {
          player_name: d.bowler,
          teams: new Set(),
          matches: new Set(),
          innings: new Set(),
          runs_conceded: 0,
          balls: 0,
          wickets: 0,
          p_runs_conceded: 0,
          p_balls: 0,
          p_wickets: 0,
          p_dots: 0,
          p_boundaries_conceded: 0,
        });
      }
      const st = bowlerStats.get(d.bowler)!;
      st.teams.add(d.bowling_team);
      st.matches.add(d.match_id);
      st.innings.add(d.innings);
      st.runs_conceded += d.total_runs;
      st.balls += 1;
      if (d.is_wicket) st.wickets += 1;

      if (d.is_pressure_ball) {
        st.p_runs_conceded += d.total_runs;
        st.p_balls += 1;
        if (d.total_runs === 0) st.p_dots += 1;
        if (d.runs_off_bat >= 4) st.p_boundaries_conceded += 1;
        if (d.is_wicket) st.p_wickets += 1;
      }
    }

    if (stepDelayMs > 0) await delay(stepDelayMs);

    // Stage 7: Comparing players and calculating rankings.
    updateJob(
      jobId,
      7,
      92,
      totalRecords,
      'Comparing player distributions and ranking Top 10 Batters and Top 10 Bowlers…'
    );

    const batterResults: PlayerPressureResult[] = [];
    for (const [bName, st] of batterStats.entries()) {
      const effBalls = st.p_balls > 0 ? st.p_balls : st.balls;
      const effRuns = st.p_balls > 0 ? st.p_runs : st.runs;
      const sr = Number(((st.runs * 100.0) / Math.max(1, st.balls)).toFixed(2));
      const pSr = Number(((effRuns * 100.0) / Math.max(1, effBalls)).toFixed(2));
      const dotPct = Number(((st.p_dots * 100.0) / Math.max(1, effBalls)).toFixed(1));
      const boundPct = Number(((st.p_boundaries * 100.0) / Math.max(1, effBalls)).toFixed(1));
      const controlPct = Number(
        Math.max(
          45.0,
          Math.min(
            97.5,
            100.0 - dotPct * 0.55 - (st.p_dismissals * 12.0) / Math.max(1, effBalls / 6.0)
          )
        ).toFixed(1)
      );

      const shrink = effBalls / (effBalls + 10.0);
      const rawScore =
        52.0 +
        (pSr - 125.0) * 0.22 +
        boundPct * 0.38 -
        dotPct * 0.25 +
        effRuns * 0.28 -
        st.p_dismissals * 4.5;
      const pressureScore = Number(
        Math.max(35.0, Math.min(99.2, 62.0 * (1.0 - shrink) + rawScore * shrink)).toFixed(2)
      );

      const evLevel: 'strong' | 'moderate' | 'limited' =
        effBalls >= 12 ? 'strong' : effBalls >= 6 ? 'moderate' : 'limited';
      const teamsList = Array.from(st.teams).sort();

      batterResults.push({
        rank: 0,
        player_name: bName,
        role: 'batting',
        team: teamsList[0] || 'Unknown',
        teams: teamsList,
        matches: st.matches.size,
        innings_list: Array.from(st.innings).sort((a, b) => a - b),
        match_ids: Array.from(st.matches).sort(),
        pressure_score: pressureScore,
        runs: st.runs,
        balls: st.balls,
        wickets: st.dismissals,
        pressure_runs: effRuns,
        pressure_balls: effBalls,
        pressure_wickets: st.p_dismissals,
        strike_rate: sr,
        pressure_strike_rate: pSr,
        economy: 0,
        pressure_economy: 0,
        dot_ball_pct: dotPct,
        boundary_pct: boundPct,
        control_pct: controlPct,
        evidence_level: evLevel,
      });
    }

    batterResults.sort(
      (a, b) =>
        b.pressure_score - a.pressure_score ||
        b.pressure_runs - a.pressure_runs ||
        b.pressure_strike_rate - a.pressure_strike_rate
    );
    batterResults.forEach((item, index) => {
      item.rank = index + 1;
    });

    const bowlerResults: PlayerPressureResult[] = [];
    for (const [bwName, st] of bowlerStats.entries()) {
      const effBalls = st.p_balls > 0 ? st.p_balls : st.balls;
      const effRuns = st.p_balls > 0 ? st.p_runs_conceded : st.runs_conceded;
      const effWkts = st.p_balls > 0 ? st.p_wickets : st.wickets;
      const econ = Number(((st.runs_conceded * 6.0) / Math.max(1, st.balls)).toFixed(2));
      const pEcon = Number(((effRuns * 6.0) / Math.max(1, effBalls)).toFixed(2));
      const dotPct = Number(((st.p_dots * 100.0) / Math.max(1, effBalls)).toFixed(1));
      const boundPct = Number(
        ((st.p_boundaries_conceded * 100.0) / Math.max(1, effBalls)).toFixed(1)
      );
      const controlPct = Number(
        Math.max(
          48.0,
          Math.min(98.0, 62.0 + dotPct * 0.45 - boundPct * 0.35 + effWkts * 3.2)
        ).toFixed(1)
      );

      const shrink = effBalls / (effBalls + 10.0);
      const rawScore =
        56.0 +
        (9.2 - pEcon) * 4.2 +
        dotPct * 0.35 +
        effWkts * 7.5 -
        boundPct * 0.25;
      const pressureScore = Number(
        Math.max(35.0, Math.min(99.4, 62.0 * (1.0 - shrink) + rawScore * shrink)).toFixed(2)
      );

      const evLevel: 'strong' | 'moderate' | 'limited' =
        effBalls >= 12 ? 'strong' : effBalls >= 6 ? 'moderate' : 'limited';
      const teamsList = Array.from(st.teams).sort();

      bowlerResults.push({
        rank: 0,
        player_name: bwName,
        role: 'bowling',
        team: teamsList[0] || 'Unknown',
        teams: teamsList,
        matches: st.matches.size,
        innings_list: Array.from(st.innings).sort((a, b) => a - b),
        match_ids: Array.from(st.matches).sort(),
        pressure_score: pressureScore,
        runs: st.runs_conceded,
        balls: st.balls,
        wickets: st.wickets,
        pressure_runs: effRuns,
        pressure_balls: effBalls,
        pressure_wickets: effWkts,
        strike_rate: st.wickets > 0 ? Number((st.balls / st.wickets).toFixed(1)) : 0,
        pressure_strike_rate: effWkts > 0 ? Number((effBalls / effWkts).toFixed(1)) : 0,
        economy: econ,
        pressure_economy: pEcon,
        dot_ball_pct: dotPct,
        boundary_pct: boundPct,
        control_pct: controlPct,
        evidence_level: evLevel,
      });
    }

    bowlerResults.sort(
      (a, b) =>
        b.pressure_score - a.pressure_score ||
        b.pressure_wickets - a.pressure_wickets ||
        a.pressure_economy - b.pressure_economy
    );
    bowlerResults.forEach((item, index) => {
      item.rank = index + 1;
    });

    if (stepDelayMs > 0) await delay(stepDelayMs);

    // Stage 8: Generating final results.
    updateJob(
      jobId,
      8,
      97,
      totalRecords,
      'Compiling Top 10 rankings, best player spotlights, and ball-level evidence…'
    );

    const matchLabels = new Map<string, string>();
    for (const [mId, tSet] of matchTeams.entries()) {
      const sorted = Array.from(tSet).sort();
      if (sorted.length >= 2) {
        matchLabels.set(mId, `${sorted[0]} vs ${sorted[1]} (${mId})`);
      } else if (sorted.length === 1) {
        matchLabels.set(mId, `${sorted[0]} (${mId})`);
      } else {
        matchLabels.set(mId, mId);
      }
    }

    const pressureDeliveries = parsedDeliveries.filter((d) => d.is_pressure_ball);
    pressureDeliveries.sort(
      (a, b) =>
        b.pressure_index - a.pressure_index ||
        Number(b.is_wicket) - Number(a.is_wicket) ||
        b.runs_off_bat - a.runs_off_bat
    );
    const sourceEvidence =
      pressureDeliveries.length > 0
        ? pressureDeliveries.slice(0, 120)
        : parsedDeliveries.slice(0, 80);

    const ballEvidence: BallEvidenceRecord[] = sourceEvidence.map((d) => ({
      record_id: `REC_${String(d.idx).padStart(4, '0')}`,
      match_id: d.match_id,
      match_label: matchLabels.get(d.match_id) || d.match_id,
      innings: d.innings,
      over: d.over,
      ball: d.ball,
      over_ball_label: d.over_ball_label,
      batting_team: d.batting_team,
      bowling_team: d.bowling_team,
      batter: d.batter,
      bowler: d.bowler,
      runs_off_bat: d.runs_off_bat,
      extras: d.extras,
      total_runs: d.total_runs,
      is_wicket: d.is_wicket,
      wicket_type: d.wicket_type,
      player_dismissed: d.player_dismissed,
      phase: d.phase,
      pressure_index: d.pressure_index,
      is_pressure_ball: d.is_pressure_ball,
      pressure_reasons: d.pressure_reasons,
      required_rate: d.required_rate,
      score_snapshot: d.score_snapshot,
    }));

    const allTeams = Array.from(
      new Set(parsedDeliveries.flatMap((d) => [d.batting_team, d.bowling_team]))
    ).sort();
    const allMatches = Array.from(matchTeams.keys())
      .sort()
      .map((mId) => ({ id: mId, label: matchLabels.get(mId) || mId }));
    const allInnings = Array.from(new Set(parsedDeliveries.map((d) => d.innings))).sort(
      (a, b) => a - b
    );
    const allPlayers = Array.from(
      new Set(parsedDeliveries.flatMap((d) => [d.batter, d.bowler]))
    ).sort();

    const finalResults: LiveAnalysisResults = {
      job_id: jobId,
      filename,
      file_size: fileSize,
      completed_at: new Date().toISOString(),
      summary: {
        total_records: totalRecords,
        pressure_records: pressureBallsCount,
        pressure_density_pct: Number(
          ((pressureBallsCount * 100.0) / Math.max(1, totalRecords)).toFixed(1)
        ),
        total_matches: allMatches.length,
        total_teams: allTeams.length,
        total_batters_evaluated: batterResults.length,
        total_bowlers_evaluated: bowlerResults.length,
      },
      best_batter: batterResults[0] ?? null,
      best_bowler: bowlerResults[0] ?? null,
      top_batters: batterResults.slice(0, 10),
      top_bowlers: bowlerResults.slice(0, 10),
      all_batters: batterResults,
      all_bowlers: bowlerResults,
      ball_evidence: ballEvidence,
      available_filters: {
        teams: allTeams,
        matches: allMatches,
        innings: allInnings,
        players: allPlayers,
      },
    };

    updateJob(
      jobId,
      8,
      100,
      totalRecords,
      `Completed analysis of ${totalRecords.toLocaleString()} deliveries across ${allMatches.length} matches.`,
      'completed',
      finalResults
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    updateJob(jobId, 1, 0, 0, `Analysis failed: ${msg}`, 'failed', null, msg);
  }
}

export async function startAnalysisJob(
  filename: string,
  fileSize: number,
  csvText: string,
  synchronous = false
): Promise<LiveJobStatus> {
  const validation = validateCsvPayload(filename, csvText, fileSize);
  if (!validation.valid) {
    throw new Error(validation.error || 'Dataset validation failed.');
  }

  const jobId = `job_${crypto.randomBytes(6).toString('hex')}`;
  const initialStages: AnalysisStageState[] = STAGE_DEFINITIONS.map((s) => ({
    stage: s.stage,
    title: s.title,
    status: s.stage === 1 ? 'active' : 'pending',
    detail: s.stage === 1 ? 'Initializing…' : 'Queued',
  }));

  const jobState: InternalJob = {
    job_id: jobId,
    filename,
    file_size: validation.file_size,
    status: 'running',
    current_stage: 1,
    current_stage_title: STAGE_DEFINITIONS[0].title,
    progress_pct: 4,
    records_processed: 0,
    total_records: validation.row_count,
    status_message: `Queued ${filename} (${validation.row_count.toLocaleString()} records) for pressure analysis.`,
    stages: initialStages,
    error: null,
    has_results: false,
    results: null,
  };

  jobsStore.set(jobId, jobState);

  if (synchronous) {
    await runAnalysisPipeline(jobId, filename, validation.file_size, csvText, 0);
  } else {
    void runAnalysisPipeline(jobId, filename, validation.file_size, csvText, 240);
  }

  return getJobStatus(jobId)!;
}

export function getJobStatus(jobId: string): LiveJobStatus | null {
  const job = jobsStore.get(jobId);
  if (!job) return null;
  return {
    job_id: job.job_id,
    filename: job.filename,
    file_size: job.file_size,
    status: job.status,
    current_stage: job.current_stage,
    current_stage_title: job.current_stage_title,
    progress_pct: job.progress_pct,
    records_processed: job.records_processed,
    total_records: job.total_records,
    status_message: job.status_message,
    stages: job.stages.map((s) => ({ ...s })),
    error: job.error,
    has_results: job.has_results,
  };
}

export function getJobResults(jobId: string): LiveAnalysisResults | null {
  const job = jobsStore.get(jobId);
  if (!job || !job.results) return null;
  return job.results;
}

/**
 * Generates a realistic multi-match T20 ball-by-ball CSV dataset (180+ deliveries)
 * featuring Rajasthan Royals, Mumbai Indians, Chennai Super Kings, and Kolkata Knight Riders
 * across high-pressure death overs, wicket clusters, and steep run chases.
 */
export function generateSampleBallByBallCsv(): string {
  const header =
    'match_id,innings,over,ball,batting_team,bowling_team,batter,bowler,runs_off_bat,extras,total_runs,is_wicket,wicket_type,player_dismissed';

  const matches: Array<{
    id: string;
    inn1: {
      batTeam: string;
      bowlTeam: string;
      batters: string[];
      bowlers: string[];
    };
    inn2: {
      batTeam: string;
      bowlTeam: string;
      batters: string[];
      bowlers: string[];
    };
  }> = [
    {
      id: 'IPL_2025_RR_MI',
      inn1: {
        batTeam: 'Rajasthan Royals',
        bowlTeam: 'Mumbai Indians',
        batters: ['Yashasvi Jaiswal', 'Jos Buttler', 'Sanju Samson', 'Riyan Parag', 'Shimron Hetmyer', 'Dhruv Jurel'],
        bowlers: ['Trent Boult', 'Jasprit Bumrah', 'Hardik Pandya', 'Piyush Chawla'],
      },
      inn2: {
        batTeam: 'Mumbai Indians',
        bowlTeam: 'Rajasthan Royals',
        batters: ['Rohit Sharma', 'Ishan Kishan', 'Suryakumar Yadav', 'Tilak Varma', 'Hardik Pandya', 'Tim David'],
        bowlers: ['Sandeep Sharma', 'Yuzvendra Chahal', 'Avesh Khan', 'Ravichandran Ashwin'],
      },
    },
    {
      id: 'IPL_2025_RR_CSK',
      inn1: {
        batTeam: 'Chennai Super Kings',
        bowlTeam: 'Rajasthan Royals',
        batters: ['Ruturaj Gaikwad', 'Rachin Ravindra', 'Shivam Dube', 'Ravindra Jadeja', 'MS Dhoni'],
        bowlers: ['Sandeep Sharma', 'Yuzvendra Chahal', 'Avesh Khan', 'Ravichandran Ashwin'],
      },
      inn2: {
        batTeam: 'Rajasthan Royals',
        bowlTeam: 'Chennai Super Kings',
        batters: ['Yashasvi Jaiswal', 'Sanju Samson', 'Riyan Parag', 'Dhruv Jurel', 'Shimron Hetmyer'],
        bowlers: ['Matheesha Pathirana', 'Ravindra Jadeja', 'Tushar Deshpande', 'Mustafizur Rahman'],
      },
    },
    {
      id: 'IPL_2025_KKR_MI',
      inn1: {
        batTeam: 'Kolkata Knight Riders',
        bowlTeam: 'Mumbai Indians',
        batters: ['Phil Salt', 'Sunil Narine', 'Shreyas Iyer', 'Rinku Singh', 'Andre Russell'],
        bowlers: ['Jasprit Bumrah', 'Hardik Pandya', 'Piyush Chawla'],
      },
      inn2: {
        batTeam: 'Mumbai Indians',
        bowlTeam: 'Kolkata Knight Riders',
        batters: ['Rohit Sharma', 'Suryakumar Yadav', 'Tilak Varma', 'Tim David'],
        bowlers: ['Varun Chakravarthy', 'Sunil Narine', 'Harshit Rana', 'Andre Russell'],
      },
    },
  ];

  // Deterministic ball patterns for realistic pressure cricket scores
  const rows: string[] = [header];
  const oversToSimulate = [3, 5, 9, 13, 15, 16, 17, 18, 19];

  matches.forEach((m, mIdx) => {
    [1, 2].forEach((innNum) => {
      const cfg = innNum === 1 ? m.inn1 : m.inn2;
      let batterIdx = 0;

      oversToSimulate.forEach((overNum, oIdx) => {
        const bowler = cfg.bowlers[(oIdx + mIdx) % cfg.bowlers.length];
        for (let ball = 1; ball <= 6; ball++) {
          const batter = cfg.batters[batterIdx % cfg.batters.length];
          const seed = (mIdx * 97 + innNum * 41 + overNum * 17 + ball * 13) % 20;

          let runsBat = 1;
          let extras = 0;
          let isWicket = 0;
          let wicketType = '';
          let dismissed = '';

          // Make Sanju Samson, Riyan Parag, Rinku Singh, Suryakumar Yadav, Jasprit Bumrah, Sandeep Sharma, Yuzvendra Chahal stand out under pressure
          if (['Sanju Samson', 'Riyan Parag', 'Suryakumar Yadav', 'Rinku Singh', 'Shimron Hetmyer'].includes(batter)) {
            if (seed < 4) runsBat = 6;
            else if (seed < 9) runsBat = 4;
            else if (seed < 14) runsBat = 2;
            else if (seed < 18) runsBat = 1;
            else if (seed === 19 && overNum >= 18 && ball === 6) {
              runsBat = 0;
              isWicket = 1;
              wicketType = 'caught';
              dismissed = batter;
              batterIdx++;
            } else {
              runsBat = 0;
            }
          } else {
            if (seed < 2) runsBat = 6;
            else if (seed < 5) runsBat = 4;
            else if (seed < 10) runsBat = 1;
            else if (seed >= 17) {
              runsBat = 0;
              isWicket = 1;
              wicketType = seed === 18 ? 'bowled' : 'caught';
              dismissed = batter;
              batterIdx++;
            } else {
              runsBat = 0;
            }
          }

          if (['Jasprit Bumrah', 'Sandeep Sharma', 'Yuzvendra Chahal', 'Matheesha Pathirana', 'Varun Chakravarthy'].includes(bowler)) {
            if (seed % 3 === 0 && isWicket === 0) {
              runsBat = 0;
            }
            if (seed === 11 && isWicket === 0) {
              runsBat = 0;
              isWicket = 1;
              wicketType = 'lbw';
              dismissed = batter;
              batterIdx++;
            }
          }

          const totalRuns = runsBat + extras;
          rows.push(
            [
              m.id,
              innNum,
              overNum,
              ball,
              cfg.batTeam,
              cfg.bowlTeam,
              batter,
              bowler,
              runsBat,
              extras,
              totalRuns,
              isWicket,
              wicketType,
              dismissed,
            ].join(',')
          );
        }
      });
    });
  });

  return rows.join('\n');
}

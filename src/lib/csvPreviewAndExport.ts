export interface CsvPreviewData {
  headers: string[];
  rows: string[][];
  totalRowCount: number;
}

export interface PlayerPressureResult {
  rank: number;
  player_name: string;
  role: 'batting' | 'bowling';
  team: string;
  teams: string[];
  matches: number;
  innings_list: number[];
  match_ids: string[];
  pressure_score: number;
  runs: number;
  balls: number;
  wickets: number;
  pressure_runs: number;
  pressure_balls: number;
  pressure_wickets: number;
  strike_rate: number;
  pressure_strike_rate: number;
  economy: number;
  pressure_economy: number;
  dot_ball_pct: number;
  boundary_pct: number;
  control_pct: number;
  evidence_level: 'strong' | 'moderate' | 'limited';
}

export interface BallEvidenceRecord {
  record_id: string;
  match_id: string;
  match_label: string;
  innings: number;
  over: number;
  ball: number;
  over_ball_label: string;
  batting_team: string;
  bowling_team: string;
  batter: string;
  bowler: string;
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
}

export interface ResultsFilterState {
  playerQuery: string;
  team: string;
  matchId: string;
  innings: string;
  roleFilter: 'all' | 'batting' | 'bowling';
}

/**
 * Parses a CSV text string into headers, preview rows, and total data row count.
 */
export function parseCsvPreview(csvText: string, maxPreviewRows = 8): CsvPreviewData {
  const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) {
    return { headers: [], rows: [], totalRowCount: 0 };
  }

  const lines = normalized.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [], totalRowCount: 0 };
  }

  const parseLine = (line: string): string[] => {
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
  };

  const headers = parseLine(lines[0]);
  const dataLines = lines.slice(1);
  const previewRows = dataLines.slice(0, maxPreviewRows).map(parseLine);

  return {
    headers,
    rows: previewRows,
    totalRowCount: dataLines.length,
  };
}

/**
 * Formats byte size into human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Filters player pressure evaluations by player name, team, match, and innings.
 * When match or innings filters are active and ball-level evidence is available,
 * filters players who participated in the selected match/innings.
 */
export function filterPlayerResults(
  players: PlayerPressureResult[],
  filters: ResultsFilterState
): PlayerPressureResult[] {
  const q = filters.playerQuery.trim().toLowerCase();
  const team = filters.team;
  const matchId = filters.matchId;
  const inningsNum = filters.innings !== 'all' ? Number(filters.innings) : null;

  return players.filter((p) => {
    if (filters.roleFilter !== 'all' && p.role !== filters.roleFilter) {
      return false;
    }
    if (q && !p.player_name.toLowerCase().includes(q) && !p.team.toLowerCase().includes(q)) {
      return false;
    }
    if (team !== 'all' && p.team !== team && !p.teams.includes(team)) {
      return false;
    }
    if (matchId !== 'all' && !p.match_ids.includes(matchId)) {
      return false;
    }
    if (inningsNum !== null && !p.innings_list.includes(inningsNum)) {
      return false;
    }
    return true;
  });
}

/**
 * Filters ball-by-ball pressure evidence records by player, team, match, and innings.
 */
export function filterBallEvidence(
  evidence: BallEvidenceRecord[],
  filters: ResultsFilterState
): BallEvidenceRecord[] {
  const q = filters.playerQuery.trim().toLowerCase();
  const team = filters.team;
  const matchId = filters.matchId;
  const inningsNum = filters.innings !== 'all' ? Number(filters.innings) : null;

  return evidence.filter((item) => {
    if (
      q &&
      !item.batter.toLowerCase().includes(q) &&
      !item.bowler.toLowerCase().includes(q)
    ) {
      return false;
    }
    if (
      team !== 'all' &&
      item.batting_team !== team &&
      item.bowling_team !== team
    ) {
      return false;
    }
    if (matchId !== 'all' && item.match_id !== matchId) {
      return false;
    }
    if (inningsNum !== null && item.innings !== inningsNum) {
      return false;
    }
    return true;
  });
}

/**
 * Converts player pressure analysis results into a downloadable CSV string.
 */
export function generateResultsCsv(
  batters: PlayerPressureResult[],
  bowlers: PlayerPressureResult[]
): string {
  const headers = [
    'role',
    'rank',
    'player_name',
    'team',
    'pressure_score',
    'matches',
    'runs',
    'balls',
    'wickets',
    'pressure_runs',
    'pressure_balls',
    'pressure_wickets',
    'strike_rate',
    'pressure_strike_rate',
    'economy',
    'pressure_economy',
    'dot_ball_pct',
    'boundary_pct',
    'control_pct',
    'evidence_level',
  ];

  const escapeCell = (val: unknown): string => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const allRows = [...batters, ...bowlers].map((row) =>
    [
      row.role,
      row.rank,
      row.player_name,
      row.team,
      row.pressure_score.toFixed(2),
      row.matches,
      row.runs,
      row.balls,
      row.wickets,
      row.pressure_runs,
      row.pressure_balls,
      row.pressure_wickets,
      row.strike_rate.toFixed(2),
      row.pressure_strike_rate.toFixed(2),
      row.economy.toFixed(2),
      row.pressure_economy.toFixed(2),
      row.dot_ball_pct.toFixed(1),
      row.boundary_pct.toFixed(1),
      row.control_pct.toFixed(1),
      row.evidence_level,
    ]
      .map(escapeCell)
      .join(',')
  );

  return [headers.join(','), ...allRows].join('\n');
}

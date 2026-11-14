import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCsvPreview,
  formatFileSize,
  filterPlayerResults,
  filterBallEvidence,
  generateResultsCsv,
  PlayerPressureResult,
  BallEvidenceRecord,
} from './csvPreviewAndExport';

test('parseCsvPreview extracts headers, preview rows, and total row count accurately', () => {
  const sample = [
    'match_id,innings,over,ball,batter,bowler,runs_off_bat,extras,is_wicket',
    'M101,1,16,1,"Samson, SV",Bumrah,4,0,0',
    'M101,1,16,2,"Samson, SV",Bumrah,0,0,1',
    'M101,1,16,3,Parag,Bumrah,6,0,0',
  ].join('\n');

  const parsed = parseCsvPreview(sample, 2);
  assert.equal(parsed.headers.length, 9);
  assert.equal(parsed.headers[0], 'match_id');
  assert.equal(parsed.totalRowCount, 3);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0][4], 'Samson, SV');
});

test('formatFileSize formats bytes, KB, and MB cleanly', () => {
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(2048), '2.0 KB');
  assert.equal(formatFileSize(1048576 * 1.5), '1.50 MB');
});

test('filterPlayerResults filters by player query, team, matchId, and innings', () => {
  const players: PlayerPressureResult[] = [
    {
      rank: 1,
      player_name: 'Sanju Samson',
      role: 'batting',
      team: 'Rajasthan Royals',
      teams: ['Rajasthan Royals'],
      matches: 2,
      innings_list: [1, 2],
      match_ids: ['M1', 'M2'],
      pressure_score: 91.4,
      runs: 88,
      balls: 52,
      wickets: 1,
      pressure_runs: 54,
      pressure_balls: 28,
      pressure_wickets: 1,
      strike_rate: 169.2,
      pressure_strike_rate: 192.8,
      economy: 0,
      pressure_economy: 0,
      dot_ball_pct: 21.4,
      boundary_pct: 32.1,
      control_pct: 84.5,
      evidence_level: 'strong',
    },
    {
      rank: 2,
      player_name: 'Riyan Parag',
      role: 'batting',
      team: 'Rajasthan Royals',
      teams: ['Rajasthan Royals'],
      matches: 1,
      innings_list: [2],
      match_ids: ['M2'],
      pressure_score: 87.2,
      runs: 64,
      balls: 38,
      wickets: 0,
      pressure_runs: 48,
      pressure_balls: 25,
      pressure_wickets: 0,
      strike_rate: 168.4,
      pressure_strike_rate: 192.0,
      economy: 0,
      pressure_economy: 0,
      dot_ball_pct: 24.0,
      boundary_pct: 28.0,
      control_pct: 81.2,
      evidence_level: 'strong',
    },
  ];

  const byMatch1 = filterPlayerResults(players, {
    playerQuery: '',
    team: 'all',
    matchId: 'M1',
    innings: 'all',
    roleFilter: 'all',
  });
  assert.equal(byMatch1.length, 1);
  assert.equal(byMatch1[0].player_name, 'Sanju Samson');

  const byQuery = filterPlayerResults(players, {
    playerQuery: 'parag',
    team: 'all',
    matchId: 'all',
    innings: '2',
    roleFilter: 'batting',
  });
  assert.equal(byQuery.length, 1);
  assert.equal(byQuery[0].player_name, 'Riyan Parag');
});

test('filterBallEvidence filters ball records and generateResultsCsv produces valid CSV', () => {
  const evidence: BallEvidenceRecord[] = [
    {
      record_id: 'R1',
      match_id: 'M1',
      match_label: 'RR vs MI (M1)',
      innings: 2,
      over: 18,
      ball: 4,
      over_ball_label: '18.4',
      batting_team: 'Rajasthan Royals',
      bowling_team: 'Mumbai Indians',
      batter: 'Sanju Samson',
      bowler: 'Jasprit Bumrah',
      runs_off_bat: 6,
      extras: 0,
      total_runs: 6,
      is_wicket: false,
      wicket_type: '',
      player_dismissed: '',
      phase: 'Death (16-20)',
      pressure_index: 94.2,
      is_pressure_ball: true,
      pressure_reasons: ['Death Overs (16-20)', 'Steep Chase RRR 12.5'],
      required_rate: 12.5,
      score_snapshot: '158/4',
    },
  ];

  const filtered = filterBallEvidence(evidence, {
    playerQuery: 'bumrah',
    team: 'Mumbai Indians',
    matchId: 'M1',
    innings: '2',
    roleFilter: 'all',
  });
  assert.equal(filtered.length, 1);

  const csv = generateResultsCsv(
    [
      {
        rank: 1,
        player_name: 'Sanju Samson',
        role: 'batting',
        team: 'Rajasthan Royals',
        teams: ['Rajasthan Royals'],
        matches: 2,
        innings_list: [1, 2],
        match_ids: ['M1', 'M2'],
        pressure_score: 91.4,
        runs: 88,
        balls: 52,
        wickets: 1,
        pressure_runs: 54,
        pressure_balls: 28,
        pressure_wickets: 1,
        strike_rate: 169.2,
        pressure_strike_rate: 192.8,
        economy: 0,
        pressure_economy: 0,
        dot_ball_pct: 21.4,
        boundary_pct: 32.1,
        control_pct: 84.5,
        evidence_level: 'strong',
      },
    ],
    []
  );
  assert.ok(csv.includes('Sanju Samson'));
  assert.ok(csv.includes('91.40'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_LIVE_TABLES,
  REQUIRED_TABLE_SCHEMAS,
  buildTimelineStages,
  computeTableChecklist,
  formatBytesCompact,
  formatExpiryTimer,
  getEvidenceTierStyle,
  identifyCsvFilename,
  validateCsvContentForTable,
} from './liveConsoleUiHelpers';
import type { Job, LiveSchema, Validation } from '../api/liveClient';

const MOCK_VALIDATION: Validation = {
  original_rows: 240,
  processed_rows: 240,
  rejected_rows: 0,
  duplicate_records: 0,
  columns: ['match_id'],
  normalized_columns: ['n_match_id'],
  additional_columns: [],
  missing_values: { match_id: 0 },
  raw_preview: [{ match_id: 1 }],
  structured_preview: [{ n_match_id: 1 }],
  issues: [],
  sha256: 'abc123def456',
  notice: 'Verified.',
};

const MOCK_SCHEMA: LiveSchema = {
  required_columns: REQUIRED_TABLE_SCHEMAS,
  max_bytes: 2 * 1024 * 1024,
  max_rows: 10000,
  expires_seconds: 900,
  limitation: 'Six tables required.',
  methodology: {
    version: 'Phase 7A',
    description: 'Desc',
    pressure: 'Pressure',
    scores: 'Scores',
    evidence: 'Evidence',
    limitations: ['Lim 1'],
  },
};

test('REQUIRED_TABLE_SCHEMAS defines exact column counts and column names for all 6 CSV tables', () => {
  assert.equal(REQUIRED_TABLE_SCHEMAS.ball_by_ball.length, 23);
  assert.equal(REQUIRED_TABLE_SCHEMAS.matches.length, 11);
  assert.equal(REQUIRED_TABLE_SCHEMAS.competitions.length, 3);
  assert.equal(REQUIRED_TABLE_SCHEMAS.teams.length, 3);
  assert.equal(REQUIRED_TABLE_SCHEMAS.competition_team_player_mapping.length, 6);
  assert.equal(REQUIRED_TABLE_SCHEMAS.playing_eleven.length, 9);

  assert.deepEqual(REQUIRED_TABLE_SCHEMAS.competitions, [
    'comp_id',
    'comp_name',
    'match_format',
  ]);
  assert.deepEqual(REQUIRED_TABLE_SCHEMAS.teams, ['comp_id', 'team_id', 'team_name']);
  assert.deepEqual(REQUIRED_TABLE_SCHEMAS.competition_team_player_mapping, [
    'comp_id',
    'comp_name',
    'team_id',
    'team_name',
    'player_id',
    'player_name',
  ]);
  assert.deepEqual(REQUIRED_TABLE_SCHEMAS.playing_eleven, [
    'match_id',
    'team_id',
    'player_id',
    'batting_order',
    'is_played',
    'is_captain',
    'is_wk',
    'is_impact',
    'is_impact_off',
  ]);
  assert.deepEqual(REQUIRED_TABLE_SCHEMAS.matches, [
    'match_id',
    'comp_id',
    'match_date',
    'home_team_id',
    'away_team_id',
    'toss_win_team_id',
    'win_team_id',
    'result',
    'first_inn_revised_overs',
    'second_inn_revised_overs',
    'revised_target',
  ]);
});

test('identifyCsvFilename identifies each of the six CSV files by actual filename and rejects unknown filenames', () => {
  for (const table of CANONICAL_LIVE_TABLES) {
    const res = identifyCsvFilename(table.filename, MOCK_SCHEMA);
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.tableKey, table.key);
      assert.equal(res.canonicalFilename, table.filename);
      assert.deepEqual(res.requiredColumns, REQUIRED_TABLE_SCHEMAS[table.key]);
    }
  }

  const unknown = identifyCsvFilename('unknown_table.csv', MOCK_SCHEMA);
  assert.equal(unknown.ok, false);
  if (!unknown.ok) {
    assert.match(unknown.error, /Unrecognized CSV filename "unknown_table\.csv"/);
    assert.match(unknown.error, /ball_by_ball\.csv/);
  }

  const nonCsv = identifyCsvFilename('matches.xlsx', MOCK_SCHEMA);
  assert.equal(nonCsv.ok, false);
});

test('validateCsvContentForTable validates each companion CSV against its own schema and never requires ball_by_ball columns', () => {
  // 1. competitions.csv (3 columns)
  const compCsv = 'comp_id,comp_name,match_format\n1,IPL 2024,T20\n';
  const compRes = validateCsvContentForTable(compCsv, 'competitions', MOCK_SCHEMA);
  assert.equal(compRes.ok, true);
  if (compRes.ok) {
    assert.equal(compRes.validation.original_rows, 1);
    assert.deepEqual(compRes.presentColumns, ['comp_id', 'comp_name', 'match_format']);
  }

  // 2. matches.csv (11 columns)
  const matchesCsv =
    'match_id,comp_id,match_date,home_team_id,away_team_id,toss_win_team_id,win_team_id,result,first_inn_revised_overs,second_inn_revised_overs,revised_target\n' +
    '100,1,2024-04-01,10,20,10,10,Home Won,,,\n';
  const matchesRes = validateCsvContentForTable(matchesCsv, 'matches', MOCK_SCHEMA);
  assert.equal(matchesRes.ok, true);

  // 3. teams.csv (3 columns)
  const teamsCsv = 'comp_id,team_id,team_name\n1,10,Rajasthan Royals\n';
  const teamsRes = validateCsvContentForTable(teamsCsv, 'teams', MOCK_SCHEMA);
  assert.equal(teamsRes.ok, true);

  // 4. competition_team_player_mapping.csv (6 columns)
  const mappingCsv =
    'comp_id,comp_name,team_id,team_name,player_id,player_name\n1,IPL,10,RR,501,Sanju Samson\n';
  const mappingRes = validateCsvContentForTable(
    mappingCsv,
    'competition_team_player_mapping',
    MOCK_SCHEMA
  );
  assert.equal(mappingRes.ok, true);

  // 5. playing_eleven.csv (9 columns)
  const xiCsv =
    'match_id,team_id,player_id,batting_order,is_played,is_captain,is_wk,is_impact,is_impact_off\n' +
    '100,10,501,3,1,1,1,0,0\n';
  const xiRes = validateCsvContentForTable(xiCsv, 'playing_eleven', MOCK_SCHEMA);
  assert.equal(xiRes.ok, true);

  // Missing columns on competitions.csv reports ONLY competitions.csv missing columns, NEVER ball_by_ball columns
  const badCompCsv = 'comp_id,comp_name\n1,IPL 2024\n';
  const badCompRes = validateCsvContentForTable(badCompCsv, 'competitions', MOCK_SCHEMA);
  assert.equal(badCompRes.ok, false);
  if (!badCompRes.ok) {
    assert.deepEqual(badCompRes.missingColumns, ['match_format']);
    assert.equal(badCompRes.error, 'competitions.csv: Missing required columns: match_format');
    assert.equal(badCompRes.error.includes('overid'), false);
    assert.equal(badCompRes.error.includes('striker_id'), false);
  }
});

test('computeTableChecklist reflects validated, staged, and missing tables accurately', () => {
  const initial = computeTableChecklist(MOCK_SCHEMA, null, []);
  assert.equal(initial.length, 6);
  assert.equal(
    initial.every((t) => t.status === 'awaiting_initial'),
    true
  );

  // Staged companion upload before ball_by_ball job exists
  const staged = computeTableChecklist(
    MOCK_SCHEMA,
    null,
    [{ name: 'competitions.csv', size: 1024 }],
    { competitions: MOCK_VALIDATION }
  );
  const compItem = staged.find((t) => t.key === 'competitions');
  const bbbItem = staged.find((t) => t.key === 'ball_by_ball');
  assert.equal(compItem?.status, 'staged');
  assert.equal(compItem?.uploadedSize, 1024);
  assert.equal(bbbItem?.status, 'missing');

  const partialJob: Job = {
    status: 'validated',
    stages: ['ball_by_ball: CSV read and schema checked'],
    validation: {
      ball_by_ball: MOCK_VALIDATION,
      matches: MOCK_VALIDATION,
    },
    missing_tables: [
      'competitions',
      'teams',
      'competition_team_player_mapping',
      'playing_eleven',
    ],
    analysis_available: false,
    message: null,
    expires_in_seconds: 850,
  };

  const afterPartial = computeTableChecklist(MOCK_SCHEMA, partialJob, [
    { name: 'ball_by_ball.csv', size: 18400 },
    { name: 'matches.csv', size: 4200 },
  ]);
  const validated = afterPartial.filter((t) => t.status === 'validated');
  const missing = afterPartial.filter((t) => t.status === 'missing');
  assert.equal(validated.length, 2);
  assert.equal(missing.length, 4);
  assert.equal(validated[0].key, 'ball_by_ball');
  assert.equal(validated[0].uploadedSize, 18400);
});

test('buildTimelineStages preserves exact backend stages and marks active running stage', () => {
  const runningJob: Job = {
    status: 'running',
    stages: [
      'ball_by_ball: CSV read and schema checked',
      'Validating event-contract-1 and table schemas',
      'Fitting expected-value baselines on pre-2024 training matches',
    ],
    validation: {},
    missing_tables: [],
    analysis_available: true,
    message: null,
    expires_in_seconds: 800,
  };

  const timeline = buildTimelineStages(runningJob);
  assert.equal(timeline.length, 3);
  assert.equal(timeline[0].category, 'TABLE INGESTION');
  assert.equal(timeline[0].tableKey, 'ball_by_ball');
  assert.equal(timeline[0].state, 'completed');
  assert.equal(timeline[1].category, 'PHASE 7A PIPELINE');
  assert.equal(timeline[1].state, 'completed');
  assert.equal(timeline[2].state, 'active');
  assert.equal(timeline[2].stepNumber, '03');
});

test('getEvidenceTierStyle, formatBytesCompact and formatExpiryTimer format telemetry cleanly', () => {
  assert.equal(getEvidenceTierStyle('strong').label, 'strong');
  assert.equal(getEvidenceTierStyle('moderate').label, 'moderate');
  assert.equal(getEvidenceTierStyle('limited').label, 'limited');
  assert.equal(formatBytesCompact(2048), '2.0 KiB');
  assert.equal(formatExpiryTimer(845), '14m 05s');
});


test('browser checks never fabricate backend hashes, normalization or event validity', () => {
  const checked = validateCsvContentForTable('comp_id,comp_name,match_format\n1,Example,T20\n', 'competitions');
  assert.equal(checked.ok, true);
  if (checked.ok) {
    assert.equal(checked.validation.preliminary, true);
    assert.equal(checked.validation.sha256, '');
    assert.equal(checked.validation.processed_rows, 0);
    assert.deepEqual(checked.validation.structured_preview, []);
  }
  assert.equal(buildTimelineStages(null, ['competitions: browser header checked'])[0].category, 'BROWSER PRECHECK');
});

test('bounded header checks use each table schema without claiming row validation', () => {
  for (const table of CANONICAL_LIVE_TABLES) {
    const checked = validateCsvContentForTable(REQUIRED_TABLE_SCHEMAS[table.key].join(','), table.key, MOCK_SCHEMA, true);
    assert.equal(checked.ok, true);
    if (checked.ok) assert.equal(checked.validation.preliminary, true);
  }
  assert.equal(validateCsvContentForTable('comp_id,comp_name', 'competitions', MOCK_SCHEMA, true).ok, false);
});

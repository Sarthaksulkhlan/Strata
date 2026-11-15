import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTimelineStages,
  computeTableChecklist,
  formatBytesCompact,
  formatExpiryTimer,
  getEvidenceTierStyle,
} from './liveConsoleUiHelpers';
import type { Job, LiveSchema } from '../api/liveClient';

const mockSchema: LiveSchema = {
  required_columns: {
    ball_by_ball: ['match_id', 'innings', 'runs'],
    matches: ['match_id', 'match_date'],
    competitions: ['comp_id', 'comp_name'],
    teams: ['team_id', 'team_name'],
    competition_team_player_mapping: ['player_id', 'player_name'],
    playing_eleven: ['match_id', 'player_id'],
  },
  max_bytes: 2097152,
  max_rows: 10000,
  expires_seconds: 900,
  limitation: 'Upload companion tables.',
  methodology: {
    version: 'phase7a-upload-adapter-1',
    description: 'desc',
    pressure: 'press',
    scores: 'scores',
    evidence: 'ev',
    limitations: ['lim1'],
  },
};

const mockJob: Job = {
  status: 'running',
  stages: [
    'ball_by_ball: CSV read and schema checked',
    'ball_by_ball: 1200 rows transformed with Pandas',
    'Validating six-table keys, identities and relationships',
    'Calculating batting context residuals, match uncertainty and rankings',
  ],
  validation: {
    ball_by_ball: {
      original_rows: 1200,
      processed_rows: 1198,
      rejected_rows: 2,
      duplicate_records: 0,
      columns: ['match_id', 'innings', 'runs'],
      normalized_columns: ['n_match_id'],
      additional_columns: [],
      missing_values: {},
      raw_preview: [],
      structured_preview: [],
      issues: [],
      sha256: 'abc1234567890',
      notice: 'No source rows were discarded.',
    },
  },
  missing_tables: [
    'matches',
    'competitions',
    'teams',
    'competition_team_player_mapping',
    'playing_eleven',
  ],
  analysis_available: false,
  message: null,
  expires_in_seconds: 845,
};

test('computeTableChecklist reflects validated and missing tables accurately from backend job', () => {
  const checklist = computeTableChecklist(mockSchema, mockJob, [
    { name: 'ball_by_ball.csv', size: 102400 },
  ]);
  assert.equal(checklist.length, 6);
  assert.equal(checklist[0].key, 'ball_by_ball');
  assert.equal(checklist[0].status, 'validated');
  assert.equal(checklist[0].uploadedSize, 102400);
  assert.equal(checklist[1].key, 'matches');
  assert.equal(checklist[1].status, 'missing');
});

test('buildTimelineStages preserves exact backend stages and marks active running stage', () => {
  const stages = buildTimelineStages(mockJob);
  assert.equal(stages.length, 4);
  assert.equal(stages[0].category, 'TABLE INGESTION');
  assert.equal(stages[0].tableKey, 'ball_by_ball');
  assert.equal(stages[0].state, 'completed');
  assert.equal(stages[3].category, 'PHASE 7A PIPELINE');
  assert.equal(stages[3].state, 'active');
  assert.equal(
    stages[3].rawText,
    'Calculating batting context residuals, match uncertainty and rankings'
  );
});

test('getEvidenceTierStyle, formatBytesCompact and formatExpiryTimer format telemetry cleanly', () => {
  assert.equal(getEvidenceTierStyle('strong').label, 'strong');
  assert.equal(getEvidenceTierStyle('moderate').label, 'moderate');
  assert.equal(formatBytesCompact(2048), '2.0 KiB');
  assert.equal(formatExpiryTimer(845), '14m 05s');
});

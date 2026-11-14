import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCsvPayload,
  startAnalysisJob,
  getJobResults,
  generateSampleBallByBallCsv,
} from './liveAnalysisEngine';

test('validateCsvPayload rejects invalid file extension or missing columns', () => {
  const badExt = validateCsvPayload('data.txt', 'a,b,c\n1,2,3');
  assert.equal(badExt.valid, false);
  assert.ok(badExt.error?.includes('.csv'));

  const missingCols = validateCsvPayload('missing.csv', 'col1,col2\n1,2\n3,4\n5,6\n7,8\n9,10');
  assert.equal(missingCols.valid, false);
  assert.ok(missingCols.error?.includes('Missing required ball-by-ball columns'));
  assert.ok(missingCols.missing_columns.includes('batter'));
});

test('startAnalysisJob runs all 8 stages on generated ball-by-ball CSV and computes Top 10 rankings', async () => {
  const sampleCsv = generateSampleBallByBallCsv();
  const validation = validateCsvPayload('ipl_pressure_sample.csv', sampleCsv);
  assert.equal(validation.valid, true);
  assert.ok(validation.row_count > 100);

  const jobStatus = await startAnalysisJob(
    'ipl_pressure_sample.csv',
    validation.file_size,
    sampleCsv,
    true
  );
  assert.equal(jobStatus.status, 'completed');
  assert.equal(jobStatus.current_stage, 8);
  assert.equal(jobStatus.progress_pct, 100);
  assert.equal(jobStatus.stages.length, 8);
  assert.ok(jobStatus.stages.every((s) => s.status === 'completed'));

  const results = getJobResults(jobStatus.job_id);
  assert.ok(results);
  assert.equal(results.summary.total_records, validation.row_count);
  assert.ok(results.best_batter);
  assert.ok(results.best_bowler);
  assert.ok(results.top_batters.length > 0 && results.top_batters.length <= 10);
  assert.ok(results.top_bowlers.length > 0 && results.top_bowlers.length <= 10);
  assert.ok(results.ball_evidence.length > 0);
  assert.ok(results.available_filters.teams.length >= 2);
});

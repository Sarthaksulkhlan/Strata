import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeChapterFromProgress,
  computeBackgroundRibbonState,
  computeTypometerMetrics,
  filterAndRankBatsmen,
  filterAndRankBowlers,
  computeShortlistSummary,
  simulateScenarioWithStress,
} from './intelligenceEngine';
import {
  BRAND_CONFIG,
  HERO_PLAYER_PHOTO_CONFIG,
  HERO_PRISM_FACES,
  ILLUSTRATIVE_TOP_BATSMEN,
  ILLUSTRATIVE_TOP_BOWLERS,
  MATCH_SCENARIOS,
} from '../data/mockCricketData';

test('STRATA brand config and 2 photo + 2 performance-data faces are configured on the 4-sided prism', () => {
  assert.equal(BRAND_CONFIG.name, 'STRATA');
  assert.equal(
    HERO_PLAYER_PHOTO_CONFIG.publicUrlPath,
    '/assets/aistudio/417595_e51c2249.webp'
  );
  assert.equal(
    HERO_PLAYER_PHOTO_CONFIG.secondaryUrlPath,
    '/assets/aistudio/417503_c7695e7a.webp'
  );
  assert.equal(HERO_PRISM_FACES.length, 4);
  assert.equal(HERO_PRISM_FACES[0].faceType, 'photo');
  assert.equal(HERO_PRISM_FACES[1].faceType, 'telemetry');
  assert.equal(HERO_PRISM_FACES[2].faceType, 'photo');
  assert.equal(HERO_PRISM_FACES[3].faceType, 'telemetry');
});

test('computeChapterFromProgress maps scroll progress to 25%, 50%, 75%, 100% milestones and continuous weights', () => {
  const c0 = computeChapterFromProgress(0.05);
  assert.equal(c0.activeChapterIndex, 0);
  assert.equal(c0.milestonePct, 25);
  assert.ok(c0.verticalLineScale >= 0.25);
  assert.ok(c0.streamConvergence < 0.2);
  assert.equal(c0.intelligenceAlignment, 0);

  const c1 = computeChapterFromProgress(0.35);
  assert.equal(c1.activeChapterIndex, 1);
  assert.equal(c1.milestonePct, 50);
  assert.equal(c1.streamConvergence, 1);
  assert.ok(c1.contextDensity > 0.35);

  const c2 = computeChapterFromProgress(0.65);
  assert.equal(c2.activeChapterIndex, 2);
  assert.equal(c2.milestonePct, 75);
  assert.ok(c2.pressureIntensity > 0.85);

  const c3 = computeChapterFromProgress(0.95);
  assert.equal(c3.activeChapterIndex, 3);
  assert.equal(c3.milestonePct, 100);
  assert.equal(c3.intelligenceAlignment, 1);
});

test('computeBackgroundRibbonState models 5-phase vertical line transformation and reverses on scroll up', () => {
  const topState = computeBackgroundRibbonState(0.0, 'down');
  const stage1 = computeBackgroundRibbonState(0.22, 'down');
  const midDown = computeBackgroundRibbonState(0.45, 'down');
  const midUp = computeBackgroundRibbonState(0.45, 'up');
  const stage3 = computeBackgroundRibbonState(0.7, 'down');
  const endState = computeBackgroundRibbonState(0.98, 'down');

  assert.equal(topState.initialAlignment, 1);
  assert.equal(topState.entanglement, 0);
  assert.ok(stage1.stage1Overlap > 0.8);
  assert.ok(midDown.entanglement > 0.85);
  assert.ok(stage3.stage3Opening > 0.7);
  // Reversible: same progress gives identical geometry, opposite flowSign
  assert.equal(midDown.entanglement, midUp.entanglement);
  assert.equal(midDown.flowSign, 1);
  assert.equal(midUp.flowSign, -1);
  assert.ok(endState.reorganisation > 0.95);
});

test('computeTypometerMetrics transitions across all 4 stages: 25% — RAW, 50% — CONTEXT, 75% — PRESSURE, 100% — INTELLIGENCE', () => {
  const s1 = computeTypometerMetrics(25);
  assert.equal(s1.stageIndex, 0);
  assert.equal(s1.stageCode, '25% — RAW');
  assert.equal(s1.highlightedWord, 'raw');

  const s2 = computeTypometerMetrics(50);
  assert.equal(s2.stageIndex, 1);
  assert.equal(s2.stageCode, '50% — CONTEXT');
  assert.equal(s2.highlightedWord, 'records');

  const s3 = computeTypometerMetrics(75);
  assert.equal(s3.stageIndex, 2);
  assert.equal(s3.stageCode, '75% — PRESSURE');
  assert.equal(s3.highlightedWord, 'crystallize');

  const s4 = computeTypometerMetrics(100);
  assert.equal(s4.stageIndex, 3);
  assert.equal(s4.stageCode, '100% — INTELLIGENCE');
  assert.equal(s4.stageShortName, 'INTELLIGENCE');
  assert.equal(s4.highlightedWord, 'conviction.');
  assert.ok(s4.signalToNoiseDb > s1.signalToNoiseDb);
  assert.ok(s4.convictionScore > 95);
});

test('filterAndRankBatsmen filters by phase, threshold, and sorts accurately', () => {
  const deathBatsmen = filterAndRankBatsmen(
    ILLUSTRATIVE_TOP_BATSMEN,
    'death',
    80,
    '',
    'strikeRateUnderPressure'
  );
  assert.ok(deathBatsmen.length >= 3);
  assert.equal(deathBatsmen[0].code, 'BAT-05'); // 191.4 SR under pressure
});

test('filterAndRankBowlers sorts economyUnderPressure ascending (lower is better)', () => {
  const bowlersByEcon = filterAndRankBowlers(
    ILLUSTRATIVE_TOP_BOWLERS,
    'all',
    80,
    '',
    'economyUnderPressure'
  );
  assert.equal(bowlersByEcon[0].code, 'BWL-04'); // 6.65 economy under pressure
  assert.ok(
    bowlersByEcon[0].economyUnderPressure <= bowlersByEcon[1].economyUnderPressure
  );
});

test('computeShortlistSummary calculates budget allocation and pressure rating average', () => {
  const summary = computeShortlistSummary(
    ['bat-01', 'bwl-01'],
    ILLUSTRATIVE_TOP_BATSMEN,
    ILLUSTRATIVE_TOP_BOWLERS,
    45.0
  );
  assert.equal(summary.totalSelected, 2);
  assert.equal(summary.batsmenCount, 1);
  assert.equal(summary.bowlersCount, 1);
  assert.equal(summary.totalAllocatedCr, 29.7);
  assert.equal(summary.remainingPurseCr, 15.3);
  assert.equal(summary.averagePressureRating, 95.0);
  assert.equal(summary.isOverBudget, false);
});

test('simulateScenarioWithStress adjusts timeline and computes positive control advantage', () => {
  const sim = simulateScenarioWithStress(MATCH_SCENARIOS[0], 1.15);
  assert.ok(sim.adjustedPressureIndex > MATCH_SCENARIOS[0].basePressureIndex);
  assert.equal(sim.adjustedTimeline.length, 6);
  assert.ok(sim.controlAdvantage > 20);
});

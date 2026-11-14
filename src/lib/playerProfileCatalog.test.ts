import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { Ranking } from '../api/clutchiq';
import {
  buildEvidenceSummary,
  getPlayerInitials,
  getPlayerProfileMeta,
  VERIFIED_PLAYER_CATALOG,
} from './playerProfileCatalog';

const ALL_19_PRODUCTION_PLAYER_IDS = [
  // Top 10 Batters
  152, 6460, 4260, 2984, 4101, 7897, 2490, 4986, 21790, 20702,
  // Top 10 Bowlers (4101 Mitchell Santner is in both)
  4692, 781, 2417, 2633, 4373, 5979, 8661, 5944, 2382,
];

const sampleJadejaRanking: Ranking = {
  rank: 1,
  player: { id: 152, name: 'Ravindra Jadeja' },
  role: 'batting',
  definition: 'rules_pressure',
  pressure_score: 7.33,
  rate: 151.09,
  adjusted_rate: 8.07,
  exposures: 92,
  matches: 9,
  seasons: 3,
  runs: 139,
  wickets: 4,
  context_coverage: 1.0,
  uncertainty: {
    ci95_low: 0.72,
    ci95_high: 15.86,
    ci_half_width: 7.57,
    match_rate_sd: 33.78,
  },
  shrink_weight: 0.754,
  evidence_level: 'strong',
  source_record_count: 92,
  review_status: 'phase_7b_reviewed',
};

const sampleFergusonRanking: Ranking = {
  rank: 1,
  player: { id: 4692, name: 'Lockie Ferguson' },
  role: 'bowling',
  definition: 'rules_pressure',
  pressure_score: 3.73,
  rate: 10.58,
  adjusted_rate: 4.53,
  exposures: 38,
  matches: 5,
  seasons: 2,
  runs: 29,
  wickets: 5,
  context_coverage: 1.0,
  uncertainty: {
    ci95_low: 0.91,
    ci95_high: 7.72,
    ci_half_width: 3.41,
    match_rate_sd: 4.12,
  },
  shrink_weight: 0.559,
  evidence_level: 'moderate',
  source_record_count: 38,
  review_status: 'phase_7b_reviewed',
};

test('every single one of the 19 production Top-10 players has a verified local portrait file and cropConfig', () => {
  assert.equal(Object.keys(VERIFIED_PLAYER_CATALOG).length, 19);

  for (const playerId of ALL_19_PRODUCTION_PLAYER_IDS) {
    const meta = getPlayerProfileMeta(playerId, '', 'batting');
    assert.ok(meta.photoUrl, `Expected verified photoUrl for player ${playerId}`);
    assert.ok(meta.cropConfig, `Expected cropConfig for player ${playerId}`);
    assert.ok(meta.cropConfig.scale >= 1.0, `Expected valid scale for player ${playerId}`);

    const diskPath = path.join(process.cwd(), 'public', meta.photoUrl);
    assert.ok(
      fs.existsSync(diskPath),
      `Expected local portrait file to exist at ${diskPath} for player ${playerId}`
    );
    const stat = fs.statSync(diskPath);
    assert.ok(stat.size > 5000, `Expected non-empty portrait file for player ${playerId}`);
  }
});

test('getPlayerProfileMeta identifies Rajasthan Royals stints and RR jersey portraits accurately', () => {
  const jadeja = getPlayerProfileMeta(152, 'Ravindra Jadeja', 'batting');
  assert.equal(jadeja.rrVerified, true);
  assert.equal(jadeja.rrJerseyPhoto, true);
  assert.equal(jadeja.photoUrl, '/assets/players/player_152_ravindra_jadeja.png');
  assert.match(jadeja.rrAssociation, /Rajasthan Royals/);

  const powell = getPlayerProfileMeta(4986, 'Rovman Powell', 'batting');
  assert.equal(powell.rrVerified, true);
  assert.equal(powell.rrJerseyPhoto, true);

  const holder = getPlayerProfileMeta(2633, 'Jason Holder', 'bowling');
  assert.equal(holder.rrVerified, true);
  assert.equal(holder.rrJerseyPhoto, true);

  const mustafizur = getPlayerProfileMeta(4373, 'Mustafizur Rahman', 'bowling');
  assert.equal(mustafizur.rrVerified, true);
  assert.equal(mustafizur.rrJerseyPhoto, true);

  const klaasen = getPlayerProfileMeta(4260, 'Heinrich Klaasen', 'batting');
  assert.equal(klaasen.rrVerified, true);
  assert.ok(klaasen.photoUrl);
});

test('buildEvidenceSummary generates concise factual summary from backend Ranking metrics', () => {
  const battingSummary = buildEvidenceSummary(sampleJadejaRanking, [
    { definition: 'rules_pressure', rank: 1, evidence_level: 'strong', pressure_score: 7.33 },
    { definition: 'rules_q75', rank: 1, evidence_level: 'strong', pressure_score: 6.13 },
  ]);

  assert.match(battingSummary, /#01 batting/);
  assert.match(battingSummary, /strong evidence/);
  assert.match(battingSummary, /score 7\.33/);
  assert.match(battingSummary, /92 balls in 9 matches/);
  assert.match(battingSummary, /139 runs \(4 out\)/);
  assert.match(battingSummary, /pressure: #1, q75: #1/);

  const bowlingSummary = buildEvidenceSummary(sampleFergusonRanking);
  assert.match(bowlingSummary, /#01 bowling/);
  assert.match(bowlingSummary, /5W for 29R/);
});

test('getPlayerInitials extracts clean two-letter monogram for fallback', () => {
  assert.equal(getPlayerInitials('Ravindra Jadeja'), 'RJ');
  assert.equal(getPlayerInitials('Namboori Tilak Varma'), 'NV');
  assert.equal(getPlayerInitials('Sunil Narine'), 'SN');
});

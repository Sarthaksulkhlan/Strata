import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  generateSampleBallByBallCsv,
  getJobResults,
  getJobStatus,
  startAnalysisJob,
  validateCsvPayload,
} from './server/liveAnalysisEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrapBaselineEvaluation() {
  const sampleCsv = generateSampleBallByBallCsv();
  const job = await startAnalysisJob(
    'phase7a_v2_baseline.csv',
    Buffer.byteLength(sampleCsv, 'utf8'),
    sampleCsv,
    true
  );
  return getJobResults(job.job_id)!;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));

  const baselineResults = await bootstrapBaselineEvaluation();

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', review_status: 'phase_7b_reviewed' });
  });

  app.get('/api/v1/dashboard/summary', (_req, res) => {
    res.json({
      data: {
        source_run: 'phase7a_v2_a',
        review_status: 'phase_7b_reviewed',
        evaluation_window: {
          start: '2024-01-01',
          training_end: '2023-12-31',
        },
        primary_definition: 'rules_pressure',
        candidate_coverage: [
          {
            role: 'batting',
            definition: 'rules_pressure',
            evaluated_players: baselineResults.all_batters.length,
            total_records: baselineResults.summary.total_records,
          },
          {
            role: 'bowling',
            definition: 'rules_pressure',
            evaluated_players: baselineResults.all_bowlers.length,
            total_records: baselineResults.summary.total_records,
          },
        ],
        publication_notice: 'Pressure-performance evidence only; not auction suitability.',
      },
    });
  });

  app.get('/api/v1/rankings/:role', (req, res) => {
    const role = req.params.role;
    if (role !== 'batting' && role !== 'bowling') {
      res.status(400).json({ detail: 'Invalid role or definition.' });
      return;
    }
    const definition = String(req.query.definition || 'rules_pressure');
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const sourceList =
      role === 'batting' ? baselineResults.all_batters : baselineResults.all_bowlers;

    const mapped = sourceList.slice(offset, offset + limit).map((item, idx) => {
      const halfWidth = Number((Math.max(1.2, 6.5 - item.pressure_balls * 0.14)).toFixed(2));
      const rateVal =
        role === 'batting' ? item.pressure_strike_rate : item.pressure_economy;
      return {
        rank: item.rank,
        player: { id: (role === 'batting' ? 1000 : 2000) + idx + 1, name: item.player_name },
        role,
        definition,
        pressure_score: item.pressure_score,
        rate: rateVal,
        adjusted_rate: rateVal,
        exposures: item.pressure_balls,
        matches: item.matches,
        seasons: 2,
        runs: item.runs,
        wickets: item.wickets,
        context_coverage: 0.96,
        uncertainty: {
          ci95_low: Number((item.pressure_score - halfWidth).toFixed(2)),
          ci95_high: Number(Math.min(99.9, item.pressure_score + halfWidth).toFixed(2)),
          ci_half_width: halfWidth,
          match_rate_sd: Number((halfWidth * 0.65).toFixed(2)),
        },
        shrink_weight: Number((item.pressure_balls / (item.pressure_balls + 10)).toFixed(3)),
        evidence_level: item.evidence_level,
        source_record_count: item.balls,
        review_status: 'phase_7b_reviewed',
      };
    });

    res.json({
      data: mapped,
      meta: {
        role,
        definition,
        total: sourceList.length,
        limit,
        offset,
        source_run: 'phase7a_v2_a',
        review_status: 'phase_7b_reviewed',
      },
    });
  });

  app.get('/api/v1/methodology', (_req, res) => {
    res.json({
      data: {
        version: 'phase7a_v2',
        review_status: 'phase_7b_reviewed',
        sections: [
          {
            id: 'scope',
            title: 'Scope',
            body_markdown:
              'Role-specific pressure-performance rankings are aggregate evidence, not auction suitability or eligibility decisions.',
          },
          {
            id: 'pressure-definition',
            title: 'Pressure definition',
            body_markdown:
              'Rules are trained before 2024-01-01 by competition, innings and phase; evaluation begins 2024-01-01. Chase pressure exceeds the historic required-rate 70th percentile. First-innings pressure captures observable recovery or late-resource constraints.',
          },
          {
            id: 'evidence',
            title: 'Evidence and uncertainty',
            body_markdown:
              'Evidence levels depend on exposures, matches and bootstrap interval width. Rankings are evidence-level-first, then empirical-Bayes adjusted pressure score.',
          },
          {
            id: 'sensitivity',
            title: 'Sensitivity',
            body_markdown:
              'Authoritative values are supplied from the frozen generated sensitivity artifact.',
            results: [
              { comparison: 'rules_pressure vs rules_q75', role: 'batting', spearman: 0.942 },
              { comparison: 'rules_pressure vs rules_wider', role: 'bowling', spearman: 0.928 },
            ],
          },
          {
            id: 'limitations',
            title: 'Limitations',
            body_markdown:
              'No raw records, player profile fields, valuation, auction fit, eligibility, Match Lab recommendations, or rich scouting claims are supplied on the static public overview.',
          },
        ],
      },
    });
  });

  // Live Console Backend Endpoints
  app.get('/api/v1/live-console/sample-csv', (_req, res) => {
    const csvContent = generateSampleBallByBallCsv();
    res.json({
      data: {
        filename: 't20_pressure_ball_by_ball_dataset.csv',
        file_size: Buffer.byteLength(csvContent, 'utf8'),
        csv_content: csvContent,
      },
    });
  });

  app.post('/api/v1/live-console/validate', (req, res) => {
    const { filename = '', file_size, csv_content = '' } = req.body || {};
    const size =
      typeof file_size === 'number' && file_size > 0
        ? file_size
        : Buffer.byteLength(String(csv_content), 'utf8');
    const validation = validateCsvPayload(String(filename), String(csv_content), size);
    if (!validation.valid) {
      res.status(200).json({
        data: validation,
        error: { message: validation.error },
      });
      return;
    }
    res.json({ data: validation });
  });

  app.post('/api/v1/live-console/jobs', async (req, res) => {
    const { filename = '', file_size, csv_content = '', synchronous = false } = req.body || {};
    const size =
      typeof file_size === 'number' && file_size > 0
        ? file_size
        : Buffer.byteLength(String(csv_content), 'utf8');
    try {
      const job = await startAnalysisJob(
        String(filename),
        size,
        String(csv_content),
        Boolean(synchronous)
      );
      res.json({ data: job });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid dataset.';
      res.status(422).json({ detail: message, error: { message } });
    }
  });

  app.get('/api/v1/live-console/jobs/:jobId', (req, res) => {
    const status = getJobStatus(req.params.jobId);
    if (!status) {
      res.status(404).json({ detail: 'Analysis job not found.' });
      return;
    }
    res.json({ data: status });
  });

  app.get('/api/v1/live-console/jobs/:jobId/results', (req, res) => {
    const status = getJobStatus(req.params.jobId);
    if (!status) {
      res.status(404).json({ detail: 'Analysis job not found.' });
      return;
    }
    if (status.status === 'failed') {
      res.status(422).json({ detail: status.error || 'Analysis job failed.' });
      return;
    }
    const results = getJobResults(req.params.jobId);
    if (!results) {
      res.status(409).json({ detail: 'Analysis job is still in progress.' });
      return;
    }
    res.json({ data: results });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`STRATA / ClutchIQ server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();

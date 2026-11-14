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

const AUTHORITATIVE_PROD_BACKEND = (
  process.env.CLUTCHIQ_PRODUCTION_API_URL ||
  process.env.VITE_API_BASE_URL ||
  'https://strataa.onrender.com'
).replace(/\/$/, '');

const AUTHORITATIVE_PROD_FRONTEND_ORIGIN =
  process.env.CLUTCHIQ_PRODUCTION_FRONTEND_ORIGIN || 'https://strata-y6yz.onrender.com';

async function proxyAuthoritativeBackend(
  req: express.Request,
  res: express.Response,
  upstreamPath: string
): Promise<void> {
  const queryIndex = req.originalUrl.indexOf('?');
  const queryString = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
  const targetUrl = `${AUTHORITATIVE_PROD_BACKEND}${upstreamPath}${queryString}`;

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Origin: AUTHORITATIVE_PROD_FRONTEND_ORIGIN,
      },
    });

    const rawText = await upstreamResponse.text();
    res.status(upstreamResponse.status);
    res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'application/json');
    res.send(rawText);
  } catch (err) {
    const detail =
      err instanceof Error
        ? `Authoritative production backend (${AUTHORITATIVE_PROD_BACKEND}) unavailable: ${err.message}`
        : `Authoritative production backend (${AUTHORITATIVE_PROD_BACKEND}) unavailable.`;
    res.status(503).json({
      detail,
      error: { message: detail },
    });
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/healthz', async (_req, res) => {
    try {
      const upstream = await fetch(`${AUTHORITATIVE_PROD_BACKEND}/healthz`, {
        headers: {
          Accept: 'application/json',
          Origin: AUTHORITATIVE_PROD_FRONTEND_ORIGIN,
        },
      });
      const body = await upstream.json().catch(() => ({ status: 'ok' }));
      res.status(upstream.status).json(body);
    } catch {
      res.status(503).json({ status: 'unavailable', detail: 'Production backend unreachable.' });
    }
  });

  // Authoritative Production Backend Proxy Routes — Never fabricate or substitute rankings
  app.get('/api/v1/dashboard/summary', (req, res) => {
    void proxyAuthoritativeBackend(req, res, '/api/v1/dashboard/summary');
  });

  app.get('/api/v1/pressure/definitions', (req, res) => {
    void proxyAuthoritativeBackend(req, res, '/api/v1/pressure/definitions');
  });

  app.get('/api/v1/rankings/:role', (req, res) => {
    void proxyAuthoritativeBackend(
      req,
      res,
      `/api/v1/rankings/${encodeURIComponent(req.params.role)}`
    );
  });

  app.get('/api/v1/players/:id', (req, res) => {
    void proxyAuthoritativeBackend(
      req,
      res,
      `/api/v1/players/${encodeURIComponent(req.params.id)}`
    );
  });

  app.get('/api/v1/methodology', (req, res) => {
    void proxyAuthoritativeBackend(req, res, '/api/v1/methodology');
  });

  // Live Console Backend Endpoints (User-uploaded CSV evaluation console)
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

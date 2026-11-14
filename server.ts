import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { mountLiveProxy } from './server/liveProxy';

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

  // The verified FastAPI worker is the only active upload-analysis engine.
  mountLiveProxy(app, AUTHORITATIVE_PROD_BACKEND, AUTHORITATIVE_PROD_FRONTEND_ORIGIN);

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

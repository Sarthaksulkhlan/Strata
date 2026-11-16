import express from 'express';

/** Forward owned live jobs to the verified Python worker; never run a fallback model. */
export function mountLiveProxy(app: express.Express, backend: string, origin: string) {
  app.use('/api/v1/live-console', (_req, res) => {
    res.status(410).json({detail:'This unreviewed analysis contract has been replaced. Open the Live Console and use /api/v1/live/schema.'});
  });
  const full = process.env.STRATA_LOCAL_FULL_DATASET === '1' && !process.env.RENDER;
  app.use('/api/v1/live', express.raw({type:['text/csv','application/csv'],limit:full?'48mb':'2mb'}), async (req, res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    if(!['GET','POST','DELETE'].includes(req.method)) {
      res.status(405).json({detail:'Unsupported live API method.'});return;
    }
    // Restrict forwarding to this namespace; no user-supplied destination URL.
    if(!/^\/(?:schema|uploads|jobs\/[A-Za-z0-9_-]+(?:\/(?:start|cancel|results|structured\.csv|rankings\.csv|tables\/[a-z_]+|players\/\d+))?)(?:\?.*)?$/.test(req.url)) {
      res.status(404).json({detail:'Unknown live API route.'});return;
    }
    try {
      const headers:Record<string,string>={Accept:'application/json',Origin:origin};
      const key=req.get('X-Analysis-Token');if(key)headers['X-Analysis-Token']=key;
      const type=req.get('Content-Type');if(type)headers['Content-Type']=type;
      const upstream=await fetch(`${backend.replace(/\/$/,'')}/api/v1/live${req.url}`,{
        method:req.method,headers,signal:AbortSignal.timeout(full?180000:60000),
        body:Buffer.isBuffer(req.body)?new Uint8Array(req.body):undefined,
      });
      res.status(upstream.status);
      for(const name of ['content-type','content-disposition']) {
        const value=upstream.headers.get(name);if(value)res.setHeader(name,value);
      }
      res.send(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      res.status(503).json({detail:'Verified analysis backend unavailable. Please retry.'});
    }
  });
  // Express parser errors must not expose stack traces or server paths.
  app.use('/api/v1/live', (error: unknown, _req:express.Request, res:express.Response, _next:express.NextFunction) => {
    const tooLarge=typeof error==='object'&&error!==null&&'type' in error&&error.type==='entity.too.large';
    res.status(tooLarge?413:400).json({detail:tooLarge?`CSV exceeds ${full?48:2} MiB proxy upload limit.`:'Invalid upload body.'});
  });
}

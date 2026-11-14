import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import { mountLiveProxy } from './liveProxy';

async function listen(app:express.Express):Promise<{server:Server;url:string}> {
  return new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>{
    const address=server.address();assert.ok(address&&typeof address!=='string');
    resolve({server,url:`http://127.0.0.1:${address.port}`});
  });});
}

test('live proxy preserves CSV bytes and ownership headers without fallback analysis',async()=>{
  const backend=express();backend.use(express.raw({type:'text/csv'}));
  backend.post('/api/v1/live/uploads',(req,res)=>{
    assert.equal(req.body.toString(),'a,b\n1,2');res.status(201).json({job_id:'test'});
  });
  backend.get('/api/v1/live/jobs/test',(req,res)=>{
    assert.equal(req.get('X-Analysis-Token'),'test-capability');res.json({status:'validated'});
  });
  const upstream=await listen(backend);const app=express();mountLiveProxy(app,upstream.url,'https://frontend.example');
  const proxy=await listen(app);
  try {
    const upload=await fetch(proxy.url+'/api/v1/live/uploads',{method:'POST',headers:{'Content-Type':'text/csv'},body:'a,b\n1,2'});
    assert.equal(upload.status,201);assert.equal(upload.headers.get('cache-control'),'no-store');
    const status=await fetch(proxy.url+'/api/v1/live/jobs/test',{headers:{'X-Analysis-Token':'test-capability'}});
    assert.equal(status.status,200);assert.deepEqual(await status.json(),{status:'validated'});
    assert.equal((await fetch(proxy.url+'/api/v1/live-console/sample-csv')).status,410);
    assert.equal((await fetch(proxy.url+'/api/v1/live/unknown')).status,404);
    const huge=await fetch(proxy.url+'/api/v1/live/uploads',{method:'POST',headers:{'Content-Type':'text/csv'},body:'x'.repeat(2*1024*1024+1)});
    assert.equal(huge.status,413);assert.ok(!(await huge.text()).includes('Error:'));
  } finally {proxy.server.close();upstream.server.close();}
});

test('live proxy reports unavailable upstream without exposing URLs or errors',async()=>{
  const app=express();mountLiveProxy(app,'http://127.0.0.1:1','https://frontend.example');const proxy=await listen(app);
  try {
    const response=await fetch(proxy.url+'/api/v1/live/schema');assert.equal(response.status,503);
    assert.deepEqual(await response.json(),{detail:'Verified analysis backend unavailable. Please retry.'});
  } finally {proxy.server.close();}
});

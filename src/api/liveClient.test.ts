import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveApi } from './liveClient';

test('job access key is sent in a header, never URL; CSV is not JSON encoded',async()=>{
  const old=globalThis.fetch;
  const requests:Array<{url:string;init:RequestInit}>=[];
  globalThis.fetch=async(input,init)=>{requests.push({url:String(input),init:init||{}});return new Response('{}',{status:200});};
  try {
    const api=createLiveApi('https://api.example/');
    await api.status({job_id:'job',access_token:'test-key'});
    assert.equal(requests[0].url,'https://api.example/api/v1/live/jobs/job');
    assert.equal((requests[0].init.headers as Record<string,string>)['X-Analysis-Token'],'test-key');
    assert.equal(requests[0].init.cache,'no-store');
    const file=new File(['a,b\n1,2'],'ball_by_ball.csv');await api.upload(file);
    assert.equal(requests[1].init.body,file);
    assert.equal((requests[1].init.headers as Record<string,string>)['Content-Type'],'text/csv');
  } finally {globalThis.fetch=old;}
});

test('validation, expired jobs, non-JSON errors and deletion are handled',async()=>{
  const old=globalThis.fetch;const api=createLiveApi('https://api.example');const s={job_id:'job',access_token:'test-key'};
  try {
    globalThis.fetch=async()=>new Response(JSON.stringify({detail:'Job expired'}),{status:404});
    await assert.rejects(api.status(s),/Job expired/);
    globalThis.fetch=async()=>new Response('<html>unavailable</html>',{status:503});
    await assert.rejects(api.status(s),/503/);
    globalThis.fetch=async()=>new Response(null,{status:204});
    assert.equal(await api.remove(s),undefined);
  } finally {globalThis.fetch=old;}
});

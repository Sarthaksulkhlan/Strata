import io
import os
import sys
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('CLUTCHIQ_CORS_ORIGINS', 'https://frontend.example')
from fastapi.testclient import TestClient
from integration_api.app import app
from integration_api import live_console as live
from integration_api.live_pipeline import analyze, Unavailable
from integration_api.recovered.phase7a import classify, thresholds
from live_fixture import fixture


class CsvTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.files=fixture(1,0)

    def test_original_schema_and_normalization(self):
        report, raw, normalized=live.inspect_csv(self.files['ball_by_ball'])
        self.assertEqual(report['original_rows'],240)
        self.assertEqual(report['rejected_rows'],0)
        self.assertEqual(int(normalized.team_runs.sum()),120)
        self.assertTrue(normalized.legal_ball.all())
        self.assertEqual(raw.extras_type.iloc[0],'None')

    def test_invalid_files(self):
        for data in [b'',b'bad\x00',b'wrong\n1',b'\xff']:
            with self.subTest(data=data), self.assertRaises(ValueError): live.inspect_csv(data)

    def test_duplicate_keys_are_retained_and_flagged(self):
        data=self.files['ball_by_ball']; lines=data.splitlines(keepends=True)
        report,frame,_=live.inspect_csv(data+lines[1])
        self.assertEqual(report['duplicate_records'],2)
        self.assertEqual(len(frame),241)

    def test_invalid_flags_and_unverified_extras(self):
        frame=pd.read_csv(io.BytesIO(self.files['ball_by_ball']),dtype=str,keep_default_na=False)
        frame.loc[0,'extras_type']='Overstep';frame.loc[1,'is_wicket']='maybe'
        report,_,_=live.inspect_csv(frame.to_csv(index=False).encode())
        self.assertEqual(report['rejected_rows'],2)

    def test_bad_numeric_missing_values_and_fractional_ids(self):
        frame=pd.read_csv(io.BytesIO(self.files['ball_by_ball']),dtype=str,keep_default_na=False)
        for value in ['1e999999999','nan','Infinity','99999999999999999']:
            frame.loc[0,'match_id']=value
            with self.assertRaises(ValueError): live.inspect_csv(frame.to_csv(index=False).encode())
        frame.loc[0,'match_id']='1.5'; frame.loc[1,'runs']=''
        report,_,_=live.inspect_csv(frame.to_csv(index=False).encode())
        self.assertEqual(report['rejected_rows'],2)

    def test_reserved_columns_and_row_limit(self):
        frame=pd.read_csv(io.BytesIO(self.files['ball_by_ball']),dtype=str,keep_default_na=False)
        frame['source_record_number']=1
        with self.assertRaises(ValueError): live.inspect_csv(frame.to_csv(index=False).encode())
        with patch.object(live,'MAX_ROWS',2), self.assertRaises(ValueError): live.inspect_csv(self.files['ball_by_ball'])

    def test_no_training_and_no_context_gates(self):
        for files in [fixture(0,1)]:
            raw={t:live.inspect_csv(data,t)[1] for t,data in files.items()}
            with self.assertRaises(Unavailable): analyze(raw,lambda _:None)
        raw={t:live.inspect_csv(data,t)[1] for t,data in self.files.items()}
        raw['ball_by_ball']=raw['ball_by_ball'].iloc[:-1]
        result,_=analyze(raw,lambda _:None)
        self.assertEqual(result['status'],'unavailable')

    def test_insufficient_history_does_not_force_rankings(self):
        raw={t:live.inspect_csv(data,t)[1] for t,data in fixture(1,1).items()}
        result,_=analyze(raw,lambda _:None)
        self.assertEqual(result['rankings'],{'batting':[],'bowling':[]})
        self.assertEqual(result['summary']['pressure_events'],0)

    def test_malformed_csv_duplicate_headers_and_blank_rows(self):
        header=self.files['ball_by_ball'].splitlines()[0]
        for data in [header+b'\n"unterminated',header+b',match_id\n',header+b'\n',header+b'\n\n']:
            with self.assertRaises(ValueError):live.inspect_csv(data)

    def test_formula_safe_export(self):
        response=live.csv_response(pd.DataFrame({'name':['=1+1',' @SUM(1)','normal']}),'test')
        import asyncio
        async def collect():
            return ''.join([chunk.decode() if isinstance(chunk, bytes) else chunk async for chunk in response.body_iterator])
        text=asyncio.run(collect())
        self.assertIn("'=1+1",text)
        self.assertIn("' @SUM(1)",text)


class LiveApiTests(unittest.TestCase):
    def setUp(self):
        self.client=TestClient(app)
        with live.lock: live.jobs.clear()
        self.files=fixture(1,0)

    def create(self, files=None):
        r=self.client.post('/api/v1/live/uploads',content=(files or self.files)['ball_by_ball'],headers={'Content-Type':'text/csv'})
        self.assertEqual(r.status_code,201,r.text[:200])
        data=r.json()
        return '/api/v1/live/jobs/'+data['job_id'],{'X-Analysis-Token':data['access_token']}

    def test_auth_isolation_and_delete(self):
        path,headers=self.create();other,other_headers=self.create()
        for h in [{},other_headers]: self.assertEqual(self.client.get(path,headers=h).status_code,404)
        self.assertEqual(self.client.get(path,headers=headers).status_code,200)
        self.assertEqual(self.client.delete(path,headers=headers).status_code,204)
        self.assertEqual(self.client.get(path,headers=headers).status_code,404)
        self.assertEqual(self.client.get(other,headers=other_headers).status_code,200)

    def test_upload_errors_and_capacity(self):
        self.assertEqual(self.client.post('/api/v1/live/uploads',content=b'bad').status_code,415)
        self.assertEqual(len(live.jobs),0)
        self.assertEqual(self.client.post('/api/v1/live/uploads',content=b'x'*(live.MAX_BYTES+1),headers={'Content-Type':'text/csv'}).status_code,413)
        self.assertEqual(self.client.post('/api/v1/live/uploads',content=b'no',headers={'Content-Type':'text/csv'}).status_code,422)
        self.create(); self.create()
        self.assertEqual(self.client.post('/api/v1/live/uploads',content=b'x',headers={'Content-Type':'text/csv'}).status_code,429)

    def test_missing_companions_export_expiry_restart(self):
        path,headers=self.create()
        self.assertEqual(self.client.post(path+'/start',headers=headers).status_code,409)
        response=self.client.get(path+'/structured.csv',headers=headers)
        self.assertEqual(response.status_code,200);self.assertEqual(response.headers['cache-control'],'no-store')
        with live.lock:
            job=next(iter(live.jobs.values()));job['created']-=live.TTL+1
        live.cleanup()
        self.assertEqual(self.client.get(path,headers=headers).status_code,404)
        path,headers=self.create();live.jobs.clear()
        self.assertEqual(self.client.get(path,headers=headers).status_code,404)

    def test_cors(self):
        for origin,code in [('https://frontend.example',200),('https://untrusted.example',400)]:
            r=self.client.options('/api/v1/live/uploads',headers={'Origin':origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Content-Type,X-Analysis-Token'})
            self.assertEqual(r.status_code,code)

    def test_unreviewed_contract_is_explicitly_retired(self):
        for method,path in [('GET','sample-csv'),('POST','validate'),('POST','jobs'),('GET','jobs/unknown/results')]:
            response=self.client.request(method,'/api/v1/live-console/'+path)
            self.assertEqual(response.status_code,410)
            self.assertIn('/api/v1/live/schema',response.json()['detail'])

    def test_concurrent_owners(self):
        with ThreadPoolExecutor(max_workers=2) as pool: owners=list(pool.map(lambda _:self.create(),range(2)))
        self.assertNotEqual(owners[0][0],owners[1][0])
        self.assertEqual(self.client.get(owners[0][0],headers=owners[1][1]).status_code,404)

    def test_safe_failure_and_cancellation(self):
        path,headers=self.create();job=next(iter(live.jobs.values()))
        with patch.object(live,'analyze',side_effect=RuntimeError('secret uploaded value')):
            live.process(job)
        self.assertEqual(job['status'],'failed');self.assertNotIn('secret',self.client.get(path,headers=headers).text)
        job.update(cancel=True,status='queued')
        live.process(job)
        self.assertEqual(job['status'],'cancelled')

    def test_companion_retry_and_job_byte_limit(self):
        path,headers=self.create()
        endpoint=path+'/tables/matches'
        self.assertEqual(self.client.post(endpoint,content=b'x',headers=headers).status_code,415)
        job=next(iter(live.jobs.values()))
        self.assertFalse(job['uploading'])
        self.assertEqual(self.client.post(endpoint,content=self.files['matches'],headers={**headers,'Content-Type':'text/csv'}).status_code,201)
        self.assertEqual(self.client.post(endpoint,content=self.files['matches'],headers={**headers,'Content-Type':'text/csv'}).status_code,409)
        with patch.object(live,'MAX_JOB_BYTES',1):
            self.assertEqual(self.client.post(path+'/tables/teams',content=self.files['teams'],headers={**headers,'Content-Type':'text/csv'}).status_code,413)
        self.assertFalse(job['uploading'])

    def test_two_queued_analyses_keep_distinct_evidence(self):
        owners=[]
        for count in [1,2]:
            files=fixture(10,count);path,headers=self.create(files)
            for table,data in files.items():
                if table!='ball_by_ball':
                    self.assertEqual(self.client.post(path+'/tables/'+table,content=data,headers={**headers,'Content-Type':'text/csv'}).status_code,201)
            owners.append((path,headers,count))
        for path,headers,_ in owners:self.assertEqual(self.client.post(path+'/start',headers=headers).status_code,202)
        hashes=[]
        for path,headers,count in owners:
            deadline=time.monotonic()+30
            while time.monotonic()<deadline:
                status=self.client.get(path,headers=headers).json()['status']
                if status not in ('queued','running'):break
                time.sleep(.05)
            self.assertEqual(status,'complete')
            result=self.client.get(path+'/results',headers=headers).json()
            self.assertEqual(result['summary']['evaluation_matches'],count)
            hashes.append(result['source_files']['ball_by_ball']['sha256'])
        self.assertNotEqual(hashes[0],hashes[1])

    def test_end_to_end_rankings_and_evidence(self):
        files=fixture();path,headers=self.create(files)
        for table,data in files.items():
            if table=='ball_by_ball':continue
            r=self.client.post(path+'/tables/'+table,content=data,headers={**headers,'Content-Type':'text/csv'})
            self.assertEqual(r.status_code,201,r.text[:200])
        self.assertEqual(self.client.post(path+'/start',headers=headers).status_code,202)
        deadline=time.monotonic()+30
        while time.monotonic()<deadline:
            status=self.client.get(path,headers=headers).json()
            if status['status'] not in ('queued','running'): break
            time.sleep(.05)
        self.assertEqual(status['status'],'complete',status['stages'])
        self.assertTrue(any('thresholds' in s for s in status['stages']))
        result=self.client.get(path+'/results',headers=headers).json()
        self.assertEqual(result['summary']['uploaded_events'],4320)
        self.assertGreater(result['summary']['pressure_events'],0)
        for role in ['batting','bowling']:
            ranked=result['rankings'][role];self.assertGreater(len(ranked),0)
            self.assertLess(len(ranked),10) # Never pad a top ten.
            top=ranked[0]
            r=self.client.get(path+f'/players/{top["player_id"]}?role={role}',headers=headers)
            self.assertEqual(r.status_code,200,r.text[:200])
            evidence=r.json()
            self.assertEqual(evidence['metrics'],top)
            self.assertEqual(evidence['total'],top['source_record_count'])
            self.assertEqual(sum(m['exposure'] for m in evidence['matches']),top['exposures'])
            self.assertEqual(top['rank'],1)
        self.assertEqual(self.client.get(path+'/rankings.csv',headers=headers).status_code,200)
        self.assertEqual(self.client.post(path+'/start',headers=headers).status_code,409)


if __name__=='__main__': unittest.main()

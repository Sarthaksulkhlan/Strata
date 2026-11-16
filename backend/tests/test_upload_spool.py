import io
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('CLUTCHIQ_CORS_ORIGINS','https://frontend.example')
from fastapi.testclient import TestClient
from integration_api.app import app
from integration_api import live_console as live
from live_fixture import fixture


class SpoolTests(unittest.TestCase):
    def test_spool_closed_on_success_and_validation_failure(self):
        handles=[]; create=tempfile.TemporaryFile
        def track(*args,**kwargs):
            handle=create(*args,**kwargs);handles.append(handle);return handle
        with patch.dict(live.jobs, {}, clear=True), patch.object(live.tempfile,'TemporaryFile',side_effect=track), TestClient(app) as client:
            for payload,expected in [(b'bad\n1\n',422),(b'\xff',422),(fixture(1,0)['ball_by_ball'],201)]:
                response=client.post('/api/v1/live/uploads',content=payload,headers={'Content-Type':'text/csv'})
                self.assertEqual(response.status_code,expected,response.text)
                if expected==201:
                    # Request spool closes immediately; owned structured export
                    # remains private until the session is deleted/expired.
                    self.assertTrue(all(handle.closed for handle in handles[:-1]))
                    self.assertFalse(handles[-1].closed)
                    owner=response.json()
                    client.delete('/api/v1/live/jobs/'+owner['job_id'],headers={'X-Analysis-Token':owner['access_token']})
                import gc
                gc.collect()
                self.assertTrue(all(handle.closed for handle in handles))

    def test_stream_matches_existing_validation_contract(self):
        import hashlib
        data=fixture(1,0)['ball_by_ball']
        expected,_,_=live.inspect_csv(data)
        actual,_,_=live.inspect_stream(io.StringIO(data.decode()),hashlib.sha256(data).hexdigest(),'ball_by_ball')
        self.assertEqual(actual,expected)

    def test_expired_running_job_cancels_at_real_stage_boundary(self):
        job={'created':live.time.monotonic()-live.TTL-1,'cancel':False,'stages':[],
             'tables':{},'status':'queued'}
        with patch.object(live,'analyze',side_effect=lambda tables,progress:progress('next stage')):
            live.process(job)
        self.assertEqual(job['status'],'cancelled')
        self.assertNotIn('result',job)

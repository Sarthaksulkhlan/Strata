import hashlib
import os
from pathlib import Path
import sys
import unittest

import pandas as pd

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('CLUTCHIQ_CORS_ORIGINS','https://frontend.example')
from fastapi.testclient import TestClient
from integration_api.app import app,store
from integration_api.service import validate_snapshot


@unittest.skipUnless(os.environ.get('STRATA_APPROVED_SNAPSHOT'),'Approved local snapshot required')
class ApprovedRegressionTests(unittest.TestCase):
    def test_unchanged_approved_routes_and_rankings(self):
        root=Path(os.environ['STRATA_APPROVED_SNAPSHOT'])
        protected={p:hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}
        before=os.environ.get('CLUTCHIQ_OUTPUT_SNAPSHOT')
        os.environ['CLUTCHIQ_OUTPUT_SNAPSHOT']=str(root)
        store.cache_clear()
        try:
            validate_snapshot(root)
            with TestClient(app) as client:
                for route in ['/healthz','/api/v1/dashboard/summary','/api/v1/methodology','/api/v1/pressure/definitions']:
                    self.assertEqual(client.get(route).status_code,200,route)
                self.assertEqual(client.get('/api/v1/match-lab').status_code,503)
                for role in ['batting','bowling']:
                    response=client.get('/api/v1/rankings/'+role)
                    self.assertEqual(response.status_code,200)
                    rows=response.json()['data']; expected=pd.read_csv(root/role/'top_10.csv.gz')
                    self.assertEqual([r['player']['id'] for r in rows],expected.player_id.tolist())
                    for row,source in zip(rows,expected.itertuples()):
                        self.assertAlmostEqual(row['pressure_score'],source.pressure_score,places=8)
                        self.assertEqual(row['exposures'],source.exposures)
                        self.assertEqual(row['evidence_level'],source.evidence_level)
                        self.assertNotIn('source_records',row)
                        self.assertEqual(client.get(f'/api/v1/players/{source.player_id}?role={role}').status_code,200)
                self.assertEqual(client.post('/api/v1/rankings/batting').status_code,405)
            self.assertEqual(protected,{p:hashlib.sha256(p.read_bytes()).hexdigest() for p in protected})
        finally:
            store.cache_clear()
            if before is None:os.environ.pop('CLUTCHIQ_OUTPUT_SNAPSHOT',None)
            else:os.environ['CLUTCHIQ_OUTPUT_SNAPSHOT']=before

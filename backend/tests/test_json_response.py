import json
import os
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('CLUTCHIQ_CORS_ORIGINS', 'https://frontend.example')
from integration_api.json_response import FiniteJSONResponse, finite_json


class JSONBoundaryTests(unittest.TestCase):
    def test_nested_nonfinite_values_become_null_without_mutation(self):
        original = {'values': [float('nan'), float('inf'), -float('inf')], 'nested': {'x': 1.2345678901234567}}
        output = json.loads(FiniteJSONResponse(original).body)
        self.assertEqual(output, {'values': [None, None, None], 'nested': original['nested']})
        self.assertNotEqual(original['values'][0], original['values'][0])

    def test_legitimate_values_are_preserved(self):
        value = {'zero': 0, 'negative': -3.5, 'false': False, 'null': None,
                 'text': 'NaN', 'large_integer': 2**60, 'float': 1.2345678901234567}
        self.assertEqual(json.loads(FiniteJSONResponse(value).body), value)
        self.assertEqual(finite_json(value), value)


@unittest.skipUnless(os.environ.get('STRATA_APPROVED_SNAPSHOT'), 'Requires private approved snapshot')
class InsufficientEvidenceRegressionTests(unittest.TestCase):
    def test_real_affected_routes_and_top_tens(self):
        from fastapi.testclient import TestClient
        from integration_api.app import app, store
        previous = os.environ.get('CLUTCHIQ_OUTPUT_SNAPSHOT')
        os.environ['CLUTCHIQ_OUTPUT_SNAPSHOT'] = os.environ['STRATA_APPROVED_SNAPSHOT']
        store.cache_clear()
        try:
            with TestClient(app) as client:
                for role, player_id, offset in [('batting', 47, 171), ('bowling', 305, 160)]:
                    player = client.get(f'/api/v1/players/{player_id}?role={role}&definition=rules_pressure')
                    self.assertEqual(player.status_code, 200)
                    row = player.json()['data']['primary_evaluation']
                    self.assertIsNone(row['uncertainty']['ci95_low'])
                    self.assertIsNone(row['uncertainty']['ci95_high'])
                    self.assertIsNone(row['uncertainty']['match_rate_sd'])
                    self.assertIsNone(row['shrink_weight'])
                    page = client.get(f'/api/v1/rankings/{role}?offset={offset}&limit=1')
                    self.assertEqual(page.status_code, 200)
                    self.assertIsNone(page.json()['data'][0]['uncertainty']['ci_half_width'])
                    top = client.get(f'/api/v1/rankings/{role}')
                    self.assertEqual(top.status_code, 200)
                    self.assertEqual(len(top.json()['data']), 10)
                    for candidate in top.json()['data']:
                        self.assertIsNotNone(candidate['uncertainty']['ci95_low'])
                        self.assertEqual(client.get(f"/api/v1/players/{candidate['player']['id']}?role={role}").status_code, 200)
        finally:
            store.cache_clear()
            if previous is None:
                os.environ.pop('CLUTCHIQ_OUTPUT_SNAPSHOT', None)
            else:
                os.environ['CLUTCHIQ_OUTPUT_SNAPSHOT'] = previous

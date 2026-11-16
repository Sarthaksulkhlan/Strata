import os
import sys
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('CLUTCHIQ_CORS_ORIGINS', 'https://frontend.example')
from integration_api.live_console import inspect_csv
from integration_api.live_pipeline import reconstruct_batches, normalize_deliveries
from integration_api.recovered.event_contract import normalize_event
from integration_api.recovered.validation import validate_tables
from integration_api.recovered.state import reconstruct
from live_fixture import fixture


class ReconstructionBatchTests(unittest.TestCase):
    def test_chunked_normalization_equals_original_row_contract(self):
        import io
        frame = pd.read_csv(io.BytesIO(fixture(2, 1)['ball_by_ball']), dtype=str, keep_default_na=False)
        frame.loc[0, 'runs'] = ''
        frame.loc[1, 'extras_type'] = 'Unverified'
        expected = pd.DataFrame(normalize_event(row) for row in frame.to_dict('records'))
        actual = normalize_deliveries(frame, batch_rows=17)
        pd.testing.assert_frame_equal(actual, expected, check_dtype=False)

    def test_complete_match_batches_equal_original_including_absent_fixture(self):
        inspected = {name: inspect_csv(data, name) for name, data in fixture(3, 1).items()}
        raw = {name: value[1] for name, value in inspected.items()}
        typed, issues, _, _, _ = validate_tables(raw)
        derived = inspected['ball_by_ball'][2].drop(columns='source_record_number')
        events = pd.concat([raw['ball_by_ball'], derived], axis=1)
        events['relationship_valid'] = ~events.source_record_number.isin(
            issues.loc[issues.table.eq('ball_by_ball'), 'source_record_number'])
        # Retain the fixture metadata for an absent match, as the real pack does.
        events = events[events.n_match_id.ne(events.n_match_id.max())]
        expected, _, checks, _ = reconstruct(events, typed['matches'], typed['competitions'])
        stages = []
        actual, actual_checks = reconstruct_batches(events, typed['matches'], typed['competitions'], stages.append, batch_matches=1)
        pd.testing.assert_frame_equal(actual, expected, check_dtype=False)
        pd.testing.assert_frame_equal(actual_checks, checks, check_dtype=False)
        self.assertEqual(len(stages), events.n_match_id.nunique())
        self.assertIn('3 of 3', stages[-1])

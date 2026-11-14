import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from integration_api.live_analysis import (
    get_job_results,
    start_analysis_job,
    validate_csv_payload,
)

SAMPLE_CSV = """match_id,innings,over,ball,batting_team,bowling_team,batter,bowler,runs_off_bat,extras,total_runs,is_wicket,wicket_type,player_dismissed
RR_MI_01,1,16,1,Rajasthan Royals,Mumbai Indians,Sanju Samson,Jasprit Bumrah,4,0,4,0,,
RR_MI_01,1,16,2,Rajasthan Royals,Mumbai Indians,Sanju Samson,Jasprit Bumrah,0,0,0,0,,
RR_MI_01,1,16,3,Rajasthan Royals,Mumbai Indians,Sanju Samson,Jasprit Bumrah,6,0,6,0,,
RR_MI_01,1,16,4,Rajasthan Royals,Mumbai Indians,Sanju Samson,Jasprit Bumrah,1,0,1,0,,
RR_MI_01,1,16,5,Rajasthan Royals,Mumbai Indians,Riyan Parag,Jasprit Bumrah,4,0,4,0,,
RR_MI_01,1,16,6,Rajasthan Royals,Mumbai Indians,Riyan Parag,Jasprit Bumrah,0,0,0,1,bowled,Riyan Parag
RR_MI_01,2,18,1,Mumbai Indians,Rajasthan Royals,Suryakumar Yadav,Trent Boult,0,0,0,0,,
RR_MI_01,2,18,2,Mumbai Indians,Rajasthan Royals,Suryakumar Yadav,Trent Boult,0,0,0,1,caught,Suryakumar Yadav
"""


class LiveAnalysisEngineTests(unittest.TestCase):
    def test_rejects_missing_columns_with_clear_error(self):
        bad_csv = "colA,colB\n1,2\n3,4\n"
        result = validate_csv_payload("bad.csv", bad_csv)
        self.assertFalse(result["valid"])
        self.assertIn("Missing required ball-by-ball columns", result["error"])

    def test_validates_and_completes_analysis_job(self):
        val_res = validate_csv_payload("sample.csv", SAMPLE_CSV)
        self.assertTrue(val_res["valid"])
        self.assertEqual(val_res["row_count"], 8)

        job_data = start_analysis_job(
            "sample.csv",
            len(SAMPLE_CSV.encode("utf-8")),
            SAMPLE_CSV,
            synchronous=True,
        )
        self.assertEqual(job_data["status"], "completed")
        self.assertEqual(job_data["current_stage"], 8)
        self.assertEqual(job_data["progress_pct"], 100)

        results = get_job_results(job_data["job_id"])
        self.assertIsNotNone(results)
        self.assertEqual(results["summary"]["total_records"], 8)
        self.assertIsNotNone(results["best_batter"])
        self.assertIsNotNone(results["best_bowler"])
        self.assertGreaterEqual(len(results["top_batters"]), 2)
        self.assertGreaterEqual(len(results["top_bowlers"]), 2)

import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("CLUTCHIQ_CORS_ORIGINS", "https://frontend.example")

from integration_api.app import cors_origins
from integration_api.app import app, store
from integration_api.service import SnapshotError, configured_snapshot_root


class ConfigurationSafetyTests(unittest.TestCase):
    def test_cors_requires_explicit_origin(self):
        previous = os.environ.get("CLUTCHIQ_CORS_ORIGINS")
        try:
            os.environ["CLUTCHIQ_CORS_ORIGINS"] = "*"
            with self.assertRaises(RuntimeError):
                cors_origins()
        finally:
            if previous is None:
                os.environ.pop("CLUTCHIQ_CORS_ORIGINS", None)
            else:
                os.environ["CLUTCHIQ_CORS_ORIGINS"] = previous

    def test_snapshot_path_is_required(self):
        previous = os.environ.pop("CLUTCHIQ_OUTPUT_SNAPSHOT", None)
        try:
            with self.assertRaises(SnapshotError):
                configured_snapshot_root()
        finally:
            if previous is not None:
                os.environ["CLUTCHIQ_OUTPUT_SNAPSHOT"] = previous

    def test_health_is_unavailable_without_snapshot(self):
        from fastapi.testclient import TestClient
        previous = os.environ.pop("CLUTCHIQ_OUTPUT_SNAPSHOT", None)
        try:
            store.cache_clear()
            response = TestClient(app).get("/healthz")
            self.assertEqual(response.status_code, 503)
            self.assertEqual(response.json()["error"]["code"], "snapshot_unavailable")
        finally:
            store.cache_clear()
            if previous is not None:
                os.environ["CLUTCHIQ_OUTPUT_SNAPSHOT"] = previous

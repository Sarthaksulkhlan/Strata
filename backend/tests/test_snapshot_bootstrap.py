import hashlib
import io
import json
import os
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from integration_api.snapshot_bootstrap import SnapshotBootstrapError, bootstrap_snapshot


def archive_bytes(payload: bytes = b"approved") -> bytes:
    manifest = {"artifacts": {"summary.json": hashlib.sha256(payload).hexdigest()}}
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as archive:
        archive.writestr("private-snapshot/phase7a_v2_a/manifest.json", json.dumps(manifest))
        archive.writestr("private-snapshot/phase7a_v2_a/summary.json", payload)
    return stream.getvalue()


class SnapshotBootstrapTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = {"SNAPSHOT_GITHUB_REPOSITORY": "owner/private-snapshot", "SNAPSHOT_GITHUB_REF": "a" * 40, "SNAPSHOT_GITHUB_TOKEN": "test-auth-value", "CLUTCHIQ_OUTPUT_SNAPSHOT": str(Path(self.temp.name) / "phase7a_v2_a")}
        self.previous = {key: os.environ.get(key) for key in self.env}; os.environ.update(self.env)

    def tearDown(self):
        for key, value in self.previous.items():
            if value is None: os.environ.pop(key, None)
            else: os.environ[key] = value
        self.temp.cleanup()

    def test_downloads_validates_and_refreshes_after_restart(self):
        with patch("urllib.request.urlopen", side_effect=lambda *_args, **_kwargs: io.BytesIO(archive_bytes())) as request:
            first = bootstrap_snapshot(); second = bootstrap_snapshot()
        self.assertEqual(first, second); self.assertTrue((first / "manifest.json").is_file()); self.assertEqual(request.call_count, 2)

    def test_failure_does_not_include_token(self):
        with patch("urllib.request.urlopen", side_effect=OSError("network unavailable")):
            with self.assertRaises(SnapshotBootstrapError) as error: bootstrap_snapshot()
        self.assertNotIn(self.env["SNAPSHOT_GITHUB_TOKEN"], str(error.exception))

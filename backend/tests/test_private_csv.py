import gc
import io
from concurrent.futures import ThreadPoolExecutor
import sys
from pathlib import Path
import unittest
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from integration_api.private_csv import PrivateCsv, safe_chunks


class PrivateCsvTests(unittest.TestCase):
    def test_complete_stream_concurrent_readers_and_release(self):
        frame = pd.DataFrame({'number': range(10001), 'name': ['ordinary'] * 10000 + ['=unsafe']})
        stored = PrivateCsv(frame)
        file = stored._file
        with ThreadPoolExecutor(max_workers=2) as pool:
            a, b = list(pool.map(lambda _: b''.join(stored.chunks()), range(2)))
        self.assertEqual(a, b)
        parsed = pd.read_csv(io.BytesIO(a))
        self.assertEqual(len(parsed), 10001)
        self.assertEqual(parsed.name.iloc[-1], "'=unsafe")
        del stored
        gc.collect()
        self.assertTrue(file.closed)

    def test_empty_export_keeps_header(self):
        import csv
        self.assertEqual(list(csv.reader(io.StringIO(''.join(safe_chunks(pd.DataFrame(columns=['a'])))))), [['a']])

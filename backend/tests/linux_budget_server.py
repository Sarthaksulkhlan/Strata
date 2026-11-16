"""Fail closed unless the complete API is in a Linux cgroup v2 <=512 MiB, no swap.

The full-pack HTTP client runs outside this container. No private data is baked
into its image. This harness does not assert success merely because it starts.
"""
import json
import os
from pathlib import Path
import sys
import threading
import time

root = Path('/sys/fs/cgroup')
if sys.platform != 'linux' or not (root / 'memory.max').is_file():
    raise SystemExit('Linux cgroup v2 is required for the resource certification run.')
limit = (root / 'memory.max').read_text().strip()
swap = (root / 'memory.swap.max').read_text().strip()
if not limit.isdigit() or int(limit) > 512 * 1024 * 1024 or swap != '0':
    raise SystemExit('Refusing uncapped/swappable test: require memory.max <= 512 MiB and memory.swap.max = 0.')
print(json.dumps({'cgroup_memory_max': int(limit), 'cgroup_swap_max': int(swap)}), flush=True)

def monitor():
    while True:
        print(json.dumps({name: (root / name).read_text().strip()
                          for name in ('memory.current', 'memory.peak', 'memory.events')}), flush=True)
        time.sleep(10)

threading.Thread(target=monitor, daemon=True).start()
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from integration_api.app import app, store
store()  # Manifest-validated production data participates in the memory limit.
import uvicorn
uvicorn.run(app, host='0.0.0.0', port=8012, workers=1, access_log=False)

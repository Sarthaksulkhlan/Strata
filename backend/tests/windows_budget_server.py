"""Local Windows committed-memory cap, NOT a Linux/no-swap Render certificate.

python -B backend/tests/windows_budget_server.py --mib 512 --port 8012
The client/full-pack test must run in a separate process.
"""
import argparse
import ctypes as c
from ctypes import wintypes as w
import json
import os
from pathlib import Path
import sys
import threading
import time

if sys.platform != 'win32':
    raise SystemExit('This diagnostic is Windows-only; use the Linux container harness instead.')

class Basic(c.Structure):
    _fields_ = [('process_time', c.c_int64), ('job_time', c.c_int64), ('flags', w.DWORD),
                ('min_ws', c.c_size_t), ('max_ws', c.c_size_t), ('active', w.DWORD),
                ('affinity', c.c_size_t), ('priority', w.DWORD), ('scheduling', w.DWORD)]

class Extended(c.Structure):
    _fields_ = [('basic', Basic), ('io', c.c_uint64 * 6), ('process_limit', c.c_size_t),
                ('job_limit', c.c_size_t), ('peak_process', c.c_size_t), ('peak_job', c.c_size_t)]

parser = argparse.ArgumentParser()
parser.add_argument('--mib', type=int, default=512)
parser.add_argument('--port', type=int, default=8012)
args = parser.parse_args()
kernel = c.WinDLL('kernel32', use_last_error=True)
kernel.CreateJobObjectW.argtypes = [c.c_void_p, w.LPCWSTR]
kernel.CreateJobObjectW.restype = w.HANDLE
kernel.GetCurrentProcess.restype = w.HANDLE
kernel.SetInformationJobObject.argtypes = [w.HANDLE, c.c_int, c.c_void_p, w.DWORD]
kernel.AssignProcessToJobObject.argtypes = [w.HANDLE, w.HANDLE]
kernel.QueryInformationJobObject.argtypes = [w.HANDLE, c.c_int, c.c_void_p, w.DWORD, c.c_void_p]
handle = kernel.CreateJobObjectW(None, None)
assert handle, c.get_last_error()
limits = Extended()
limits.basic.flags = 0x200  # JOB_OBJECT_LIMIT_JOB_MEMORY: committed-memory sum.
limits.job_limit = args.mib * 1024 * 1024
assert kernel.SetInformationJobObject(handle, 9, c.byref(limits), c.sizeof(limits)), c.get_last_error()
assert kernel.AssignProcessToJobObject(handle, kernel.GetCurrentProcess()), c.get_last_error()
print(json.dumps({'windows_commit_cap_bytes': limits.job_limit, 'linux_no_swap_certified': False}), flush=True)

def telemetry():
    previous = 0
    while True:
        measured = Extended()
        if kernel.QueryInformationJobObject(handle, 9, c.byref(measured), c.sizeof(measured), None):
            if measured.peak_job != previous:
                previous = measured.peak_job
                print(json.dumps({'windows_peak_committed_bytes': previous}), flush=True)
        time.sleep(5)

threading.Thread(target=telemetry, daemon=True).start()
os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')
os.environ.setdefault('OMP_NUM_THREADS', '1')
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import uvicorn
uvicorn.run('integration_api.app:app', host='127.0.0.1', port=args.port, workers=1, access_log=False)

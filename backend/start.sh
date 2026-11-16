#!/usr/bin/env bash
set -euo pipefail
export OPENBLAS_NUM_THREADS=1
export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1
echo "snapshot bootstrap: starting"
python -m integration_api.snapshot_bootstrap
echo "snapshot bootstrap: complete; starting API"
exec uvicorn integration_api.app:app --workers 1 --host 0.0.0.0 --port "${PORT}"

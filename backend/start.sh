#!/usr/bin/env bash
set -euo pipefail
echo "snapshot bootstrap: starting"
python -m integration_api.snapshot_bootstrap
echo "snapshot bootstrap: complete; starting API"
exec uvicorn integration_api.app:app --host 0.0.0.0 --port "${PORT}"

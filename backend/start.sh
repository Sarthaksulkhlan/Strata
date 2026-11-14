#!/usr/bin/env bash
set -euo pipefail
python -m integration_api.snapshot_bootstrap
exec uvicorn integration_api.app:app --host 0.0.0.0 --port "${PORT}"

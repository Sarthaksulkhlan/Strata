# Render Free deployment: existing STRATA repository

Use the existing static frontend and Python backend services. No persistent disk,
paid database or external queue is required. Do not add raw CSVs, snapshots,
credentials, `.env` files or private configuration to Git or container images.

## Service settings

| Setting | Frontend | Backend |
|---|---|---|
| Root directory | repository root | `backend` |
| Runtime | Static Site | Python 3.12.10; Free plan |
| Build | `npm ci && npm run build` | `pip install -r requirements.txt` |
| Publish/start | `dist` | `bash start.sh` |
| Health check | existing static site | `/healthz` |
| Auto deploy | After CI Checks Pass | After CI Checks Pass |

`render.yaml` declares these settings. Existing service Dashboard settings must
actually match: committing a Blueprint does not prove existing manually created
services adopted it. This session does not have Render account-management access.

## Environment variables

Frontend: `VITE_API_BASE_URL=https://strataa.onrender.com` (public URL only).
This value is baked at build time; a frontend rebuild is needed if it changes.
Do not put snapshot credentials in any `VITE_` variable.

Backend private Render settings:

- `CLUTCHIQ_CORS_ORIGINS=https://strata-y6yz.onrender.com`
- `CLUTCHIQ_OUTPUT_SNAPSHOT=/tmp/clutchiq-snapshot/phase7a_v2_a`
- `SNAPSHOT_GITHUB_REPOSITORY=Sarthaksulkhlan/Strata-Phase7A`
- `SNAPSHOT_GITHUB_REF`: the existing approved full Git commit SHA; do not use a branch.
- `SNAPSHOT_GITHUB_TOKEN`: read-only access to that private repository, stored only
  in Render's private secret settings. Never paste it into commands or Git.
- `PORT`: provided by Render; `start.sh` consumes it.

`start.sh` downloads the pinned snapshot into temporary storage, validates every
manifest-listed artifact before starting Uvicorn, and starts one worker. The
approved snapshot has 23 artifacts plus manifest.json (24 files). Download or
validation failure stops startup. Every cold start retrieves and validates the
snapshot; no paid disk or permanent state is claimed. BLAS/OpenMP worker counts
are bounded to one to avoid unnecessary native thread memory.

The aggregate GET endpoints remain read-only. The existing owned Live Console
POST/GET/DELETE endpoints use ephemeral sessions; no durable history exists.
Explicit CORS is required. `/healthz` returns 503 for missing/invalid snapshots.

## Full-pack deployment gate

Do **not** set `STRATA_LOCAL_FULL_DATASET=1` on Render. The safety guard remains
until the entire workload passes a measured Linux 512 MiB/no-swap run with
headroom and the 15-minute lifetime under actual CPU constraints. Windows
committed-memory-cap testing is useful evidence, not Render certification.
Default hosted limits still reject the full 41 MB delivery file transparently.
The supported full-pack alternative is local execution in `FULL_DATASET_LOCAL.md`.

## Reproducible Linux resource check (not yet executed on this Windows host)

`Dockerfile.memory` copies application code only; the snapshot is mounted
read-only. Start on a Linux Docker/cgroup-v2 host:

```sh
docker build -f backend/Dockerfile.memory -t strata-memory-check backend
docker run --rm --name strata-memory-check --memory=512m --memory-swap=512m --cpus=0.1 -p 127.0.0.1:8012:8012 -e CLUTCHIQ_CORS_ORIGINS=http://localhost:3011 --mount type=bind,src=/absolute/private/phase7a_v2_a,dst=/snapshot/phase7a_v2_a,readonly strata-memory-check
```

The harness refuses uncapped memory or nonzero cgroup swap allowance. Run
`tests/full_console_local.py` from a separate local client with the existing
private ZIP/snapshot variables, `STRATA_LOCAL_FULL_DATASET=1` and
`STRATA_FULL_TEST_URL=http://127.0.0.1:8012`. It checks all candidates, thresholds,
all 200,999 structured export records, evidence, results and deletion. Inspect
`memory.peak`, `memory.events`, zero swap and runtime, not just exit status.
No Windows host swap settings are changed. Do not upload private fixtures to CI.

The existing GitHub workflows run backend regressions and frontend tests/lint/
build before auto-deploy. They intentionally do not contain the private full
pack. Passing those workflows alone does not certify the full-pack resource gate.

Official configuration references: https://render.com/docs/deploys and
https://render.com/docs/free. No deployment or push was performed here.

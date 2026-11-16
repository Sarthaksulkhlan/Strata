# Full official dataset: local execution alternative

The same Live Analysis Console supports full-pack processing **locally**. This is
not a claim that Render Free can process the complete pack. Keep
`STRATA_LOCAL_FULL_DATASET` unset on Render. Backend startup rejects full mode
when Render's `RENDER` environment flag is present.

Render documents 512 MB RAM / 0.1 CPU for Free:
https://render.com/docs/compute-plans
Earlier uncapped Windows measurements exceeded that allocation. The latest
implementation passes an enforced 512 MiB Windows committed-memory cap; this
is still not Linux no-swap or Render certification. See the submission
verification report for exact measurements. Chunking requests alone is not
a substitute for measuring the complete analytical workload.
The original method uses whole-history training, match reconstruction and
bootstrap aggregation; it is not replaced with an incremental approximation.

## Limits and storage

| Mode | Per CSV | Combined | Rows per table | Resident jobs |
|---|---:|---:|---:|---:|
| Hosted/default | 2 MiB | 6 MiB | 10,000 | 2 |
| Explicit local full | 48 MiB | 64 MiB | 250,000 | 1 |

The six actual source CSVs total 42,639,503 bytes. The delivery CSV is
41,071,837 bytes / 200,999 records; playing XI has 28,381 records. Full limits
provide bounded headroom for this inspected pack, not arbitrary unlimited input.

Requests spool to automatically removed private temporary files; validation
reads the spool as a UTF-8 CSV stream. No complete bytearray, bytes copy and
decoded CSV string are retained together. Pandas still materializes validated
tables because the original analytical functions require them. Normalization
uses a row generator rather than a complete list of source-row dictionaries;
the adapter no longer copies all raw tables again. Normalized structured exports
are retained in owned private temporary files, not a second resident full frame;
CSV responses stream bounded chunks with spreadsheet-formula protection. Normalization now runs in
4,096-row batches and unchanged state reconstruction runs in batches of 40
complete matches. Global validation, training quantiles, context baselines,
bootstrap and ranking still use the full eligible population, never independent
per-chunk rankings. The local Node proxy still
buffers one bounded request. It is not a resumable/chunk-upload protocol.

Sessions remain temporary for 15 minutes, not durable history. Inactive expired
jobs are removed; analysis checks cancellation/expiry at genuine stage
boundaries. No partial table enters a job after failed receipt/validation.
Incomplete six-table jobs cannot start. Private job ownership headers remain
mandatory. Spools close on success, invalid input, exceptions and disconnects.

## Start locally

In the existing frontend repository, use two PowerShell terminals. Retain your
existing approved local `CLUTCHIQ_OUTPUT_SNAPSHOT` configuration; do not change
the snapshot or download pin.

Backend (use the existing Python environment with backend dependencies):

```powershell
$env:STRATA_LOCAL_FULL_DATASET='1'
$env:CLUTCHIQ_CORS_ORIGINS='http://localhost:3011'
python -B -m uvicorn integration_api.app:app --app-dir backend --host 127.0.0.1 --port 8011
```

Frontend:

```powershell
$env:STRATA_LOCAL_FULL_DATASET='1'
$env:PORT='3011'
$env:VITE_API_BASE_URL='http://127.0.0.1:8011'
$env:CLUTCHIQ_PRODUCTION_API_URL='http://127.0.0.1:8011'
$env:CLUTCHIQ_PRODUCTION_FRONTEND_ORIGIN='http://localhost:3011'
npm run dev
```

Open `http://localhost:3011/#live-console`. The schema-driven UI should show
48 MiB / 250,000 rows per CSV and 64 MiB per job. Supply all six original tables.
Uploaded results remain separate from the approved production ranking API.

## Private full-pack verification

`backend/tests/full_console_local.py` is opt-in; it never bundles source data.
Set `STRATA_ORIGINAL_ZIP` and `STRATA_APPROVED_SNAPSHOT` to existing private local
paths, plus `STRATA_LOCAL_FULL_DATASET=1`. Run with the backend test environment:

```powershell
python -B backend/tests/full_console_local.py
```

With local servers running, additionally set
`STRATA_FULL_TEST_URL=http://localhost:3011` to exercise the real Node proxy and
Uvicorn network path. The test rejects non-loopback destinations. It uploads all
six files, verifies hashes/row counts, blocks incomplete starts, polls real
progress, compares every primary candidate's ordering and checked numeric
metrics to the approved evidence, retrieves evidence/exports and deletes the job.

No new infrastructure, paid storage, database or queue is required. Full hosted
processing is not supported/certified by this alternative. No 41 MB proprietary
request was sent to Render and its large-body infrastructure limit was not
verified. Hosted mode deliberately keeps the existing bounded request path.


## Latest frontend and browser verification

The working tree incorporates AI Studio frontend commit
`52c252d9db36ca198833a224ed60b268a624a1b4` with focused integration corrections.
Browser header checks read at most 64 KiB per file; they are preliminary, never
backend event validation or a substitute for the backend SHA-256. Companion-first
uploads remain supported and are sent when the delivery file creates a session.

To run the opt-in browser test against localhost (same private path environment
variables as above), install Playwright into your test environment and use an
installed Chrome browser:

```powershell
python -B backend/tests/browser_console_local.py
```

It uses temporary private copies of exactly the six CSVs, removes those copies
on exit, and never sends them outside loopback. A test failure must not be
reported as a completed browser verification. See the latest local audit report
for measured results and remaining Render certification blockers.

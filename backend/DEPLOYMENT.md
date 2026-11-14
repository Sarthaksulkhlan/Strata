# Render backend handoff

This service serves reviewed aggregate evidence only. Do not commit or upload raw source data, analytical workspaces, `.env` files, or the approved snapshot to this repository.

## Required Render service configuration

Create the `strata-aggregate-api` web service from this repository with `backend` as its root directory. The Blueprint supplies the build command, start command, persistent disk, and health-check route.

Set these values in the Render Dashboard's private service environment settings, never in Git:

| Variable | Value |
| --- | --- |
| `CLUTCHIQ_CORS_ORIGINS` | Exact deployed frontend origin(s), comma-separated, for example `https://your-frontend.onrender.com` |
| `CLUTCHIQ_OUTPUT_SNAPSHOT` | Absolute path to the approved snapshot directory on the attached Render disk |

The disk is the only location for the approved snapshot. Transfer the approved, manifest-bearing snapshot through an authorized private operational channel, then verify that `manifest.json` and every listed artifact are present before enabling public traffic. The service validates every manifest hash before it serves aggregate data. Do not place a snapshot archive in Git, a public release, frontend assets, or browser storage.

The API uses `GET` routes only. It has no interactive documentation endpoint and returns `503` when the snapshot is absent or fails integrity validation.

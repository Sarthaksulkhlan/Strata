# Render production runbook

1. Create the backend Web Service from `main` with root directory `backend`.
2. Attach the encrypted persistent disk before enabling public traffic.
3. Set the exact frontend origin in `CLUTCHIQ_CORS_ORIGINS`.
4. Set `CLUTCHIQ_OUTPUT_SNAPSHOT` only in Render's private service environment.
5. Confirm `/healthz` returns `200`; it validates the snapshot manifest before traffic is accepted.
6. Set the backend public URL as `VITE_API_BASE_URL` in the Static Site, then redeploy it.
7. Verify rankings, player evidence, methodology, rejected CORS origins, and Match Lab's expected `503` response.

Never place secrets or the approved snapshot in GitHub.

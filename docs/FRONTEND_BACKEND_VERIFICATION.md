# Frontend/backend production verification

After the API health check succeeds, set the backend public URL as `VITE_API_BASE_URL` in the Render Static Site and redeploy the frontend. Confirm the browser renders genuine batting and bowling tables, aggregate selected-player evidence, and methodology responses.

Verify CORS with the exact frontend origin only. Match Lab should remain unavailable with its supported `503` state; auction tools remain disabled because they have no approved aggregate output.

The frontend must never receive raw snapshot files, `source_records`, tokens, or private backend configuration.

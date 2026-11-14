# Render Free snapshot troubleshooting

If `/healthz` returns `503`, inspect the backend log lifecycle in order: bootstrap start, download, extraction, manifest validation, then API startup. A missing final validation message means the API must not be treated as ready.

Free services lose `/tmp` on restarts and cold starts. This is expected: the startup script retrieves the pinned private snapshot again before Uvicorn starts. Never work around a failed bootstrap by changing the API to use mock output or by disabling manifest validation.

If the download fails, confirm the private repository identifier, immutable commit SHA, and read-only token in Render's private environment settings. Do not copy any value into GitHub issues, logs, source files, or frontend variables.

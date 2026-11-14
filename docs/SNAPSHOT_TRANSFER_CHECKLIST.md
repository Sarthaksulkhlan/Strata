# Approved snapshot transfer checklist

- Use the complete approved snapshot directory with its original `manifest.json`.
- Transfer it only through an authorized private channel to the Render persistent disk.
- Preserve the manifest's relative artifact paths and do not edit files after transfer.
- Confirm the backend health check succeeds only after manifest hashes validate.
- Do not upload the snapshot to Git, Releases, frontend assets, browser storage, or public object URLs.
- Record the transfer and integrity check in your private deployment log.

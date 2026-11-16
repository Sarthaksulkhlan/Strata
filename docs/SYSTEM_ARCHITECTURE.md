# STRATA system architecture

```mermaid
flowchart TD
 U[Browser] --> F[React TypeScript / Render Static Site]
 F -->|HTTPS and strict CORS| A[FastAPI / Render Web Service]
 P[Private snapshot repository / pinned commit] --> V[Startup manifest and hash validation]
 V --> S[Approved Phase 7A snapshot]
 S --> A
 A --> R[Production rankings / aggregate evidence / methodology]
 U --> C[Six CSV uploads]
 C --> J[Private temporary job / owner token]
 J --> Q[Schema and relationship validation]
 Q --> N[Normalize / join / reconstruct pre-ball state]
 N --> H[Recovered pressure rules and historical baselines]
 H --> B[Batting and bowling residuals]
 B --> E[Bootstrap / shrinkage / evidence tiers]
 E --> O[Uploaded rankings / evidence / exports]
 O --> A
```

## Six-table data flow

```mermaid
flowchart LR
 C[competitions] --> M[matches]
 T[teams] --> M
 P[competition_team_player_mapping] --> I[Identity and roster validation]
 X[playing_eleven] --> I
 M --> I
 D[ball_by_ball] --> I
 I --> V[Validated pack]
 V --> N[Event normalization and state reconstruction]
 N --> Q[Pressure classification]
 Q --> B[Batting evaluation]
 Q --> W[Bowling evaluation]
 B --> R[Evidence tier / score / player ID ordering]
 W --> R
 R --> E[Rankings and supporting evidence]
```

The approved production snapshot and uploaded analyses are separate flows.
Uploads never replace production rankings. There is no persistent database or
external queue. One Python worker handles jobs; private temporary files and
memory hold session state. Restart loses sessions. Private job requests require
the owner token in `X-Analysis-Token`.

Render serves the frontend from `dist`; the Express development proxy is not
part of the Static Site runtime. Clients use `VITE_API_BASE_URL`. Backend startup
validates the pinned private snapshot before starting one Uvicorn worker on
Render's `PORT`. Credentials remain server-side.

Hosted limits are 2 MiB per CSV, 6 MiB per job and 10,000 rows per CSV. Local
full mode allows 48 MiB, 64 MiB and 250,000 rows respectively. Sessions have a
900-second deadline; cleanup respects active processing and exports. No durable
history is promised. Recent full-pack runs exceeded the deadline; Render Free
512 MiB/no-swap operation remains unverified.

See [deployment settings](../backend/DEPLOYMENT.md) and
[local full-pack instructions](../backend/FULL_DATASET_LOCAL.md).

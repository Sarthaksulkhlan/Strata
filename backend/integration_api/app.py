from __future__ import annotations

import os
from functools import lru_cache

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from integration_api.service import ALLOWED_DEFINITIONS, ALLOWED_ROLES, SnapshotError, SnapshotStore, configured_snapshot_root


def cors_origins() -> list[str]:
    configured = os.environ.get("CLUTCHIQ_CORS_ORIGINS", "")
    origins = [origin.strip().rstrip("/") for origin in configured.split(",") if origin.strip()]
    if not origins or "*" in origins:
        raise RuntimeError("CLUTCHIQ_CORS_ORIGINS must contain explicit origins only.")
    return origins


@lru_cache(maxsize=1)
def store() -> SnapshotStore:
    return SnapshotStore(configured_snapshot_root())


def create_app() -> FastAPI:
    app = FastAPI(title="ClutchIQ Aggregate API", version="1.0.0", docs_url=None, redoc_url=None)
    app.add_middleware(CORSMiddleware, allow_origins=cors_origins(), allow_credentials=False, allow_methods=["GET"], allow_headers=["Accept", "Content-Type"], max_age=600)

    @app.exception_handler(SnapshotError)
    async def snapshot_error(_: Request, __: SnapshotError):
        return JSONResponse(status_code=503, content={"error": {"code": "snapshot_unavailable", "message": "Approved output snapshot is unavailable.", "request_id": "not-recorded"}})

    def get_store() -> SnapshotStore: return store()

    @app.get("/healthz")
    def healthz():
        # Readiness is deliberately coupled to manifest validation. Render must
        # not route public traffic to a service missing its approved snapshot.
        get_store()
        return {"status": "ok", "review_status": "phase_7b_reviewed"}

    def validate(role: str, definition: str) -> None:
        if role not in ALLOWED_ROLES or definition not in ALLOWED_DEFINITIONS: raise HTTPException(status_code=400, detail="Invalid role or definition.")

    @app.get("/api/v1/dashboard/summary")
    def dashboard(): return get_store().dashboard()

    @app.get("/api/v1/rankings/{role}")
    def rankings(role: str, definition: str = "rules_pressure", evidence_level: str | None = None, player_name: str | None = None, limit: int = Query(10, ge=1, le=100), offset: int = Query(0, ge=0)):
        validate(role, definition)
        return get_store().rankings(role, definition, evidence_level, player_name, limit, offset)

    @app.get("/api/v1/players/{player_id}")
    def player(player_id: int, role: str, definition: str = "rules_pressure"):
        validate(role, definition); result = get_store().player(player_id, role, definition)
        if result is None: raise HTTPException(status_code=404, detail="Player evidence is unavailable for this role and definition.")
        return result

    @app.get("/api/v1/pressure/definitions")
    def definitions(role: str | None = None, definition: str | None = None):
        if role is not None and role not in ALLOWED_ROLES: raise HTTPException(status_code=400, detail="Invalid role.")
        if definition is not None and definition not in ALLOWED_DEFINITIONS: raise HTTPException(status_code=400, detail="Invalid definition.")
        return get_store().definitions(role, definition)

    @app.get("/api/v1/methodology")
    def methodology(): return get_store().methodology()

    @app.get("/api/v1/match-lab")
    def match_lab(): raise HTTPException(status_code=503, detail="Match Lab is unavailable because no approved analytical output supports it.")
    return app


app = create_app()

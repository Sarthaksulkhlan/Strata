from __future__ import annotations

import os
from functools import lru_cache

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from integration_api.live_analysis import (
    get_job_results,
    get_job_status,
    start_analysis_job,
    validate_csv_payload,
)
from integration_api.service import ALLOWED_DEFINITIONS, ALLOWED_ROLES, SnapshotError, SnapshotStore, configured_snapshot_root


class CsvUploadPayload(BaseModel):
    filename: str
    file_size: int = 0
    csv_content: str
    synchronous: bool = False


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
    app.add_middleware(CORSMiddleware, allow_origins=cors_origins(), allow_credentials=False, allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["Accept", "Content-Type"], max_age=600)

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
        if role not in (None, *ALLOWED_ROLES): raise HTTPException(status_code=400, detail="Invalid role.")
        if definition not in (None, *ALLOWED_DEFINITIONS): raise HTTPException(status_code=400, detail="Invalid definition.")
        return get_store().definitions(role, definition)

    @app.get("/api/v1/methodology")
    def methodology(): return get_store().methodology()

    @app.get("/api/v1/match-lab")
    def match_lab(): raise HTTPException(status_code=503, detail="Match Lab is unavailable because no approved analytical output supports it.")

    @app.post("/api/v1/live-console/validate")
    def live_console_validate(payload: CsvUploadPayload):
        size = payload.file_size or len(payload.csv_content.encode("utf-8"))
        result = validate_csv_payload(payload.filename, payload.csv_content)
        result["file_size"] = size
        if not result["valid"]:
            return JSONResponse(status_code=422, content={"data": result, "error": {"message": result["error"]}})
        return {"data": result}

    @app.post("/api/v1/live-console/jobs")
    def live_console_create_job(payload: CsvUploadPayload):
        size = payload.file_size or len(payload.csv_content.encode("utf-8"))
        try:
            job = start_analysis_job(
                payload.filename,
                size,
                payload.csv_content,
                synchronous=payload.synchronous,
            )
            return {"data": job}
        except ValueError as err:
            raise HTTPException(status_code=422, detail=str(err)) from err

    @app.get("/api/v1/live-console/jobs/{job_id}")
    def live_console_job_status(job_id: str):
        status = get_job_status(job_id)
        if status is None:
            raise HTTPException(status_code=404, detail="Analysis job not found.")
        return {"data": status}

    @app.get("/api/v1/live-console/jobs/{job_id}/results")
    def live_console_job_results(job_id: str):
        status = get_job_status(job_id)
        if status is None:
            raise HTTPException(status_code=404, detail="Analysis job not found.")
        if status["status"] == "failed":
            raise HTTPException(status_code=422, detail=status.get("error") or "Analysis job failed.")
        results = get_job_results(job_id)
        if results is None:
            raise HTTPException(status_code=409, detail="Analysis job is still in progress.")
        return {"data": results}

    return app


app = create_app()

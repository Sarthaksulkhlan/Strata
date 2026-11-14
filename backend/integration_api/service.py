from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any

import pandas as pd

ALLOWED_DEFINITIONS = ("rules_pressure", "rules_q75", "rules_wider")
ALLOWED_ROLES = ("batting", "bowling")
REVIEW_STATUS = "phase_7b_reviewed"


class SnapshotError(RuntimeError): pass


def validate_snapshot(root: Path) -> None:
    """Validate every artifact named by the immutable approved manifest."""
    root = root.resolve(); manifest_path = root / "manifest.json"
    if not manifest_path.is_file(): raise SnapshotError("Approved output manifest is unavailable.")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    artifacts = manifest.get("artifacts", {})
    if not artifacts: raise SnapshotError("Approved output manifest is invalid.")
    for relative_path, expected_hash in artifacts.items():
        candidate = (root / relative_path).resolve()
        if root not in candidate.parents or not candidate.is_file(): raise SnapshotError("Approved output snapshot failed integrity validation.")
        if hashlib.sha256(candidate.read_bytes()).hexdigest() != expected_hash: raise SnapshotError("Approved output snapshot failed integrity validation.")


class SnapshotStore:
    """Loads reviewed aggregate artifacts and never returns raw source records."""
    def __init__(self, root: Path):
        self.root = root.resolve(); validate_snapshot(self.root); self.summary = self._read_json("summary.json")
        self.coverage = pd.read_csv(self.root / "candidate_coverage.csv.gz")
        self.sensitivity = pd.read_csv(self.root / "ranking_sensitivity.csv.gz")
        self.thresholds = pd.read_csv(self.root / "pressure_thresholds.csv.gz")
        self.evaluations = {(role, definition): pd.read_csv(self.root / role / f"{definition}_evaluations.csv.gz") for role in ALLOWED_ROLES for definition in ALLOWED_DEFINITIONS}

    def _read_json(self, name: str) -> dict[str, Any]: return json.loads((self.root / name).read_text(encoding="utf-8"))

    @staticmethod
    def _record_count(source_records: object) -> int: return len(str(source_records).split(";")) if pd.notna(source_records) else 0

    def _public_row(self, row: pd.Series, role: str) -> dict[str, Any]:
        return {"rank": int(row["rank"]), "player": {"id": int(row["player_id"]), "name": str(row["player_name"])}, "role": role, "definition": str(row["definition"]), "pressure_score": float(row["pressure_score"]), "rate": float(row["rate"]), "adjusted_rate": float(row["adjusted_rate"]), "exposures": int(row["exposures"]), "matches": int(row["matches"]), "seasons": int(row["seasons"]), "runs": float(row["runs"]), "wickets": int(row["wickets"]), "context_coverage": float(row["context_coverage"]), "uncertainty": {"ci95_low": float(row["ci95_low"]), "ci95_high": float(row["ci95_high"]), "ci_half_width": float(row["ci_half_width"]), "match_rate_sd": float(row["match_rate_sd"])}, "shrink_weight": float(row["shrink_weight"]), "evidence_level": str(row["evidence_level"]), "source_record_count": self._record_count(row["source_records"]), "review_status": REVIEW_STATUS}

    def rankings(self, role: str, definition: str, evidence_level: str | None, player_name: str | None, limit: int, offset: int) -> dict[str, Any]:
        frame = self.evaluations[(role, definition)]
        if evidence_level: frame = frame[frame.evidence_level.eq(evidence_level)]
        if player_name: frame = frame[frame.player_name.str.contains(player_name, case=False, na=False, regex=False)]
        total = len(frame); page = frame.iloc[offset : offset + limit]
        return {"data": [self._public_row(row, role) for _, row in page.iterrows()], "meta": {"role": role, "definition": definition, "total": total, "limit": limit, "offset": offset, "source_run": self.root.name, "review_status": REVIEW_STATUS}, "links": {"next": offset + limit if offset + limit < total else None, "previous": max(0, offset - limit) if offset else None}}

    def player(self, player_id: int, role: str, definition: str) -> dict[str, Any] | None:
        frame = self.evaluations[(role, definition)]; match = frame[frame.player_id.eq(player_id)]
        if match.empty: return None
        primary = self._public_row(match.iloc[0], role); sensitivity: list[dict[str, Any]] = []
        for alternative in ALLOWED_DEFINITIONS:
            row = self.evaluations[(role, alternative)]; row = row[row.player_id.eq(player_id)]
            if not row.empty:
                value = row.iloc[0]; sensitivity.append({"definition": alternative, "rank": int(value["rank"]), "evidence_level": str(value["evidence_level"]), "pressure_score": float(value["pressure_score"])})
        return {"data": {"player": primary.pop("player"), "role": role, "primary_evaluation": primary, "sensitivity": sensitivity, "review_status": REVIEW_STATUS, "limitations": ["Aggregate pressure-performance evidence only.", "No auction valuation, eligibility, profile attributes, or raw-event evidence is published."]}}

    def dashboard(self) -> dict[str, Any]:
        return {"data": {"source_run": self.root.name, "review_status": REVIEW_STATUS, "evaluation_window": {"start": self.summary["evaluation_start"], "training_end": self.summary["rules_training_end"]}, "primary_definition": "rules_pressure", "candidate_coverage": self.coverage.to_dict(orient="records"), "publication_notice": "Pressure-performance evidence only; not auction suitability."}}

    def definitions(self, role: str | None, definition: str | None) -> dict[str, Any]:
        frame = self.coverage.copy()
        if role: frame = frame[frame.role.eq(role)]
        if definition: frame = frame[frame.definition.eq(definition)]
        definitions = []
        for name in ALLOWED_DEFINITIONS:
            values = frame[frame.definition.eq(name)].to_dict(orient="records")
            if values: definitions.append({"id": name, "label": "Phase 7A primary rules-based pressure model" if name == "rules_pressure" else f"Phase 7A sensitivity: {name}", "is_primary": name == "rules_pressure", "coverage": values, "review_status": REVIEW_STATUS})
        return {"data": {"definitions": definitions, "evaluation_window": {"start": self.summary["evaluation_start"], "training_end": self.summary["rules_training_end"]}}}

    def methodology(self) -> dict[str, Any]:
        sensitivity = self.sensitivity.round({"spearman": 3}).to_dict(orient="records")
        return {"data": {"version": "phase7a_v2", "review_status": REVIEW_STATUS, "sections": [
            {"id": "scope", "title": "Scope", "body_markdown": "Role-specific pressure-performance rankings are aggregate evidence, not auction suitability or eligibility decisions."},
            {"id": "pressure-definition", "title": "Pressure definition", "body_markdown": "Rules are trained before 2024-01-01 by competition, innings and phase; evaluation begins 2024-01-01. Chase pressure exceeds the historic required-rate 70th percentile. First-innings pressure captures observable recovery or late-resource constraints."},
            {"id": "evidence", "title": "Evidence and uncertainty", "body_markdown": "Evidence levels depend on exposures, matches and bootstrap interval width. Rankings are evidence-level-first, then empirical-Bayes adjusted pressure score."},
            {"id": "sensitivity", "title": "Sensitivity", "body_markdown": "Authoritative values are supplied from the frozen generated sensitivity artifact.", "results": sensitivity},
            {"id": "limitations", "title": "Limitations", "body_markdown": "No raw records, player profile fields, valuation, auction fit, eligibility, Match Lab recommendations, or rich scouting claims are supplied."}]}}


def configured_snapshot_root() -> Path:
    value = os.environ.get("CLUTCHIQ_OUTPUT_SNAPSHOT")
    if not value: raise SnapshotError("Approved output snapshot is unavailable.")
    return Path(value)

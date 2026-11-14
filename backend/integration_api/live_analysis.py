from __future__ import annotations

import csv
import io
import math
import threading
import time
import uuid
from typing import Any

STAGE_DEFINITIONS = [
    {"stage": 1, "title": "Reading uploaded CSV."},
    {"stage": 2, "title": "Validating columns and data."},
    {"stage": 3, "title": "Processing match and ball-level records."},
    {"stage": 4, "title": "Identifying pressure situations."},
    {"stage": 5, "title": "Calculating batting performance under pressure."},
    {"stage": 6, "title": "Calculating bowling performance under pressure."},
    {"stage": 7, "title": "Comparing players and calculating rankings."},
    {"stage": 8, "title": "Generating final results."},
]

COLUMN_ALIASES: dict[str, list[str]] = {
    "match_id": ["match_id", "id", "match", "game_id", "match_no"],
    "innings": ["innings", "inning", "innings_number", "inn"],
    "over": ["over", "over_number", "overs", "ball_over"],
    "ball": ["ball", "ball_number", "delivery", "ball_in_over"],
    "batter": ["batter", "batsman", "striker", "batter_name", "batsman_name"],
    "bowler": ["bowler", "bowler_name"],
    "batting_team": ["batting_team", "team_batting", "team", "batter_team"],
    "bowling_team": ["bowling_team", "team_bowling", "opposition", "bowler_team"],
    "runs_off_bat": ["runs_off_bat", "batsman_runs", "batter_runs", "runs_batter", "runs"],
    "extras": ["extras", "extra_runs", "runs_extras"],
    "total_runs": ["total_runs", "runs_total"],
    "wicket": ["is_wicket", "wicket", "wicket_type", "dismissal_kind", "player_dismissed", "out"],
    "wicket_type": ["wicket_type", "dismissal_kind"],
    "player_dismissed": ["player_dismissed", "dismissed_player", "out_player"],
}

REQUIRED_CONCEPTS = ["batter", "bowler", "runs_off_bat", "over"]

_JOBS: dict[str, dict[str, Any]] = {}
_JOBS_LOCK = threading.Lock()


def _resolve_columns(headers: list[str]) -> tuple[dict[str, str], list[str]]:
    lower_map = {h.strip().lower(): h.strip() for h in headers if h.strip()}
    resolved: dict[str, str] = {}
    for concept, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in lower_map:
                resolved[concept] = lower_map[alias]
                break

    # If 'over' is missing but 'ball' has decimal notation like 15.2, allow 'ball' to satisfy 'over'
    if "over" not in resolved and "ball" in resolved:
        resolved["over"] = resolved["ball"]

    missing: list[str] = []
    for req in REQUIRED_CONCEPTS:
        if req not in resolved:
            missing.append(req)
    return resolved, missing


def validate_csv_payload(filename: str, csv_text: str) -> dict[str, Any]:
    if not filename or not filename.lower().endswith(".csv"):
        return {
            "valid": False,
            "filename": filename or "unknown",
            "error": "Invalid file format. Please upload a valid .csv ball-by-ball cricket dataset.",
            "missing_columns": REQUIRED_CONCEPTS,
            "detected_columns": [],
            "row_count": 0,
        }

    text = (csv_text or "").strip()
    if not text:
        return {
            "valid": False,
            "filename": filename,
            "error": "The uploaded CSV file is empty.",
            "missing_columns": REQUIRED_CONCEPTS,
            "detected_columns": [],
            "row_count": 0,
        }

    reader = csv.reader(io.StringIO(text))
    try:
        headers = [h.strip() for h in next(reader)]
    except StopIteration:
        return {
            "valid": False,
            "filename": filename,
            "error": "Could not read CSV header row.",
            "missing_columns": REQUIRED_CONCEPTS,
            "detected_columns": [],
            "row_count": 0,
        }

    resolved, missing = _resolve_columns(headers)
    rows = [r for r in reader if any(cell.strip() for cell in r)]

    if missing:
        friendly_missing = [
            f"{m} (e.g. {', '.join(COLUMN_ALIASES[m][:3])})" for m in missing
        ]
        return {
            "valid": False,
            "filename": filename,
            "error": f"Missing required ball-by-ball columns: {', '.join(friendly_missing)}.",
            "missing_columns": missing,
            "detected_columns": headers,
            "mapped_columns": resolved,
            "row_count": len(rows),
        }

    if len(rows) < 5:
        return {
            "valid": False,
            "filename": filename,
            "error": f"Dataset contains only {len(rows)} rows. At least 5 ball-by-ball records are required for pressure analysis.",
            "missing_columns": [],
            "detected_columns": headers,
            "mapped_columns": resolved,
            "row_count": len(rows),
        }

    return {
        "valid": True,
        "filename": filename,
        "error": None,
        "missing_columns": [],
        "detected_columns": headers,
        "mapped_columns": resolved,
        "row_count": len(rows),
        "message": f"Validated {len(rows):,} ball-by-ball records across {len(resolved)} mapped schema fields.",
    }


def _safe_int(val: Any, default: int = 0) -> int:
    try:
        return int(float(str(val).strip()))
    except (ValueError, TypeError):
        return default


def _safe_float(val: Any, default: float = 0.0) -> float:
    try:
        return float(str(val).strip())
    except (ValueError, TypeError):
        return default


def _is_wicket_value(row_dict: dict[str, str], resolved: dict[str, str]) -> tuple[bool, str, str]:
    wicket_type = ""
    player_dismissed = ""
    if "wicket_type" in resolved:
        wicket_type = row_dict.get(resolved["wicket_type"], "").strip()
    if "player_dismissed" in resolved:
        player_dismissed = row_dict.get(resolved["player_dismissed"], "").strip()

    if "wicket" in resolved:
        raw_w = row_dict.get(resolved["wicket"], "").strip().lower()
        if raw_w in ("1", "true", "yes", "out", "w"):
            return True, wicket_type or "dismissed", player_dismissed
        if raw_w not in ("", "0", "false", "no", "none", "nan", "null"):
            return True, wicket_type or raw_w, player_dismissed

    if player_dismissed and player_dismissed.lower() not in ("", "none", "nan", "null", "0"):
        return True, wicket_type or "dismissed", player_dismissed
    if wicket_type and wicket_type.lower() not in ("", "none", "nan", "null", "0"):
        return True, wicket_type, player_dismissed

    return False, "", ""


def _update_job(
    job_id: str,
    stage: int,
    progress_pct: int,
    records_processed: int,
    status_message: str,
    status: str = "running",
    results: dict[str, Any] | None = None,
    error: str | None = None,
) -> None:
    with _JOBS_LOCK:
        job = _JOBS.get(job_id)
        if not job:
            return
        stage_title = STAGE_DEFINITIONS[min(max(stage, 1), 8) - 1]["title"]
        job["current_stage"] = stage
        job["current_stage_title"] = stage_title
        job["progress_pct"] = progress_pct
        job["records_processed"] = records_processed
        job["status_message"] = status_message
        job["status"] = status
        job["updated_at"] = time.time()
        if error:
            job["error"] = error
        if results is not None:
            job["results"] = results

        for s in job["stages"]:
            if s["stage"] < stage:
                s["status"] = "completed"
            elif s["stage"] == stage:
                s["status"] = "completed" if status == "completed" else ("failed" if status == "failed" else "active")
                s["detail"] = status_message
            else:
                s["status"] = "pending"


def _run_analysis_pipeline(job_id: str, filename: str, file_size: int, csv_text: str, step_delay: float = 0.22) -> None:
    try:
        # Stage 1: Reading uploaded CSV.
        _update_job(job_id, 1, 8, 0, f"Reading CSV byte stream from {filename} ({file_size:,} bytes)…")
        if step_delay > 0:
            time.sleep(step_delay)

        reader = csv.DictReader(io.StringIO(csv_text.strip()))
        headers = [h.strip() for h in (reader.fieldnames or []) if h]
        raw_rows = list(reader)
        total_records = len(raw_rows)
        with _JOBS_LOCK:
            if job_id in _JOBS:
                _JOBS[job_id]["total_records"] = total_records

        _update_job(job_id, 1, 14, total_records, f"Read {total_records:,} raw delivery rows across {len(headers)} columns.")
        if step_delay > 0:
            time.sleep(step_delay)

        # Stage 2: Validating columns and data.
        _update_job(job_id, 2, 22, total_records, "Validating ball-by-ball schema fields and data integrity…")
        validation = validate_csv_payload(filename, csv_text)
        if not validation["valid"]:
            _update_job(job_id, 2, 22, 0, validation["error"], status="failed", error=validation["error"])
            return

        resolved: dict[str, str] = validation["mapped_columns"]
        _update_job(job_id, 2, 28, total_records, f"Verified {len(resolved)} core cricket telemetry fields.")
        if step_delay > 0:
            time.sleep(step_delay)

        # Stage 3: Processing match and ball-level records.
        _update_job(job_id, 3, 36, 0, "Reconstructing match timelines, innings totals, and delivery sequences…")
        parsed_deliveries: list[dict[str, Any]] = []
        innings_totals: dict[tuple[str, int], int] = {}

        for idx, row in enumerate(raw_rows):
            clean_row = {k.strip(): (v.strip() if isinstance(v, str) else "") for k, v in row.items() if k}
            match_id = clean_row.get(resolved.get("match_id", ""), "") or "MATCH_01"
            innings = max(1, _safe_int(clean_row.get(resolved.get("innings", ""), "1"), 1))

            raw_over_str = clean_row.get(resolved.get("over", ""), "0")
            if "." in raw_over_str and resolved.get("over") == resolved.get("ball"):
                parts = raw_over_str.split(".", 1)
                over_num = _safe_int(parts[0], 0)
                ball_num = max(1, _safe_int(parts[1], 1))
            else:
                over_num = _safe_int(raw_over_str, 0)
                ball_num = max(1, _safe_int(clean_row.get(resolved.get("ball", ""), "1"), (idx % 6) + 1))

            batter = clean_row.get(resolved["batter"], "Unknown Batter") or "Unknown Batter"
            bowler = clean_row.get(resolved["bowler"], "Unknown Bowler") or "Unknown Bowler"
            batting_team = clean_row.get(resolved.get("batting_team", ""), "") or "Team A"
            bowling_team = clean_row.get(resolved.get("bowling_team", ""), "") or "Team B"

            runs_bat = _safe_int(clean_row.get(resolved["runs_off_bat"], "0"), 0)
            extras = _safe_int(clean_row.get(resolved.get("extras", ""), "0"), 0)
            total_runs = _safe_int(clean_row.get(resolved.get("total_runs", ""), str(runs_bat + extras)), runs_bat + extras)
            is_wicket, wicket_type, player_dismissed = _is_wicket_value(clean_row, resolved)

            innings_key = (match_id, innings)
            innings_totals[innings_key] = innings_totals.get(innings_key, 0) + total_runs

            parsed_deliveries.append({
                "idx": idx + 1,
                "match_id": str(match_id),
                "innings": innings,
                "over": over_num,
                "ball": ball_num,
                "batter": batter,
                "bowler": bowler,
                "batting_team": batting_team,
                "bowling_team": bowling_team,
                "runs_off_bat": runs_bat,
                "extras": extras,
                "total_runs": total_runs,
                "is_wicket": is_wicket,
                "wicket_type": wicket_type,
                "player_dismissed": player_dismissed or (batter if is_wicket else ""),
            })

            if (idx + 1) % max(1, total_records // 3) == 0:
                _update_job(
                    job_id,
                    3,
                    36 + int(12 * ((idx + 1) / total_records)),
                    idx + 1,
                    f"Processed {idx + 1:,} / {total_records:,} ball-level records…",
                )

        if step_delay > 0:
            time.sleep(step_delay)

        # Stage 4: Identifying pressure situations.
        _update_job(job_id, 4, 52, total_records, "Evaluating required run rates, wicket clusters, and match phase leverage…")
        running_state: dict[tuple[str, int], dict[str, Any]] = {}
        pressure_balls_count = 0
        match_teams: dict[str, set[str]] = {}

        for d in parsed_deliveries:
            m_id = d["match_id"]
            inn = d["innings"]
            match_teams.setdefault(m_id, set()).update([d["batting_team"], d["bowling_team"]])
            st = running_state.setdefault(
                (m_id, inn),
                {"runs": 0, "wickets": 0, "balls": 0, "recent_wickets": []},
            )
            st["runs"] += d["total_runs"]
            st["balls"] += 1
            if d["is_wicket"]:
                st["wickets"] += 1
                st["recent_wickets"].append(st["balls"])
            st["recent_wickets"] = [b for b in st["recent_wickets"] if st["balls"] - b <= 18]

            over_1based = d["over"] + 1 if d["over"] < 20 else d["over"]
            if over_1based <= 6:
                phase = "Powerplay (1-6)"
            elif over_1based <= 15:
                phase = "Middle (7-15)"
            else:
                phase = "Death (16-20)"

            reasons: list[str] = []
            base_pressure = 38.0

            if over_1based >= 16:
                base_pressure += 26.0
                reasons.append("Death Overs (16-20)")
            elif over_1based >= 13:
                base_pressure += 12.0

            if len(st["recent_wickets"]) >= 2:
                base_pressure += 20.0
                reasons.append(f"Cluster Wickets ({len(st['recent_wickets'])} in 3 overs)")
            elif st["wickets"] >= 3 and over_1based <= 10:
                base_pressure += 18.0
                reasons.append(f"Top-Order Collapse ({st['wickets']} wkts)")
            elif st["wickets"] >= 5:
                base_pressure += 14.0
                reasons.append(f"Lower-Order Exposure ({st['wickets']} wkts down)")

            req_rate: float | None = None
            if inn >= 2:
                first_inn_total = innings_totals.get((m_id, 1), 175)
                target = max(first_inn_total + 1, st["runs"] + 1)
                balls_rem = max(1, 120 - st["balls"])
                runs_needed = max(0, target - st["runs"])
                req_rate = round((runs_needed * 6.0) / balls_rem, 2)
                if req_rate >= 11.5:
                    base_pressure += 24.0
                    reasons.append(f"Steep Chase RRR {req_rate:.1f}")
                elif req_rate >= 9.5:
                    base_pressure += 14.0
                    reasons.append(f"Elevated Chase RRR {req_rate:.1f}")
            else:
                curr_rr = (st["runs"] * 6.0) / max(1, st["balls"])
                if over_1based >= 15 and curr_rr < 8.0:
                    base_pressure += 14.0
                    reasons.append("Late First-Innings Acceleration Stress")

            if d["is_wicket"] or d["runs_off_bat"] >= 4:
                base_pressure += 5.0

            pressure_index = round(min(99.4, max(22.0, base_pressure)), 1)
            is_pressure = pressure_index >= 62.0 or len(reasons) > 0
            if is_pressure and not reasons:
                reasons.append("High Leverage Phase")
            if is_pressure:
                pressure_balls_count += 1

            d["phase"] = phase
            d["pressure_index"] = pressure_index
            d["is_pressure_ball"] = is_pressure
            d["pressure_reasons"] = reasons
            d["required_rate"] = req_rate
            d["score_snapshot"] = f"{st['runs']}/{st['wickets']}"
            d["over_ball_label"] = f"{d['over']}.{d['ball']}"

        if step_delay > 0:
            time.sleep(step_delay)
        _update_job(
            job_id,
            4,
            62,
            total_records,
            f"Identified {pressure_balls_count:,} high-pressure deliveries ({(pressure_balls_count / max(1, total_records)) * 100:.1f}% of dataset).",
        )

        # Stage 5: Calculating batting performance under pressure.
        _update_job(job_id, 5, 72, total_records, "Computing empirical-Bayes batting pressure scores, strike rates, and control metrics…")
        batter_stats: dict[str, dict[str, Any]] = {}
        for d in parsed_deliveries:
            b_name = d["batter"]
            st = batter_stats.setdefault(
                b_name,
                {
                    "player_name": b_name,
                    "teams": set(),
                    "matches": set(),
                    "innings": set(),
                    "runs": 0,
                    "balls": 0,
                    "dismissals": 0,
                    "p_runs": 0,
                    "p_balls": 0,
                    "p_dismissals": 0,
                    "p_dots": 0,
                    "p_boundaries": 0,
                    "p_weighted_sum": 0.0,
                },
            )
            st["teams"].add(d["batting_team"])
            st["matches"].add(d["match_id"])
            st["innings"].add(d["innings"])
            st["runs"] += d["runs_off_bat"]
            st["balls"] += 1
            if d["is_wicket"] and (not d["player_dismissed"] or d["player_dismissed"] == b_name):
                st["dismissals"] += 1

            if d["is_pressure_ball"]:
                st["p_runs"] += d["runs_off_bat"]
                st["p_balls"] += 1
                if d["runs_off_bat"] == 0 and d["extras"] == 0:
                    st["p_dots"] += 1
                if d["runs_off_bat"] >= 4:
                    st["p_boundaries"] += 1
                if d["is_wicket"] and (not d["player_dismissed"] or d["player_dismissed"] == b_name):
                    st["p_dismissals"] += 1
                weight = d["pressure_index"] / 75.0
                st["p_weighted_sum"] += (d["runs_off_bat"] * 1.45 - (6.0 if d["is_wicket"] else 0.0) - (0.35 if d["runs_off_bat"] == 0 else 0.0)) * weight

        if step_delay > 0:
            time.sleep(step_delay)

        # Stage 6: Calculating bowling performance under pressure.
        _update_job(job_id, 6, 82, total_records, "Computing bowling pressure economy, dot-ball suppression, and wicket impact…")
        bowler_stats: dict[str, dict[str, Any]] = {}
        for d in parsed_deliveries:
            bw_name = d["bowler"]
            st = bowler_stats.setdefault(
                bw_name,
                {
                    "player_name": bw_name,
                    "teams": set(),
                    "matches": set(),
                    "innings": set(),
                    "runs_conceded": 0,
                    "balls": 0,
                    "wickets": 0,
                    "p_runs_conceded": 0,
                    "p_balls": 0,
                    "p_wickets": 0,
                    "p_dots": 0,
                    "p_boundaries_conceded": 0,
                    "p_weighted_sum": 0.0,
                },
            )
            st["teams"].add(d["bowling_team"])
            st["matches"].add(d["match_id"])
            st["innings"].add(d["innings"])
            st["runs_conceded"] += d["total_runs"]
            st["balls"] += 1
            if d["is_wicket"]:
                st["wickets"] += 1

            if d["is_pressure_ball"]:
                st["p_runs_conceded"] += d["total_runs"]
                st["p_balls"] += 1
                if d["total_runs"] == 0:
                    st["p_dots"] += 1
                if d["runs_off_bat"] >= 4:
                    st["p_boundaries_conceded"] += 1
                if d["is_wicket"]:
                    st["p_wickets"] += 1
                weight = d["pressure_index"] / 75.0
                st["p_weighted_sum"] += (
                    (8.5 if d["is_wicket"] else 0.0)
                    + (1.8 if d["total_runs"] == 0 else 0.0)
                    + (0.7 if d["total_runs"] <= 1 else 0.0)
                    - (d["total_runs"] * 0.65)
                ) * weight

        if step_delay > 0:
            time.sleep(step_delay)

        # Stage 7: Comparing players and calculating rankings.
        _update_job(job_id, 7, 92, total_records, "Comparing player distributions and ranking Top 10 Batters and Top 10 Bowlers…")

        batter_results: list[dict[str, Any]] = []
        for b_name, st in batter_stats.items():
            eff_balls = st["p_balls"] if st["p_balls"] > 0 else st["balls"]
            eff_runs = st["p_runs"] if st["p_balls"] > 0 else st["runs"]
            sr = round((st["runs"] * 100.0) / max(1, st["balls"]), 2)
            p_sr = round((eff_runs * 100.0) / max(1, eff_balls), 2)
            dot_pct = round((st["p_dots"] * 100.0) / max(1, eff_balls), 1)
            bound_pct = round((st["p_boundaries"] * 100.0) / max(1, eff_balls), 1)
            control_pct = round(max(45.0, min(97.5, 100.0 - dot_pct * 0.55 - (st["p_dismissals"] * 12.0) / max(1, eff_balls / 6.0))), 1)

            shrink = eff_balls / (eff_balls + 10.0)
            raw_score = 52.0 + (p_sr - 125.0) * 0.22 + (bound_pct * 0.38) - (dot_pct * 0.25) + (eff_runs * 0.28) - (st["p_dismissals"] * 4.5)
            pressure_score = round(max(35.0, min(99.2, 62.0 * (1.0 - shrink) + raw_score * shrink)), 2)

            ev_level = "strong" if eff_balls >= 12 else ("moderate" if eff_balls >= 6 else "limited")
            teams_list = sorted(st["teams"])
            batter_results.append({
                "rank": 0,
                "player_name": b_name,
                "role": "batting",
                "team": teams_list[0] if teams_list else "Unknown",
                "teams": teams_list,
                "matches": len(st["matches"]),
                "innings_list": sorted(st["innings"]),
                "match_ids": sorted(st["matches"]),
                "pressure_score": pressure_score,
                "runs": st["runs"],
                "balls": st["balls"],
                "wickets": st["dismissals"],
                "pressure_runs": eff_runs,
                "pressure_balls": eff_balls,
                "pressure_wickets": st["p_dismissals"],
                "strike_rate": sr,
                "pressure_strike_rate": p_sr,
                "economy": 0.0,
                "pressure_economy": 0.0,
                "dot_ball_pct": dot_pct,
                "boundary_pct": bound_pct,
                "control_pct": control_pct,
                "evidence_level": ev_level,
            })

        batter_results.sort(key=lambda x: (x["pressure_score"], x["pressure_runs"], x["pressure_strike_rate"]), reverse=True)
        for idx, item in enumerate(batter_results):
            item["rank"] = idx + 1

        bowler_results: list[dict[str, Any]] = []
        for bw_name, st in bowler_stats.items():
            eff_balls = st["p_balls"] if st["p_balls"] > 0 else st["balls"]
            eff_runs = st["p_runs_conceded"] if st["p_balls"] > 0 else st["runs_conceded"]
            eff_wkts = st["p_wickets"] if st["p_balls"] > 0 else st["wickets"]
            econ = round((st["runs_conceded"] * 6.0) / max(1, st["balls"]), 2)
            p_econ = round((eff_runs * 6.0) / max(1, eff_balls), 2)
            dot_pct = round((st["p_dots"] * 100.0) / max(1, eff_balls), 1)
            bound_pct = round((st["p_boundaries_conceded"] * 100.0) / max(1, eff_balls), 1)
            control_pct = round(max(48.0, min(98.0, 62.0 + dot_pct * 0.45 - bound_pct * 0.35 + eff_wkts * 3.2)), 1)

            shrink = eff_balls / (eff_balls + 10.0)
            raw_score = 56.0 + (9.2 - p_econ) * 4.2 + (dot_pct * 0.35) + (eff_wkts * 7.5) - (bound_pct * 0.25)
            pressure_score = round(max(35.0, min(99.4, 62.0 * (1.0 - shrink) + raw_score * shrink)), 2)

            ev_level = "strong" if eff_balls >= 12 else ("moderate" if eff_balls >= 6 else "limited")
            teams_list = sorted(st["teams"])
            bowler_results.append({
                "rank": 0,
                "player_name": bw_name,
                "role": "bowling",
                "team": teams_list[0] if teams_list else "Unknown",
                "teams": teams_list,
                "matches": len(st["matches"]),
                "innings_list": sorted(st["innings"]),
                "match_ids": sorted(st["matches"]),
                "pressure_score": pressure_score,
                "runs": st["runs_conceded"],
                "balls": st["balls"],
                "wickets": st["wickets"],
                "pressure_runs": eff_runs,
                "pressure_balls": eff_balls,
                "pressure_wickets": eff_wkts,
                "strike_rate": round(st["balls"] / max(1, st["wickets"]), 1) if st["wickets"] > 0 else 0.0,
                "pressure_strike_rate": round(eff_balls / max(1, eff_wkts), 1) if eff_wkts > 0 else 0.0,
                "economy": econ,
                "pressure_economy": p_econ,
                "dot_ball_pct": dot_pct,
                "boundary_pct": bound_pct,
                "control_pct": control_pct,
                "evidence_level": ev_level,
            })

        bowler_results.sort(key=lambda x: (x["pressure_score"], x["pressure_wickets"], -x["pressure_economy"]), reverse=True)
        for idx, item in enumerate(bowler_results):
            item["rank"] = idx + 1

        if step_delay > 0:
            time.sleep(step_delay)

        # Stage 8: Generating final results.
        _update_job(job_id, 8, 97, total_records, "Compiling Top 10 rankings, best player spotlights, and ball-level evidence…")

        match_labels: dict[str, str] = {}
        for m_id, t_set in match_teams.items():
            t_sorted = sorted(t_set)
            if len(t_sorted) >= 2:
                match_labels[m_id] = f"{t_sorted[0]} vs {t_sorted[1]} ({m_id})"
            elif len(t_sorted) == 1:
                match_labels[m_id] = f"{t_sorted[0]} ({m_id})"
            else:
                match_labels[m_id] = m_id

        pressure_deliveries = [d for d in parsed_deliveries if d["is_pressure_ball"]]
        pressure_deliveries.sort(key=lambda d: (d["pressure_index"], d["is_wicket"], d["runs_off_bat"]), reverse=True)
        top_evidence_Source = pressure_deliveries[:120] if pressure_deliveries else parsed_deliveries[:80]

        ball_evidence = [
            {
                "record_id": f"REC_{d['idx']:04d}",
                "match_id": d["match_id"],
                "match_label": match_labels.get(d["match_id"], d["match_id"]),
                "innings": d["innings"],
                "over": d["over"],
                "ball": d["ball"],
                "over_ball_label": d["over_ball_label"],
                "batting_team": d["batting_team"],
                "bowling_team": d["bowling_team"],
                "batter": d["batter"],
                "bowler": d["bowler"],
                "runs_off_bat": d["runs_off_bat"],
                "extras": d["extras"],
                "total_runs": d["total_runs"],
                "is_wicket": d["is_wicket"],
                "wicket_type": d["wicket_type"],
                "player_dismissed": d["player_dismissed"],
                "phase": d["phase"],
                "pressure_index": d["pressure_index"],
                "is_pressure_ball": d["is_pressure_ball"],
                "pressure_reasons": d["pressure_reasons"],
                "required_rate": d["required_rate"],
                "score_snapshot": d["score_snapshot"],
            }
            for d in top_evidence_Source
        ]

        all_teams = sorted({d["batting_team"] for d in parsed_deliveries} | {d["bowling_team"] for d in parsed_deliveries})
        all_matches = [{"id": m_id, "label": match_labels.get(m_id, m_id)} for m_id in sorted(match_teams.keys())]
        all_innings = sorted({d["innings"] for d in parsed_deliveries})
        all_players = sorted({d["batter"] for d in parsed_deliveries} | {d["bowler"] for d in parsed_deliveries})

        final_results = {
            "job_id": job_id,
            "filename": filename,
            "file_size": file_size,
            "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "summary": {
                "total_records": total_records,
                "pressure_records": pressure_balls_count,
                "pressure_density_pct": round((pressure_balls_count * 100.0) / max(1, total_records), 1),
                "total_matches": len(all_matches),
                "total_teams": len(all_teams),
                "total_batters_evaluated": len(batter_results),
                "total_bowlers_evaluated": len(bowler_results),
            },
            "best_batter": batter_results[0] if batter_results else None,
            "best_bowler": bowler_results[0] if bowler_results else None,
            "top_batters": batter_results[:10],
            "top_bowlers": bowler_results[:10],
            "all_batters": batter_results,
            "all_bowlers": bowler_results,
            "ball_evidence": ball_evidence,
            "available_filters": {
                "teams": all_teams,
                "matches": all_matches,
                "innings": all_innings,
                "players": all_players,
            },
        }

        _update_job(
            job_id,
            8,
            100,
            total_records,
            f"Completed analysis of {total_records:,} deliveries across {len(all_matches)} matches.",
            status="completed",
            results=final_results,
        )
    except Exception as exc:
        _update_job(
            job_id,
            1,
            0,
            0,
            f"Analysis failed: {exc}",
            status="failed",
            error=str(exc),
        )


def start_analysis_job(filename: str, file_size: int, csv_text: str, synchronous: bool = False) -> dict[str, Any]:
    validation = validate_csv_payload(filename, csv_text)
    if not validation["valid"]:
        raise ValueError(validation["error"])

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    initial_stages = [
        {
            "stage": s["stage"],
            "title": s["title"],
            "status": "active" if s["stage"] == 1 else "pending",
            "detail": "Initializing…" if s["stage"] == 1 else "Queued",
        }
        for s in STAGE_DEFINITIONS
    ]

    job_state: dict[str, Any] = {
        "job_id": job_id,
        "filename": filename,
        "file_size": file_size,
        "status": "running",
        "current_stage": 1,
        "current_stage_title": STAGE_DEFINITIONS[0]["title"],
        "progress_pct": 4,
        "records_processed": 0,
        "total_records": validation["row_count"],
        "status_message": f"Queued {filename} ({validation['row_count']:,} records) for pressure analysis.",
        "stages": initial_stages,
        "error": None,
        "results": None,
        "created_at": time.time(),
        "updated_at": time.time(),
    }

    with _JOBS_LOCK:
        _JOBS[job_id] = job_state

    if synchronous:
        _run_analysis_pipeline(job_id, filename, file_size, csv_text, step_delay=0.0)
    else:
        worker = threading.Thread(
            target=_run_analysis_pipeline,
            args=(job_id, filename, file_size, csv_text, 0.22),
            daemon=True,
        )
        worker.start()

    return get_job_status(job_id) or job_state


def get_job_status(job_id: str) -> dict[str, Any] | None:
    with _JOBS_LOCK:
        job = _JOBS.get(job_id)
        if not job:
            return None
        return {
            "job_id": job["job_id"],
            "filename": job["filename"],
            "file_size": job["file_size"],
            "status": job["status"],
            "current_stage": job["current_stage"],
            "current_stage_title": job["current_stage_title"],
            "progress_pct": job["progress_pct"],
            "records_processed": job["records_processed"],
            "total_records": job["total_records"],
            "status_message": job["status_message"],
            "stages": [dict(s) for s in job["stages"]],
            "error": job["error"],
            "has_results": job["results"] is not None,
        }


def get_job_results(job_id: str) -> dict[str, Any] | None:
    with _JOBS_LOCK:
        job = _JOBS.get(job_id)
        if not job or not job.get("results"):
            return None
        return job["results"]

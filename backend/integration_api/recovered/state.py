"""Before-delivery reconstruction. Unknown increments poison later prefixes.

Final outcomes are reconciliation targets only, never pressure predictors.
Eligibility is retrospective data-quality selection, not a match-state feature.
"""
import re
import pandas as pd
from .event_contract import integer


def known(value):
    return value is not None and not pd.isna(value)


def total(values):
    return sum(int(v) for v in values) if all(known(v) for v in values) else None


def advance(value, increment):
    return value + int(increment) if value is not None and known(increment) else None


def reconstruct(events, matches, competitions):
    meta = matches.set_index("match_id").to_dict("index")
    comp = competitions.set_index("comp_id").to_dict("index")
    groups = {}
    innings, over_checks = [], []
    for key, g in events.groupby(["n_match_id", "n_innings"], sort=True):
        g = g.sort_values("n_innings_ball_num", kind="stable")
        groups[key] = g
        reasons = []
        numbers = list(g.n_innings_ball_num)
        if numbers != list(range(1, len(g) + 1)):
            reasons.append("event_sequence_invalid")
        if g.n_batting_team_id.nunique() != 1 or g.n_bowling_team_id.nunique() != 1:
            reasons.append("innings_teams_change")
        order = list(g.n_overid)
        if not order or order[0] != 1 or any(b-a not in (0, 1) for a, b in zip(order, order[1:])):
            reasons.append("over_sequence_invalid")
        for over, og in g.groupby("n_overid", sort=True):
            legal = total(og.legal_ball.tolist())
            candidate = total(og.candidate_legal_ball.tolist())
            complete = over < g.n_overid.max()
            issue = legal is not None and ((complete and legal != 6) or legal > 6)
            candidate_issue = candidate is not None and ((complete and candidate != 6) or candidate > 6)
            if list(og.n_over_ball_num) != list(range(1, len(og) + 1)):
                reasons.append("over_event_sequence_invalid")
            if issue or candidate_issue:
                reasons.append("over_legal_count_mismatch")
            over_checks.append({"match_id": key[0], "innings": key[1], "overid": over, "events": len(og), "legal_balls": legal,
                                "candidate_legal_balls": candidate, "nonterminal": complete, "mismatch": issue or candidate_issue})
        score, wickets, legal = [total(g[c].tolist()) for c in ("team_runs", "team_wicket", "legal_ball")]
        if wickets is not None and wickets > (2 if key[1] > 2 else 10):
            reasons.append("too_many_wickets")
        if not g.event_valid.all():
            reasons.append("ambiguous_events")
        if not g.relationship_valid.all():
            reasons.append("relationship_issues")
        dismissed = g.loc[g.team_wicket.fillna(False), "dismissed_batter_id"].dropna()
        if dismissed.duplicated().any():
            reasons.append("duplicate_batter_dismissal")
        innings.append({"match_id": key[0], "innings": key[1], "events": len(g), "runs": score,
                        "wickets": wickets, "legal_balls": legal, "batting_team_id": g.n_batting_team_id.iloc[0],
                        "bowling_team_id": g.n_bowling_team_id.iloc[0], "reasons": ";".join(sorted(set(reasons)))})
    summary = pd.DataFrame(innings)
    lookup = {(r["match_id"], r["innings"]): r for r in innings}
    match_checks, policy = [], {}
    for mid, m in sorted(meta.items()):
        first, second = lookup.get((mid, 1)), lookup.get((mid, 2))
        result = str(m["result"])
        revised = any(str(m[c]) not in ("", "<NA>", "nan", "None") for c in ("first_inn_revised_overs", "second_inn_revised_overs", "revised_target"))
        revised |= bool(re.search(r"\bD/?LS?\b", result, re.I))
        no_result = bool(re.search(r"abandon|no result|cancel", result, re.I))
        reasons = []
        if revised:
            reasons.append("revision_timing_or_units_unknown")
        if no_result:
            reasons.append("no_result_or_abandoned")
        if first is None or second is None:
            reasons.append("missing_regulation_innings")
        if first and not (first["legal_balls"] == 120 or first["wickets"] == 10):
            reasons.append("first_innings_length_unverified")
        if first and first["reasons"]:
            reasons.append("first_innings_quality_unresolved")
        run_margin = re.search(r"won\s+(?:by\s+)?(\d+)\s*runs?\b", result, re.I)
        wicket_margin = re.search(r"won\s+(?:by\s+)?(\d+)\s*(?:wickets?|wkts?)\b", result, re.I)
        super_result = bool(re.search(r"super\s*over", result, re.I))
        tied = bool(re.search(r"\btied?\b", result, re.I)) or super_result
        if second and not revised and not no_result and (run_margin or tied) and not (second["legal_balls"] == 120 or second["wickets"] == 10):
            reasons.append("second_innings_length_unverified")
        reconciliation = "not_testable"
        if first and second and not revised and not no_result and first["runs"] is not None and second["runs"] is not None:
            if tied:
                ok = first["runs"] == second["runs"]
                reconciliation = "pass" if ok else "fail"
            elif run_margin:
                ok = first["runs"] - second["runs"] == int(run_margin[1]) and integer(m["win_team_id"]) == first["batting_team_id"]
                reconciliation = "pass" if ok else "fail"
            elif wicket_margin and second["wickets"] is not None:
                ok = second["runs"] >= first["runs"] + 1 and 10-second["wickets"] == int(wicket_margin[1]) and integer(m["win_team_id"]) == second["batting_team_id"]
                reconciliation = "pass" if ok else "fail"
            if reconciliation == "fail":
                reasons.append("result_reconciliation_failed")
        if reconciliation == "not_testable":
            reasons.append("result_not_reconciled")
        if super_result and (mid, 3) not in lookup:
            reasons.append("super_over_records_missing")
        target = first["runs"] + 1 if first and first["runs"] is not None and not revised and not no_result and (first["legal_balls"] == 120 or first["wickets"] == 10) else None
        # First-innings target is never derived from a future chase.
        policy[mid] = {"revised": revised, "no_result": no_result, "target": target, "reasons": reasons}
        match_checks.append({"match_id": mid, "has_first": first is not None, "has_second": second is not None,
                             "revised": revised, "no_result": no_result, "reconciliation": reconciliation,
                             "reasons": ";".join(sorted(set(reasons)))})
    states = []
    late = set()
    for (mid, inn), g in groups.items():
        pol, m = policy[mid], meta[mid]
        c = comp[m["comp_id"]]
        super_over = inn > 2
        budget = 120 if not super_over and not pol["revised"] and not pol["no_result"] and c["match_format"] in ("T20", "T20I") else None
        target = pol["target"] if inn == 2 and budget is not None else None
        score = wickets = legal = 0
        for r in g.to_dict("records"):
            remaining = budget - legal if budget is not None and legal is not None else None
            needed = max(target-score, 0) if target is not None and score is not None else None
            terminal = (remaining is not None and remaining <= 0) or (wickets is not None and wickets >= (2 if super_over else 10)) or needed == 0
            if terminal:
                late.add((mid, inn))
            phase = None
            if legal is not None and budget == 120 and legal < 120:
                phase = "powerplay" if legal < 36 else "middle" if legal < 90 else "death"
            states.append({"source_record_number": r["source_record_number"], "match_id": mid, "innings": inn,
                           "event_number": r["n_innings_ball_num"], "comp_id": m["comp_id"], "match_date": m["match_date"],
                           "competition": c["comp_name"], "match_format": c["match_format"],
                           "competition_group": "IPL" if str(c["comp_name"]).startswith("IPL ") else "T20I" if c["match_format"] == "T20I" else "other_T20",
                           "score_before": score, "wickets_before": wickets, "legal_balls_before": legal,
                           "overs_before": f"{legal//6}.{legal%6}" if legal is not None else None,
                           "scheduled_balls": budget, "schedule_basis": "ordinary_T20_policy" if budget else "unknown",
                           "balls_remaining": remaining, "wickets_remaining": (2 if super_over else 10)-wickets if wickets is not None else None,
                           "target": target, "target_basis": "validated_first_innings_plus_one" if target else "not_available",
                           "runs_required": needed, "required_rate": 6*needed/remaining if needed is not None and remaining is not None and remaining > 0 else None,
                           "innings_phase": phase, "super_over": super_over, "terminal_before": terminal,
                           "context_reasons": ";".join(sorted(set(pol["reasons"] + (["super_over_context_unverified"] if super_over else []))))})
            score = advance(score, r["team_runs"])
            wickets = advance(wickets, r["team_wicket"])
            legal = advance(legal, r["legal_ball"])
    st = pd.DataFrame(states)
    ir = {(r["match_id"], r["innings"]): r["reasons"] for r in innings}
    st["innings_quality_reasons"] = [ir[(m, i)] + (";event_after_terminal" if (m, i) in late else "") for m, i in zip(st.match_id, st.innings)]
    st["context_valid"] = st.context_reasons.eq("") & st.innings_quality_reasons.eq("") & ~st.super_over
    st["pressure_input_ready"] = st.context_valid & st.innings.eq(2) & st.required_rate.notna() & ~st.terminal_before
    return st, summary, pd.DataFrame(match_checks), pd.DataFrame(over_checks)

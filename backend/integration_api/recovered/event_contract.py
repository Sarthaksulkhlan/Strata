"""Conservative, pure event normalization. Raw values are never overwritten.

Provider's Overstep/other are deliberately NOT certified as no-balls. The
candidate legal-ball interpretation is exported separately for diagnostics.
"""
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Mapping


@dataclass(frozen=True)
class Contract:
    version: str = "event-contract-1"
    # Only enable an alias with independently recorded source evidence.
    verified_no_ball_labels: tuple[str, ...] = ()
    evidence: str = ""

    def __post_init__(self):
        if self.verified_no_ball_labels and not self.evidence.strip():
            raise ValueError("Verified aliases require source evidence")


DISMISSALS = {1: "bowled", 2: "caught", 3: "lbw", 4: "run_out",
              5: "stumped", 6: "hit_wicket", 9: "retired_out", 10: "obstructing_field"}
LABELS = {"Bowled": 1, "Caught": 2, "LBW": 3, "RunOut": 4, "Stump": 5,
          "Hit Wicket": 6, "Retire Out": 9, "Obstracting the field": 10,
          "Obstructing the field": 10}
BOWLER_WICKETS = {1, 2, 3, 5, 6}
IDS = ("match_id", "innings", "overid", "over_ball_num", "innings_ball_num",
       "batting_team_id", "bowling_team_id", "striker_id", "non_striker_id", "bowler_id")


def integer(value):
    """Reject fractional/non-finite tokens instead of silently truncating IDs."""
    if value is None or str(value) == "":
        return None
    try:
        n = Decimal(str(value))
        return int(n) if n.is_finite() and n == n.to_integral_value() else None
    except (InvalidOperation, ValueError):
        return None


def boolean(value):
    return {"true": True, "false": False, "1": True, "0": False}.get(str(value).lower())


def normalize_event(raw: Mapping, contract: Contract = Contract()) -> dict:
    """Derived fields only; caller retains the source row alongside this result."""
    reasons = []
    out = {"n_" + c: integer(raw.get(c)) for c in IDS}
    for c in IDS:
        if out["n_" + c] is None or out["n_" + c] <= 0:
            reasons.append("invalid_" + c)
    if out["n_batting_team_id"] == out["n_bowling_team_id"]:
        reasons.append("same_teams")
    if out["n_striker_id"] == out["n_non_striker_id"]:
        reasons.append("same_batters")
    runs, e1, e2 = [integer(raw.get(c)) for c in ("runs", "extras1_runs", "extras_2_runs")]
    valid_runs = all(v is not None and v >= 0 for v in (runs, e1, e2))
    if not valid_runs:
        reasons.append("invalid_runs")
    label = raw.get("extras_type")
    legal = faced = charged = None
    candidate_legal = None
    if valid_runs:
        if label == "None":
            if e1 or e2:
                reasons.append("unlabelled_extras")
            else:
                legal, faced, charged = True, True, runs
        elif label == "wide":
            if runs or e1 < 1 or e2:
                reasons.append("invalid_wide_components")
            else:
                legal, faced, charged = False, False, e1
        elif label in ("byes", "legbyes"):
            if runs or e1 < 1 or e2:
                reasons.append("invalid_bye_components")
            else:
                legal, faced, charged = True, True, 0
        elif label in contract.verified_no_ball_labels:
            if e1 != 1:
                reasons.append("invalid_no_ball_penalty")
            else:
                legal, faced = False, True
                charged = runs + e1 if e2 == 0 else None
        elif label in ("Overstep", "other"):
            reasons.append("unverified_extra_" + label)
            candidate_legal = False
        elif label == "Penalty":
            reasons.append("penalty_timing_unknown")
        else:
            reasons.append("unknown_extras_label")
        if e2:
            reasons.append("secondary_extras_untyped")
            charged = None
    if candidate_legal is None:
        candidate_legal = legal
    wicket = boolean(raw.get("is_wicket"))
    did = integer(raw.get("dismissed_player_id"))
    dtype = integer(raw.get("dismissal_type_id"))
    for name, value in (("dismissed_player_id", did), ("dismissal_type_id", dtype)):
        if raw.get(name) not in (None, "") and (value is None or value <= 0):
            reasons.append("invalid_" + name)
    dlabel = raw.get("dismissal_type", "")
    credited = None
    team_wicket = wicket
    if wicket is None:
        reasons.append("invalid_wicket_flag")
    elif not wicket:
        if did is not None or dtype is not None or dlabel:
            reasons.append("dismissal_without_wicket")
            team_wicket = None
        else:
            credited = False
    else:
        if dtype not in DISMISSALS or LABELS.get(dlabel) != dtype:
            reasons.append("unknown_or_conflicting_dismissal")
            team_wicket = None
        else:
            credited = dtype in BOWLER_WICKETS
        if did is None:
            reasons.append("wicket_without_dismissed_player")
        elif did not in (out["n_striker_id"], out["n_non_striker_id"]):
            reasons.append("dismissed_player_not_at_crease")
        if credited and did != out["n_striker_id"]:
            reasons.append("bowler_wicket_non_striker")
            credited = None
        if (label in contract.verified_no_ball_labels and dtype not in (4, 10)) or (label == "wide" and dtype not in (4, 5, 6, 10)):
            reasons.append("dismissal_illegal_for_extra")
            team_wicket = credited = None
        if dtype == 9:
            # A retirement can be recorded between deliveries; the feed has no
            # explicit event-kind flag proving this row consumed a delivery.
            reasons.append("retirement_delivery_timing_unknown")
            legal = faced = candidate_legal = None
    for flag, value in (("is_four", 4), ("is_six", 6)):
        b = boolean(raw.get(flag))
        if b is None or (b and runs != value):
            reasons.append("invalid_" + flag)
    out.update(batter_runs=runs if valid_runs else None,
               extras_runs=e1 + e2 if valid_runs else None,
               team_runs=runs + e1 + e2 if valid_runs else None,
               bowler_runs=charged, legal_ball=legal, ball_faced=faced,
               candidate_legal_ball=candidate_legal, team_wicket=team_wicket,
               dismissed_batter_id=did if wicket and did is not None else None,
               bowler_wicket=credited, dismissal_kind=DISMISSALS.get(dtype),
               contract_version=contract.version,
               reason_codes=";".join(sorted(set(reasons))),
               event_valid=not reasons)
    return out

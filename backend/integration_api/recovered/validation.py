"""Six-table relationship validation. Problems are retained as a source-keyed ledger."""
import pandas as pd
from .ingest import KEYS, typed_table
from .event_contract import boolean, integer


def validate_tables(raw):
    tables = {name: typed_table(df) for name, df in raw.items()}
    issues, checks = [], []

    def flag(name, mask, code, severity="warning"):
        for number in tables[name].loc[mask, "source_record_number"]:
            issues.append({"table": name, "source_record_number": int(number), "code": code, "severity": severity})

    for name, key in KEYS.items():
        frame = tables[name]
        bad = frame[key].isna().any(axis=1)
        for c in key:
            bad |= frame[c].map(lambda v: integer(v) is None or integer(v) <= 0)
        flag(name, bad, "invalid_primary_key", "fatal")
        dup = frame.duplicated(key, keep=False)
        flag(name, dup, "duplicate_primary_key", "warning" if name == "playing_eleven" else "fatal")
        checks.append({"check": name + "_primary_key", "affected": int(dup.sum()), "invalid": int(bad.sum())})

    def refs(left, right, lk, rk=None, severity="fatal"):
        rk = rk or lk
        right_keys = set(tables[right][rk].itertuples(index=False, name=None))
        mask = pd.Series([k not in right_keys for k in tables[left][lk].itertuples(index=False, name=None)], index=tables[left].index)
        label = left + "_to_" + right + "_" + "_".join(lk)
        flag(left, mask, label, severity)
        checks.append({"check": label, "affected": int(mask.sum())})
    refs("matches", "competitions", ["comp_id"])
    refs("teams", "competitions", ["comp_id"])
    refs("competition_team_player_mapping", "teams", ["comp_id", "team_id"])
    refs("playing_eleven", "matches", ["match_id"])
    refs("playing_eleven", "competition_team_player_mapping", ["player_id"])
    refs("ball_by_ball", "matches", ["match_id"])
    for side in ("home", "away"):
        refs("matches", "teams", ["comp_id", side + "_team_id"], ["comp_id", "team_id"])
    # Stop unsafe joins before they can duplicate/drop events.
    ledger = pd.DataFrame(issues, columns=["table", "source_record_number", "code", "severity"])
    if not ledger.empty and ledger.severity.eq("fatal").any():
        return tables, ledger, pd.DataFrame(checks), None, None
    m = tables["matches"].set_index("match_id").to_dict("index")
    p = tables["competition_team_player_mapping"]
    team_names = tables["teams"].set_index(["comp_id", "team_id"]).team_name.to_dict()
    comp_names = tables["competitions"].set_index("comp_id").comp_name.to_dict()
    flag("competition_team_player_mapping", p.comp_name.ne(p.comp_id.map(comp_names)), "competition_name_conflict")
    flag("competition_team_player_mapping", pd.Series([r.team_name != team_names.get((r.comp_id, r.team_id)) for r in p.itertuples()], index=p.index), "team_name_conflict")
    x = tables["playing_eleven"]
    # A consensus bridge, never arbitrary first-row selection. Conflicting values stay null.
    bridge_rows = []
    for key, group in x.groupby(["match_id", "team_id", "player_id"], sort=True):
        row = dict(zip(["match_id", "team_id", "player_id"], key))
        row["source_records"] = ";".join(str(n) for n in group.source_record_number)
        row["source_sha256"] = group.source_sha256.iloc[0]
        row["source_member"] = group.source_member.iloc[0]
        row["source_count"] = len(group)
        conflict = []
        for col in ("batting_order", "is_played", "is_captain", "is_wk", "is_impact", "is_impact_off"):
            vals = group[col].unique()
            row[col] = vals[0] if len(vals) == 1 and vals[0] != "" else None
            if len(vals) > 1:
                conflict.append(col)
        row["conflicting_fields"] = ";".join(conflict)
        bridge_rows.append(row)
    bridge = pd.DataFrame(bridge_rows)
    participant = bridge.set_index(["match_id", "team_id", "player_id"]).to_dict("index")
    roster = set(p[["comp_id", "team_id", "player_id"]].itertuples(index=False, name=None))
    b = tables["ball_by_ball"]
    for row in b.itertuples():
        match = m[row.match_id]
        def event_issue(code):
            issues.append({"table": "ball_by_ball", "source_record_number": row.source_record_number, "code": code, "severity": "warning"})
        if {row.batting_team_id, row.bowling_team_id} != {match["home_team_id"], match["away_team_id"]}:
            event_issue("event_team_mismatch")
        for role, side in (("striker", "batting"), ("non_striker", "batting"), ("bowler", "bowling"), ("dismissed_player", "batting")):
            pid = getattr(row, role + "_id")
            if pd.isna(pid):
                continue
            tid = getattr(row, side + "_team_id")
            if (match["comp_id"], tid, pid) not in roster:
                event_issue(role + "_missing_competition_roster")
            entry = participant.get((row.match_id, tid, pid))
            if entry is None:
                event_issue(role + "_missing_match_roster")
            elif boolean(entry["is_played"]) is not True:
                event_issue(role + "_not_confirmed_played")
            elif entry["conflicting_fields"]:
                event_issue(role + "_participation_conflict")
    for row in tables["matches"].itertuples():
        for field in ("toss_win_team_id", "win_team_id"):
            value = getattr(row, field)
            if pd.notna(value) and value not in (row.home_team_id, row.away_team_id):
                issues.append({"table": "matches", "source_record_number": row.source_record_number, "code": field + "_outside_fixture", "severity": "warning"})
    # Aliases are a separate bridge. Never merge distinct IDs that share a name.
    provenance = ["source_sha256", "source_member", "source_record_number"]
    aliases = [p[["player_id", "player_name"] + provenance].assign(source_role="roster")]
    for role in ("striker", "non_striker", "bowler"):
        aliases.append(b[[role + "_id", role + "_name"] + provenance].rename(columns={role + "_id": "player_id", role + "_name": "player_name"}).assign(source_role=role))
    observations = pd.concat(aliases)
    counts = observations.groupby(["player_id", "player_name"]).size().rename("source_observations")
    # Representative supporting source reference; all underlying records remain in staging.
    aliases = observations.sort_values(["source_member", "source_record_number", "source_role"]).drop_duplicates(["player_id", "player_name"])
    aliases = aliases.merge(counts, on=["player_id", "player_name"], validate="one_to_one").sort_values(["player_id", "player_name"])
    aliases["names_for_id"] = aliases.groupby("player_id").player_name.transform("nunique")
    aliases["ids_for_name"] = aliases.groupby("player_name").player_id.transform("nunique")
    ledger = pd.DataFrame(issues, columns=["table", "source_record_number", "code", "severity"])
    return tables, ledger, pd.DataFrame(checks), bridge, aliases

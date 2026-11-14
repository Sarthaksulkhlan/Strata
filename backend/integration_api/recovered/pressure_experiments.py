import pandas as pd

def entry_roles(events):
    """Infer arrival band using only observed batters up to each event; never final order."""
    rows = []
    for _, innings in events.groupby(["n_match_id", "n_innings"], sort=True):
        known = {}
        for event in innings.sort_values("source_record_number").itertuples():
            pair = [int(v) for v in (event.n_striker_id, event.n_non_striker_id) if pd.notna(v)]
            new = sorted(set(pair) - set(known))
            for player in new:
                position = len(known) + 1
                role = "opening" if not known and len(new) == 2 else "unknown"
                if len(new) == 1:
                    role = "opening" if position <= 2 else "middle" if position <= 5 else "lower"
                # Both opening batters receive the same band, even after the first is added.
                if len(new) == 2 and len(known) < 2:
                    role = "opening"
                known[player] = role
            rows.append({"source_record_number": event.source_record_number,
                         "arrival_role": known.get(event.n_striker_id, "unknown")})
    return pd.DataFrame(rows)

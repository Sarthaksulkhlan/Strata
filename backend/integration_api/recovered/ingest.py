import pandas as pd
from .event_contract import integer

KEYS = {"competitions": ["comp_id"], "teams": ["comp_id", "team_id"],
        "matches": ["match_id"], "competition_team_player_mapping": ["comp_id", "team_id", "player_id"],
        "playing_eleven": ["match_id", "team_id", "player_id"],
        "ball_by_ball": ["match_id", "innings", "innings_ball_num"]}

def typed_table(frame):
    out = frame.copy()
    for c in frame:
        if c.endswith("_id"):
            out[c] = pd.array(frame[c].map(integer), dtype="Int64")
    return out

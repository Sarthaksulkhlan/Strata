"""In-memory adapter around recovered functions. Never reads the approved snapshot."""
import json
import pandas as pd

from .recovered.event_contract import IDS, integer, normalize_event
from .recovered.validation import validate_tables
from .recovered.state import reconstruct
from .recovered.pressure_experiments import entry_roles
from .recovered.phase7a import thresholds, classify, baseline, summarize, shrink


METHOD = {
    'version': 'phase7a-upload-adapter-1', 'review_status': 'uploaded_dataset_not_independently_reviewed',
    'training_end_exclusive': '2024-01-01', 'evaluation_start': '2024-01-01',
    'description': 'Original Phase 7A rules, context adjustment, 1000 match-bootstrap replicates (seed 7007), empirical-Bayes shrinkage and evidence-first ordering. Training thresholds and baselines are fitted only on the uploaded pre-2024 matches.',
    'pressure': 'At least 36 legal balls played, 6–60 balls remaining, 2–8 wickets remaining. First innings: rate at/below historical Q25 with at most 6 wickets remaining, or death phase with at most 4. Chase: required rate above historical Q70. Each historical threshold and role baseline requires 100 events across 10 matches.',
    'scores': 'Batting: 100 × supported residual runs / supported balls faced. Bowling: −6 × supported residual runs / supported legal balls. Scores shrink toward the cohort mean using between-player variance and bootstrap uncertainty. Wickets are reported separately, not added as an invented score bonus.',
    'evidence': 'Strong: 60 exposures, 8 matches and CI half-width ≤25 batting / ≤1.5 bowling. Moderate: 30, 5 and ≤40 / ≤2.5. Limited: 12 exposures and 3 matches. Otherwise insufficient. Rank by evidence tier, then descending shrunk score, then player ID.',
    'limitations': ['Uploaded results are separate from the frozen approved production rankings.',
        'Complete ordinary T20 innings, consistent rosters and reconcilable results are required. Unknown extras, revised games and incomplete contexts are excluded by the original rules.',
        'No eligibility, auction valuation or causal clutch claim. Confidence is conditional on uploaded coverage.',
        'Exposures differ from evidence-record counts; wides may be evidence without a batter exposure.',
        'Original bootstrap aggregates match residuals and exposures, including partially supported contexts. Inspect context coverage; this is a retained methodology limitation.',
        'Nothing is saved permanently. Expired jobs and restarts require re-upload.'],
}


class Unavailable(ValueError):
    pass


def records(frame):
    return json.loads(frame.to_json(orient='records'))


def analyze(tables, progress):
    """Returns JSON-safe aggregates plus private event frames for owned evidence queries."""
    progress('Validating six-table keys, identities and relationships')
    raw = {k: v.copy() for k, v in tables.items()}
    for col in IDS:
        if raw['ball_by_ball'][col].map(lambda v: integer(v) is None or integer(v) <= 0).any():
            raise Unavailable('Invalid delivery identifier or ball numbering in ' + col + '. Inspect validation issues; no identifiers were inferred.')
    typed, issues, checks, _, aliases = validate_tables(raw)
    if not issues.empty and issues.severity.eq('fatal').any():
        return {'status': 'unavailable', 'message': 'Fatal key or parent-reference errors. Correct the indicated source rows and upload again.',
                'issues': records(issues.head(100)), 'checks': records(checks)}, {}
    # The offline code compares ISO dates lexically. Reject ambiguous date formats
    # before that comparison rather than assigning an inferred season.
    dates = typed['matches'].match_date
    if not dates.str.fullmatch(r'\d{4}-\d{2}-\d{2}').all() or pd.to_datetime(dates, errors='coerce').isna().any():
        raise Unavailable('Match dates must be valid ISO dates (YYYY-MM-DD). No dates were inferred.')
    progress('Normalizing deliveries using event-contract-1')
    b = raw['ball_by_ball']
    derived = pd.DataFrame([normalize_event(row) for row in b.to_dict('records')])
    for col in [c for c in derived if c.startswith('n_')] + ['batter_runs', 'extras_runs', 'team_runs', 'bowler_runs', 'dismissed_batter_id']:
        derived[col] = pd.array(derived[col], dtype='Int64')
    for col in ('legal_ball', 'ball_faced', 'candidate_legal_ball', 'team_wicket', 'bowler_wicket'):
        derived[col] = pd.array(derived[col], dtype='boolean')
    events = pd.concat([b.reset_index(drop=True), derived], axis=1)
    bad = set(issues.loc[issues.table.eq('ball_by_ball'), 'source_record_number'])
    events['relationship_valid'] = ~events.source_record_number.isin(bad)
    progress('Reconstructing pre-delivery states and reconciling complete innings')
    states, _, matches, _ = reconstruct(events, typed['matches'], typed['competitions'])
    f = states[states.context_valid & states.innings.isin([1, 2]) & ~states.terminal_before].copy()
    if f.empty:
        return {'status':'unavailable', 'message':'No complete, reconciled ordinary T20 match contexts are usable.',
                'issues':records(issues.head(100)), 'match_checks':records(matches)}, {}
    f = f.merge(events[['source_record_number', 'source_sha256', 'source_member', 'n_striker_id', 'n_bowler_id',
        'batter_runs', 'bowler_runs', 'ball_faced', 'legal_ball', 'dismissed_batter_id', 'bowler_wicket',
        'event_valid', 'relationship_valid']], on='source_record_number', validate='one_to_one')
    if not (f.event_valid & f.relationship_valid).all():
        raise Unavailable('An invalid event reached the analysis gate. No rankings were produced.')
    # Offline Phase 7A reads CSV here: absent dismissal IDs are NaN and compare
    # false. Preserve that behavior across the nullable in-memory boundary.
    f['striker_dismissed'] = f.n_striker_id.eq(f.dismissed_batter_id).fillna(False)
    f = f.merge(entry_roles(events), on='source_record_number', validate='one_to_one')
    progress('Fitting pre-2024 context thresholds and applying Phase 7A pressure rules')
    if not f.match_date.lt('2024-01-01').any():
        raise Unavailable('No usable pre-2024 training matches. Historical thresholds cannot be fitted.')
    t = thresholds(f)
    f = classify(f, t)
    names = aliases.groupby('player_id').player_name.agg(lambda s: ' | '.join(sorted(set(s))))
    result = {'status':'complete', 'methodology':METHOD, 'thresholds':records(t), 'rankings':{},
        'summary':{'uploaded_events':len(b), 'context_valid_events':len(f),
            'pressure_events':int(f.rules_pressure.fillna(False).sum()), 'matches':int(f.match_id.nunique()),
            'training_matches':int(f.loc[f.match_date.lt('2024-01-01'), 'match_id'].nunique()),
            'evaluation_matches':int(f.loc[f.match_date.ge('2024-01-01'), 'match_id'].nunique())},
        'source_files':{k:{'sha256':v.source_sha256.iloc[0], 'rows':len(v)} for k,v in raw.items()},
        'issues':records(issues.head(100)), 'match_checks':records(matches)}
    evidence = {}
    for role, actor in [('batting', 'n_striker_id'), ('bowling', 'n_bowler_id')]:
        progress(f'Calculating {role} context residuals, match uncertainty and rankings')
        base = baseline(f.assign(player_id=f[actor]), role)
        pressure = base[base.rules_pressure.eq(True)].copy()
        evidence[role] = pressure
        if pressure.empty:
            result['rankings'][role] = []
            continue
        ranked, prior = shrink(summarize(pressure, role), role)
        ranked['player_name'] = ranked.player_id.map(names)
        ranked['definition'] = 'rules_pressure'
        ranked['evidence_order'] = ranked.evidence_level.map({'strong':0,'moderate':1,'limited':2,'insufficient':3})
        ranked = ranked.sort_values(['evidence_order', 'pressure_score', 'player_id'], ascending=[True, False, True])
        ranked['rank'] = range(1, len(ranked)+1)
        ranked['source_record_count'] = ranked.source_records.str.split(';').str.len()
        result['rankings'][role] = records(ranked)
        result[role + '_prior'] = records(pd.DataFrame([prior]))[0]
    progress('Preparing traceable uploaded-dataset results')
    if not any(result['rankings'].values()):
        result['message'] = 'No candidates have supported pressure evidence under the unchanged thresholds. No top ten was forced.'
    return result, evidence

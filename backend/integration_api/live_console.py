"""Bounded private in-process jobs. Uploads are never logged or written to disk."""
import asyncio
import csv
import hashlib
import io
import logging
import re
import secrets
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool
from .recovered.event_contract import IDS, normalize_event
from .live_pipeline import METHOD, Unavailable, analyze, records

router = APIRouter(prefix='/api/v1/live')
REQUIRED = {
    'ball_by_ball': list(IDS) + ['runs','extras1_runs','extras_2_runs','extras_type','is_wicket',
        'dismissed_player_id','dismissal_type_id','dismissal_type','is_four','is_six',
        'striker_name','non_striker_name','bowler_name'],
    'matches':['match_id','comp_id','match_date','home_team_id','away_team_id','toss_win_team_id',
        'win_team_id','result','first_inn_revised_overs','second_inn_revised_overs','revised_target'],
    'competitions':['comp_id','comp_name','match_format'],
    'teams':['comp_id','team_id','team_name'],
    'competition_team_player_mapping':['comp_id','comp_name','team_id','team_name','player_id','player_name'],
    'playing_eleven':['match_id','team_id','player_id','batting_order','is_played','is_captain','is_wk','is_impact','is_impact_off'],
}
MAX_BYTES = 2 * 1024 * 1024
MAX_JOB_BYTES = 6 * 1024 * 1024
MAX_ROWS = 10000
TTL = 900
LIMIT = 2
jobs = {}
lock = threading.RLock()
worker = ThreadPoolExecutor(max_workers=1, thread_name_prefix='live-analysis')
DEPENDENCY = 'Upload the five companion tables before starting. Deliveries alone cannot establish match dates, teams, participation or historical pressure baselines.'


def cleanup():
    with lock:
        for key, job in list(jobs.items()):
            if time.monotonic() - job['created'] > TTL and job['status'] not in ('queued','running') and not job.get('uploading'):
                del jobs[key]


async def expire_jobs():
    while True:
        await asyncio.sleep(30)
        cleanup()


def inspect_csv(data, table='ball_by_ball'):
    if not data or b'\x00' in data:
        raise ValueError('CSV is empty or contains binary content.')
    try:
        text = data.decode('utf-8-sig')
        reader = csv.reader(io.StringIO(text), strict=True)
        header = next(reader)
        if len(header) != len(set(header)) or not header or len(header) > 100 or any(not re.fullmatch(r'[a-z][a-z0-9_]{0,63}', c) for c in header):
            raise ValueError('CSV requires unique, original-format column names (at most 100).')
        reserved = set(normalize_event({})) | {'relationship_valid'}
        if any(c.startswith(('source_', 'n_')) or c in reserved for c in header):
            raise ValueError('Source provenance and derived columns are assigned by the server, not by uploads.')
        missing = [c for c in REQUIRED[table] if c not in header]
        if missing:
            raise ValueError('Missing required columns: ' + ', '.join(missing))
        for number, row in enumerate(reader, 1):
            if number > MAX_ROWS:
                raise ValueError('Upload exceeds 10000 rows. Use a coherent subset of complete matches and training history.')
            if len(row) != len(header) or any(len(v) > 2048 for v in row):
                raise ValueError('CSV has a malformed row or oversized cell.')
        raw = pd.read_csv(io.StringIO(text), dtype=str, keep_default_na=False)
    except (UnicodeError, csv.Error, StopIteration, pd.errors.ParserError) as exc:
        raise ValueError('Upload must be a well-formed UTF-8 CSV.') from exc
    if raw.empty:
        raise ValueError('CSV has no data rows.')
    # Bound conversion before the unchanged offline Decimal/int contract.
    for c in raw:
        if c.endswith('_id') or c in IDS or c in ('runs','extras1_runs','extras_2_runs'):
            tokens = raw[c][raw[c].ne('')]
            if not tokens.str.fullmatch(r'[+-]?\d{1,15}(?:\.\d{1,6})?').all():
                raise ValueError('Invalid or out-of-range numeric tokens in column ' + c + '. Scientific notation is unsupported.')
    digest = hashlib.sha256(data).hexdigest()
    frame = raw.copy()
    frame.insert(0, 'source_record_number', range(1, len(frame)+1))
    frame.insert(0, 'source_member', table + '.csv')
    frame.insert(0, 'source_sha256', digest)
    if table == 'ball_by_ball':
        normalized = pd.DataFrame([normalize_event(row) for row in raw.to_dict('records')])
        duplicate = normalized.duplicated(['n_match_id','n_innings','n_innings_ball_num'], keep=False)
        normalized.loc[duplicate, 'event_valid'] = False
        normalized.loc[duplicate, 'reason_codes'] += ';duplicate_delivery_key'
        normalized.insert(0, 'source_record_number', frame.source_record_number)
        valid = int(normalized.event_valid.sum())
        issues = records(normalized.loc[~normalized.event_valid, ['source_record_number','reason_codes']].head(100))
    else:
        normalized = frame
        duplicate = raw.duplicated(keep=False)
        valid = len(raw)
        issues = []
    report = {'original_rows':len(raw), 'processed_rows':valid, 'rejected_rows':len(raw)-valid,
        'duplicate_records':int(duplicate.sum()), 'columns':list(raw.columns),
        'additional_columns':[c for c in raw.columns if c not in REQUIRED[table]],
        'normalized_columns':list(normalized.columns),
        'missing_values':{c:int(raw[c].eq('').sum()) for c in REQUIRED[table]},
        'raw_preview':records(raw.head(10)), 'structured_preview':records(normalized.head(10)),
        'issues':issues, 'sha256':digest,
        'notice':'No source rows were discarded. Event-invalid rows are retained for diagnostics. Relationship and match consistency checks run after all six tables are supplied; empty optional dismissal/revision fields are not errors.'}
    return report, frame, normalized


def access(job_id, request):
    with lock:
        cleanup()
        job = jobs.get(job_id)
        token = request.headers.get('X-Analysis-Token','')
        if job is None or not secrets.compare_digest(job['token'], token):
            raise HTTPException(404, 'Job unavailable, expired, or inaccessible. Re-upload after a restart.')
        return job


def snapshot(job):
    missing = [t for t in REQUIRED if t not in job['tables']]
    return {'status':job['status'], 'stages':list(job['stages']), 'validation':dict(job['reports']),
        'missing_tables':missing, 'analysis_available':not missing, 'message':job.get('message'),
        'expires_in_seconds':max(0, int(TTL-(time.monotonic()-job['created'])))}


@router.get('/schema')
def schema():
    return {'format':'Original Data Pack six CSV tables', 'required_columns':REQUIRED,
        'max_bytes':MAX_BYTES, 'max_job_bytes':MAX_JOB_BYTES, 'max_rows':MAX_ROWS,
        'expires_seconds':TTL, 'limitation':DEPENDENCY, 'methodology':METHOD}


async def receive(request, job, table):
    try:
        if request.headers.get('content-type','').split(';')[0].strip() not in ('text/csv','application/csv'):
            raise HTTPException(415, 'Send UTF-8 CSV with Content-Type: text/csv.')
        async with asyncio.timeout(30):
            data = bytearray()
            async for chunk in request.stream():
                if len(data)+len(chunk) > MAX_BYTES:
                    raise HTTPException(413, 'CSV exceeds 2 MiB upload limit.')
                data.extend(chunk)
            if job['bytes']+len(data) > MAX_JOB_BYTES:
                raise HTTPException(413, 'This job exceeds the combined 6 MiB limit.')
        report, frame, normalized = await run_in_threadpool(inspect_csv, bytes(data), table)
        with lock:
            job['reports'][table] = report
            job['tables'][table] = frame
            if table == 'ball_by_ball': job['structured'] = normalized
            job['bytes'] += len(data)
            job['stages'].extend([f'{table}: CSV read and schema checked', f'{table}: {len(frame)} rows transformed with Pandas'])
            job['status'] = 'validated'
    except TimeoutError:
        raise HTTPException(408, 'Upload timed out. Try again.') from None
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    finally:
        with lock: job['uploading'] = False


@router.post('/uploads', status_code=201)
async def upload(request: Request):
    with lock:
        cleanup()
        if len(jobs) >= LIMIT:
            raise HTTPException(429, 'Temporary analysis capacity reached. Delete a previous upload or retry later.')
        key = secrets.token_urlsafe(24)
        job = {'token':secrets.token_urlsafe(32), 'created':time.monotonic(), 'status':'receiving',
            'stages':[], 'tables':{}, 'reports':{}, 'bytes':0, 'uploading':True, 'cancel':False}
        jobs[key] = job
    try:
        await receive(request, job, 'ball_by_ball')
        return {'job_id':key, 'access_token':job['token'], **snapshot(job)}
    except BaseException:
        with lock: jobs.pop(key, None)
        raise


@router.post('/jobs/{job_id}/tables/{table}', status_code=201)
async def companion(job_id: str, table: str, request: Request):
    job = access(job_id, request)
    if table not in REQUIRED or table == 'ball_by_ball': raise HTTPException(400, 'Unknown companion table.')
    with lock:
        if job['status'] != 'validated' or job['uploading'] or table in job['tables']:
            raise HTTPException(409, 'Table already supplied or job is busy. Start a new upload to replace data.')
        job['uploading'] = True
    await receive(request, job, table)
    return snapshot(job)


@router.get('/jobs/{job_id}')
def status(job_id: str, request: Request):
    job = access(job_id, request)
    with lock: return snapshot(job)


class Cancelled(Exception):
    pass


def process(job):
    def progress(stage):
        with lock:
            if job['cancel']: raise Cancelled()
            job['stages'].append(stage)
    try:
        with lock: job['status'] = 'running'
        result, evidence = analyze(job['tables'], progress)
        with lock:
            if job['cancel']: raise Cancelled()
            job.update(status=result['status'], message=result.get('message'), result=result, evidence=evidence)
    except Cancelled:
        with lock:
            job.update(status='cancelled', message='Analysis cancelled. No rankings were published.')
            job['tables'].clear()
    except Unavailable as exc:
        with lock: job.update(status='unavailable', message=str(exc))
    except Exception as exc:
        logging.getLogger(__name__).error('Live analysis failed (%s)', type(exc).__name__)
        with lock: job.update(status='failed', message='Analysis could not safely process this dataset. Check schemas and relationships; no partial rankings were published.')


@router.post('/jobs/{job_id}/start', status_code=202)
def start(job_id: str, request: Request):
    job = access(job_id, request)
    with lock:
        if job['status'] != 'validated' or job['uploading']: raise HTTPException(409, 'Job is busy or has already run.')
        if set(job['tables']) != set(REQUIRED): raise HTTPException(409, DEPENDENCY)
        job['status'] = 'queued'
        worker.submit(process, job)
    return {'status':'queued'}


@router.post('/jobs/{job_id}/cancel', status_code=202)
def cancel(job_id: str, request: Request):
    job = access(job_id, request)
    with lock:
        if job['status'] not in ('queued','running'): raise HTTPException(409, 'Job is not processing.')
        job['cancel'] = True
    return {'message':'Cancellation requested; processing will stop at the next stage boundary.'}


def completed(job):
    if job['status'] != 'complete': raise HTTPException(409, job.get('message') or 'Results are not ready.')


@router.get('/jobs/{job_id}/results')
def results(job_id: str, request: Request):
    job = access(job_id, request)
    if job['status'] == 'unavailable' and 'result' in job: return job['result']
    completed(job)
    return job['result']


@router.get('/jobs/{job_id}/players/{player_id}')
def player(job_id: str, player_id: int, request: Request, role: str = 'batting', offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100)):
    job = access(job_id, request)
    completed(job)
    if role not in ('batting','bowling'): raise HTTPException(400, 'Invalid role.')
    metrics = next((r for r in job['result']['rankings'][role] if r['player_id']==player_id), None)
    if metrics is None: raise HTTPException(404, 'No supported pressure metrics for this player and role.')
    frame = job['evidence'][role]
    frame = frame[frame.player_id.eq(player_id)]
    columns = ['source_record_number','source_sha256','match_id','innings','event_number','match_date',
        'score_before','wickets_before','balls_remaining','required_rate','rules_reason',
        'exposure','runs','wickets','expected','residual']
    matches = frame.groupby('match_id')[['exposure','runs','wickets','residual']].sum(min_count=1).reset_index()
    return {'metrics':metrics, 'total':len(frame), 'offset':offset, 'limit':limit,
        'balls':records(frame[columns].iloc[offset:offset+limit]), 'matches':records(matches)}


def csv_response(frame, filename):
    frame = frame.copy()
    for c in frame.select_dtypes('object'):
        frame[c] = frame[c].map(lambda v: "'" + v if isinstance(v,str) and v.lstrip().startswith(('=','+','-','@')) else v)
    return Response(frame.to_csv(index=False), media_type='text/csv', headers={
        'Content-Disposition':f'attachment; filename="{filename}.csv"', 'Cache-Control':'no-store'})


@router.get('/jobs/{job_id}/structured.csv')
def export(job_id: str, request: Request):
    return csv_response(access(job_id, request)['structured'], 'structured')


@router.get('/jobs/{job_id}/rankings.csv')
def export_rankings(job_id: str, request: Request):
    job = access(job_id, request)
    completed(job)
    rows = [dict(row, role=role) for role, rows in job['result']['rankings'].items() for row in rows]
    return csv_response(pd.DataFrame(rows), 'uploaded-rankings')


@router.delete('/jobs/{job_id}', status_code=204)
def delete(job_id: str, request: Request):
    job = access(job_id, request)
    with lock:
        if job['status'] in ('queued','running') or job['uploading']: raise HTTPException(409, 'Cancel and wait for processing to stop before deletion.')
        jobs.pop(job_id, None)

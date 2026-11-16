"""Opt-in private full-pack HTTP-contract test. Never sends data to production.

STRATA_ORIGINAL_ZIP and STRATA_APPROVED_SNAPSHOT must identify local files.
STRATA_LOCAL_FULL_DATASET=1 must be set before launch. No private output saved.
"""
import os, sys, time, zipfile, hashlib, json, ctypes, csv
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('CLUTCHIQ_CORS_ORIGINS','http://localhost:3011')
from fastapi.testclient import TestClient
from integration_api.app import app
from integration_api import live_console as live
import pandas as pd
assert live.FULL_LOCAL
start=time.monotonic()
url=os.environ.get('STRATA_FULL_TEST_URL')
if url:
    from urllib.parse import urlsplit
    import httpx
    parsed=urlsplit(url)
    assert parsed.scheme=='http' and parsed.hostname in ('localhost','127.0.0.1'), 'Private fixture tests are local only'
    connection=httpx.Client(base_url=url,timeout=180)
else:
    connection=TestClient(app)
with zipfile.ZipFile(os.environ['STRATA_ORIGINAL_ZIP']) as archive, connection as client:
    # Include approved production data in the tested service's memory footprint.
    assert client.get('/healthz').status_code == 200
    for role in ['batting', 'bowling']:
        approved = client.get('/api/v1/rankings/' + role).json()['data']
        for row in approved:
            assert client.get('/api/v1/players/' + str(row['player']['id']) + '?role=' + role).status_code == 200
    assert client.get('/api/v1/methodology').status_code == 200
    names={Path(n).stem:n for n in archive.namelist() if n.endswith('.csv') and not n.startswith('__MACOSX')}
    owner=None; headers={'Content-Type':'text/csv'}
    for table in ['ball_by_ball']+[t for t in live.REQUIRED if t!='ball_by_ball']:
        data=archive.read(names[table]); digest=hashlib.sha256(data).hexdigest()
        route='/api/v1/live/uploads' if owner is None else f"/api/v1/live/jobs/{owner['job_id']}/tables/{table}"
        response=client.post(route,content=data,headers=headers)
        assert response.status_code==201,(table,response.text)
        body=response.json()
        if owner is None:
            owner=body; headers['X-Analysis-Token']=owner['access_token']
        assert body['validation'][table]['sha256']==digest
        print(json.dumps({'uploaded':table,'rows':body['validation'][table]['original_rows']}),flush=True)
        del data
        if table=='ball_by_ball':
            assert body['validation'][table]['original_rows']==200999
            assert client.post(f"/api/v1/live/jobs/{owner['job_id']}/start",headers=headers).status_code==409
    route=f"/api/v1/live/jobs/{owner['job_id']}"
    assert client.get(route).status_code==404
    assert client.post(route+'/start',headers=headers).status_code==202
    seen=[]
    while True:
        state=client.get(route,headers=headers).json()
        if state['stages']!=seen:
            seen=state['stages'];print(json.dumps({'stage':seen[-1]}),flush=True)
        if state['status'] not in ('running','queued'):break
        assert time.monotonic()-start<900,'Session deadline exceeded'
        time.sleep(1)
    assert state['status']=='complete',state
    result=client.get(route+'/results',headers=headers).json()
    assert result['summary']['uploaded_events']==200999
    for role in ['batting','bowling']:
        actual=pd.DataFrame(result['rankings'][role]).set_index('player_id')
        expected=pd.read_csv(Path(os.environ['STRATA_APPROVED_SNAPSHOT'])/role/'rules_pressure_evaluations.csv.gz').set_index('player_id')
        assert actual.index.tolist()==expected.index.tolist()
        columns = [field for field in expected if field in actual]
        for field in columns:
            if pd.api.types.is_numeric_dtype(expected[field]):
                pd.testing.assert_series_equal(actual[field].astype(float),expected[field].astype(float),check_names=False,rtol=1e-8,atol=1e-8)
            else:
                assert actual[field].fillna('').tolist() == expected[field].fillna('').tolist(), field
        print(json.dumps({'role': role, 'candidates': len(actual), 'compared_fields': len(columns)}), flush=True)
        pid=int(actual.index[0]); assert client.get(route+f'/players/{pid}?role={role}',headers=headers).status_code==200
    expected_thresholds = pd.read_csv(Path(os.environ['STRATA_APPROVED_SNAPSHOT']) / 'pressure_thresholds.csv.gz')
    actual_thresholds = pd.DataFrame(result['thresholds'])
    pd.testing.assert_frame_equal(actual_thresholds[expected_thresholds.columns], expected_thresholds, check_dtype=False, rtol=1e-8, atol=1e-8)
    with client.stream('GET', route + '/structured.csv', headers=headers) as response:
        assert response.status_code == 200
        reader = csv.reader(response.iter_lines())
        header = next(reader)
        position = header.index('source_record_number')
        count = 0
        for count, record in enumerate(reader, 1):
            assert int(record[position]) == count
        assert count == 200999
    print('Full structured export and historical thresholds: PASS', flush=True)
    assert client.get(route+'/rankings.csv',headers=headers).status_code==200
    assert client.delete(route,headers=headers).status_code==204
    assert client.get(route,headers=headers).status_code==404
    print(json.dumps({'full_console':'PASS','events':200999,'elapsed_seconds':round(time.monotonic()-start,2)}),flush=True)

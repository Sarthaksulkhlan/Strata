"""Opt-in real browser/full private pack check; loopback only, no public fixtures.

Requires Playwright with Chromium plus STRATA_ORIGINAL_ZIP and
STRATA_APPROVED_SNAPSHOT. Start the local full-mode backend and frontend first.
"""
import hashlib
import json
import os
from pathlib import Path
import tempfile
import time
from urllib.parse import urlsplit
import zipfile

import pandas as pd
from playwright.sync_api import sync_playwright, expect

url = os.environ.get('STRATA_FULL_TEST_URL', 'http://localhost:3011')
assert urlsplit(url).hostname in ('localhost', '127.0.0.1') and urlsplit(url).scheme == 'http'
required = ['ball_by_ball', 'matches', 'competitions', 'teams', 'competition_team_player_mapping', 'playing_eleven']
started = time.monotonic()
with tempfile.TemporaryDirectory(prefix='strata-private-browser-') as directory, zipfile.ZipFile(os.environ['STRATA_ORIGINAL_ZIP']) as archive, sync_playwright() as driver:
    files, hashes = {}, {}
    for table in required:
        member = next(n for n in archive.namelist() if n == f'Data Pack/{table}.csv')
        data = archive.read(member)
        target = Path(directory) / (table + '.csv')
        target.write_bytes(data)
        hashes[table] = hashlib.sha256(data).hexdigest()
        files[table] = str(target)
    del data
    browser = driver.chromium.launch(channel='chrome', timeout=30000)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    failures, stages, captured = [], [], {}
    page.on('pageerror', lambda error: failures.append(str(error)))

    def capture(request):
        if '/api/v1/live/jobs/' in request.url and '/tables/' in request.url:
            captured['owner'] = {
                'job_id': request.url.split('/jobs/')[1].split('/')[0],
                'access_token': request.headers['x-analysis-token'],
            }
    page.on('request', capture)
    page.goto(url + '/#/live-console', wait_until='domcontentloaded')
    expect(page.get_by_role('heading', name='How STRATA Evaluates Performance Under Pressure')).to_be_visible(timeout=30000)
    expect(page.get_by_role('button', name='Browse CSV files')).to_be_enabled(timeout=30000)
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    # Companion-first staging is a browser precheck, never a fake backend result.
    page.locator('input[type=file]').set_input_files(files['competitions'])
    expect(page.get_by_test_id('checklist-card-competitions')).to_contain_text('BROWSER CHECKED')
    expect(page.get_by_role('button', name='Start Analysis', exact=True)).to_be_disabled()
    assert 'owner' not in captured
    assert 'File SHA-256:' not in page.inner_text('body')
    # The remaining files go through the real UI and real HTTP proxy/backend.
    page.locator('input[type=file]').set_input_files([files[t] for t in required if t != 'competitions'])
    expect(page.get_by_role('button', name='Start Analysis', exact=True)).to_be_enabled(timeout=240000)
    print('Browser: all six tables accepted by backend', flush=True)
    owner = captured['owner']
    route = url + '/api/v1/live/jobs/' + owner['job_id']
    headers = {'X-Analysis-Token': owner['access_token']}
    state = page.request.get(route, headers=headers).json()
    for table in required:
        assert state['validation'][table]['sha256'] == hashes[table]
    assert state['validation']['ball_by_ball']['original_rows'] == 200999
    page.get_by_role('button', name='Start Analysis', exact=True).click()
    deadline = time.monotonic() + 600
    while True:
        assert time.monotonic() < deadline, 'No completed browser results before session deadline'
        state = page.request.get(route, headers=headers).json()
        stages.extend(state.get('stages', []))
        if state['status'] not in ('queued', 'running'):
            break
        page.wait_for_timeout(1000)
    assert state['status'] == 'complete', state.get('message')
    expect(page.get_by_role('button', name='Inspect batter', exact=True).first).to_be_visible(timeout=30000)
    result = page.request.get(route + '/results', headers=headers).json()
    assert result['status'] == 'complete', result.get('message')
    assert result['summary']['uploaded_events'] == 200999
    assert any('Reconstructed 867 of 867' in stage for stage in stages)
    checked = {}
    for role in ('batting', 'bowling'):
        actual = pd.DataFrame(result['rankings'][role]).set_index('player_id')
        expected = pd.read_csv(Path(os.environ['STRATA_APPROVED_SNAPSHOT']) / role / 'rules_pressure_evaluations.csv.gz').set_index('player_id')
        assert actual.index.tolist() == expected.index.tolist()
        columns = [c for c in expected.columns if c in actual.columns]
        for column in columns:
            if pd.api.types.is_numeric_dtype(expected[column]):
                pd.testing.assert_series_equal(actual[column].astype(float), expected[column].astype(float), check_names=False, rtol=1e-8, atol=1e-8)
            else:
                assert actual[column].fillna('').tolist() == expected[column].fillna('').tolist(), column
        checked[role] = {'candidates': len(actual), 'compared_columns': columns}
        # The two displayed top-ten tables use these backend names and values.
        for row in result['rankings'][role][:10]:
            assert row['player_name'] in page.inner_text('body')
    for name in ('Inspect batter', 'Inspect bowler'):
        with page.expect_response(lambda response: '/players/' in response.url and '/api/v1/live/' in response.url) as evidence:
            page.get_by_role('button', name=name, exact=True).first.click()
        body = evidence.value.json()
        assert evidence.value.status == 200 and body['balls'] and body['matches']
    print(json.dumps({'ranking_equivalence': checked, 'browser_evidence': 'both roles PASS'}), flush=True)
    for width in (390, 768, 1440):
        page.set_viewport_size({'width': width, 'height': 1000})
        page.wait_for_timeout(600)  # Allow existing scroll/resize animations to settle.
        overflow = page.evaluate('document.documentElement.scrollWidth > innerWidth')
        if overflow:
            print(json.dumps(page.evaluate("""() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,elements:Array.from(document.querySelectorAll('*')).filter(e=>{
              if(e.getBoundingClientRect().right<=innerWidth+1)return false;
              for(let a=e.parentElement;a && a.tagName!=='BODY' && a.tagName!=='HTML';a=a.parentElement)if(['auto','scroll','hidden','clip'].includes(getComputedStyle(a).overflowX))return false;
              return true;
            }).map(e=>({tag:e.tagName,classes:e.className,width:e.getBoundingClientRect().width,text:e.children.length?'':e.textContent.slice(0,100)}))})""")), flush=True)
        assert not overflow, width
    expect(page.get_by_role('button', name='Delete session', exact=True)).to_be_enabled()
    page.get_by_role('button', name='Delete session', exact=True).click()
    expect(page.get_by_role('button', name='Delete session', exact=True)).to_have_count(0)
    assert page.request.get(route, headers=headers).status == 404
    assert not failures, failures
    print(json.dumps({'browser_full_flow': 'PASS', 'events': 200999, 'comparison': checked, 'elapsed_seconds': round(time.monotonic() - started, 2)}), flush=True)
    browser.close()

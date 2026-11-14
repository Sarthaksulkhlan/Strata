"""Optional real-browser smoke test against local servers; synthetic uploads only.

Install playwright in a test environment; uses installed Chrome by default.
Never runs against production unless LIVE_BROWSER_URL is deliberately changed.
"""
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from live_fixture import fixture

url=os.environ.get('LIVE_BROWSER_URL','http://localhost:3011')
files=fixture()
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(url,wait_until='networkidle')
    expect(page.get_by_test_id('header-open-live-console-btn')).to_be_visible()
    page.get_by_test_id('header-open-live-console-btn').click()
    expect(page.get_by_role('heading',name='Live Analysis Console')).to_be_visible()
    expect(page.get_by_role('button',name='Browse CSV files')).to_be_enabled()
    page.get_by_label('Upload cricket CSV files').set_input_files([
        {'name':name+'.csv','mimeType':'text/csv','buffer':data} for name,data in files.items()])
    expect(page.get_by_role('button',name='Start Analysis')).to_be_enabled(timeout=60000)
    page.get_by_role('button',name='Start Analysis').click()
    expect(page.get_by_role('heading',name='04 / Uploaded-dataset results')).to_be_visible(timeout=60000)
    expect(page.get_by_text('Leading observed batter:',exact=False)).to_be_visible()
    page.get_by_role('button',name='View evidence',exact=True).first.click()
    expect(page.get_by_role('region',name='Ball-level evidence',exact=True)).to_be_visible(timeout=15000)
    page.get_by_role('button',name='Top bowlers',exact=True).click()
    expect(page.get_by_text('Leading observed bowler:',exact=False)).to_be_visible()
    page.get_by_role('button',name='View evidence',exact=True).first.click()
    expect(page.get_by_role('region',name='Match-level evidence',exact=True)).to_be_visible()
    with page.expect_download() as download:
        page.get_by_role('button',name='Export all rankings',exact=True).click()
    assert download.value.suggested_filename=='uploaded-rankings.csv'
    for width in [1440,390]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'Overflow at {width}'
        page.screenshot(path=str(Path(tempfile.gettempdir())/f'strata-live-{width}.png'),full_page=True)
    page.get_by_role('button',name='Delete session',exact=True).click()
    expect(page.get_by_role('button',name='Start Analysis')).to_have_count(0)
    page.get_by_label('Upload cricket CSV files').set_input_files({'name':'bad.csv','mimeType':'text/csv','buffer':b'missing\n1'})
    expect(page.get_by_role('alert')).to_contain_text('Missing required columns')
    # Simulate a job disappearing on restart: remove server state independently,
    # then verify the UI clears its stale session and permits a fresh upload.
    with page.expect_response('**/api/v1/live/uploads') as uploaded:
        page.get_by_label('Upload cricket CSV files').set_input_files({'name':'ball_by_ball.csv','mimeType':'text/csv','buffer':fixture(1,0)['ball_by_ball']})
    owner=uploaded.value.json()
    api_base=uploaded.value.url.rsplit('/uploads',1)[0]
    removed=page.request.delete(api_base+'/jobs/'+owner['job_id'],headers={'X-Analysis-Token':owner['access_token']})
    assert removed.status==204
    page.get_by_role('button',name='Export structured deliveries').click()
    expect(page.get_by_role('alert')).to_contain_text('Re-upload after a restart')
    expect(page.get_by_role('button',name='Browse CSV files')).to_be_enabled()
    expect(page.get_by_role('button',name='Start Analysis')).to_have_count(0)
    page.get_by_role('link',name='Back to platform').click()
    expect(page.get_by_test_id('header-open-live-console-btn')).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),'Landing overflow'
    page.set_viewport_size({'width':1440,'height':1000})
    page.get_by_role('link',name='Rankings',exact=True).click()
    expect(page.locator('#rankings')).to_be_visible()
    page.get_by_role('link',name='Methodology',exact=True).click()
    expect(page.locator('#methodology')).to_be_visible()
    # Network error state uses a failed transport, not fabricated ranking data.
    page.route('**/api/v1/live/schema',lambda route:route.abort())
    page.goto(url+'/#live-console')
    expect(page.get_by_role('alert')).to_be_visible()
    page.unroute('**/api/v1/live/schema')
    page.get_by_role('button',name='Retry connection').click()
    expect(page.get_by_role('button',name='Browse CSV files')).to_be_enabled()
    # A complete dataset with inadequate historical coverage returns a genuine empty result.
    page.get_by_label('Upload cricket CSV files').set_input_files([
        {'name':name+'.csv','mimeType':'text/csv','buffer':data} for name,data in fixture(1,1).items()])
    expect(page.get_by_role('button',name='Start Analysis')).to_be_enabled(timeout=60000)
    page.get_by_role('button',name='Start Analysis').click()
    expect(page.get_by_text('No supported batting candidates.',exact=False)).to_be_visible(timeout=60000)
    page.get_by_role('button',name='Delete session',exact=True).click()
    assert not errors,errors
    browser.close()
    print('Browser checks passed: upload, real progress/results, both roles, evidence, export, 1440/390 layouts, navigation, validation errors, network retry and insufficient-evidence empty state; no page errors.')

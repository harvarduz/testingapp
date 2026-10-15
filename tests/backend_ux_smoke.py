"""Exercise real cross-tab course conflicts and safe recovery; temporary data only."""
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'test-results'; OUTPUT.mkdir(exist_ok=True)
checks, audits = 0, []
def passed(text):
    global checks
    checks += 1; print(f'PASS {checks}: {text}',flush=True)
def audit(page,name):
    page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
    violations=page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations")
    audits.append({'screen':name,'violations':violations})
    (OUTPUT/'backend-conflict-accessibility.json').write_text(json.dumps(audits,indent=2))
    assert not violations,(name,[(v['id'],[n['target'] for n in v['nodes']]) for v in violations])
with tempfile.TemporaryDirectory(prefix='curio-backend-ux-') as directory:
    with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
    url=f'http://127.0.0.1:{port}/'
    process=subprocess.Popen(['node','server/index.js'],cwd=ROOT,env={**os.environ,'PORT':str(port),'NODE_ENV':'test','CURIO_DATA_DIR':directory,'PUBLIC_URL':url},stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    try:
        for _ in range(100):
            if process.poll() is not None:raise RuntimeError(process.stdout.read())
            try:
                with urllib.request.urlopen(url+'api/health') as response:assert json.load(response)['database']=='ready'
                break
            except OSError:time.sleep(.1)
        else:raise RuntimeError('Server did not become ready')
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
            context=browser.new_context(viewport={'width':1366,'height':1000},reduced_motion='reduce',accept_downloads=True)
            account=context.request.post(url+'api/auth/register',data={'name':'Backend Teacher','email':'backend@example.test','password':'A real backend test password!'})
            assert account.status==201
            seed=context.request.get(url+'api/courses').json()['courses'][0]
            created=context.request.post(url+'api/creator/courses',data=seed).json()['course'];course_id=created['id']
            errors=[]
            def editor(page):
                page.on('pageerror',lambda error:errors.append(str(error)))
                page.goto(url+'#creators',wait_until='networkidle')
                page.locator(f'[data-creator-course="{course_id}"]').get_by_role('button',name='Edit course',exact=True).click()
                expect(page.get_by_role('textbox',name='Course title',exact=True)).to_be_focused()
            a=context.new_page();b=context.new_page();editor(a);editor(b)
            a.get_by_role('textbox',name='Course title',exact=True).fill('The server has this newer title')
            a.get_by_role('button',name='Save draft',exact=True).click()
            expect(a.locator('.form-message.success')).to_contain_text('Draft saved')
            b.get_by_role('textbox',name='Course title',exact=True).fill('My unsaved second-tab title')
            b.get_by_role('button',name='Save draft',exact=True).click()
            expect(b.locator('.form-message.error')).to_contain_text('another tab or device')
            expect(b.get_by_role('textbox',name='Course title',exact=True)).to_have_value('My unsaved second-tab title')
            latest=context.request.get(url+'api/creator/courses/'+course_id).json()['course']
            assert latest['title']=='The server has this newer title' and latest['revision']==2
            passed('Two real editor tabs cannot silently overwrite each other; unsaved input and the newer server version both survive')
            with b.expect_download() as download:b.get_by_role('button',name='Download my draft',exact=True).click()
            assert json.loads(Path(download.value.path()).read_text())['title']=='My unsaved second-tab title'
            passed('Conflict recovery downloads the actual unsaved draft as valid JSON')
            b.get_by_role('button',name='Review latest version',exact=True).click()
            expect(b.get_by_role('button',name='Keep my edits',exact=True)).to_be_focused()
            expect(b.locator('.editor-conflict-confirm')).to_contain_text('version 2')
            b.get_by_role('button',name='Keep my edits',exact=True).click()
            expect(b.get_by_role('button',name='Review latest version',exact=True)).to_be_focused()
            expect(b.get_by_role('textbox',name='Course title',exact=True)).to_have_value('My unsaved second-tab title')
            b.get_by_role('button',name='Review latest version',exact=True).click()
            b.get_by_role('button',name='Replace with latest',exact=True).click()
            expect(b.get_by_role('textbox',name='Course title',exact=True)).to_have_value('The server has this newer title')
            expect(b.get_by_role('textbox',name='Course title',exact=True)).to_be_focused()
            b.get_by_role('textbox',name='Course title',exact=True).fill('A consciously merged course title')
            b.get_by_role('button',name='Save draft',exact=True).click()
            expect(b.locator('.form-message.success')).to_contain_text('Draft saved')
            assert context.request.get(url+'api/creator/courses/'+course_id).json()['course']['revision']==3
            passed('Reviewing is non-destructive; replacement requires a deliberate action, restores focus and saves with the new revision')
            a.get_by_role('button',name='Your courses',exact=True).click()
            a.locator(f'[data-creator-course="{course_id}"]').get_by_role('button',name='Publish for free',exact=True).click()
            expect(a.locator('.creator-workspace .form-message.error')).to_contain_text('another tab or device')
            expect(a.locator(f'[data-creator-course="{course_id}"]')).to_contain_text('A consciously merged course title')
            assert context.request.get(url+'api/creator/courses/'+course_id).json()['course']['status']=='draft'
            a.locator(f'[data-creator-course="{course_id}"]').get_by_role('button',name='Publish for free',exact=True).click()
            expect(a.locator(f'[data-creator-course="{course_id}"] .status-pill')).to_contain_text('Published')
            passed('A stale list cannot publish unseen edits; it refreshes for review, then explicit retry publishes the correct course')
            b.close();a.close()
            for width in [320,390]:
                for mode in ['light','dark']:
                    mobile=browser.new_context(viewport={'width':width,'height':900},reduced_motion='reduce',storage_state=context.storage_state())
                    mobile.add_init_script("localStorage.setItem('curio.appearance.v1',JSON.stringify({version:2,mode:'%s',seed:'#1a73e8'}))"%mode)
                    page=mobile.new_page();editor(page)
                    current=mobile.request.get(url+'api/creator/courses/'+course_id).json()['course']
                    changed={**current,'description':current['description']+' A server-side revision.'}
                    response=mobile.request.put(url+'api/creator/courses/'+course_id,data=changed,headers={'If-Match':'"rev-%s"'%current['revision']})
                    assert response.status==200
                    page.get_by_role('textbox',name='Course title',exact=True).fill('Local work must remain safe')
                    page.get_by_role('button',name='Save changes',exact=True).click()
                    expect(page.locator('.editor-conflict')).to_be_visible()
                    page.get_by_role('button',name='Review latest version',exact=True).click()
                    expect(page.get_by_role('button',name='Keep my edits',exact=True)).to_be_focused()
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                    for button in page.locator('.editor-conflict button').all():assert button.bounding_box()['height']>=44
                    audit(page,f'{width}px {mode} conflict review')
                    page.screenshot(path=str(OUTPUT/f'backend-conflict-{width}-{mode}.png'))
                    page.get_by_role('button',name='Keep my edits',exact=True).click()
                    # The component's beforeunload guard correctly protects real navigation.
                    page.on('dialog',lambda dialog:dialog.accept())
                    mobile.close()
            passed('Conflict recovery fits 320/390px in both themes, keeps focus visible and provides 44px controls')
            assert not errors,errors
            passed('All backend conflict and recovery journeys finish without uncaught browser errors')
            context.close();browser.close()
    finally:process.terminate();process.wait(timeout=15)
print(f'{checks} checks and {len(audits)} accessibility audits passed.',flush=True)

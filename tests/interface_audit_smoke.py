"""Account recovery, mobile search and navigation focus regression checks.
Run against a local test server via CURIO_TEST_URL. Account responses are mocked.
"""
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('CURIO_TEST_URL', 'http://127.0.0.1:5173/').rstrip('/') + '/'
checks = 0

def passed(message):
    global checks
    checks += 1
    print(f'PASS {checks}: {message}', flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':1366,'height':850}, reduced_motion='reduce')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    session = {'user':{'id':'audit-account', 'name':'Returning Learner', 'email':'returning@example.test'}, 'progress':json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {emptyProgress} from './src/progress.js'; console.log(JSON.stringify(emptyProgress()))"],cwd=ROOT,text=True))}
    session_failed = [True]
    page.route('**/api/session', lambda route: route.fulfill(status=503, json={'error':'Temporary account interruption'}) if session_failed[0] else route.fulfill(json=session))
    page.route('**/api/progress', lambda route: route.fulfill(json={'progress':json.loads(route.request.post_data)}))
    page.goto(URL + '#overview', wait_until='networkidle')
    expect(page.get_by_role('alert')).to_contain_text('Could not load your account')
    session_failed[0] = False
    page.get_by_role('button', name='Retry connection', exact=True).click()
    expect(page.get_by_role('alert')).to_have_count(0)
    page.get_by_role('button', name='Open account menu', exact=True).click()
    expect(page.get_by_role('region', name='Account menu')).to_contain_text('Returning Learner')
    page.keyboard.press('Escape')
    passed('Failed session recovers the real account on retry without reloading')
    context.close()
    context = browser.new_context(viewport={'width':1366,'height':850}, reduced_motion='reduce')
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    held = []
    retrying = [False]
    page.route('**/api/session', lambda route: held.append(route) if retrying[0] else route.fulfill(status=503, json={'error':'Temporary account interruption'}))
    page.route('**/api/auth/login', lambda route: route.fulfill(json=session))
    page.route('**/api/creator/courses', lambda route: route.fulfill(json={'courses':[]}))
    page.route('**/api/progress', lambda route: route.fulfill(json={'progress':json.loads(route.request.post_data)}))
    page.goto(URL + '#creators', wait_until='networkidle')
    retrying[0] = True
    page.get_by_role('button', name='Retry connection', exact=True).click()
    page.get_by_role('button', name='Already have an account? Sign in', exact=True).click()
    page.get_by_role('textbox', name='Email address', exact=True).fill('returning@example.test')
    page.get_by_role('textbox', name='Password', exact=True).fill('A valid test password 42!')
    page.get_by_role('button', name='Sign in', exact=True).click()
    expect(page.get_by_role('button', name='Create a course', exact=True)).to_be_visible()
    assert held, 'The session retry must still be pending during login'
    for request in held:
        request.fulfill(json={'user':None, 'progress':session['progress']})
    page.wait_for_timeout(300)
    expect(page.get_by_role('button', name='Create a course', exact=True)).to_be_visible()
    assert page.evaluate("localStorage.getItem('curio.student.owner')") == 'audit-account'
    page.get_by_role('button', name='Open account menu', exact=True).click()
    expect(page.get_by_role('region', name='Account menu')).to_contain_text('Returning Learner')
    passed('A delayed anonymous retry cannot overwrite a newer login or erase its local owner')
    context.close()
    context = browser.new_context(viewport={'width':1366,'height':850}, reduced_motion='reduce')
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/api/session', lambda route: route.fulfill(status=503, json={'error':'Account offline'}))
    page.goto(URL, wait_until='networkidle')
    expect(page.get_by_role('alert')).to_contain_text('Could not load your account')
    page.get_by_role('alert').get_by_role('button').click()
    expect(page.get_by_role('alert')).to_contain_text('Could not load your account')
    passed('Successful catalog retry preserves unresolved account error on homepage')
    page.unroute('**/api/session')
    page.goto(URL + '#overview', wait_until='networkidle')
    page.get_by_role('navigation', name='Main navigation', exact=True).get_by_role('button', name='Explore courses', exact=True).click()
    expect(page.get_by_role('heading', name='Find your next course.', exact=True)).to_be_focused()
    search = page.get_by_role('textbox', name='Search courses', exact=True)
    page.get_by_role('navigation', name='Main navigation', exact=True).get_by_role('button', name='My learning', exact=True).click()
    search.fill('thinking in numbers')
    expect(search).to_be_focused()
    expect(page.locator('.course-card')).to_have_count(1)
    page.get_by_role('button', name='Clear search', exact=True).click()
    expect(search).to_be_focused()
    search.fill('thinking in numbers')
    page.get_by_role('button', name='Explore course', exact=True).click()
    page.get_by_role('button', name='Let’s start learning', exact=True).click()
    page.get_by_role('button', name='Try extra practice', exact=True).click()
    page.keyboard.press('Escape')
    expect(page.get_by_role('heading', name='Find your next course.', exact=True)).to_be_focused()
    passed('Route changes focus heading; typing retains cursor; nested practice restores visible focus')
    for width in [320,390,480,768,820,1024,1366]:
        page.set_viewport_size({'width':width,'height':850})
        page.goto(URL + '#explore', wait_until='networkidle')
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), width
        if width <= 480:
            assert search.bounding_box()['width'] >= width - 160, (width,search.bounding_box())
            assert search.bounding_box()['height'] >= 44
            sort = page.get_by_role('combobox', name='Sort courses', exact=True)
            assert sort.locator('span').first.evaluate('n => n.scrollWidth <= n.clientWidth + 1')
        if width <= 780:
            expect(page.locator('#learning-sidebar')).to_have_attribute('inert', '')
            page.keyboard.press('Control+Home')
            for _ in range(12):
                page.keyboard.press('Tab')
                assert not page.evaluate('Boolean(document.activeElement.closest("#learning-sidebar"))'), width
            page.get_by_role('button', name='Open navigation', exact=True).click()
            expect(page.locator('#learning-sidebar')).not_to_have_attribute('inert', '')
            page.keyboard.press('Escape')
            expect(page.get_by_role('button', name='Open navigation', exact=True)).to_be_focused()
        else:
            expect(page.locator('#learning-sidebar')).not_to_have_attribute('inert', '')
    passed('Seven viewports keep search/filters readable; closed mobile drawer stays out of Tab order')
    for mode in ['light','dark']:
        page.set_viewport_size({'width':390,'height':844})
        page.goto(URL + '#explore', wait_until='networkidle')
        page.get_by_role('button', name='Open navigation', exact=True).click()
        page.get_by_role('button', name='Appearance', exact=True).click()
        page.get_by_role('button', name=mode.title(), exact=True).click()
        page.keyboard.press('Escape')
        page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
        violations=page.evaluate("async () => (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations")
        assert not violations, [(v['id'],[n['target'] for n in v['nodes']]) for v in violations]
        page.screenshot(path=str(ROOT/f'test-results/interface-audit-{mode}-390.png'),full_page=False)
    passed('Mobile search/catalog pass light/dark accessibility checks')
    assert not errors, errors
    context.close()
    browser.close()
print(f'{checks} interface audit checks passed; 2 accessibility states passed.',flush=True)

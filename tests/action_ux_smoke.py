"""Internal action feedback and recovery. Uses mocked, delayed local API responses.
Build and start a local app; no account/course writes reach the application API.
"""
import json
import os
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('CURIO_TEST_URL', 'http://127.0.0.1:4190/').rstrip('/') + '/'
OUTPUT = ROOT / 'test-results'
OUTPUT.mkdir(exist_ok=True)
checks, audits = 0, []

def passed(message):
    global checks
    checks += 1
    print(f'PASS {checks}: {message}', flush=True)

def audit(page, label):
    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    issues = page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations")
    audits.append({'screen': label, 'violations': issues})
    (OUTPUT / 'action-ux-accessibility.json').write_text(json.dumps(audits, indent=2))
    assert not issues, (label, [(issue['id'], [node['target'] for node in issue['nodes']]) for issue in issues])

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1366, 'height': 900}, reduced_motion='no-preference')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    login_requests = []
    context.route('**/api/auth/login', lambda route: login_requests.append(route))
    page.goto(URL + '#creators', wait_until='networkidle')
    page.get_by_role('button', name='Already have an account? Sign in', exact=True).click()
    page.get_by_role('textbox', name='Email address', exact=True).fill('returning@example.test')
    page.get_by_role('textbox', name='Password', exact=True).fill('A valid private password 42!')
    page.get_by_role('button', name='Sign in', exact=True).click()
    pending = page.get_by_role('button', name='Signing in…', exact=True)
    expect(pending).to_be_disabled()
    expect(pending).to_have_attribute('aria-busy', 'true')
    password_toggle = page.get_by_role('button', name='Show password', exact=True)
    assert password_toggle.evaluate('button=>button.matches(":disabled") && !button.disabled')
    password_toggle.hover(); page.mouse.down()
    expect(password_toggle).not_to_have_attribute('data-material-pressed', '')
    expect(password_toggle.locator('.material-ripple')).to_have_count(0)
    page.mouse.up()
    expect(page.locator('.account-panel form')).to_have_attribute('aria-busy', 'true')
    assert len(login_requests) == 1
    login_requests.pop().fulfill(status=401, json={'error': 'Email or password is incorrect.'})
    expect(page.locator('.account-panel [role="alert"]')).to_be_focused()
    expect(page.get_by_role('button', name='Sign in', exact=True)).to_be_enabled()
    passed('Slow sign-in has a named busy action; buttons disabled through their fieldset show no enabled press/ripple feedback and failures recover focus')

    password_toggle.hover(); page.mouse.down()
    expect(password_toggle).to_have_attribute('data-material-pressed', '')
    page.locator('.account-panel fieldset').evaluate('node=>node.disabled=true')
    expect(password_toggle).not_to_have_attribute('data-material-pressed', '')
    page.mouse.up()
    expect(password_toggle.locator('.material-ripple')).to_have_count(0)
    passed('A control disabled during a held press releases its visual state and cleans up its ripple')

    page.goto(URL + '#explore', wait_until='networkidle')
    assert page.get_by_role('button', name='Learning is for everyone', exact=True).bounding_box()['height'] >= 44
    opener = page.get_by_role('button', name='View Thinking in numbers', exact=True)
    opener.click()
    dialog = page.get_by_role('dialog')
    box = dialog.bounding_box()
    page.mouse.move(box['x'] + 60, box['y'] + 110); page.mouse.down()
    page.mouse.move(8, box['y'] + 100, steps=6); page.mouse.up()
    expect(dialog).to_be_visible()
    page.mouse.move(8, box['y'] + 100); page.mouse.down()
    page.mouse.move(8, box['y'] + 220, steps=5); page.mouse.up()
    expect(dialog).to_be_visible()
    page.mouse.click(8, box['y'] + 100)
    expect(dialog).to_have_count(0)
    expect(opener).to_be_focused()
    opener.click(); page.keyboard.press('Escape')
    expect(dialog).to_have_count(0)
    passed('Dragging from a lesson onto its backdrop or swiping across the backdrop keeps it open; an intentional outside click and Escape still close it')

    context.close()
    context = browser.new_context(viewport={'width': 1366, 'height': 900}, reduced_motion='reduce')
    context.add_init_script('''Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:text=>{window.__copies=(window.__copies||0)+1;window.__copiedText=text;return new Promise((resolve,reject)=>{window.__copyResolve=resolve;window.__copyReject=reject})}}});''')
    page = context.new_page(); page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL + '#explore', wait_until='networkidle')
    page.get_by_role('button', name='View Thinking in numbers', exact=True).click()
    copy = page.get_by_role('button', name='Copy course link', exact=True)
    copy.evaluate('button=>{button.focus();button.click();button.click()}')
    pending = page.get_by_role('button', name='Copying link…', exact=True)
    expect(pending).to_have_attribute('aria-disabled', 'true')
    expect(pending).to_have_attribute('aria-busy', 'true')
    expect(pending).to_be_focused()
    assert page.evaluate('window.__copies') == 1
    page.evaluate('window.__copyReject(new Error("Clipboard permission denied"))')
    share = page.get_by_role('textbox', name='Course sharing link', exact=True)
    expect(share).to_be_focused()
    assert share.evaluate('node=>node.selectionStart===0 && node.selectionEnd===node.value.length')
    assert share.input_value().endswith('#course=numbers')
    copy.click()
    page.get_by_role('button', name='Close dialog', exact=True).click()
    page.get_by_role('button', name='View The physics of everyday life', exact=True).click()
    page.evaluate('window.__copyResolve()')
    expect(page.get_by_role('button', name='Copy course link', exact=True)).to_be_visible()
    expect(page.get_by_role('textbox', name='Course sharing link', exact=True)).to_have_count(0)
    passed('Clipboard clicks share one in-flight request, preserve button focus, select the fallback link, and ignore completion after leaving that course')
    context.close()

    progress = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', "import {emptyProgress} from './src/progress.js';console.log(JSON.stringify(emptyProgress()))"], cwd=ROOT, text=True))
    context = browser.new_context(viewport={'width': 1366, 'height': 900}, reduced_motion='reduce')
    page = context.new_page(); page.on('pageerror', lambda error: errors.append(str(error)))
    seed = context.request.get(URL + 'api/courses').json()['courses'][0]
    courses = [{**seed, 'id': f'draft-{index}', 'title': f'Action course {index}', 'status': 'draft', 'everPublished': False} for index in [1, 2]]
    context.route('**/api/session', lambda route: route.fulfill(json={'user': {'id': 'action-owner', 'name': 'Avery Teacher', 'email': 'avery@example.test'}, 'progress': progress}))
    context.route('**/api/progress', lambda route: route.fulfill(json={'progress': json.loads(route.request.post_data)}))
    mutations = []
    def creator_route(route):
        if route.request.method == 'GET':
            route.fulfill(json={'courses': courses})
        else:
            mutations.append(route)
    context.route('**/api/creator/courses**', creator_route)
    page.goto(URL + '#creators', wait_until='networkidle')
    rows = page.locator('.creator-course-row')
    expect(rows).to_have_count(2)
    rows.get_by_role('button', name='Publish for free', exact=True).evaluate_all('buttons=>{buttons[0].click();buttons[0].click();buttons[1].click()}')
    pending = page.get_by_role('button', name='Publishing…', exact=True)
    expect(pending).to_have_attribute('aria-busy', 'true')
    expect(rows.locator('button:not(:disabled)')).to_have_count(0)
    expect(page.get_by_role('button', name='Create a course', exact=True)).to_be_disabled()
    expect(page.get_by_role('button', name='Upload course', exact=True)).to_be_disabled()
    assert len(mutations) == 1
    courses[0] = {**courses[0], 'status': 'published', 'everPublished': True}
    mutations.pop().fulfill(json={'course': courses[0]})
    expect(rows.first.get_by_role('button', name='Edit course', exact=True)).to_be_focused()
    expect(page.get_by_role('status').filter(has_text='Course published.')).to_be_visible()
    passed('Creator mutations serialize across rows, disable conflicting actions, name the pending operation, and return focus after the refreshed list arrives')

    second = rows.nth(1)
    second.get_by_role('button', name='Delete Action course 2', exact=True).click()
    expect(second.get_by_role('button', name='Keep', exact=True)).to_be_focused()
    second.get_by_role('button', name='Keep', exact=True).click()
    expect(second.get_by_role('button', name='Delete Action course 2', exact=True)).to_be_focused()
    second.get_by_role('button', name='Delete Action course 2', exact=True).click()
    second.get_by_role('button', name='Delete', exact=True).click()
    expect(second.get_by_role('button', name='Deleting…', exact=True)).to_have_attribute('aria-busy', 'true')
    assert len(mutations) == 1
    courses.pop()
    mutations.pop().fulfill(json={'ok': True})
    expect(rows).to_have_count(1)
    expect(page.get_by_role('heading', name='Your courses.', exact=True)).to_be_focused()
    expect(page.get_by_role('status').filter(has_text='Draft deleted.')).to_be_visible()
    passed('Delete confirmation starts on Keep, cancellation restores the trigger, and completing deletion restores useful list focus')

    rows.first.get_by_role('button', name='Edit course', exact=True).click()
    title = page.get_by_role('textbox', name='Course title', exact=True)
    title.fill('An improved action course')
    page.get_by_role('button', name='Save changes', exact=True).click()
    pending = page.get_by_role('button', name='Saving changes…', exact=True)
    expect(pending).to_have_attribute('aria-busy', 'true')
    expect(title).to_be_disabled()
    expect(page.get_by_role('button', name='Save & publish', exact=True)).to_be_disabled()
    assert len(mutations) == 1
    mutations.pop().fulfill(status=503, json={'error': 'Please retry saving your changes.'})
    expect(page.locator('.course-editor > [role="alert"]')).to_be_focused()
    expect(title).to_have_value('An improved action course')
    page.get_by_role('button', name='Save changes', exact=True).click()
    saved = {**courses[0], **json.loads(mutations[-1].request.post_data)}
    courses[0] = saved
    mutations.pop().fulfill(json={'course': saved})
    expect(page.get_by_role('status').filter(has_text='Changes saved.')).to_be_visible()
    page.get_by_role('button', name='Save & publish', exact=True).click()
    expect(page.get_by_role('button', name='Publishing…', exact=True)).to_have_attribute('aria-busy', 'true')
    assert len(mutations) == 1
    mutations.pop().fulfill(json={'course': saved})
    expect(page.get_by_role('button', name='Publishing…', exact=True)).to_have_attribute('aria-busy', 'true')
    for _ in range(30):
        if mutations: break
        page.wait_for_timeout(20)
    assert len(mutations) == 1 and mutations[0].request.url.endswith('/publish')
    mutations.pop().fulfill(json={'course': saved})
    expect(page.get_by_role('status').filter(has_text='Published.')).to_be_visible()
    passed('Editor Save and Publish identify their own pending operation, lock fields, retain failed edits, and complete their multi-request workflow')

    courses.append({**seed, 'id': 'draft-3', 'title': 'A safe draft', 'status': 'draft', 'everPublished': False})
    for mode in ['light', 'dark']:
        page.set_viewport_size({'width': 390, 'height': 844})
        page.evaluate('(mode)=>localStorage.setItem("curio.appearance.v1",JSON.stringify({version:2,seed:"#1a73e8",mode}))', mode)
        page.reload(wait_until='networkidle')
        draft = rows.nth(1)
        draft.get_by_role('button', name='Delete A safe draft', exact=True).click()
        expect(draft.get_by_role('button', name='Keep', exact=True)).to_be_focused()
        for button in draft.locator('.delete-confirm button').all():
            box = button.bounding_box()
            assert box['height'] >= 44
            assert box['y'] + box['height'] < page.locator('.mobile-study-nav').bounding_box()['y']
        audit(page, f'{mode} delete confirmation at 390px')
        draft.get_by_role('button', name='Keep', exact=True).click()
        rows.first.get_by_role('button', name='Edit course', exact=True).click()
        page.get_by_role('button', name='Save changes', exact=True).click()
        expect(page.get_by_role('button', name='Saving changes…', exact=True)).to_be_disabled()
        audit(page, f'{mode} pending editor at 390px')
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
        mutations.pop().fulfill(json={'course': saved})
        expect(page.get_by_role('status').filter(has_text='Changes saved.')).to_be_visible()
        page.get_by_role('button', name='Your courses', exact=True).click()
    passed('Pending controls remain readable, fit a phone and pass light/dark accessibility audits')
    logout_progress, logouts = [], []
    context.route('**/api/progress', lambda route: logout_progress.append(route))
    context.route('**/api/auth/logout', lambda route: logouts.append(route))
    page.get_by_role('button', name='Open account menu', exact=True).click()
    page.get_by_role('button', name='Sign out', exact=True).evaluate('button=>{button.click();button.click()}')
    expect(page.get_by_role('button', name='Signing out…', exact=True)).to_have_attribute('aria-busy', 'true')
    assert len(logout_progress) == 1
    logout_progress.pop().fulfill(json={'progress': progress})
    for _ in range(50):
        if logouts: break
        page.wait_for_timeout(20)
    assert len(logouts) == 1
    logouts.pop().fulfill(status=503, json={'error': 'Please try signing out again.'})
    expect(page.get_by_role('region', name='Account menu')).to_contain_text('Could not sign out')
    page.get_by_role('button', name='Sign out', exact=True).click()
    assert len(logout_progress) == 1
    logout_progress.pop().fulfill(json={'progress': progress})
    for _ in range(50):
        if logouts: break
        page.wait_for_timeout(20)
    assert len(logouts) == 1
    logouts.pop().fulfill(json={'ok': True})
    expect(page.get_by_role('textbox', name='Your name', exact=True)).to_be_visible()
    passed('Repeated sign-out activation sends one save/logout sequence; failure preserves the session and allows a successful retry')
    context.close()

    touch = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, reduced_motion='reduce')
    phone = touch.new_page(); phone.on('pageerror', lambda error: errors.append(str(error)))
    phone.goto(URL + '#explore', wait_until='networkidle')
    title_button = phone.locator('.course-body h3 button').first
    assert title_button.bounding_box()['height'] >= 44
    title_button.tap()
    expect(phone.get_by_role('dialog')).to_be_visible()
    phone.get_by_role('button', name='Close dialog', exact=True).tap()
    expect(title_button).to_be_focused()
    assert not errors, errors
    touch.close()
    passed('Course titles and desktop footer help have 44px targets; real touch opens and closes a lesson with focus restored')
    browser.close()

print(f'\n{checks} action UX checks and {len(audits)} accessibility states passed.', flush=True)

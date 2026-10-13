"""Verify real account recovery and interactive lessons using a temporary database."""
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect
from account_helpers import account_menu, open_account, open_profile
from select_helpers import choose_option

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'test-results'; OUTPUT.mkdir(exist_ok=True)
checks = 0
audits = []


def passed(description):
    global checks
    checks += 1
    print(f'PASS {checks}: {description}', flush=True)


def audit(page, name):
    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    violations = page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations")
    audits.append({'screen': name, 'violations': violations})
    (OUTPUT / 'platform-ux-accessibility.json').write_text(json.dumps(audits, indent=2))
    assert not violations, (name, [(v['id'], [n['target'] for n in v['nodes']]) for v in violations])


with tempfile.TemporaryDirectory(prefix='curio-platform-ux-') as directory:
    with socket.socket() as reservation:
        reservation.bind(('127.0.0.1', 0)); port = reservation.getsockname()[1]
    url = f'http://127.0.0.1:{port}/'
    process = subprocess.Popen(['node', 'server/index.js'], cwd=ROOT, env={**os.environ, 'PORT': str(port), 'NODE_ENV': 'test', 'CURIO_DATA_DIR': directory, 'PUBLIC_URL': url}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        for _ in range(100):
            if process.poll() is not None: raise RuntimeError(process.stdout.read())
            try:
                with urllib.request.urlopen(url + 'api/health') as response: assert json.load(response)['status'] == 'ok'
                break
            except OSError: time.sleep(.1)
        else: raise RuntimeError('Server did not start')
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            context = browser.new_context(viewport={'width':1366,'height':1000}, reduced_motion='reduce')
            page = context.new_page(); errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(url + '#explore', wait_until='networkidle')
            open_account(page, 'login')
            expect(page.get_by_role('heading', name='Welcome back.', exact=True)).to_be_visible()
            expect(page.get_by_role('textbox', name='Email address', exact=True)).to_be_focused()
            page.keyboard.press('Escape')
            expect(page.get_by_role('button', name='Open account menu')).to_be_focused()
            open_account(page)
            expect(page.get_by_role('heading', name='Create your account.', exact=True)).to_be_visible()
            page.keyboard.press('Escape')
            passed('Sign in and Create account open the correct form, focus its first field and return to the avatar')

            registered = context.request.post(url + 'api/auth/register', data={'name':'Harvard Student','email':'harvard@example.test','password':'Private learning password 42!'})
            assert registered.status == 201
            page.reload(wait_until='networkidle')
            for route in ['overview','explore','learning','practice','paths','lab','achievements','creators','home']:
                page.goto(url + '#' + route, wait_until='networkidle')
                expect(page.locator('.account-access, .sync-message')).to_have_count(0)
                assert 'Signed in as' not in page.locator('body').inner_text()
                if route not in ['overview','home']: expect(page.locator('.greeting')).to_have_count(0)
                menu = account_menu(page)
                expect(menu.locator('.account-identity')).to_contain_text('Harvard Student')
                expect(menu.locator('.account-identity')).to_contain_text('harvard@example.test')
                expect(menu.get_by_role('button', name='Sign out', exact=True)).to_have_count(1)
                page.keyboard.press('Escape')
            passed('Real session identity appears in one shared account menu; nine screens have no repeated login or save banner')

            page.goto(url + '#explore', wait_until='networkidle')
            trigger = page.get_by_role('button', name='Open account menu', exact=True)
            trigger.focus(); page.keyboard.press('ArrowDown')
            menu = page.get_by_role('region', name='Account menu')
            expect(menu.get_by_role('button', name='My learning', exact=True)).to_be_focused()
            page.keyboard.press('End'); expect(menu.get_by_role('button', name='Sign out', exact=True)).to_be_focused()
            page.keyboard.press('Home'); expect(menu.get_by_role('button', name='My learning', exact=True)).to_be_focused()
            page.keyboard.press('Escape'); expect(trigger).to_be_focused()
            account_menu(page); page.get_by_role('heading', name='Find your next course.', exact=True).click()
            expect(menu).to_have_count(0)
            open_profile(page)
            page.get_by_role('dialog', name='Learning profile').get_by_role('textbox', name='What should we call you?').fill('Harvard learner')
            page.get_by_role('button', name='Save my preferences').click()
            expect(trigger).to_be_focused()
            passed('Keyboard, outside clicks and profile actions preserve predictable account-menu focus')

            for mode in ['light','dark']:
                for width in [1366,390,320]:
                    page.set_viewport_size({'width':width,'height':844})
                    page.evaluate('(mode)=>localStorage.setItem("curio.appearance.v1",JSON.stringify({version:2,seed:"#1a73e8",mode}))', mode)
                    for route in ['home','explore']:
                        page.goto(url + '#' + route, wait_until='networkidle'); page.reload(wait_until='networkidle')
                        menu = account_menu(page); box = menu.bounding_box()
                        assert box['x'] >= 0 and box['x'] + box['width'] <= width + 1
                        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
                        if width in [1366,390]: audit(page, f'{mode} {width}px {route} account menu')
                        if width == 390: page.screenshot(path=str(OUTPUT / f'91-account-{route}-{mode}.png'))
                        page.keyboard.press('Escape')
            passed('Home and app account controls fit 320/390/1366px with audited light/dark menus')

            page.set_viewport_size({'width':1366,'height':1000})
            page.goto(url + '#explore', wait_until='networkidle')
            context.route('**/api/progress', lambda route: route.fulfill(status=503, content_type='application/json', body=json.dumps({'error':'Temporary save failure'})))
            open_profile(page)
            choose_option(page.get_by_role('dialog', name='Learning profile').get_by_role('combobox', name='Your daily learning goal'),'3')
            page.get_by_role('button', name='Save my preferences').click()
            menu = account_menu(page)
            expect(menu.get_by_role('status')).to_contain_text('Temporary save failure')
            context.unroute('**/api/progress')
            menu.get_by_role('button', name='Retry saving progress', exact=True).click()
            expect(menu.get_by_role('status')).to_contain_text('Saved to your account')
            assert context.request.get(url + 'api/session').json()['progress']['goal'] == 3
            context.route('**/api/auth/logout', lambda route: route.fulfill(status=503, content_type='application/json', body=json.dumps({'error':'Temporary logout failure'})))
            menu.get_by_role('button', name='Sign out', exact=True).click()
            expect(menu.get_by_role('alert')).to_contain_text('Temporary logout failure')
            assert context.request.get(url + 'api/session').json()['user']['name'] == 'Harvard Student'
            context.unroute('**/api/auth/logout')
            page.keyboard.press('Escape')
            passed('Failed saves offer a working retry; failed sign-out keeps the account and explains recovery')

            page.goto(url + '#creators', wait_until='networkidle')
            page.get_by_role('button', name='Create a course', exact=True).click()
            title = page.get_by_role('textbox', name='Course title', exact=True); title.fill('Private unfinished course')
            account_menu(page).get_by_role('button', name='Sign out', exact=True).click()
            confirm = page.get_by_role('dialog', name='Leave without saving?', exact=True)
            expect(confirm).to_be_visible(); confirm.get_by_role('button', name='Keep editing').click()
            expect(title).to_have_value('Private unfinished course')
            account_menu(page).get_by_role('button', name='Sign out', exact=True).click()
            confirm.get_by_role('button', name='Discard changes').click()
            expect(page.get_by_role('button', name='Open account menu')).to_have_attribute('aria-busy','false')
            expect(page.locator('.course-editor')).to_have_count(0)
            expect(account_menu(page).get_by_role('button', name='Sign in', exact=True)).to_be_visible()
            assert context.request.get(url + 'api/session').json()['user'] is None
            assert not json.loads(page.evaluate("localStorage.getItem('curio.student.v1')"))['completed']
            page.keyboard.press('Escape')
            second = context.request.post(url + 'api/auth/register', data={'name':'Boris Park','email':'boris@example.test','password':'A different private password 57!'})
            assert second.status == 201
            page.reload(wait_until='networkidle')
            expect(account_menu(page).locator('.account-identity')).to_contain_text('Boris Park')
            assert 'Harvard Student' not in page.locator('body').inner_text()
            page.keyboard.press('Escape')
            passed('Sign-out protects unfinished edits, clears the creator editor, and another account receives its own identity')

            guest = browser.new_context(viewport={'width':390,'height':900}, reduced_motion='reduce')
            learner = guest.new_page(); learner.on('pageerror', lambda error: errors.append(str(error)))
            learner.goto(url + '#explore', wait_until='networkidle')
            catalog = guest.request.get(url + 'api/courses').json()['courses']
            assert len(catalog) == 20 and sum(len(c['lessons']) for c in catalog) == 101
            assert sum(len(l['practice']) for c in catalog for l in c['lessons']) == 218
            for course in catalog:
                learner.get_by_role('button', name=course['title'], exact=True).click()
                dialog = learner.get_by_role('dialog')
                for lesson_index in [0, len(course['lessons']) - 2, len(course['lessons']) - 1]:
                    lesson = course['lessons'][lesson_index]
                    dialog.locator('.lesson-list button').nth(lesson_index).click()
                    assert dialog.evaluate('(node)=>node.scrollTop') == 0
                    expect(dialog.locator('.worked-example-heading')).to_contain_text('Step 1 of')
                    for _ in range(len(lesson['steps']) - 1): dialog.get_by_role('button', name='Next step', exact=True).click()
                    expect(dialog.locator('.worked-example-heading')).to_contain_text(f"Step {len(lesson['steps'])} of {len(lesson['steps'])}")
                    dialog.get_by_role('button', name='Review example', exact=True).click()
                    expect(dialog.locator('.worked-example-heading')).to_contain_text('Step 1 of')
                    for position, question in enumerate(lesson['practice']):
                        answers = dialog.get_by_role('group', name='Lesson practice answers').get_by_role('button')
                        if course['id'] == 'numbers' and lesson_index == 0 and position == 0:
                            attempts_before = len(json.loads(learner.evaluate("localStorage.getItem('curio.student.v1')"))['practiceAttempts'])
                            answers.nth((question['answer'] + 1) % len(question['options'])).click()
                            dialog.get_by_role('button', name='Check practice answer', exact=True).evaluate('(button) => { button.click(); button.click(); }')
                            expect(dialog.locator('.lesson-exercises').get_by_role('status')).to_contain_text('Compare your reasoning.')
                            expect(dialog.locator('.lesson-exercises').get_by_role('status')).to_contain_text(question['explanation'])
                            assert len(json.loads(learner.evaluate("localStorage.getItem('curio.student.v1')"))['practiceAttempts']) == attempts_before + 1
                            learner.screenshot(path=str(OUTPUT / '92-lesson-exercise-retry-mobile.png'), full_page=True)
                            dialog.get_by_role('button', name='Try this answer again', exact=True).click()
                            expect(dialog.get_by_role('button', name='Check practice answer', exact=True)).to_be_disabled()
                        answers.nth(question['answer']).click()
                        dialog.get_by_role('button', name='Check practice answer', exact=True).click()
                        expect(dialog.locator('.lesson-exercises').get_by_role('status')).to_contain_text(question['explanation'])
                        dialog.get_by_role('button', name='Next exercise' if position + 1 < len(lesson['practice']) else 'Finish these exercises', exact=True).click()
                    expect(dialog.locator('.lesson-exercises')).to_contain_text('Continue to the lesson check')
                    dialog.get_by_role('button', name=course['title'], exact=True).click()
                dialog.get_by_role('button', name='Close dialog', exact=True).click()
            progress = json.loads(learner.evaluate("localStorage.getItem('curio.student.v1')"))
            assert not progress['completed'] and not progress['practiceDays']
            assert len(progress['practiceAttempts']) >= 120
            expect(learner.get_by_role('button', name='0 Curio coins', exact=True)).to_be_visible()
            passed('60 original/application lessons across every course have working example steps and explained exercises without premature completion or coins')
            passed('Wrong inline answers explain the mistake, retry requires a new choice, and duplicate activation records one attempt')
            learner.get_by_role('button', name='Thinking in numbers', exact=True).click()
            dialog = learner.get_by_role('dialog')
            dialog.get_by_role('button', name='Continue learning', exact=True).click()
            assert dialog.evaluate('(node)=>node.scrollTop') == 0
            expect(dialog).to_be_focused()
            dialog.get_by_role('button', name='Got it. Let me try!', exact=True).click()
            assert dialog.evaluate('(node)=>node.scrollTop') == 0
            expect(dialog).to_be_focused()
            dialog.get_by_role('button', name='Revisit the idea', exact=True).click()
            assert dialog.evaluate('(node)=>node.scrollTop') == 0
            expect(dialog).to_be_focused()
            dialog.get_by_role('button', name='Close dialog', exact=True).click()
            passed('Long mobile lessons start at the top; lesson/check/revisit transitions reset scroll and focus without losing progress')
            held_login = []
            def delay_login(route):
                held_login.append((route, route.fetch()))
            learner.route('**/api/auth/login', delay_login)
            open_account(learner, 'login')
            account = learner.get_by_role('dialog', name='Your Curio account')
            account.get_by_role('textbox', name='Email address').fill('boris@example.test')
            account.get_by_role('textbox', name='Password', exact=True).fill('A different private password 57!')
            account.get_by_role('button', name='Sign in', exact=True).click()
            expect(account.get_by_role('button', name='Just a moment…', exact=True)).to_be_disabled()
            for _ in range(50):
                if held_login: break
                learner.wait_for_timeout(100)
            assert held_login and held_login[0][1].status == 200
            account.get_by_role('button', name='Close dialog').click()
            learner.set_viewport_size({'width':1366,'height':1000})
            learner.get_by_role('button', name='Customize appearance', exact=True).click()
            appearance = learner.get_by_role('dialog', name='Curio appearance')
            expect(appearance).to_be_visible()
            route, response = held_login.pop()
            route.fulfill(response=response)
            expect(learner.get_by_role('button', name='Open account menu')).to_have_attribute('title','Boris Park · Account')
            expect(appearance).to_be_visible()
            appearance.get_by_role('button', name='Close dialog').click()
            passed('A delayed sign-in response accepts the real account without closing a newer appearance dialog')
            assert not errors, errors
            browser.close()
    finally:
        process.terminate(); process.wait(timeout=10)

print(f'\n{checks} account/curriculum checks and {len(audits)} accessibility states passed. Temporary database removed.')

"""Regression checks for auth recovery and authoring work that must not be lost.

Run npm run build first. Accounts and courses live only in a temporary database.
"""
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.request

from playwright.sync_api import sync_playwright, expect
from account_helpers import open_account

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'test-results'
OUTPUT.mkdir(exist_ok=True)
checks = 0
audits = []


def passed(description):
    global checks
    checks += 1
    print(f'PASS {checks}: {description}', flush=True)


def audit(page, name):
    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    violations = page.evaluate("async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}})).violations")
    audits.append({'screen': name, 'violations': violations})
    (OUTPUT / 'account-creator-ux-accessibility.json').write_text(json.dumps(audits, indent=2))
    assert not violations, (name, [(v['id'], [n['target'] for n in v['nodes']]) for v in violations])


def fill_lesson(page, number, lesson):
    for label, key in [('title', 'title'), ('idea', 'idea'), ('example', 'example'), ('question', 'question'), ('answer explanation', 'explanation')]:
        page.get_by_role('textbox', name=f'Lesson {number} {label}', exact=True).fill(lesson[key])
    for option, text in enumerate(lesson['options'], 1):
        page.get_by_role('textbox', name=f'Lesson {number} option {option}', exact=True).fill(text)


with tempfile.TemporaryDirectory(prefix='curio-account-creator-ux-') as directory:
    with socket.socket() as reservation:
        reservation.bind(('127.0.0.1', 0))
        port = reservation.getsockname()[1]
    url = f'http://127.0.0.1:{port}/'
    process = subprocess.Popen(['node', 'server/index.js'], cwd=ROOT, env={**os.environ, 'PORT': str(port), 'NODE_ENV': 'test', 'CURIO_DATA_DIR': directory, 'PUBLIC_URL': url}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        for _ in range(100):
            if process.poll() is not None:
                raise RuntimeError(process.stdout.read())
            try:
                with urllib.request.urlopen(url + 'api/health') as response:
                    assert json.load(response)['status'] == 'ok'
                break
            except OSError:
                time.sleep(.1)
        else:
            raise RuntimeError('Server did not start')

        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            context = browser.new_context(viewport={'width': 1366, 'height': 900}, reduced_motion='reduce')
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(url, wait_until='networkidle')
            open_account(page)
            dialog = page.get_by_role('dialog', name='Your Curio account')
            dialog.get_by_role('textbox', name='Password', exact=True).fill('A private learning password!')
            dialog.get_by_role('button', name='Show password', exact=True).click()
            dialog.get_by_role('button', name='Already have an account? Sign in').click()
            expect(dialog.get_by_role('textbox', name='Email address', exact=True)).to_be_focused()
            expect(dialog.get_by_role('textbox', name='Password', exact=True)).to_have_attribute('type', 'password')
            dialog.get_by_role('button', name='New here? Create an account').click()
            expect(dialog.get_by_role('textbox', name='Your name', exact=True)).to_be_focused()
            passed('Switching account forms focuses the first field and conceals the password again')

            dialog.get_by_role('button', name='Already have an account? Sign in').click()
            dialog.get_by_role('textbox', name='Email address', exact=True).fill('creator@example.test')
            login_requests = []

            def failed_login(route):
                login_requests.append(route.request.url)
                route.fulfill(status=401, content_type='application/json', body=json.dumps({'error': 'Email or password is incorrect.'}))

            context.route('**/api/auth/login', failed_login)
            dialog.locator('form').evaluate('(form) => { form.requestSubmit(); form.requestSubmit(); }')
            expect(dialog.get_by_role('alert')).to_be_focused()
            assert len(login_requests) == 1
            dialog.get_by_role('textbox', name='Password', exact=True).fill('A corrected private password!')
            expect(dialog.get_by_role('alert')).to_have_count(0)
            context.unroute('**/api/auth/login')
            page.keyboard.press('Escape')
            passed('A failed login receives focus, clears on correction, and rapid duplicate submits send one request')

            assert context.request.post(url + 'api/auth/register', data={'name': 'Morgan Teacher', 'email': 'creator@example.test', 'password': 'A private creator password!'}).status == 201
            page.goto(url + '#creators', wait_until='networkidle')
            page.reload(wait_until='networkidle')
            seed = context.request.get(url + 'api/courses').json()['courses'][0]
            seed['lessons'] = seed['lessons'][:1]
            seed['title'] = 'Patterns with Morgan'
            payload = {'name': 'patterns.json', 'mimeType': 'application/json', 'buffer': json.dumps(seed).encode()}
            page.get_by_label('Upload course JSON').set_input_files({'name': 'broken.json', 'mimeType': 'application/json', 'buffer': b'{broken'})
            with page.expect_file_chooser() as chooser:
                page.get_by_role('button', name='Choose another file', exact=True).click()
            chooser.value.set_files(payload)
            expect(page.get_by_role('textbox', name='Course title', exact=True)).to_be_focused()
            expect(page.locator('.editor-top')).to_contain_text('Unsaved changes')
            page.get_by_role('navigation', name='Main navigation').get_by_role('button', name='Explore courses', exact=True).click()
            confirm = page.get_by_role('dialog', name='Leave without saving?', exact=True)
            expect(confirm).to_be_visible()
            confirm.get_by_role('button', name='Keep editing', exact=True).click()
            expect(page.get_by_role('textbox', name='Course title', exact=True)).to_have_value(seed['title'])
            page.get_by_role('button', name='Your courses', exact=True).click()
            expect(page.locator('.editor-leave').get_by_role('button', name='Keep editing', exact=True)).to_be_focused()
            page.locator('.editor-leave').get_by_role('button', name='Keep editing', exact=True).click()
            expect(page.get_by_role('button', name='Your courses', exact=True)).to_be_focused()
            passed('Failed import offers a new file picker; successful unsaved imports warn before both navigation routes')

            page.get_by_role('button', name='Add a lesson', exact=True).click()
            expect(page.get_by_role('textbox', name='Lesson 2 title', exact=True)).to_be_focused()
            assert page.locator('.editor-lesson').nth(1).evaluate('(node) => node.open')
            page.get_by_role('button', name='Preview lesson', exact=True).click()
            issues = page.locator('.publication-issues')
            expect(issues).to_be_focused()
            expect(issues).to_contain_text('before previewing')
            bounds = issues.bounding_box()
            assert bounds['y'] >= 0 and bounds['y'] + bounds['height'] <= 900
            expect(issues).to_contain_text('Lesson 2: add a title.')
            page.get_by_role('spinbutton', name='Estimated minutes', exact=True).fill('')
            expect(page.get_by_role('spinbutton', name='Estimated minutes', exact=True)).to_have_value('')
            page.get_by_role('spinbutton', name='Estimated minutes', exact=True).fill('20')
            fill_lesson(page, 2, seed['lessons'][0])
            passed('New lessons open ready to type; preview validation is visible and focused; numeric time can be replaced normally')

            save_requests = []

            def observe_save(route):
                if route.request.method == 'POST':
                    save_requests.append(route.request.url)
                route.continue_()

            context.route('**/api/creator/courses', observe_save)
            page.locator('.course-editor form').evaluate('(form) => { form.requestSubmit(); form.requestSubmit(); }')
            expect(page.get_by_role('status').filter(has_text='Draft saved.')).to_be_visible()
            assert len(save_requests) == 1
            context.unroute('**/api/creator/courses')
            own_courses = context.request.get(url + 'api/creator/courses').json()['courses']
            assert len(own_courses) == 1 and len(own_courses[0]['lessons']) == 2
            course_id = own_courses[0]['id']
            page.get_by_role('button', name='Publish for free', exact=True).click()
            expect(page.get_by_role('status').filter(has_text='Published.')).to_be_visible()
            expect(page.get_by_role('button', name='Remove lesson 2', exact=True)).to_have_count(0)
            page.get_by_role('button', name='Add a lesson', exact=True).click()
            fill_lesson(page, 3, seed['lessons'][0])
            page.get_by_role('button', name='Save changes', exact=True).click()
            expect(page.get_by_role('status').filter(has_text='Changes saved.')).to_be_visible()
            expect(page.get_by_role('button', name='Remove lesson 3', exact=True)).to_have_count(0)
            assert len(context.request.get(url + 'api/creator/courses').json()['courses'][0]['lessons']) == 3
            passed('Saving a new draft once creates one course; published and newly saved lesson positions remain protected')

            title = page.get_by_role('textbox', name='Course title', exact=True)
            title.fill('A title safely retained through a failed save')
            context.route('**/api/creator/courses/' + course_id, lambda route: route.fulfill(status=503, content_type='application/json', body=json.dumps({'error': 'The service is temporarily unavailable.'})))
            page.get_by_role('button', name='Save changes', exact=True).click()
            error = page.locator('.course-editor > [role="alert"]')
            expect(error).to_be_focused()
            expect(error).to_contain_text('temporarily unavailable')
            expect(title).to_have_value('A title safely retained through a failed save')
            expect(page.locator('.editor-top')).to_contain_text('Unsaved changes')
            context.unroute('**/api/creator/courses/' + course_id)
            page.get_by_role('button', name='Save changes', exact=True).click()
            expect(page.get_by_role('status').filter(has_text='Changes saved.')).to_be_visible()
            page.get_by_role('textbox', name='Lesson 3 idea', exact=True).fill('Too short')
            page.get_by_role('button', name='Save changes', exact=True).click()
            expect(issues).to_be_focused()
            expect(issues).to_contain_text('saving this published course')
            assert context.request.get(url + 'api/creator/courses').json()['courses'][0]['lessons'][2]['idea'] == seed['lessons'][0]['idea']
            page.get_by_role('textbox', name='Lesson 3 idea', exact=True).fill(seed['lessons'][0]['idea'])
            page.get_by_role('button', name='Save changes', exact=True).click()
            expect(page.get_by_role('status').filter(has_text='Changes saved.')).to_be_visible()
            page.get_by_role('button', name='Your courses', exact=True).click()
            expect(page.get_by_role('heading', name='Your courses.', exact=True)).to_be_focused()
            passed('Failed save retains edits and focuses recovery; published saves validate content and returning restores list focus')

            for mode in ['light', 'dark']:
                for width in [320, 390]:
                    page.set_viewport_size({'width': width, 'height': 900})
                    page.evaluate('(mode) => localStorage.setItem("curio.appearance.v1", JSON.stringify({version:2, seed:"#1a73e8", mode}))', mode)
                    page.reload(wait_until='networkidle')
                    page.get_by_role('button', name='Edit course', exact=True).click()
                    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
                    for swatch in page.locator('.cover-swatch').all():
                        box = swatch.bounding_box()
                        assert box['width'] >= 44 and box['height'] >= 44
                    page.get_by_role('textbox', name='Course title', exact=True).fill('')
                    page.get_by_role('button', name='Save changes', exact=True).click()
                    expect(page.locator('.publication-issues')).to_be_focused()
                    await_box = page.locator('.publication-issues').bounding_box()
                    assert await_box['y'] >= 0 and await_box['y'] + await_box['height'] <= 900
                    audit(page, f'{mode} {width}px creator validation')
                    page.get_by_role('textbox', name='Course title', exact=True).fill('A title safely retained through a failed save')
                    page.get_by_role('button', name='Save changes', exact=True).click()
                    expect(page.get_by_role('status').filter(has_text='Changes saved.')).to_be_visible()
                    page.get_by_role('button', name='Your courses', exact=True).click()
            passed('Creator forms and focused validation fit 320/390px in light/dark, with usable 44px cover choices')
            assert not errors, errors
            passed('Account and authoring recovery flows have no browser JavaScript errors')
            browser.close()
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()

print(f'\n{checks} account/creator UX checks and {len(audits)} accessibility audits passed. Temporary data removed.')

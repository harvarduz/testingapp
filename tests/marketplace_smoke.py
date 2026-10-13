"""A complete creator-to-student flow using an isolated temporary database.
Run npm run build first. This suite starts and stops its own application server.
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
from select_helpers import choose_option

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'test-results'
OUTPUT.mkdir(exist_ok=True)
checks = 0


def passed(description):
    global checks
    checks += 1
    print(f'PASS {checks}: {description}', flush=True)


with tempfile.TemporaryDirectory(prefix='curio-marketplace-') as directory:
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
            raise RuntimeError('Application server did not become ready')

        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
            author = browser.new_context(viewport={'width': 1366, 'height': 1000}, reduced_motion='reduce')
            page = author.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(url, wait_until='networkidle')
            expect(page.locator('.landing-subject-grid button')).to_have_count(18)
            page.get_by_role('button', name='Languages 1 course', exact=True).click()
            expect(page.locator('.course-card')).to_have_count(1)
            expect(page.get_by_role('button', name='Say it clearly', exact=True)).to_be_visible()
            choose_option(page.get_by_role('combobox', name='Choose a subject'), 'Arts & music')
            expect(page.get_by_role('button', name='Listen, look, and create', exact=True)).to_be_visible()
            passed('All 18 subjects are discoverable; landing links and subject filters return real courses')

            page.goto(url, wait_until='networkidle')
            page.get_by_role('button', name='Create your first course').click()
            expect(page.locator('.creator-offer')).to_contain_text('free for a limited time')
            page.get_by_role('textbox', name='Your name', exact=True).fill('Morgan Teacher')
            page.get_by_role('textbox', name='Email address', exact=True).fill('teacher@example.test')
            page.get_by_role('textbox', name='Password', exact=True).fill('A unique teacher password 42!')
            page.get_by_role('button', name='Create free account', exact=True).click()
            expect(page.get_by_role('heading', name='Your courses.')).to_be_visible()
            expect(page.get_by_role('heading', name='Your workspace is ready.')).to_be_visible()
            passed('The free creator offer leads to a working registration and private creator workspace')

            page.get_by_role('button', name='Create a course', exact=True).click()
            page.get_by_role('button', name='Publish for free', exact=True).click()
            expect(page.locator('.publication-issues')).to_contain_text('Give your course a title')
            expect(page.locator('.publication-issues')).to_contain_text('fill all four answer options')
            page.get_by_role('button', name='Save draft', exact=True).click()
            expect(page.get_by_role('status').filter(has_text='Draft saved.')).to_be_visible()
            page.get_by_role('button', name='Your courses', exact=True).click()
            expect(page.locator('.creator-course-row')).to_have_count(1)
            page.get_by_role('button', name='Delete untitled course', exact=True).click()
            page.get_by_role('button', name='Delete', exact=True).click()
            expect(page.locator('.creator-course-row')).to_have_count(0)
            passed('Incomplete courses cannot be published; a private draft can be saved and deleted')

            page.get_by_label('Upload course JSON').set_input_files({'name': 'broken.json', 'mimeType': 'application/json', 'buffer': b'{broken'})
            expect(page.get_by_role('alert')).to_contain_text('not valid JSON')
            with page.expect_download() as download:
                page.get_by_role('button', name='Download template', exact=True).click()
            assert download.value.suggested_filename == 'curio-course-template.json'
            template = json.loads(Path(download.value.path()).read_text())
            template.update(title='Patterns with Morgan', category='Thinking skills', lessons=template['lessons'][:1])
            page.get_by_label('Upload course JSON').set_input_files({'name': 'patterns.json', 'mimeType': 'application/json', 'buffer': json.dumps(template).encode()})
            expect(page.get_by_role('textbox', name='Course title', exact=True)).to_have_value('Patterns with Morgan')
            expect(page.get_by_role('textbox', name='Lesson 1 title', exact=True)).to_have_value('Find the pattern')
            passed('Course templates download; malformed uploads fail clearly and valid JSON fills the editor')

            page.get_by_role('button', name='Preview lesson', exact=True).click()
            dialog = page.get_by_role('dialog')
            expect(dialog).to_contain_text('Creator preview')
            dialog.get_by_role('button', name='Let’s start learning').click()
            dialog.get_by_role('button', name='Got it. Let me try!').click()
            dialog.get_by_role('button', name='C 14', exact=True).click()
            dialog.get_by_role('button', name='Check my answer', exact=True).click()
            dialog.get_by_role('button', name='Finish preview', exact=True).click()
            expect(dialog).to_contain_text('did not change your learning progress')
            assert not json.loads(page.evaluate("localStorage.getItem('curio.student.v1')"))['completed']
            page.get_by_role('button', name='Close dialog').click()
            page.get_by_role('button', name='Save draft', exact=True).click()
            expect(page.get_by_role('status').filter(has_text='Draft saved.')).to_be_visible()
            private_id = author.request.get(url + 'api/creator/courses').json()['courses'][0]['id']
            assert not any(course['id'] == private_id for course in browser.new_context().request.get(url + 'api/courses').json()['courses'])
            passed('A real lesson preview awards no progress, and saved drafts stay out of the public catalog')

            page.get_by_role('textbox', name='Course title', exact=True).fill('Patterns with Morgan, revised')
            page.get_by_role('navigation', name='Main navigation').get_by_role('button', name='Explore courses').click()
            page.get_by_role('dialog', name='Leave without saving?', exact=True).get_by_role('button', name='Keep editing', exact=True).click()
            expect(page.locator('.course-editor')).to_be_visible()
            page.get_by_role('textbox', name='Course title', exact=True).fill('Patterns with Morgan')
            page.get_by_role('button', name='Publish for free', exact=True).click()
            expect(page.get_by_role('status').filter(has_text='Published.')).to_be_visible()
            page.reload(wait_until='networkidle')
            expect(page.locator('.creator-course-row')).to_contain_text('Published')
            passed('Unsaved edits warn before navigation; a course publishes free and survives a reload')

            student = browser.new_context(viewport={'width': 390, 'height': 950}, reduced_motion='reduce')
            learning = student.new_page()
            learning.on('pageerror', lambda error: errors.append(str(error)))
            learning.goto(url + '#explore', wait_until='networkidle')
            learning.get_by_role('textbox', name='Search courses').fill('Patterns with Morgan')
            expect(learning.locator('.course-card')).to_have_count(1)
            expect(learning.locator('.course-author')).to_contain_text('Morgan Teacher')
            learning.get_by_role('button', name='Explore course', exact=True).click()
            dialog = learning.get_by_role('dialog')
            dialog.get_by_role('button', name='Let’s start learning').click()
            dialog.get_by_role('button', name='Got it. Let me try!').click()
            dialog.get_by_role('button', name='C 14', exact=True).click()
            dialog.get_by_role('button', name='Check my answer', exact=True).click()
            dialog.get_by_role('button', name='Finish lesson', exact=True).click()
            expect(dialog).to_contain_text('Course complete')
            learning.get_by_role('button', name='Close dialog').click()
            passed('A different student browser finds the published course, sees attribution, and completes its quiz on mobile')

            learning.get_by_role('button', name='Sign in / Create account', exact=True).click()
            account = learning.get_by_role('dialog')
            account.get_by_role('textbox', name='Your name', exact=True).fill('Taylor Student')
            account.get_by_role('textbox', name='Email address', exact=True).fill('student@example.test')
            account.get_by_role('textbox', name='Password', exact=True).fill('A unique student password 42!')
            account.get_by_role('button', name='Create free account', exact=True).click()
            expect(learning.get_by_role('status').filter(has_text='Saved to your account')).to_be_visible()
            saved = student.request.get(url + 'api/session').json()['progress']
            assert saved['completed'][private_id] == [0]

            another_device = browser.new_context(viewport={'width': 768, 'height': 950})
            resumed = another_device.new_page()
            resumed.goto(url, wait_until='networkidle')
            resumed.get_by_role('button', name='Open website navigation', exact=True).click()
            resumed.get_by_role('navigation', name='Mobile website navigation').get_by_role('button', name='Sign in / Create account', exact=True).click()
            account = resumed.get_by_role('dialog')
            account.get_by_role('button', name='Already have an account? Sign in').click()
            account.get_by_role('textbox', name='Email address', exact=True).fill('student@example.test')
            account.get_by_role('textbox', name='Password', exact=True).fill('A wrong student password 99!')
            account.get_by_role('button', name='Sign in', exact=True).click()
            expect(account.get_by_role('alert')).to_contain_text('incorrect')
            account.get_by_role('textbox', name='Password', exact=True).fill('A unique student password 42!')
            account.get_by_role('button', name='Sign in', exact=True).click()
            expect(account).to_have_count(0)
            resumed.get_by_role('button', name='My learning', exact=True).click()
            resumed.get_by_role('button', name='Completed', exact=True).click()
            expect(resumed.locator('.course-progress')).to_contain_text('1/1 complete')
            resumed.get_by_role('button', name='Sign out', exact=True).click()
            expect(resumed.get_by_role('button', name='Sign in / Create account', exact=True)).to_be_visible()
            assert not json.loads(resumed.evaluate("localStorage.getItem('curio.student.v1')"))['completed']
            passed('Guest progress syncs to an account, resumes on another device, and clears locally at sign-out')

            for width in [320, 390, 768, 1366]:
                page.set_viewport_size({'width': width, 'height': 950})
                page.goto(url + '#creators', wait_until='networkidle')
                page.reload(wait_until='networkidle')
                if page.evaluate('document.documentElement.scrollWidth > innerWidth'):
                    page.screenshot(path=str(OUTPUT / 'creator-overflow.png'), full_page=True)
                    print(page.evaluate("[...document.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth && e.getBoundingClientRect().left >= 0).map(e => [e.tagName, e.className, Math.round(e.getBoundingClientRect().width)]).slice(0,25)"))
                assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'Creator list overflow at {width}'
                if width == 1366:
                    page.screenshot(path=str(OUTPUT / '09-creator-workspace.png'), full_page=True)
                page.get_by_role('button', name='Edit course', exact=True).click()
                if page.evaluate('document.documentElement.scrollWidth > innerWidth'):
                    page.screenshot(path=str(OUTPUT / 'editor-overflow.png'), full_page=True)
                    print(page.evaluate("[...document.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth && e.getBoundingClientRect().left >= 0).map(e => [e.tagName, e.className, Math.round(e.getBoundingClientRect().width)]).slice(0,25)"))
                assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'Editor overflow at {width}'
                if width == 390:
                    page.screenshot(path=str(OUTPUT / '10-creator-editor-mobile.png'), full_page=True)
            passed('The creator workspace and full lesson editor fit 320, 390, 768, and 1366px screens')

            page.get_by_role('button', name='Your courses', exact=True).click()
            page.get_by_role('button', name='Unpublish', exact=True).click()
            expect(page.locator('.creator-course-row')).to_contain_text('Private draft')
            assert not any(course['id'] == private_id for course in student.request.get(url + 'api/courses').json()['courses'])
            assert student.request.get(url + 'api/session').json()['progress']['completed'][private_id] == [0]
            passed('Unpublishing removes a course from discovery while retaining its data and student completion records')
            assert not errors, f'Browser errors: {errors}'
            passed('The entire creator-to-student journey completes without browser JavaScript errors')
            browser.close()
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()

print(f'\n{checks} marketplace checks passed. Temporary accounts and courses were removed with their database.')

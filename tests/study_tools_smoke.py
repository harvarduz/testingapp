"""Exercise saved courses, notes, shared links, filters, review, and mobile controls.
Run npm run build first. Uses an isolated server and temporary database.
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
from select_helpers import choose_option

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'test-results'
OUTPUT.mkdir(exist_ok=True)
checks = 0

def passed(description):
    global checks
    checks += 1
    print(f'PASS {checks}: {description}', flush=True)

def ready(page, condition):
    for _ in range(100):
        if page.evaluate("async () => { const {progress} = await (await fetch('/api/session')).json(); return Boolean(progress && (" + condition + ")); }"):
            return
        page.wait_for_timeout(100)
    raise AssertionError('Account progress did not reach the expected state: ' + condition)

with tempfile.TemporaryDirectory(prefix='curio-study-') as directory:
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
            context = browser.new_context(viewport={'width':1366, 'height':1000}, reduced_motion='reduce', permissions=['clipboard-read','clipboard-write'])
            page = context.new_page()
            errors=[]
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(url + '#explore', wait_until='networkidle')
            page.get_by_role('button', name='Save Thinking in numbers', exact=True).click()
            page.goto(url + '#learning', wait_until='networkidle')
            page.get_by_role('button', name='Saved', exact=True).click()
            expect(page.locator('.course-card')).to_have_count(1)
            assert page.evaluate("JSON.parse(localStorage.getItem('curio.student.v1')).enrolled.length") == 0
            page.reload(wait_until='networkidle')
            page.get_by_role('button', name='Saved', exact=True).click()
            expect(page.locator('.course-card')).to_have_count(1)
            passed('Saving a course persists for guests without enrolling or awarding lesson credit')

            page.get_by_role('button', name='Explore course', exact=True).click()
            dialog = page.get_by_role('dialog')
            dialog.get_by_role('button', name='Copy course link').click()
            expect(dialog.get_by_role('button', name='Link copied')).to_be_visible()
            link = page.evaluate('navigator.clipboard.readText()')
            assert link.endswith('#course=numbers')
            shared = browser.new_context(viewport={'width':390,'height':900})
            shared_page = shared.new_page()
            shared_page.goto(link, wait_until='networkidle')
            expect(shared_page.get_by_role('dialog').get_by_role('heading', name='Thinking in numbers', exact=True)).to_be_visible()
            shared_page.reload(wait_until='networkidle')
            expect(shared_page.get_by_role('dialog')).to_be_visible()
            shared_page.keyboard.press('Escape')
            expect(shared_page).to_have_url(url + '#explore')
            shared_page.goto(url + '#course=unpublished-example', wait_until='networkidle')
            expect(shared_page.get_by_role('status')).to_contain_text('This course is unavailable')
            shared.close()
            passed('Copied course links open directly in another mobile browser, survive reload, and handle missing courses')
            page.evaluate("Object.defineProperty(navigator, 'clipboard', {value: {writeText: async () => {throw new Error('Clipboard unavailable');}}})")
            dialog.get_by_role('button', name='Link copied').click()
            expect(dialog.get_by_role('textbox', name='Course sharing link')).to_have_value(link)
            passed('When clipboard access is blocked, a selectable sharing link remains available')

            dialog.get_by_role('button', name='Let’s start learning').click()
            dialog.locator('.lesson-notes summary').click()
            note = 'The difference stays the same: add three. <script>no execution</script>'
            dialog.get_by_role('textbox', name='What do you want to remember?').fill(note)
            page.reload(wait_until='networkidle')
            page.get_by_role('button', name='Continue learning', exact=True).click()
            dialog=page.get_by_role('dialog')
            dialog.get_by_role('button', name='Continue learning', exact=True).click()
            dialog.locator('.lesson-notes summary').click()
            expect(dialog.get_by_role('textbox', name='What do you want to remember?')).to_have_value(note)
            dialog.get_by_role('button', name='Got it. Let me try!').click()
            expect(dialog.locator('.lesson-notes')).to_contain_text('Note saved')
            dialog.locator('.quiz-option').filter(has_text='14').click()
            dialog.get_by_role('button', name='Check my answer').click()
            dialog.get_by_role('button', name='Finish lesson', exact=True).click()
            dialog.get_by_role('button', name='Close dialog').click()
            passed('Private lesson notes survive reload and the quiz step, with plain-text rendering')

            page.goto(url + '#practice', wait_until='networkidle')
            page.locator('.review-list button').first.click()
            dialog=page.get_by_role('dialog')
            expect(dialog.get_by_role('heading', name='Find the pattern', exact=True)).to_be_visible()
            dialog.get_by_role('button', name='Got it. Let me try!').click()
            dialog.locator('.quiz-option').filter(has_text='14').click()
            dialog.get_by_role('button', name='Check my answer').click()
            dialog.get_by_role('button', name='Finish lesson', exact=True).click()
            assert page.evaluate("JSON.parse(localStorage.getItem('curio.student.v1')).completed.numbers.length") == 1
            assert sum(page.evaluate("JSON.parse(localStorage.getItem('curio.student.v1')).activity").values()) == 1
            dialog.get_by_role('button', name='Close dialog').click()
            passed('Completed-lesson review opens the right lesson without increasing completion or activity totals')

            open_account(page)
            dialog=page.get_by_role('dialog')
            dialog.get_by_label('Your name', exact=True).fill('Study Tester')
            dialog.get_by_label('Email address', exact=True).fill('study@example.test')
            dialog.get_by_label('Password', exact=True).fill('A unique study password 42!')
            dialog.get_by_role('button', name='Show password').click()
            expect(dialog.get_by_label('Password', exact=True)).to_have_attribute('type','text')
            dialog.get_by_role('button', name='Hide password').click()
            expect(dialog.get_by_label('Password', exact=True)).to_have_attribute('type','password')
            dialog.get_by_role('button', name='Create free account', exact=True).click()
            expect(page.get_by_role('dialog')).to_have_count(0)
            ready(page, "progress.notes['numbers:0']?.text.includes('add three') && progress.savedCourses.numbers?.saved")
            stale=context.request.get(url+'api/session').json()['progress']
            passed('Account registration offers a password visibility control and syncs guest notes and saved courses')

            other=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
            phone=other.new_page()
            phone.goto(url+'#learning',wait_until='networkidle')
            open_account(phone)
            dialog=phone.get_by_role('dialog')
            dialog.get_by_role('button',name='Already have an account? Sign in').click()
            dialog.get_by_label('Email address',exact=True).fill('study@example.test')
            dialog.get_by_label('Password',exact=True).fill('A unique study password 42!')
            dialog.get_by_role('button',name='Sign in',exact=True).click()
            phone.get_by_role('button',name='Saved',exact=True).click()
            expect(phone.locator('.course-card')).to_have_count(1)
            phone.get_by_role('button',name='Continue learning',exact=True).click()
            dialog=phone.get_by_role('dialog')
            dialog.locator('.lesson-list button').first.click()
            dialog.locator('.lesson-notes summary').click()
            expect(dialog.get_by_role('textbox',name='What do you want to remember?')).to_have_value(note)
            dialog.get_by_role('textbox',name='What do you want to remember?').fill('')
            ready(phone, "progress.notes['numbers:0']?.text === ''")
            dialog.get_by_role('button',name='Close dialog').click()
            phone.get_by_role('button',name='Unsave Thinking in numbers',exact=True).click()
            ready(phone, "progress.savedCourses.numbers?.saved === false")
            assert context.request.put(url+'api/progress',data=stale).status == 200
            restored=context.request.get(url+'api/session').json()['progress']
            assert restored['notes']['numbers:0']['text'] == ''
            assert restored['savedCourses']['numbers']['saved'] is False
            passed('Notes and saved courses sync to another device; deletion survives a stale-device update')

            template=context.request.get(url+'api/courses').json()['courses'][0]
            template.update(title='Advanced study lab',level='Advanced',minutes=45)
            created=context.request.post(url+'api/creator/courses',data=template)
            assert created.status == 201
            course_id=created.json()['course']['id']
            assert context.request.post(url+'api/creator/courses/'+course_id+'/publish',data={},headers={'If-Match': '"rev-%s"' % created.json()['course']['revision']}).status == 200
            page.goto(url+'#explore',wait_until='networkidle');page.reload(wait_until='networkidle')
            choose_option(page.get_by_role('combobox',name='Filter by level'), 'Advanced')
            expect(page.locator('.course-card')).to_have_count(1)
            expect(page.locator('.course-card')).to_contain_text('Advanced study lab')
            choose_option(page.get_by_role('combobox',name='Filter by duration'), 'Under 20 minutes')
            expect(page.locator('.course-card')).to_have_count(0)
            choose_option(page.get_by_role('combobox',name='Filter by duration'), 'Over 40 minutes')
            expect(page.locator('.course-card')).to_have_count(1)
            page.get_by_role('button',name='Clear filters',exact=True).click()
            expect(page.locator('.course-card')).to_have_count(21)
            page.get_by_role('textbox',name='Search courses').fill('Study Tester')
            expect(page.locator('.course-card')).to_have_count(1)
            passed('Level, duration, author search, and filter reset work against an actual published community course')

            phone.goto(url+'#course='+course_id,wait_until='networkidle')
            expect(phone.get_by_role('dialog').get_by_role('heading',name='Advanced study lab',exact=True)).to_be_visible()
            phone.get_by_role('button',name='Close dialog').click()
            passed('A shared community-course link waits for the server catalog and opens the published course')

            for width in [320,390,768,1366]:
                phone.set_viewport_size({'width':width,'height':950})
                for route in ['#overview','#explore','#learning','#practice']:
                    phone.goto(url+route,wait_until='networkidle')
                    assert phone.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width,route)
                phone.goto(url+'#course=numbers',wait_until='networkidle')
                dialog=phone.get_by_role('dialog')
                dialog.locator('.lesson-list button').first.click()
                dialog.locator('.lesson-notes summary').click()
                assert dialog.evaluate('(node) => node.scrollWidth <= node.clientWidth'), width
                phone.get_by_role('button',name='Close dialog').click()
            passed('Course browsing, overview, saved learning, practice, and lesson notes fit 320/390/768/1366 px layouts')

            phone.set_viewport_size({'width':390,'height':900})
            phone.goto(url+'#overview',wait_until='networkidle')
            phone.get_by_role('button',name='Open navigation',exact=True).click()
            menu=phone.get_by_role('dialog',name='Learning navigation')
            expect(menu).to_be_visible()
            for _ in range(15):
                phone.keyboard.press('Tab')
                assert menu.evaluate('(node) => node.contains(document.activeElement)')
            phone.keyboard.press('Escape')
            expect(phone.get_by_role('button',name='Open navigation',exact=True)).to_be_focused()
            phone.get_by_role('navigation',name='Mobile learning navigation').get_by_role('button',name='Browse courses').click()
            expect(phone).to_have_url(url+'#explore')
            page.goto(url,wait_until='networkidle');page.screenshot(path=str(OUTPUT/'24-final-home.png'),full_page=True)
            page.goto(url+'#overview',wait_until='networkidle');page.screenshot(path=str(OUTPUT/'25-final-workspace.png'),full_page=True)
            phone.screenshot(path=str(OUTPUT/'26-final-mobile.png'))
            assert not errors,errors
            passed('Mobile navigation traps focus, closes with Escape, restores focus, and provides working bottom navigation')
            browser.close()
    finally:
        process.terminate()
        try: process.wait(timeout=10)
        except subprocess.TimeoutExpired: process.kill();process.wait()
print(f'\n{checks} study tools checks passed. Temporary server and database removed.')

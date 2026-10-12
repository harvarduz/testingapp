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

with tempfile.TemporaryDirectory(prefix='curio-learning-') as directory:
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
            page.goto(url+'#overview',wait_until='networkidle')
            page.set_viewport_size({'width':1366,'height':600})
            sidebar=page.locator('.sidebar')
            assert sidebar.evaluate('(node)=>getComputedStyle(node).overflowY') == 'auto'
            sidebar.hover();page.mouse.wheel(0,800)
            page.wait_for_timeout(200)
            assert sidebar.evaluate('(node)=>node.scrollTop') > 0
            page.get_by_role('button',name='Collapse navigation',exact=True).click()
            expect(page.get_by_role('button',name='Expand navigation',exact=True)).to_be_visible()
            assert sidebar.bounding_box()['width'] == 84
            page.reload(wait_until='networkidle')
            assert sidebar.bounding_box()['width'] == 84
            page.get_by_role('button',name='Study paths',exact=True).click()
            expect(page.get_by_role('heading',name='Choose a direction')).to_be_visible()
            passed('The sidebar scrolls at short desktop heights, collapses to a working icon rail, and remembers the preference')

            page.get_by_role('button',name='Choose Mathematics foundations',exact=True).click()
            expect(page.locator('.active-path')).to_contain_text('0/13 lessons complete')
            assert page.evaluate("JSON.parse(localStorage.getItem('curio.student.v1')).enrolled.length") == 0
            page.get_by_role('button',name='Continue your path').click()
            dialog=page.get_by_role('dialog')
            expect(dialog.get_by_role('heading',name='Find the pattern',exact=True)).to_be_visible()
            expect(dialog.get_by_role('heading',name='Work through an example')).to_be_visible()
            expect(dialog.locator('.worked-lesson ol li')).to_have_count(3)
            expect(dialog.locator('.common-mistake')).to_contain_text('other sequences')
            passed('A study path opens an actual lesson with goals, worked calculations, and an explained common mistake')

            dialog.get_by_role('button',name='Got it. Let me try!').click()
            dialog.locator('.quiz-option').nth(2).click()
            dialog.get_by_role('button',name='Check my answer',exact=True).click()
            dialog.get_by_role('button',name='Finish lesson',exact=True).click()
            expect(page.locator('.reward-toast')).to_contain_text('+25 Curio coins')
            page.get_by_role('button',name='Close dialog').click()
            expect(page.get_by_role('button',name='25 Curio coins',exact=True)).to_be_visible()
            page.reload(wait_until='networkidle')
            expect(page.locator('.active-path')).to_contain_text('1/13 lessons complete')
            page.get_by_role('button',name='Continue your path').click()
            expect(page.get_by_role('dialog').get_by_role('heading',name='Parts of a whole',exact=True)).to_be_visible()
            page.get_by_role('button',name='Close dialog').click()
            passed('Completing a lesson earns 25 coins, advances the real path, and resumes at the next unfinished lesson')

            page.goto(url+'#practice',wait_until='networkidle')
            page.get_by_role('button',name='Start targeted practice').click()
            dialog=page.get_by_role('dialog',name='Targeted practice')
            first_question=dialog.locator('h2').inner_text()
            dialog.locator('.practice-options button').first.click()
            dialog.get_by_role('button',name='Check answer',exact=True).click()
            expect(dialog.locator('.practice-feedback')).to_contain_text('A useful mistake')
            assert dialog.locator('.practice-options .correct').count() == 1
            dialog.get_by_role('button',name='Next question').click()
            catalog=context.request.get(url+'api/courses').json()['courses']
            extras=[item for course in catalog for lesson in course['lessons'] for item in lesson.get('practice',[])]
            while dialog.get_by_role('button',name='Check answer',exact=True).count():
                prompt=dialog.locator('h2').inner_text()
                question=next(item for item in extras if item['question']==prompt)
                dialog.locator('.practice-options button').nth(question['answer']).click()
                dialog.get_by_role('button',name='Check answer',exact=True).click()
                dialog.get_by_role('button',name='See my results' if dialog.get_by_role('button',name='See my results').count() else 'Next question',exact=True).click()
            expect(dialog.locator('.session-result')).to_contain_text('2 of 3')
            expect(dialog.locator('.session-coins')).to_contain_text('+20 Curio coins')
            expect(dialog.locator('.practice-next')).to_contain_text('Find the pattern')
            page.screenshot(path=str(OUTPUT/'34-practice-result.png'))
            dialog.get_by_role('button',name='Practice again').click()
            expect(dialog.locator('h2')).to_have_text(first_question)
            passed('New transfer questions explain mistakes, reward the first successful session, and prioritise the missed question on retry')

            while dialog.get_by_role('button',name='Check answer',exact=True).count():
                prompt=dialog.locator('h2').inner_text()
                question=next(item for item in extras if item['question']==prompt)
                dialog.locator('.practice-options button').nth(question['answer']).click()
                dialog.get_by_role('button',name='Check answer',exact=True).click()
                dialog.get_by_role('button',name='See my results' if dialog.get_by_role('button',name='See my results').count() else 'Next question',exact=True).click()
            expect(dialog.locator('.session-result')).to_contain_text('3 of 3')
            expect(dialog.locator('.session-coins')).to_have_count(0)
            page.get_by_role('button',name='Close dialog').click()
            expect(page.get_by_role('button',name='45 Curio coins',exact=True)).to_be_visible()
            value=page.evaluate("JSON.parse(localStorage.getItem('curio.student.v1'))")
            assert len(value['practiceAttempts']) == 6
            assert value['completed']['numbers'] == [0]
            passed('Repeated practice saves new answers without multiplying daily coins or course completions')

            page.get_by_role('button',name='Sign in / Create account',exact=True).click()
            dialog=page.get_by_role('dialog')
            dialog.get_by_role('textbox',name='Your name',exact=True).fill('Learning Tester')
            dialog.get_by_role('textbox',name='Email address',exact=True).fill('learning@example.test')
            dialog.get_by_role('textbox',name='Password',exact=True).fill('A strong learning password 42!')
            dialog.get_by_role('button',name='Create free account').click()
            ready(page,"Object.keys(progress.practiceAttempts || {}).length === 6 && progress.activePath?.id === 'math-foundations'")
            second=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
            phone=second.new_page();phone.on('pageerror',lambda error: errors.append(str(error)))
            phone.goto(url+'#paths',wait_until='networkidle')
            registration=second.request.post(url+'api/auth/login',data={'email':'learning@example.test','password':'A strong learning password 42!'})
            assert registration.status == 200
            phone.reload(wait_until='networkidle')
            expect(phone.locator('.active-path')).to_contain_text('1/13 lessons complete')
            expect(phone.get_by_role('button',name='45 Curio coins')).to_be_visible()
            phone.goto(url+'#practice',wait_until='networkidle')
            expect(phone.locator('.practice-metrics')).to_contain_text('6')
            stale=registration.json()['progress']
            assert context.request.put(url+'api/progress',data=stale).status == 200
            assert len(context.request.get(url+'api/session').json()['progress']['practiceAttempts']) == 6
            passed('Paths, practice answers, and derived coin balances sync to a separate signed-in mobile browser without duplication')

            phone.goto(url+'#creators',wait_until='networkidle')
            phone.get_by_role('button',name='Create a course',exact=True).click()
            expect(phone.get_by_role('heading',name='Create a course.',exact=True)).to_be_visible()
            phone.locator('.lesson-extension-editor summary').click()
            phone.get_by_role('button',name='Add learning goal').click()
            phone.get_by_role('textbox',name='Lesson 1 learning goal 1').fill('Use a constant difference to predict a new term.')
            phone.get_by_role('button',name='Add worked step').click()
            phone.get_by_role('textbox',name='Lesson 1 worked step 1').fill('Compare each pair of neighbours, then apply the same difference.')
            phone.get_by_role('button',name='Add practice question').click()
            phone.get_by_role('textbox',name='Lesson 1 practice 1 question').fill('What follows 4, 8, 12 when the same difference continues?')
            for number,answer in enumerate(['14','16','18','20'],1): phone.get_by_role('textbox',name=f'Lesson 1 practice 1 option {number}').fill(answer)
            phone.get_by_role('combobox',name='Lesson 1 practice 1 correct answer').select_option('1')
            phone.get_by_role('textbox',name='Lesson 1 practice 1 explanation').fill('The constant difference is four, so twelve plus four gives sixteen.')
            lesson=catalog[0]['lessons'][0]
            phone.get_by_role('textbox',name='Course title',exact=True).fill('Applied number practice')
            phone.get_by_role('textbox',name='Short description',exact=True).fill('Use worked steps to understand and practise constant differences.')
            for field in ['title','idea','example','question']:
                phone.get_by_role('textbox',name=f'Lesson 1 {field}',exact=True).fill(lesson[field])
            for number,answer in enumerate(lesson['options'],1): phone.get_by_role('textbox',name=f'Lesson 1 option {number}',exact=True).fill(answer)
            phone.get_by_role('combobox',name='Lesson 1 correct answer',exact=True).select_option(str(lesson['answer']))
            phone.get_by_role('textbox',name='Lesson 1 answer explanation',exact=True).fill(lesson['explanation'])
            phone.get_by_role('button',name='Publish for free',exact=True).click()
            expect(phone.locator('.status-pill').first).to_contain_text('Published')
            published=second.request.get(url+'api/creator/courses').json()['courses'][0]
            course_id=published['id']
            assert published['lessons'][0]['practice'][0]['answer'] == 1
            assert published['lessons'][0]['objectives'][0].startswith('Use a constant difference')
            # A separate guest reads the lesson authored through the real editor.
            guest=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
            guest_page=guest.new_page();guest_page.goto(url+'#course='+course_id,wait_until='networkidle')
            guest_page.get_by_role('dialog').locator('.lesson-list button').first.click()
            expect(guest_page.get_by_role('heading',name='Work through an example')).to_be_visible()
            guest_page.get_by_role('button',name='Try extra practice').click()
            expect(guest_page.get_by_role('dialog',name='Targeted practice').locator('.practice-options button')).to_have_count(4)
            passed('Creators can author lesson goals, worked steps and practice; uploaded published additions are usable by another student')

            for width,height in [(320,568),(390,844),(768,600),(1366,600)]:
                page.set_viewport_size({'width':width,'height':height})
                for route in ['#overview','#paths','#practice','#explore']:
                    page.goto(url+route,wait_until='networkidle')
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(width,route)
                page.goto(url+'#practice',wait_until='networkidle')
                page.get_by_role('button',name='Start targeted practice').click()
                assert page.get_by_role('dialog').evaluate('(node)=>node.scrollWidth <= node.clientWidth'),width
                page.get_by_role('button',name='Close dialog').click()
            page.set_viewport_size({'width':390,'height':844})
            page.get_by_role('button',name='Open navigation',exact=True).click()
            menu=page.get_by_role('dialog',name='Learning navigation')
            for _ in range(18):
                page.keyboard.press('Tab')
                assert menu.evaluate('(node)=>node.contains(document.activeElement)')
            menu.get_by_role('button',name='Study paths',exact=True).click()
            expect(page.get_by_role('button',name='Open navigation',exact=True)).to_be_focused()
            assert page.evaluate('document.body.style.overflow') != 'hidden'
            expect(page.locator('.active-path')).to_be_visible()
            passed('Paths, practice, and coins fit small screens; a collapsed desktop preference keeps the full mobile drawer usable')

            page.set_viewport_size({'width':1366,'height':1000})
            page.goto(url,wait_until='networkidle');page.screenshot(path=str(OUTPUT/'35-learning-home.png'))
            page.goto(url+'#overview',wait_until='networkidle');page.screenshot(path=str(OUTPUT/'36-learning-dashboard.png'))
            page.set_viewport_size({'width':390,'height':900})
            page.goto(url+'#paths',wait_until='networkidle');page.screenshot(path=str(OUTPUT/'37-learning-path-mobile.png'))
            assert not errors,errors
            browser.close()
    finally:
        process.terminate()
        try: process.wait(timeout=10)
        except subprocess.TimeoutExpired: process.kill();process.wait()
print(f'\n{checks} learning experience checks passed. Temporary server and database removed.')

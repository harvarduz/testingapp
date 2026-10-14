"""Regression coverage for learning focus, lab validation and honest save feedback.
Run npm run build first. All account writes use an isolated temporary server.
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
checks = 0

def passed(message):
    global checks
    checks += 1
    print(f'PASS {checks}: {message}', flush=True)

def focus_in_view(locator):
    expect(locator).to_be_focused()
    assert locator.evaluate('node => { const r = node.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }')

with tempfile.TemporaryDirectory(prefix='curio-learning-ux-') as directory:
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
            errors = []
            for width in [320, 390, 1366]:
                context = browser.new_context(viewport={'width': width, 'height': 600}, reduced_motion='reduce', permissions=['clipboard-read', 'clipboard-write'])
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(url + '#course=numbers', wait_until='networkidle')
                dialog = page.get_by_role('dialog')
                dialog.get_by_role('button', name='Copy course link').click()
                expect(dialog.locator('.course-share [role=status]')).to_have_text('Link copied')
                page.evaluate("Object.defineProperty(navigator, 'clipboard', {value: {writeText: async () => {throw new Error('Clipboard unavailable');}}})")
                dialog.get_by_role('button', name='Link copied').click()
                expect(dialog.locator('.course-share [role=status]')).to_contain_text('Select the link below')
                expect(dialog.get_by_role('textbox', name='Course sharing link')).to_be_visible()
                dialog.locator('.lesson-list button').first.click()
                worked = dialog.locator('.worked-lesson ol')
                expect(worked).to_have_attribute('aria-live', 'polite')
                previous = worked.inner_text()
                dialog.get_by_role('button', name='Next step', exact=True).click()
                assert worked.inner_text() != previous
                exercises = dialog.locator('.lesson-exercises')
                exercises.locator('.practice-options button').first.click()
                exercises.get_by_role('button', name='Check practice answer').click()
                exercises.get_by_role('button', name='Try this answer again').click()
                focus_in_view(exercises.locator('.lesson-exercise-prompt'))
                page.keyboard.press('Tab')
                expect(exercises.locator('.practice-options button').first).to_be_focused()
                page.keyboard.press('Space')
                exercises.get_by_role('button', name='Check practice answer').click()
                exercises.get_by_role('button', name='Next exercise').click()
                focus_in_view(exercises.locator('.lesson-exercise-prompt'))
                while exercises.get_by_role('button', name='Check practice answer').count():
                    exercises.locator('.practice-options button').first.click()
                    exercises.get_by_role('button', name='Check practice answer').click()
                    exercises.get_by_role('button', name='Next exercise' if exercises.get_by_role('button', name='Next exercise').count() else 'Finish these exercises').click()
                focus_in_view(exercises.locator('p[tabindex="-1"]'))
                exercises.get_by_role('button', name='Review these exercises').click()
                focus_in_view(exercises.locator('.lesson-exercise-prompt'))
                dialog.get_by_role('button', name='Try extra practice').click()
                session = page.locator('.practice-session')
                while session.get_by_role('button', name='Check answer', exact=True).count():
                    session.locator('.practice-options button').first.click()
                    session.get_by_role('button', name='Check answer', exact=True).click()
                    session.get_by_role('button', name='Next question' if session.get_by_role('button', name='Next question').count() else 'See my results').click()
                    focus_in_view(session.locator('h2'))
                session.get_by_role('button', name='Practice again').click()
                focus_in_view(session.locator('h2'))
                page.keyboard.press('Tab')
                expect(session.locator('.practice-options button').first).to_be_focused()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                context.close()
                passed(f'At {width}px, exercise retries/next/results restore visible prompt focus and keyboard answer order; copy status and worked explanations are announced')

            context = browser.new_context(viewport={'width': 390, 'height': 700}, reduced_motion='reduce')
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(url + '#lab', wait_until='networkidle')
            parts = page.get_by_role('slider', name='Equal pieces')
            parts.focus()
            page.keyboard.press('Home')
            page.keyboard.press('ArrowRight')
            page.get_by_role('button', name='Piece 1', exact=True).click()
            equation = page.locator('.fraction-equation')
            expect(equation).to_contain_text('≈33%')
            expect(equation).to_have_attribute('aria-label', '1 out of 3 equals 1 over 3, approximately 33 percent')
            page.get_by_role('button', name='Algorithm tracer', exact=True).click()
            numbers = page.get_by_role('textbox', name='Algorithm number list')
            prediction = page.get_by_role('spinbutton', name='Your predicted result')
            numbers.fill('wrong')
            page.get_by_role('button', name='Lock prediction & start').click()
            expect(numbers).to_be_focused()
            expect(numbers).to_have_attribute('aria-invalid', 'true')
            assert 'algorithm-error' in numbers.get_attribute('aria-describedby')
            numbers.fill('2, 4, 6')
            expect(numbers).to_have_attribute('aria-invalid', 'false')
            page.get_by_role('button', name='Lock prediction & start').click()
            expect(prediction).to_be_focused()
            expect(prediction).to_have_attribute('aria-invalid', 'true')
            prediction.fill('12')
            expect(page.get_by_role('alert')).to_have_count(0)
            page.get_by_role('button', name='Lock prediction & start').click()
            focus_in_view(page.locator('.trace-current'))
            page.keyboard.press('Tab')
            expect(page.get_by_role('button', name='Run next step')).to_be_focused()
            page.get_by_role('button', name='Edit the inputs').click()
            focus_in_view(numbers)
            passed('Lab input errors identify and focus the field; starting/editing the trace preserves keyboard flow; rounded fractions use approximately')

            registration = context.request.post(url + 'api/auth/register', data={'name': 'UX Learner', 'email': 'ux@example.test', 'password': 'Useful test password 42!'})
            assert registration.status == 201, registration.text()
            page.goto(url + '#course=numbers', wait_until='networkidle')
            page.reload(wait_until='networkidle')
            page.locator('.lesson-list button').first.click()
            notes = page.locator('.lesson-notes')
            notes.locator('summary').click()
            pending = []
            page.route('**/api/progress', lambda route: pending.append(route))
            notes.get_by_role('textbox').fill('A constant difference predicts the next term.')
            expect(notes.locator('summary small')).to_have_text('Saving…')
            for _ in range(50):
                if pending: break
                page.wait_for_timeout(50)
            assert pending
            pending.pop().fulfill(status=503, content_type='application/json', body=json.dumps({'error': 'Sync unavailable. Please try again.'}))
            expect(notes.locator('summary small')).to_have_text('Sync needs attention')
            expect(notes.locator('.notes-caption')).to_contain_text('Sync unavailable')
            page.unroute('**/api/progress')
            notes.get_by_role('textbox').fill('A constant difference predicts the next term. Compare neighbours first.')
            expect(notes.locator('summary small')).to_have_text('Note saved')
            passed('Notes show pending and failed account saves honestly, preserve the text, and recover after a successful retry')
            assert not errors, errors
            browser.close()
    finally:
        process.terminate()
        try: process.wait(timeout=10)
        except subprocess.TimeoutExpired: process.kill(); process.wait()
print(f'\n{checks} learning UX checks passed.')

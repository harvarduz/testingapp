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

with tempfile.TemporaryDirectory(prefix='curio-labs-') as directory:
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
            page.goto(url+'#lab',wait_until='networkidle')
            expect(page.get_by_role('heading',name='Different pieces. The same amount.')).to_be_visible()
            page.get_by_role('button',name='Check my model').click()
            expect(page.locator('.lab-feedback').first).to_contain_text('Try a different model')
            for index in range(1,7): page.get_by_role('button',name=f'Piece {index}',exact=True).click()
            expect(page.locator('.fraction-equation')).to_contain_text('75%')
            page.get_by_role('button',name='Check my model').click()
            expect(page.locator('.lab-feedback').first).to_contain_text('6/8 simplifies to 3/4')
            expect(page.get_by_role('button',name='30 Curio coins',exact=True)).to_be_visible()
            page.get_by_role('button',name='Check my model').click()
            expect(page.get_by_role('button',name='30 Curio coins',exact=True)).to_be_visible()
            passed('A fraction model gives an explanation and earns 30 coins only once')

            page.get_by_role('button',name='Budget challenge',exact=True).click()
            page.get_by_role('button',name='Check my budget').click()
            expect(page.locator('.lab-feedback.hint').filter(has_text='Reduce spending')).to_be_visible()
            page.get_by_role('slider',name='Leisure').focus()
            page.keyboard.press('Home')
            for _ in range(3): page.keyboard.press('ArrowRight')
            page.get_by_role('button',name='Check my budget').click()
            expect(page.get_by_role('button',name='60 Curio coins',exact=True)).to_be_visible()
            expect(page.locator('.lab-feedback.success').filter(has_text='You protected the essentials')).to_be_visible()
            page.get_by_role('slider',name='Food').focus();page.keyboard.press('Home')
            page.get_by_role('button',name='Check my budget').click()
            expect(page.locator('.lab-feedback.hint').filter(has_text='Keep at least $60 for food')).to_be_visible()
            passed('A budget can have several valid solutions; savings alone cannot bypass essential needs')

            page.get_by_role('button',name='Algorithm tracer',exact=True).click()
            page.get_by_role('button',name='Lock prediction & start').click()
            expect(page.get_by_role('alert')).to_contain_text('Enter a prediction')
            page.get_by_role('spinbutton',name='Your predicted result').fill('9')
            page.get_by_role('button',name='Lock prediction & start').click()
            for _ in range(3): page.get_by_role('button',name='Run next step').click()
            page.get_by_role('button',name='Compare my prediction').click()
            expect(page.locator('.lab-feedback.hint').filter(has_text='You predicted 9. The final total is 12.')).to_be_visible()
            expect(page.get_by_role('button',name='60 Curio coins')).to_be_visible()
            page.get_by_role('button',name='Edit the inputs').click()
            page.get_by_role('spinbutton',name='Your predicted result').fill('12')
            page.get_by_role('button',name='Lock prediction & start').click()
            for _ in range(3): page.get_by_role('button',name='Run next step').click()
            expect(page.locator('.trace-table tbody tr')).to_have_count(3)
            page.get_by_role('button',name='Compare my prediction').click()
            expect(page.get_by_role('button',name='90 Curio coins')).to_be_visible()
            page.get_by_role('button',name='Compare my prediction').click()
            expect(page.get_by_role('button',name='90 Curio coins')).to_be_visible()
            passed('A locked prediction must match the completed trace; mistakes do not earn coins, repeats do not multiply them')

            page.get_by_role('button',name='Edit the inputs').click()
            page.get_by_role('textbox',name='Algorithm number list').fill('7, 2, 9, 4')
            page.get_by_role('combobox',name='Algorithm',exact=True).select_option('max')
            page.get_by_role('spinbutton',name='Your predicted result').fill('9')
            page.get_by_role('button',name='Lock prediction & start').click()
            for _ in range(4): page.get_by_role('button',name='Run next step').click()
            page.get_by_role('button',name='Compare my prediction').click()
            expect(page.locator('.lab-feedback.success').filter(has_text='largest value')).to_be_visible()
            page.get_by_role('button',name='Learn the idea behind this lab').click()
            expect(page.get_by_role('dialog').get_by_role('heading',name='A little repetition',exact=True)).to_be_visible()
            page.get_by_role('button',name='Close dialog').click()
            passed('The maximum algorithm preserves its candidate, and a lab connects directly to its real lesson')

            page.get_by_role('button',name='Sign in / Create account').click()
            dialog=page.get_by_role('dialog')
            dialog.get_by_role('textbox',name='Your name',exact=True).fill('Lab Learner')
            dialog.get_by_role('textbox',name='Email address',exact=True).fill('labs@example.test')
            dialog.get_by_role('textbox',name='Password',exact=True).fill('A strong lab password 42!')
            dialog.get_by_role('button',name='Create free account').click()
            ready(page, "Object.keys(progress.completedLabs || {}).length === 3")
            phone_context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
            phone=phone_context.new_page()
            assert phone_context.request.post(url+'api/auth/login',data={'email':'labs@example.test','password':'A strong lab password 42!'}).status == 200
            phone.goto(url+'#lab',wait_until='networkidle')
            expect(phone.get_by_role('button',name='90 Curio coins')).to_be_visible()
            expect(phone.locator('.lab-footer')).to_contain_text('Lab completed')
            assert len(phone_context.request.get(url+'api/session').json()['progress']['completedLabs']) == 3
            passed('Lab completions and coin balances persist across separate signed-in devices')

            for width in [320,390,768,1366]:
                page.set_viewport_size({'width':width,'height':850})
                for label in ['Fraction studio','Budget challenge','Algorithm tracer']:
                    page.get_by_role('button',name=label,exact=True).click()
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(width,label)
            page.set_viewport_size({'width':390,'height':900})
            page.get_by_role('button',name='Budget challenge',exact=True).click()
            page.screenshot(path=str(OUTPUT/'43-learning-lab-mobile.png'))
            page.set_viewport_size({'width':1366,'height':1000})
            page.get_by_role('button',name='Fraction studio',exact=True).click()
            page.screenshot(path=str(OUTPUT/'44-fraction-studio.png'))
            passed('Three interactive labs fit 320/390/768/1366 px widths')
            assert not errors,errors
            browser.close()
    finally:
        process.terminate()
        try: process.wait(timeout=10)
        except subprocess.TimeoutExpired: process.kill();process.wait()
print(f'\n{checks} Learning Lab checks passed. Temporary server and database removed.')

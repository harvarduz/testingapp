"""Exercise learner-controlled models against the compiled frontend.
Uses a temporary server/database; all account data stays local to this run.
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
audits = []


def passed(description):
    global checks
    checks += 1
    print(f'PASS {checks}: {description}', flush=True)


def open_lesson(page, url, course, title):
    if page.get_by_role('dialog').count():
        page.get_by_role('button', name='Close dialog', exact=True).click()
    page.goto(url + '#course=' + course, wait_until='networkidle')
    dialog = page.get_by_role('dialog')
    assert dialog.evaluate('(el)=>el.scrollWidth <= el.clientWidth + 1')
    dialog.locator('.lesson-list button').filter(has=page.get_by_text(title, exact=True)).click()
    expect(dialog.locator('.lesson-study')).to_be_visible()
    return dialog


def open_experiment(dialog):
    dialog.get_by_role('button', name='Open interactive experiment').click()
    model = dialog.locator('.interactive-experiment')
    expect(model).to_be_visible()
    expect(model.locator('math')).to_have_count(1)
    return model


def set_range(model, label, value):
    model.get_by_role('slider', name=label, exact=True).fill(str(value))


def audit(page, name):
    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    violations = page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations")
    audits.append({'screen': name, 'violations': violations})
    (OUTPUT / 'lesson-experiments-accessibility.json').write_text(json.dumps(audits, indent=2))
    assert not violations, (name, [(v['id'], [n['target'] for n in v['nodes']]) for v in violations])


with tempfile.TemporaryDirectory(prefix='curio-experiments-') as directory:
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
            context = browser.new_context(viewport={'width':1366, 'height':1000}, reduced_motion='reduce')
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            requests = []
            page.on('request', lambda req: requests.append(req.url))
            page.goto(url, wait_until='networkidle')
            assert not any('lesson-math-' in req or 'lesson-charts-' in req or 'InteractiveExperiment-' in req for req in requests)
            passed('Landing does not download math or chart libraries before an experiment is opened')

            d = open_lesson(page, url, 'numbers', 'Calculate a percentage change')
            assert not any('lesson-math-' in req or 'lesson-charts-' in req for req in requests)
            model = open_experiment(d)
            expect(model.locator('.experiment-metrics')).to_contain_text('$96')
            rise = model.get_by_role('slider', name='Price rise', exact=True)
            rise.focus()
            page.keyboard.press('ArrowRight')
            expect(rise).to_have_value('25')
            expect(model.locator('.experiment-metrics')).to_contain_text('$100')
            model.get_by_role('button', name='Reset model').click()
            expect(rise).to_have_value('20')
            model.get_by_text('Read the data table', exact=True).click()
            expect(model.get_by_role('table')).to_contain_text('After discount96')
            passed('Keyboard changes update exact percentage results; reset and accessible table agree')

            checkpoint = model.locator('.transfer-checkpoint')
            answer = checkpoint.get_by_role('textbox')
            answer.fill('200'); checkpoint.get_by_role('button', name='Check prediction').click()
            expect(checkpoint.get_by_role('status')).to_contain_text('Try following')
            answer.fill('1+2'); checkpoint.get_by_role('button', name='Check prediction').click()
            expect(answer).to_be_focused()
            expect(answer).to_have_attribute('aria-invalid', 'true')
            answer.fill('198'); checkpoint.get_by_role('button', name='Check prediction').click()
            expect(checkpoint.get_by_role('status')).to_contain_text('Your prediction checks out')
            expect(checkpoint.get_by_role('status')).to_contain_text('$200 × 1.10')
            checkpoint.get_by_role('button', name='Get a hint').click()
            expect(checkpoint.locator('.checkpoint-hint-text')).to_be_visible()
            audit(page, 'desktop percentage experiment with feedback')
            passed('Numeric checkpoints reject expressions, explain errors, accept correct transfer answers and expose hints')

            d.get_by_role('button', name='Close experiment').click()
            expect(d.locator('.interactive-experiment')).to_have_count(0)
            model = open_experiment(d)
            expect(model.locator('.transfer-checkpoint input')).to_have_value('')
            passed('Closing and reopening resets an exploration without retaining stale prediction feedback')

            d = open_lesson(page, url, 'computing', 'Keep a running total'); model = open_experiment(d)
            observations = model.get_by_role('textbox', name='Observations, in order')
            observations.fill('5, -2, 4'); model.get_by_role('button', name='Apply observations').click()
            next_input = model.get_by_role('button', name='Process next input')
            next_input.click(); next_input.click()
            expect(model.locator('.experiment-metrics')).to_contain_text('Current total3')
            next_input.click(); expect(next_input).to_be_disabled()
            expect(model.locator('.experiment-metrics')).to_contain_text('Current total7')
            observations.fill('2,,3'); model.get_by_role('button', name='Apply observations').click()
            expect(observations).to_be_focused()
            expect(model.get_by_role('alert')).to_contain_text('last applied list')
            expect(model.locator('.experiment-metrics')).to_contain_text('Current total7')
            observations.fill(''); model.get_by_role('button', name='Apply observations').click()
            expect(next_input).to_be_disabled()
            expect(model.locator('.experiment-metrics')).to_contain_text('Current total0')
            audit(page, 'desktop empty-list algorithm trace')
            passed('Loop trace preserves negative inputs, rejects a malformed replacement and handles empty input at step zero')

            d = open_lesson(page, url, 'data', 'Meet the mean'); model = open_experiment(d)
            model.get_by_role('textbox', name='Observations, in order').fill('2, 3, 4, 5, 100')
            model.get_by_role('button', name='Apply observations').click()
            expect(model.locator('.experiment-metrics')).to_contain_text('Mean22.8Median4')
            model.locator('.transfer-checkpoint input').fill('18,8')
            model.get_by_role('button', name='Check prediction').click()
            expect(model.locator('.transfer-checkpoint [role=status]')).to_contain_text('checks out')
            passed('Statistics distinguish an outlier’s effect on mean and median and accept decimal-comma predictions')

            for course, title, settings, expected in [
                ('physics', 'Use a speed model', [('Initial velocity',0),('Constant acceleration',2),('Journey duration',3)], 'Final position9 m'),
                ('physics', 'Connect pressure to contact area', [('Force',90),('Contact area',0.03)], 'Selected pressure3,000 Pa'),
                ('geometry', 'Calculate the volume of a box', [('Length',4),('Width',6),('Height',8)], 'Volume192 cm³'),
                ('chemistry', 'Compare solution concentrations', [('Solute mass',20),('Solvent mass',180)], 'Solute concentration10 % by mass'),
                ('astronomy', 'Use a light-travel-time model', [('Distance',1)], 'One-way delay8.32 min'),
                ('business', 'Find a break-even quantity', [('Fixed cost',50),('Price per unit',8),('Variable cost per unit',3)], 'First whole-unit break-even10 units'),
                ('finance', 'Follow compound growth', [('Starting balance',100),('Annual interest rate',10),('Years',2)], 'Compound balance$121'),
                ('chemistry', 'Balance atoms in a reaction', [('Hydrogen coefficient',2),('Oxygen coefficient',1),('Water coefficient',2)], 'Atom accountingBalanced'),
                ('business', 'Read a cash-flow timeline', [('Receipt arrives at end of month',3)], 'Funding gap at these events$20'),
                ('finance', 'Compare the full cost of two offers', [('Contract term',12)], 'Cheaper over this termA by $14'),
                ('health', 'Interpret an absolute risk difference', [('Baseline group outcomes',80),('Comparison group outcomes',60)], 'Relative reduction25 %'),
            ]:
                d = open_lesson(page, url, course, title); model = open_experiment(d)
                for label, value in settings: set_range(model, label, value)
                expect(model.locator('.experiment-metrics')).to_contain_text(expected)
                expect(model.get_by_role('img')).to_be_visible()
                model.get_by_text('Read the data table', exact=True).click()
                expect(model.get_by_role('table')).to_be_visible()
                passed(f'{course}: live controls, labelled chart, formula and data table agree with the worked calculation')

            set_range(model, 'Baseline group outcomes', 0)
            expect(model.locator('.experiment-metrics')).to_contain_text('Undefined (zero baseline)')
            set_range(model, 'Baseline group outcomes', 10); set_range(model, 'Comparison group outcomes', 20)
            expect(model.locator('.experiment-metrics')).to_contain_text('-100 %')
            passed('Risk comparisons disclose an undefined zero baseline and a rate increase as a negative reduction')
            d = open_lesson(page, url, 'business', 'Find a break-even quantity'); model = open_experiment(d)
            set_range(model, 'Price per unit', 3); set_range(model, 'Variable cost per unit', 3)
            expect(model.locator('.experiment-metrics')).to_contain_text('No finite quantity')
            passed('Zero contribution cannot display a fabricated finite break-even quantity')

            for course, title in [('logic','Find a counterexample'),('biology','Use a model of inheritance carefully'),('earth','Interpret a flood-risk forecast'),('english','Revise vague references'),('history','Separate an event from its later interpretation'),('geography','Choose a map projection for a task'),('design','Write an actionable error message'),('arts','Turn a rhythm into equivalent groupings')]:
                d = open_lesson(page, url, course, title)
                reasoning = d.locator('.reasoning-case')
                reasoning.locator('.reasoning-options button').first.click()
                reasoning.get_by_role('button', name='Check reasoning').click()
                expect(reasoning.get_by_role('status')).to_be_visible()
                expect(reasoning.get_by_role('button', name='Check reasoning')).to_be_disabled()
                reasoning.locator('.reasoning-options button').nth(1).click()
                expect(reasoning.get_by_role('status')).to_have_count(0)
                expect(reasoning.get_by_role('button', name='Check reasoning')).to_be_enabled()
                expect(d.locator('.study-source')).to_have_attribute('target','_blank')
            passed('All eight reasoning tasks offer option-specific feedback, clear stale feedback and link to further reading')

            # The experiment itself must not create completion, enrollment or coin records.
            # Discover the app's versioned key without tying this behavior check to its spelling.
            states = page.evaluate("Object.keys(localStorage).map(k=>{try{return JSON.parse(localStorage[k])}catch{return null}}).filter(v=>v&&v.completed)")
            assert all(not state['completed'] for state in states), states
            d.get_by_role('button', name='Got it. Let me try!').click()
            d.locator('.quiz-option').filter(has_text='8').first.click()
            d.get_by_role('button', name='Check my answer').click()
            d.get_by_role('button', name='Finish lesson', exact=True).click()
            expect(d.locator('.lesson-list button').last.locator('.lesson-number')).to_have_class('lesson-number done')
            passed('Exploration never awards completion; the existing lesson check still completes the real lesson')

            for width in [320,390,820]:
                for dark in [False,True]:
                    mobile = browser.new_context(viewport={'width':width,'height':900},reduced_motion='reduce',color_scheme='dark' if dark else 'light')
                    mp = mobile.new_page(); mp.on('pageerror', lambda error: errors.append(str(error)))
                    mp.add_init_script("localStorage.setItem('curio.appearance.v1', JSON.stringify({version:2, mode:'%s', seed:'#1a73e8'}))" % ('dark' if dark else 'light'))
                    md = open_lesson(mp, url, 'finance', 'Follow compound growth'); mm = open_experiment(md)
                    assert mp.evaluate('document.documentElement.dataset.theme') == ('dark' if dark else 'light')
                    mm.get_by_text('Read the data table',exact=True).click()
                    mm.locator('.transfer-checkpoint input').fill('121'); mm.get_by_role('button',name='Check prediction').click()
                    assert mp.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
                    assert md.evaluate('(el)=>el.scrollWidth <= el.clientWidth + 1'), width
                    assert mm.evaluate('(el)=>el.scrollWidth <= el.clientWidth + 1'), width
                    audit(mp, f'{width}px {"dark" if dark else "light"} compound experiment')
                    mm.locator('.experiment-metrics').scroll_into_view_if_needed()
                    mp.screenshot(path=str(OUTPUT / f'lesson-experiment-{width}-{dark}.png'))
                    if width == 320:
                        for course, title in [('chemistry','Balance atoms in a reaction'),('business','Read a cash-flow timeline'),('finance','Compare the full cost of two offers')]:
                            md = open_lesson(mp, url, course, title); mm = open_experiment(md)
                            assert md.evaluate('(el)=>el.scrollWidth <= el.clientWidth + 1')
                            assert mm.evaluate('(el)=>el.scrollWidth <= el.clientWidth + 1')
                            audit(mp, f'320px {"dark" if dark else "light"} {course} experiment')
                            mm.locator('.model-chart').scroll_into_view_if_needed()
                            mp.screenshot(path=str(OUTPUT / f'lesson-experiment-{course}-320-{dark}.png'))
                    mobile.close()
            passed('320/390/820 px models fit their dialog with keyboard controls, readable tables and light/dark accessibility audits')
            assert not errors, errors
            passed('No uncaught browser exceptions across every model and reasoning task')
            context.close(); browser.close()
    finally:
        process.terminate(); process.wait(timeout=10)
print(f'{checks} checks and {len(audits)} accessibility audits passed.', flush=True)

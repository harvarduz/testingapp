"""Automated WCAG A/AA checks. Run against an application server, not static Vite.
These checks supplement the keyboard and screen-size tests; they do not certify
complete WCAG compliance. Requires Python Playwright and npm-installed axe-core.
"""
import json
import os
import re
from pathlib import Path
import uuid
from playwright.sync_api import sync_playwright, expect
from select_helpers import choose_option

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('CURIO_TEST_URL', 'http://127.0.0.1:5173/').rstrip('/') + '/'
AXE = ROOT / 'node_modules/axe-core/axe.min.js'
OUTPUT = ROOT / 'test-results'
OUTPUT.mkdir(exist_ok=True)
REPORT = OUTPUT / ('accessibility-dark.json' if os.environ.get('CURIO_TEST_THEME') == 'dark' else 'accessibility.json')
results = []


def audit(page, name):
    page.add_script_tag(path=str(AXE))
    violations = page.evaluate("async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa']}})).violations")
    results.append({'screen': name, 'violations': violations})
    REPORT.write_text(json.dumps(results, indent=2))
    if violations:
        page.screenshot(path=str(OUTPUT / 'accessibility-failure.png'), full_page=True)
        print(name, [(v['id'], [n['target'] for n in v['nodes']]) for v in violations], flush=True)
    print(f'{"FAIL" if violations else "PASS"} {len(results)}: {name}', flush=True)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1366, 'height': 1000}, reduced_motion='reduce')
    if os.environ.get('CURIO_TEST_THEME') == 'dark':
        context.add_init_script("localStorage.setItem('curio.appearance.v1', JSON.stringify({mode:'dark',seed:'#1a73e8',version:2}))")
    page = context.new_page()
    for width in [1366, 390]:
        page.set_viewport_size({'width': width, 'height': 1000})
        for route in ['', '#overview', '#explore', '#learning', '#practice', '#achievements', '#creators', '#paths', '#lab']:
            page.goto(URL + route, wait_until='networkidle')
            audit(page, f'{route or "home"} at {width}px')
            if route == '#explore':
                choose_option(page.get_by_role('combobox', name='Filter by level'), 'Advanced')
                choose_option(page.get_by_role('combobox', name='Filter by duration'), 'Over 40 minutes')
                audit(page, f'Filtered catalog at {width}px')
            if route == '#paths':
                page.get_by_role('button', name='Choose Mathematics foundations', exact=True).click() if page.get_by_role('button', name='Choose Mathematics foundations', exact=True).count() else None
                audit(page, f'Active study path at {width}px')
            if route == '#learning':
                page.get_by_role('button', name='Saved', exact=True).click()
                audit(page, f'Saved courses at {width}px')
        page.goto(URL + '#overview', wait_until='networkidle')
        page.get_by_role('button', name=re.compile(r'^\d+ Curio coins$')).click()
        audit(page, f'Curio coin dialog at {width}px')
        page.get_by_role('button', name='Close dialog').click()
        if width == 1366:
            if page.get_by_role('button', name='Expand navigation', exact=True).count():
                page.get_by_role('button', name='Expand navigation', exact=True).click()
            page.get_by_role('button', name='Collapse navigation', exact=True).click()
            audit(page, 'Collapsed desktop navigation')
            page.get_by_role('button', name='Expand navigation', exact=True).click()
        if width == 390:
            page.get_by_role('button', name='Open navigation', exact=True).click()
            audit(page, 'Mobile navigation dialog')
            page.keyboard.press('Escape')
        page.get_by_role('button', name='Sign in / Create account', exact=True).click()
        audit(page, f'Account dialog at {width}px')
        page.get_by_role('button', name='Close dialog').click()
        page.get_by_role('button', name='Thinking in numbers', exact=True).click()
        audit(page, f'Course details at {width}px')
        dialog = page.get_by_role('dialog')
        dialog.get_by_role('button', name=re.compile('Let’s start learning|Continue learning')).click()
        audit(page, f'Interactive lesson at {width}px')
        dialog.locator('.lesson-notes summary').click()
        dialog.get_by_role('textbox', name='What do you want to remember?').fill('A pattern can have a constant difference.')
        audit(page, f'Private lesson notes at {width}px')
        dialog.get_by_role('button', name='Got it. Let me try!').click()
        audit(page, f'Quiz at {width}px')
        page.get_by_role('button', name='Close dialog').click()

    registration = context.request.post(URL + 'api/auth/register', data={
        'name': 'Accessibility Tester', 'email': f'accessibility-{uuid.uuid4().hex}@example.test', 'password': 'A unique audit password 42!'
    })
    assert registration.status == 201
    assert context.request.put(URL + 'api/progress', data={
        'name': 'Accessibility Tester', 'completed': {'numbers': [0]}, 'enrolled': ['numbers']
    }).status == 200
    page.reload(wait_until='networkidle')
    for width in [1366, 390]:
        page.set_viewport_size({'width': width, 'height': 1000})
        page.goto(URL + '#creators', wait_until='networkidle')
        page.reload(wait_until='networkidle')
        expect(page.get_by_role('heading', name='Your courses.')).to_be_visible()
        audit(page, f'Authenticated creator workspace at {width}px')
        page.get_by_role('button', name='Create a course', exact=True).click()
        audit(page, f'Lesson editor at {width}px')
        page.locator('.lesson-extension-editor summary').click()
        audit(page, f'Extended lesson editor at {width}px')
        page.goto(URL + '#practice', wait_until='networkidle')
        expect(page.get_by_role('heading', name='Review what you’ve learned')).to_be_visible()
        audit(page, f'Completed lesson review at {width}px')
        page.get_by_role('button', name='Start targeted practice').click()
        dialog = page.get_by_role('dialog', name='Targeted practice')
        audit(page, f'Targeted practice question at {width}px')
        dialog.locator('.practice-options button').first.click()
        dialog.get_by_role('button', name='Check answer', exact=True).click()
        audit(page, f'Practice mistake feedback at {width}px')
        dialog.get_by_role('button', name='Next question').click()
        catalog = context.request.get(URL + 'api/courses').json()['courses']
        questions = [question for course in catalog for lesson in course['lessons'] for question in lesson.get('practice', [])]
        while dialog.get_by_role('button', name='Check answer', exact=True).count():
            prompt = dialog.locator('h2').inner_text()
            question = next(question for question in questions if question['question'] == prompt)
            dialog.locator('.practice-options button').nth(question['answer']).click()
            dialog.get_by_role('button', name='Check answer', exact=True).click()
            audit(page, f'Practice correct feedback {dialog.locator(".practice-session-top").inner_text()} at {width}px')
            dialog.get_by_role('button', name='See my results' if dialog.get_by_role('button', name='See my results').count() else 'Next question', exact=True).click()
        audit(page, f'Practice result at {width}px')
        page.get_by_role('button', name='Close dialog').click()
        page.goto(URL + '#lab', wait_until='networkidle')
        for label in ['Fraction studio', 'Budget challenge', 'Algorithm tracer']:
            page.get_by_role('button', name=label, exact=True).click()
            audit(page, f'{label} at {width}px')
        page.get_by_role('textbox', name='Algorithm number list').fill('2, 4, 6')
        page.get_by_role('spinbutton', name='Your predicted result').fill('12')
        page.get_by_role('button', name='Lock prediction & start').click()
        for _ in range(3): page.get_by_role('button', name='Run next step').click()
        page.get_by_role('button', name='Compare my prediction').click()
        audit(page, f'Completed algorithm trace at {width}px')
    browser.close()

assert not any(item['violations'] for item in results), f'Automated WCAG violations found; see {REPORT}'
print(f'\n{len(results)} accessibility checks passed with zero automated WCAG A/AA violations. Results: {REPORT}')

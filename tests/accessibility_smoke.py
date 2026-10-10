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

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('CURIO_TEST_URL', 'http://127.0.0.1:5173/').rstrip('/') + '/'
AXE = ROOT / 'node_modules/axe-core/axe.min.js'
OUTPUT = ROOT / 'test-results'
OUTPUT.mkdir(exist_ok=True)
results = []


def audit(page, name):
    page.add_script_tag(path=str(AXE))
    violations = page.evaluate("async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa']}})).violations")
    results.append({'screen': name, 'violations': violations})
    Path(OUTPUT / 'accessibility.json').write_text(json.dumps(results, indent=2))
    if violations:
        page.screenshot(path=str(OUTPUT / 'accessibility-failure.png'), full_page=True)
        print(name, [(v['id'], [n['target'] for n in v['nodes']]) for v in violations], flush=True)
    print(f'{"FAIL" if violations else "PASS"} {len(results)}: {name}', flush=True)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1366, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    for width in [1366, 390]:
        page.set_viewport_size({'width': width, 'height': 1000})
        for route in ['', '#overview', '#explore', '#learning', '#practice', '#achievements', '#creators']:
            page.goto(URL + route, wait_until='networkidle')
            audit(page, f'{route or "home"} at {width}px')
            if route == '#explore':
                page.get_by_role('combobox', name='Filter by level').select_option('Advanced')
                page.get_by_role('combobox', name='Filter by duration').select_option('Over 40 minutes')
                audit(page, f'Filtered catalog at {width}px')
            if route == '#learning':
                page.get_by_role('button', name='Saved', exact=True).click()
                audit(page, f'Saved courses at {width}px')
        page.goto(URL + '#overview', wait_until='networkidle')
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
        page.goto(URL + '#practice', wait_until='networkidle')
        expect(page.get_by_role('heading', name='Review what you’ve learned')).to_be_visible()
        audit(page, f'Completed lesson review at {width}px')
    browser.close()

assert not any(item['violations'] for item in results), 'Automated WCAG violations found; see test-results/accessibility.json'
print(f'\n{len(results)} accessibility checks passed with zero automated WCAG A/AA violations. Results: {OUTPUT / "accessibility.json"}')

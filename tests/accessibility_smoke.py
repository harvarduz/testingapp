"""Automated WCAG A/AA checks. Run against an application server, not static Vite.
These checks supplement the keyboard and screen-size tests; they do not certify
complete WCAG compliance. Requires Python Playwright and npm-installed axe-core.
"""
import json
import os
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
        page.goto(URL + '#overview', wait_until='networkidle')
        page.get_by_role('button', name='Sign in / Create account', exact=True).click()
        audit(page, f'Account dialog at {width}px')
        page.get_by_role('button', name='Close dialog').click()
        page.get_by_role('button', name='Thinking in numbers', exact=True).click()
        audit(page, f'Course details at {width}px')
        dialog = page.get_by_role('dialog')
        dialog.get_by_role('button', name='Let’s start learning').click()
        audit(page, f'Interactive lesson at {width}px')
        dialog.get_by_role('button', name='Got it. Let me try!').click()
        audit(page, f'Quiz at {width}px')
        page.get_by_role('button', name='Close dialog').click()

    registration = context.request.post(URL + 'api/auth/register', data={
        'name': 'Accessibility Tester', 'email': f'accessibility-{uuid.uuid4().hex}@example.test', 'password': 'A unique audit password 42!'
    })
    assert registration.status == 201
    page.reload(wait_until='networkidle')
    for width in [1366, 390]:
        page.set_viewport_size({'width': width, 'height': 1000})
        page.goto(URL + '#creators', wait_until='networkidle')
        page.reload(wait_until='networkidle')
        expect(page.get_by_role('heading', name='Your ideas, taking shape.')).to_be_visible()
        audit(page, f'Authenticated creator workspace at {width}px')
        page.get_by_role('button', name='Create a course', exact=True).click()
        audit(page, f'Lesson editor at {width}px')
    browser.close()

assert not any(item['violations'] for item in results), 'Automated WCAG violations found; see test-results/accessibility.json'
print(f'\n{len(results)} accessibility checks passed with zero automated WCAG A/AA violations. Results: {OUTPUT / "accessibility.json"}')

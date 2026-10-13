"""Verify themed navigation guards, popover dismissal, and readable preferences.

Run npm run build first. All account writes use an isolated temporary database.
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
from account_helpers import open_profile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'test-results'
OUTPUT.mkdir(exist_ok=True)
checks = 0


def passed(description):
    global checks
    checks += 1
    print(f'PASS {checks}: {description}', flush=True)


def audit(page):
    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    violations = page.evaluate("async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa']}})).violations")
    assert not violations, json.dumps(violations, indent=2)


with tempfile.TemporaryDirectory(prefix='curio-navigation-') as directory:
    with socket.socket() as reservation:
        reservation.bind(('127.0.0.1', 0))
        port = reservation.getsockname()[1]
    url = f'http://127.0.0.1:{port}/'
    process = subprocess.Popen(['node', 'server/index.js'], cwd=ROOT,
        env={**os.environ, 'PORT': str(port), 'NODE_ENV': 'test', 'CURIO_DATA_DIR': directory, 'PUBLIC_URL': url},
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
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
            raise RuntimeError('Application server did not start')

        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            context = browser.new_context(viewport={'width':1366, 'height':1000}, reduced_motion='reduce')
            page = context.new_page()
            errors, native_dialogs = [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('dialog', lambda dialog: (native_dialogs.append(dialog.message), dialog.dismiss()))
            page.goto(url + '#overview', wait_until='networkidle')
            bell = page.get_by_role('button', name='Learning updates', exact=True)
            popover = page.get_by_role('region', name='Learning updates', exact=True)
            bell.click()
            expect(popover).to_be_visible()
            page.keyboard.press('Escape')
            expect(popover).to_have_count(0)
            expect(bell).to_be_focused()
            bell.click()
            page.get_by_role('heading', name='Your learning, at a glance.', exact=True).click()
            expect(popover).to_have_count(0)
            passed('Learning updates close on Escape with focus restored, and on outside clicks')

            bell.click()
            page.evaluate("location.hash = 'practice'")
            expect(page.get_by_role('heading', name='Practice & review.', exact=True)).to_be_visible()
            expect(popover).to_have_count(0)
            bell.click()
            page.get_by_role('button', name='Customize appearance', exact=True).click()
            expect(popover).to_have_count(0)
            page.keyboard.press('Escape')
            passed('Updates also close on direct route changes and when another dialog opens')

            for mode in ['light', 'dark']:
                if mode == 'dark':
                    page.get_by_role('button', name='Switch to dark theme', exact=True).click()
                open_profile(page)
                expect(page.get_by_role('dialog', name='Learning profile', exact=True)).to_be_visible()
                assert page.locator('.privacy-note').evaluate('node => parseFloat(getComputedStyle(node).fontSize) >= 12')
                audit(page)
                page.keyboard.press('Escape')
                passed(f'Profile preferences use readable footer text with audited {mode} contrast')

            page.get_by_role('navigation', name='Main navigation').get_by_role('button', name='Creator workspace', exact=True).click()
            page.get_by_role('textbox', name='Your name', exact=True).fill('Navigation Teacher')
            page.get_by_role('textbox', name='Email address', exact=True).fill('navigation@example.test')
            page.get_by_role('textbox', name='Password', exact=True).fill('Unique navigation password 927!')
            page.get_by_role('button', name='Create free account', exact=True).click()
            page.get_by_role('button', name='Create a course', exact=True).click()
            title = page.get_by_role('textbox', name='Course title', exact=True)
            title.fill('Unsaved course title')
            explore = page.get_by_role('navigation', name='Main navigation').get_by_role('button', name='Explore courses', exact=True)
            explore.click()
            confirm = page.get_by_role('dialog', name='Leave without saving?', exact=True)
            expect(confirm).to_be_visible()
            audit(page)
            for _ in range(8):
                page.keyboard.press('Tab')
                assert page.evaluate('document.activeElement.closest(\'[role="dialog"]\') !== null')
            confirm.get_by_role('button', name='Keep editing', exact=True).click()
            expect(title).to_have_value('Unsaved course title')
            expect(page).to_have_url(url + '#creators')
            expect(explore).to_be_focused()
            passed('The themed navigation confirmation traps focus; cancel preserves edits and returns focus')

            search = page.get_by_role('textbox', name='Search courses', exact=True)
            search.fill('thinking in numbers')
            expect(confirm).to_be_visible()
            page.keyboard.press('Escape')
            expect(title).to_have_value('Unsaved course title')
            expect(search).to_have_value('')
            expect(search).to_be_focused()
            search.fill('thinking in numbers')
            confirm.get_by_role('button', name='Discard changes', exact=True).click()
            expect(page).to_have_url(url + '#explore')
            expect(search).to_have_value('thinking in numbers')
            expect(page.locator('.course-card')).to_have_count(1)
            passed('Search cancellation keeps edits; discard applies the captured search and intended destination')

            page.get_by_role('navigation', name='Main navigation').get_by_role('button', name='Creator workspace', exact=True).click()
            page.get_by_role('button', name='Create a course', exact=True).click()
            title.fill('Preserve the route')
            page.evaluate("location.hash = 'practice'")
            expect(confirm).to_be_visible()
            expect(page).to_have_url(url + '#creators')
            page.keyboard.press('Escape')
            expect(title).to_have_value('Preserve the route')
            expect(page).to_have_url(url + '#creators')
            page.evaluate("location.hash = 'practice'")
            confirm.get_by_role('button', name='Discard changes', exact=True).click()
            expect(page).to_have_url(url + '#practice')
            expect(page.get_by_role('heading', name='Practice & review.', exact=True)).to_be_visible()
            passed('Direct hash navigation waits for a decision, keeps the editor URL on cancel, and resumes on discard')

            page.get_by_role('navigation', name='Main navigation').get_by_role('button', name='Creator workspace', exact=True).click()
            page.get_by_role('button', name='Create a course', exact=True).click()
            title.fill('Mobile course changes')
            page.set_viewport_size({'width':390, 'height':844})
            browse = page.get_by_role('navigation', name='Mobile learning navigation').get_by_role('button', name='Browse courses', exact=True)
            browse.click()
            expect(confirm).to_be_visible()
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
            audit(page)
            page.screenshot(path=str(OUTPUT / 'navigation-confirm-mobile.png'))
            page.keyboard.press('Escape')
            expect(title).to_have_value('Mobile course changes')
            expect(browse).to_be_focused()

            menu_button = page.get_by_role('button', name='Open navigation', exact=True)
            menu_button.click()
            page.evaluate("location.hash = 'practice'")
            expect(confirm).to_be_visible()
            expect(page).to_have_url(url + '#creators')
            page.keyboard.press('Escape')
            expect(title).to_have_value('Mobile course changes')
            expect(menu_button).to_be_focused()
            passed('A route change from the mobile drawer preserves edits and restores its visible opener on cancel')

            browse.click()
            confirm.get_by_role('button', name='Discard changes', exact=True).click()
            expect(page).to_have_url(url + '#explore')
            passed('Mobile navigation uses the same readable confirmation and restores bottom-navigation focus')

            assert not native_dialogs, native_dialogs
            assert not errors, errors
            passed('All navigation decisions use in-app dialogs with zero native alerts or JavaScript errors')
            browser.close()
    finally:
        process.terminate()
        process.wait(timeout=5)

print(f'\n{checks} navigation and readability checks passed.')

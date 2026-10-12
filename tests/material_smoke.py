"""Verify reference palettes, font assets, persistence, mobile dialogs and contrast.
Build first. All registrations and writes stay in an isolated temporary database.
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
ROUTES = ['', '#overview', '#explore', '#learning', '#practice', '#achievements', '#creators', '#paths', '#lab']
PALETTES = ['Purple', 'Blue', 'Green', 'Terracotta']
checks, audits = 0, []


def passed(description):
    global checks
    checks += 1
    print(f'PASS {checks}: {description}', flush=True)


def audit(page, name):
    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    violations = page.evaluate("async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa']}})).violations")
    audits.append({'screen': name, 'violations': violations})
    (OUTPUT / 'material-accessibility.json').write_text(json.dumps(audits, indent=2))
    if violations:
        print('FAIL', name, [(v['id'], [n['target'] for n in v['nodes']]) for v in violations], flush=True)
        page.screenshot(path=str(OUTPUT / 'material-accessibility-failure.png'), full_page=True)


with tempfile.TemporaryDirectory(prefix='curio-material-') as directory:
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
            context = browser.new_context(viewport={'width':1366,'height':1000}, reduced_motion='reduce')
            page = context.new_page()
            errors, missing = [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('response', lambda response: missing.append(response.url) if response.status >= 400 else None)
            page.goto(url + '#overview', wait_until='networkidle')
            page.evaluate('document.fonts.ready')
            assert page.evaluate('document.fonts.check(\'400 16px "Google Sans Flex"\') && document.fonts.check(\'400 16px "Roboto"\')')
            assert page.locator('.sidebar').bounding_box()['width'] == 96
            assert page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-primary').trim()") == '#65558f'
            assert page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-surface').trim()") == '#fdf7ff'
            passed('Self-hosted reference fonts load; the default 96px rail and actual Bloom purple tonal roles match the reference')

            for palette in PALETTES:
                for mode in ['Light', 'Dark']:
                    page.get_by_role('button', name='Customize appearance', exact=True).click()
                    dialog = page.get_by_role('dialog', name='Curio appearance')
                    dialog.get_by_role('button', name=palette, exact=True).click()
                    dialog.get_by_role('button', name=mode, exact=True).click()
                    expect(dialog.get_by_role('button', name=palette, exact=True)).to_have_attribute('aria-pressed','true')
                    expect(dialog.get_by_role('button', name=mode, exact=True)).to_have_attribute('aria-pressed','true')
                    audit(page, f'{palette} {mode} appearance dialog')
                    page.keyboard.press('Escape')
                    expect(page.get_by_role('button', name='Customize appearance', exact=True)).to_be_focused()
                    color = page.evaluate("document.documentElement.style.getPropertyValue('--md-sys-color-primary')")
                    for route in ROUTES:
                        page.goto(url + route, wait_until='networkidle')
                        assert page.evaluate('document.documentElement.dataset.theme') == mode.lower()
                        assert page.evaluate("document.documentElement.style.getPropertyValue('--md-sys-color-primary')") == color
                        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), (palette,mode,route)
                        audit(page, f'{palette} {mode} {route or "home"}')
                    page.goto(url+'#overview',wait_until='networkidle')
                    page.reload(wait_until='networkidle')
                    assert page.evaluate('document.documentElement.dataset.theme') == mode.lower()
                    assert page.evaluate("document.documentElement.style.getPropertyValue('--md-sys-color-primary')") == color
                passed(f'{palette} switches correctly, persists across routes/reload and has audited light/dark pages and settings')

            page.get_by_role('button', name='Customize appearance', exact=True).click()
            dialog.get_by_role('button', name='Purple', exact=True).click()
            dialog.get_by_role('button', name='Light', exact=True).click()
            page.keyboard.press('Escape')
            for mode in ['light','dark']:
                for width in [320,390,768,800,1024,1366]:
                    page.set_viewport_size({'width':width,'height':844 if width < 780 else 600})
                    for route in ROUTES:
                        page.goto(url+route,wait_until='networkidle')
                        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), (mode,width,route)
                        if route == '#overview':
                            assert page.locator('.daily-goal-card').evaluate('(node)=>node.scrollWidth <= node.clientWidth'), (mode,width,'goal card overflow')
                if mode == 'light':
                    page.get_by_role('button',name='Switch to dark theme',exact=True).click()
                passed(f'Every main page fits 320/390/768/800/1024/1366px widths and short heights in {mode} mode')

            page.set_viewport_size({'width':390,'height':844})
            page.goto(url+'#overview',wait_until='networkidle')
            page.get_by_role('button',name='Open navigation',exact=True).click()
            page.get_by_role('button',name='Appearance',exact=True).click()
            expect(page.get_by_role('dialog',name='Curio appearance')).to_be_visible()
            assert page.evaluate('document.activeElement.closest(\'[role="dialog"]\') !== null')
            for _ in range(14):
                page.keyboard.press('Tab')
                assert page.evaluate('document.activeElement.closest(\'[role="dialog"]\') !== null')
            page.keyboard.press('Escape')
            expect(page.get_by_role('button',name='Open navigation',exact=True)).to_be_focused()
            page.goto(url,wait_until='networkidle')
            page.get_by_role('button',name='Open website navigation',exact=True).click()
            page.get_by_role('button',name='Appearance',exact=True).click()
            dialog.get_by_role('button',name='Light',exact=True).click()
            page.keyboard.press('Escape')
            expect(page.get_by_role('button',name='Open website navigation',exact=True)).to_be_focused()
            passed('Both mobile menus open appearance settings; focus stays in the dialog and returns to a visible menu button')

            page.goto(url+'#overview',wait_until='networkidle')
            page.get_by_role('button',name='Thinking in numbers',exact=True).click()
            page.get_by_role('button',name='Let’s start learning',exact=True).click()
            course_dialog = page.get_by_role('dialog')
            course_dialog.evaluate('(node)=>node.scrollTop = node.scrollHeight')
            expect(course_dialog.get_by_role('button',name='Close dialog',exact=True)).to_be_in_viewport()
            course_dialog.get_by_role('button',name='Close dialog',exact=True).click()
            expect(page.get_by_role('button',name='Thinking in numbers',exact=True)).to_be_focused()
            passed('Long mobile lessons retain a visible close control at the bottom and restore course-card focus')

            page.set_viewport_size({'width':1440,'height':1000})
            page.goto(url,wait_until='networkidle')
            page.screenshot(path=str(OUTPUT/'45-material-home.png'))
            page.screenshot(path=str(OUTPUT/'49-material-home-full.png'),full_page=True)
            page.goto(url+'#overview',wait_until='networkidle')
            page.screenshot(path=str(OUTPUT/'46-material-workspace.png'))
            page.get_by_role('button',name='Switch to dark theme',exact=True).click()
            page.screenshot(path=str(OUTPUT/'47-material-dark.png'))
            page.set_viewport_size({'width':390,'height':900})
            page.goto(url+'#lab',wait_until='networkidle')
            page.screenshot(path=str(OUTPUT/'48-material-mobile-dark.png'))
            assert page.locator('.fraction-grid button').first.evaluate('(node)=>getComputedStyle(node).transitionDuration') == '1e-05s'
            passed('Reduced-motion preference disables decorative transitions; desktop/mobile screenshots captured')

            blocked = browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
            blocked.add_init_script("Storage.prototype.getItem = () => {throw new Error('blocked')}; Storage.prototype.setItem = () => {throw new Error('blocked')}")
            blocked_page = blocked.new_page()
            blocked_page.goto(url,wait_until='networkidle')
            blocked_page.get_by_role('button',name='Open website navigation',exact=True).click()
            blocked_page.get_by_role('button',name='Appearance',exact=True).click()
            blocked_page.get_by_role('button',name='Dark',exact=True).click()
            assert blocked_page.evaluate('document.documentElement.dataset.theme') == 'dark'
            expect(blocked_page.get_by_role('dialog').get_by_role('status')).to_contain_text('cannot remember appearance')
            blocked.close()
            page.evaluate("localStorage.setItem('curio.appearance.v1', '{invalid-json')")
            page.reload(wait_until='networkidle')
            assert page.evaluate('document.documentElement.dataset.theme') == 'light'
            passed('Blocked or invalid browser storage preserves usable appearance controls and explains persistence limits')
            assert not errors, errors
            assert not missing, missing
            passed('No JavaScript errors or missing asset/API responses during theme and navigation changes')
            browser.close()
    finally:
        process.terminate()
        process.wait(timeout=10)

assert not any(item['violations'] for item in audits), 'Theme contrast violations: see test-results/material-accessibility.json'
print(f'\n{checks} Material functionality checks and {len(audits)} accessibility checks passed. Temporary database removed.')

"""Check real scrolling, accessible diagrams and lightweight landing motion.
Build first. Only the isolated local database and browser storage are used.
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
OUTPUT = ROOT / 'test-results'; OUTPUT.mkdir(exist_ok=True)
checks, audits = 0, []


def passed(message):
    global checks
    checks += 1
    print(f'PASS {checks}: {message}', flush=True)


def audit(page, name):
    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    violations = page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations")
    audits.append({'screen': name, 'violations': violations})
    (OUTPUT / 'landing-motion-accessibility.json').write_text(json.dumps(audits, indent=2))
    assert not violations, (name, [(v['id'], [node['target'] for node in v['nodes']]) for v in violations])


def story_position(page, progress):
    return page.locator('.landing-scroll-story').evaluate('''(node, progress) => {
        const stage = node.querySelector('.landing-story-stage');
        return scrollY + node.getBoundingClientRect().top - parseFloat(getComputedStyle(stage).top)
            + (node.offsetHeight - stage.offsetHeight) * progress;
    }''', progress)


def assert_fits(page):
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    bounds = page.locator('.landing-story-stage').bounding_box()
    chart = page.locator('.landing-story-chart').bounding_box()
    assert bounds['y'] >= 70 and chart['y'] + chart['height'] <= page.viewport_size['height'] - 8, (bounds, chart)


with tempfile.TemporaryDirectory(prefix='curio-landing-motion-') as directory:
    with socket.socket() as reservation:
        reservation.bind(('127.0.0.1', 0)); port = reservation.getsockname()[1]
    url = f'http://127.0.0.1:{port}/'
    process = subprocess.Popen(['node', 'server/index.js'], cwd=ROOT,
        env={**os.environ, 'PORT':str(port), 'NODE_ENV':'test', 'CURIO_DATA_DIR':directory, 'PUBLIC_URL':url},
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        for _ in range(100):
            if process.poll() is not None: raise RuntimeError(process.stdout.read())
            try:
                with urllib.request.urlopen(url + 'api/health') as response: assert json.load(response)['status'] == 'ok'
                break
            except OSError: time.sleep(.1)
        else: raise RuntimeError('Server did not start')
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            context = browser.new_context(viewport={'width':390,'height':844}, reduced_motion='no-preference')
            context.add_init_script('''window.__rafCalls=0; const originalRAF=window.requestAnimationFrame;
                window.requestAnimationFrame=callback=>{ window.__rafCalls++; return originalRAF.call(window,callback); };''')
            page = context.new_page(); errors = []; page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(url, wait_until='networkidle')
            courses = context.request.get(url + 'api/courses').json()['courses']
            totals = [len(courses),sum(len(course['lessons']) for course in courses),len({course['category'] for course in courses})]
            counters = page.locator('.landing-scroll-number > span[aria-hidden]')
            assert counters.all_text_contents() == ['0','0','0']
            widths = [counters.nth(i).bounding_box()['width'] for i in range(3)]
            page.locator('.landing-facts').scroll_into_view_if_needed()
            page.wait_for_function("Number(document.querySelectorAll('.landing-scroll-number > span[aria-hidden]')[1].textContent)>0")
            samples = []
            for _ in range(3):
                samples.append(int(counters.nth(1).inner_text())); page.wait_for_timeout(80)
            assert len(set(samples)) > 1 and samples == sorted(samples), samples
            for i, total in enumerate(totals): expect(counters.nth(i)).to_have_text(str(total))
            assert widths == [counters.nth(i).bounding_box()['width'] for i in range(3)]
            assert page.locator('.landing-scroll-number .sr-only').all_text_contents() == list(map(str,totals))
            page.evaluate('scrollTo(0,0)'); page.locator('.landing-facts').scroll_into_view_if_needed()
            assert counters.all_text_contents() == list(map(str,totals))
            passed('Catalog counters animate to real totals once, reserve their width and expose stable accessible numbers')

            page.set_viewport_size({'width':1366,'height':1000})
            page.evaluate('(top)=>scrollTo(0,top)', story_position(page,0))
            stage = page.locator('.landing-story-stage')
            expect(stage).to_have_attribute('data-chapter','0')
            page.get_by_role('button',name='1 Notice',exact=True).focus()
            starting_focus = page.evaluate('document.activeElement.textContent')
            for progress, chapter in [(.5,1),(.9,2),(.05,0)]:
                target = story_position(page,progress)
                page.mouse.wheel(0, target - page.evaluate('scrollY'))
                expect(stage).to_have_attribute('data-chapter',str(chapter))
                assert page.evaluate('document.activeElement.textContent') == starting_focus
                page.wait_for_timeout(700)
                values = page.locator('.landing-story-column > strong').all_text_contents()
                assert values == (['$6','$8'] if chapter == 0 else ['$2.00','$1.60'])
                bars = page.locator('.landing-story-bar')
                ratio = bars.nth(0).bounding_box()['height'] / bars.nth(1).bounding_box()['height']
                assert abs(ratio - (.75 if chapter == 0 else 1.25)) < .02, ratio
                assert_fits(page)
            passed('Native wheel scrolling changes and reverses the prices, bar proportions and explanation without stealing focus')

            for index, label in [(1,'2 Compare'),(2,'3 Apply'),(0,'1 Notice')]:
                button = page.get_by_role('button',name=label,exact=True)
                button.focus(); page.keyboard.press('Space')
                expect(stage).to_have_attribute('data-chapter',str(index)); expect(button).to_be_focused()
            page.get_by_role('button',name='Try the unit-price lesson',exact=True).click()
            dialog = page.get_by_role('dialog',name='Compare a unit price',exact=True)
            expect(dialog.get_by_role('heading',name='Compare a unit price',exact=True)).to_be_visible()
            assert not json.loads(page.evaluate("localStorage.getItem('curio.student.v1')"))['completed']
            dialog.get_by_role('button',name='Close dialog',exact=True).click()
            passed('Keyboard step selection preserves focus and the diagram leads directly to the real unit-price lesson without false completion')

            page.goto(url, wait_until='networkidle')
            course = page.locator('.landing-course').first
            assert course.get_attribute('data-revealed') is None
            course.scroll_into_view_if_needed(); expect(course).to_have_attribute('data-revealed','true')
            page.evaluate('scrollTo(0,0)')
            subject = page.locator('.landing-subject-grid > button').last
            subject.focus()
            expect(subject).to_be_focused(); expect(subject).to_have_attribute('data-revealed','true')
            assert subject.evaluate('node=>Number(getComputedStyle(node).opacity)') == 1
            assert course.get_attribute('data-revealed') == 'true'
            passed('Below-fold content reveals once; keyboard focus reveals controls immediately')

            page.evaluate('scrollTo(0,0)'); page.wait_for_timeout(300)
            before = page.evaluate('window.__rafCalls'); page.wait_for_timeout(350)
            assert page.evaluate('window.__rafCalls') == before
            assert page.locator('.landing-preview-backdrop').evaluate('node=>getComputedStyle(node).animationIterationCount') == '1'
            passed('No JavaScript animation loop runs while idle or offscreen; decorative hero motion has one finite iteration')

            for mode in ['light','dark']:
                page.evaluate('(mode)=>localStorage.setItem("curio.appearance.v1",JSON.stringify({version:2,seed:"#1a73e8",mode}))',mode)
                for width in [1366,390]:
                    page.set_viewport_size({'width':width,'height':1000 if width==1366 else 844})
                    page.reload(wait_until='networkidle')
                    for chapter in range(3):
                        page.get_by_role('group',name='Example steps').get_by_role('button').nth(chapter).click()
                        expect(stage).to_have_attribute('data-chapter',str(chapter))
                        page.wait_for_timeout(700); assert_fits(page)
                        audit(page,f'{mode} story step {chapter+1} at {width}px')
                    page.screenshot(path=str(OUTPUT / f'landing-story-{mode}-{width}.png'))
            passed('All three scroll-driven diagrams fit desktop/mobile and pass light/dark accessibility audits')

            touch = browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
            phone = touch.new_page(); phone.goto(url,wait_until='networkidle')
            phone.get_by_role('button',name='2 Compare',exact=True).tap()
            expect(phone.locator('.landing-story-stage')).to_have_attribute('data-chapter','1')
            assert_fits(phone)
            for width,height in [(320,844),(320,740),(768,600),(1366,600)]:
                phone.set_viewport_size({'width':width,'height':height})
                phone.get_by_role('button',name='3 Apply',exact=True).tap()
                expect(phone.locator('.landing-story-stage')).to_have_attribute('data-chapter','2')
                assert not phone.evaluate('document.documentElement.scrollWidth > innerWidth')
                if height < 821:
                    expect(phone.locator('.landing-scroll-story')).to_have_class('landing-scroll-story is-static')
                    phone.locator('.landing-story-chart-note').scroll_into_view_if_needed()
                    expect(phone.locator('.landing-story-chart-note')).to_be_in_viewport()
            passed('Real touch selection works; narrow and short screens use reachable compact diagrams without horizontal overflow')

            page.emulate_media(reduced_motion='reduce')
            expect(page.locator('.landing')).to_have_attribute('data-motion','reduced')
            expect(page.locator('.landing-scroll-story')).to_have_class('landing-scroll-story is-static')
            assert page.locator('[data-reveal]:not([data-revealed])').count() == 0
            for width in [1366,390]:
                page.set_viewport_size({'width':width,'height':1000 if width==1366 else 844})
                for chapter in range(3):
                    page.get_by_role('group',name='Example steps').get_by_role('button').nth(chapter).click()
                    expect(stage).to_have_attribute('data-chapter',str(chapter))
                    audit(page,f'Reduced motion story step {chapter+1} at {width}px')
            assert page.locator('.landing-story-bar').first.evaluate('node=>getComputedStyle(node).transitionDuration') in ['0s','.01ms','1e-05s']
            page.screenshot(path=str(OUTPUT/'landing-story-reduced-mobile.png'))
            passed('Changing reduced-motion preference removes sticky scroll distance and animation while preserving every step and action')

            fallback = browser.new_context(viewport={'width':390,'height':844})
            fallback.add_init_script('delete window.IntersectionObserver')
            fallback_page = fallback.new_page(); fallback_page.goto(url,wait_until='networkidle')
            expect(fallback_page.locator('.landing')).to_have_attribute('data-motion','reduced')
            assert fallback_page.locator('.landing-scroll-number > span[aria-hidden]').all_text_contents() == list(map(str,totals))
            fallback_page.get_by_role('button',name='2 Compare',exact=True).click()
            expect(fallback_page.locator('.landing-story-stage')).to_have_attribute('data-chapter','1')
            audit(fallback_page,'IntersectionObserver unavailable')
            passed('Without IntersectionObserver, real totals, content and manual diagram selection remain available')
            assert not errors, errors
            browser.close()
    finally:
        process.terminate(); process.wait(timeout=10)

print(f'\n{checks} landing motion checks and {len(audits)} accessibility states passed. Temporary database removed.')

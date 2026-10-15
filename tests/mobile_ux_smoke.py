"""Touch regressions: hit targets, scroll composition, dialogs and learning.
Build and run a local app first. Optional CURIO_TEST_BROWSER=webkit and
CURIO_WEBKIT_EXECUTABLE allow testing the same behavior in WebKit.
"""
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('CURIO_TEST_URL', 'http://127.0.0.1:4191/').rstrip('/') + '/'
assert urlparse(URL).hostname in ('127.0.0.1', 'localhost'), 'Use an isolated local app.'
ENGINE = os.environ.get('CURIO_TEST_BROWSER', 'chromium')
OUTPUT = ROOT / 'test-results'; OUTPUT.mkdir(exist_ok=True)
checks = 0

def passed(message):
    global checks
    checks += 1
    print(f'PASS {checks} [{ENGINE}]: {message}', flush=True)

def hit_target(locator):
    locator.scroll_into_view_if_needed()
    assert locator.evaluate('''node => {
      const r=node.getBoundingClientRect(), x=r.left+r.width/2,y=r.top+r.height/2;
      return r.width>=44 && r.height>=44 && x>=0 && x<innerWidth && y>=0 && y<innerHeight
        && node.contains(document.elementFromPoint(x,y));
    }'''), locator

def audit(page, name):
    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    issues = page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations")
    assert not issues, (name, [(v['id'], [n['target'] for n in v['nodes']]) for v in issues])

with sync_playwright() as p:
    options = {'executable_path': '/usr/bin/chromium', 'args': ['--no-sandbox']} if ENGINE == 'chromium' else {}
    if ENGINE == 'webkit' and os.environ.get('CURIO_WEBKIT_EXECUTABLE'):
        options['executable_path'] = os.environ['CURIO_WEBKIT_EXECUTABLE']
    browser = getattr(p, ENGINE).launch(**options)
    errors = []
    for width, height in [(320,568), (390,844), (844,390)]:
        context = browser.new_context(viewport={'width':width,'height':height}, is_mobile=True, has_touch=True, device_scale_factor=2, reduced_motion='no-preference')
        context.add_init_script('window.__letterRasters=0;const read=CanvasRenderingContext2D.prototype.getImageData;CanvasRenderingContext2D.prototype.getImageData=function(...args){if(!this.canvas.isConnected)window.__letterRasters++;return read.apply(this,args)};')
        page = context.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL, wait_until='networkidle'); page.evaluate('document.fonts.ready')
        stage = page.locator('.particle-story-stage')
        expect(stage).to_have_attribute('data-canvas-ready', 'true')
        assert stage.evaluate('n=>getComputedStyle(n).position') == 'relative'
        rasters = page.evaluate('window.__letterRasters')
        page.evaluate('dispatchEvent(new Event("resize"))')
        page.wait_for_timeout(100)
        assert page.evaluate('window.__letterRasters') == rasters, 'Unchanged art dimensions must not rerasterize the lettering'
        art = stage.bounding_box(); copy = page.locator('.landing-hero-copy').bounding_box()
        assert art['y'] + art['height'] <= copy['y'] and copy['y'] - (art['y'] + art['height']) <= 24
        expect(page.get_by_role('button',name='Pause page animations',exact=True)).to_have_count(0)
        page.get_by_role('button',name='Open website navigation',exact=True).tap()
        pause = page.get_by_role('button',name='Pause page animations',exact=True)
        pause.tap()
        expect(stage).to_have_attribute('data-particle-motion','paused')
        page.get_by_role('button',name='Play page animations',exact=True).tap()
        page.get_by_role('button',name='Close website navigation',exact=True).tap()
        expect(page.get_by_role('button',name='Pause animation',exact=True)).to_have_count(0)
        page.get_by_role('button',name='Transform lettering',exact=True).tap()
        expect(stage).to_have_attribute('data-view','phrase')
        page.get_by_role('button',name='Reset view',exact=True).tap()
        expect(stage).to_have_attribute('data-view','curio')
        for label in ['Find your first course','Explore a subject']:
            button = page.get_by_role('button',name=label,exact=True)
            hit_target(button)
            # Recheck after scroll has settled: no sticky toolbar can cover it.
            page.wait_for_timeout(180); hit_target(button)
        orbit = page.locator('.particle-mobile-orbit')
        orbit.scroll_into_view_if_needed(); expect(orbit).to_have_attribute('data-particle-ready','true')
        assert orbit.bounding_box()['height'] >= 190
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
        page.screenshot(path=str(OUTPUT/f'mobile-{ENGINE}-{width}-connections.png'))
        passed(f'{width}×{height}: contained art, separate orbit, reachable primary actions and one working motion action inside navigation')

        page.evaluate('scrollTo({top:0,behavior:"instant"})')
        page.get_by_role('group',name='Particle views').get_by_role('button',name='Connections',exact=True).tap()
        page.wait_for_timeout(250)
        page.get_by_role('button',name='Open account menu',exact=True).tap()
        page.get_by_role('region',name='Account menu').get_by_role('button',name='Sign in',exact=True).tap()
        dialog = page.get_by_role('dialog',name='Your Curio account')
        expect(dialog).to_be_visible()
        expect(stage).to_have_attribute('data-particle-motion','obscured')
        canvas = page.locator('.landing-effects-canvas')
        expect(canvas).to_have_attribute('data-motion','obscured')
        page.wait_for_timeout(150)
        before = stage.locator('canvas').evaluate('n=>n.toDataURL()')
        paints = canvas.get_attribute('data-paint-count')
        page.wait_for_timeout(200)
        assert stage.locator('canvas').evaluate('n=>n.toDataURL()') == before
        assert canvas.get_attribute('data-paint-count') == paints
        email = dialog.get_by_role('textbox',name='Email address',exact=True)
        email.fill('learner@example.test')
        for field in dialog.locator('input:not([type=hidden])').all():
            assert field.evaluate('n=>parseFloat(getComputedStyle(n).fontSize)') >= 16, 'iOS input focus would zoom the page'
        # Approximate a keyboard reducing the available viewport. This checks
        # geometry, not a claim to emulate the native keyboard itself.
        page.set_viewport_size({'width':width,'height':max(280,height-280)})
        hit_target(dialog.get_by_role('button',name='Sign in',exact=True))
        email.fill('changed@example.test'); expect(email).to_have_value('changed@example.test')
        hit_target(dialog.get_by_role('button',name='Close dialog',exact=True))
        dialog.get_by_role('button',name='Close dialog',exact=True).tap()
        expect(dialog).to_have_count(0)
        page.set_viewport_size({'width':width,'height':height})
        expect(page.get_by_role('button',name='Open account menu',exact=True)).to_be_focused()
        stage.scroll_into_view_if_needed(); page.wait_for_timeout(150)
        expect(stage).to_have_attribute('data-particle-motion','active')
        resumed = stage.locator('canvas').evaluate('n=>n.toDataURL()')
        page.wait_for_timeout(150)
        assert stage.locator('canvas').evaluate('n=>n.toDataURL()') != resumed, 'Closing a dialog must resume the orbit'
        passed(f'{width}px: account dialog, small-height form actions, close/focus recovery and paused background renderers')

        page.get_by_role('button',name='Open website navigation',exact=True).tap()
        nav = page.get_by_role('navigation',name='Mobile website navigation')
        nav.get_by_role('link',name='Our courses',exact=True).tap()
        expect(nav).to_have_count(0)
        expect(page.locator('#courses h2')).to_be_focused()
        page.get_by_role('button',name='Explore The physics of everyday life',exact=True).tap()
        course_dialog = page.get_by_role('dialog')
        expect(course_dialog.get_by_role('heading',name='The physics of everyday life',exact=True)).to_be_visible()
        course_dialog.get_by_role('button',name='Close dialog',exact=True).tap()
        page.get_by_role('button',name='Find your first course',exact=True).tap()
        expect(page).to_have_url(URL+'#explore')
        expect(page.locator('.course-card')).to_have_count(20)
        assert page.evaluate('scrollY') == 0, 'Route changes must reset immediately, without a long cross-page smooth scroll'
        page.get_by_role('button',name='Thinking in numbers',exact=True).tap()
        dialog = page.get_by_role('dialog')
        dialog.locator('.lesson-list button').first.tap()
        expect(dialog.get_by_role('heading',name='Find the pattern',exact=True)).to_be_visible()
        dialog.get_by_role('button',name='Next step',exact=True).tap()
        expect(dialog.locator('.worked-example-heading')).to_contain_text('Step 2 of')
        dialog.get_by_role('button',name='Got it. Let me try!',exact=True).tap()
        dialog.locator('.quiz-option').nth(2).tap()
        dialog.get_by_role('button',name='Check my answer',exact=True).tap()
        expect(dialog.locator('.answer-feedback')).to_be_visible()
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
        audit(page,f'{width}px lesson')
        page.screenshot(path=str(OUTPUT/f'mobile-{ENGINE}-{width}-lesson.png'))
        passed(f'{width}px: touch navigation, course opening, worked steps, lesson answer and accessibility audit')
        context.close()
    desktop = browser.new_page(viewport={'width':1100,'height':500})
    desktop.goto(URL,wait_until='networkidle')
    expect(desktop.get_by_role('button',name='Pause animation',exact=True)).to_be_visible()
    desktop.get_by_role('button',name='Pause animation',exact=True).click()
    expect(desktop.locator('.particle-story-stage')).to_have_attribute('data-particle-motion','paused')
    desktop.close()
    passed('Short desktop windows retain a reachable pause action without requiring the mobile menu')
    assert not errors, errors
    browser.close()
print(f'{checks} mobile UX checks passed in {ENGINE}.',flush=True)

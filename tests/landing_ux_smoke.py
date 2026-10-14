"""Regression checks for reachable navigation and visible scroll scenes.
Run against a local dev or production preview through CURIO_TEST_URL.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get('CURIO_TEST_URL', 'http://127.0.0.1:5173/').rstrip('/') + '/'
OUTPUT = Path(__file__).resolve().parents[1] / 'test-results'
OUTPUT.mkdir(exist_ok=True)
checks = 0

def passed(message):
    global checks
    checks += 1
    print(f'PASS {checks}: {message}', flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for width, height in [(320,568),(390,844),(768,950),(900,600),(1000,720),(1366,950),(667,375)]:
        page.set_viewport_size({'width':width,'height':height})
        page.goto(URL, wait_until='networkidle')
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
        if width <= 1000:
            trigger = page.get_by_role('button', name='Open website navigation')
            expect(trigger).to_be_visible()
            header_height = page.locator('.landing-header').bounding_box()['height']
            trigger.click()
            nav = page.get_by_role('navigation', name='Mobile website navigation')
            expect(nav).to_be_visible()
            assert page.locator('.landing-header').bounding_box()['height'] == header_height
            box = nav.bounding_box()
            assert box['y']+box['height'] <= height+1, box
            last = nav.get_by_role('button',name='Go to your learning space')
            last.focus()
            box = last.bounding_box()
            assert box['y'] >= header_height and box['y']+box['height'] <= height, box
            page.keyboard.press('Escape')
            expect(nav).to_have_count(0)
            expect(trigger).to_be_focused()
            trigger.click()
            nav.get_by_role('link',name='Our courses',exact=True).click()
            expect(nav).to_have_count(0)
            expect(page.locator('#landing-courses-title')).to_be_focused()
            expect(page).to_have_url(URL+'#courses')
        else:
            expect(page.get_by_role('navigation',name='Website navigation',exact=True)).to_be_visible()
    passed('Phone, tablet, and desktop navigation stays reachable; short menus scroll, Escape restores focus, section links focus their heading')

    page.set_viewport_size({'width':900,'height':800})
    page.goto(URL,wait_until='networkidle')
    trigger = page.get_by_role('button',name='Open website navigation')
    trigger.click()
    page.mouse.click(8,790)
    expect(trigger).to_have_attribute('aria-expanded','false')
    trigger.click()
    page.get_by_role('button',name='Find your first course').focus()
    expect(trigger).to_have_attribute('aria-expanded','false')
    trigger.click()
    page.set_viewport_size({'width':1366,'height':800})
    expect(page.get_by_role('navigation',name='Mobile website navigation')).to_have_count(0)
    page.set_viewport_size({'width':900,'height':800})
    expect(trigger).to_have_attribute('aria-expanded','false')
    passed('Menu dismisses on outside interaction, focus leaving it, and switching to desktop; it does not reopen after resizing')

    page.emulate_media(reduced_motion='no-preference')
    for width,height in [(320,568),(390,844),(768,950),(820,1180),(900,950),(1024,720),(844,390),(1366,950)]:
        page.set_viewport_size({'width':width,'height':height})
        page.goto(URL,wait_until='networkidle')
        page.evaluate('document.fonts.ready')
        scene = page.locator('.landing-skills-scene')
        scene.evaluate('node=>scrollTo({top:scrollY+node.getBoundingClientRect().top-100,behavior:"instant"})')
        page.wait_for_timeout(180)
        nodes = page.locator('.landing-skill-node')
        for previous,current in zip(nodes.all(),nodes.all()[1:]):
            a,b=previous.bounding_box(),current.bounding_box()
            assert a['y']+a['height']+2 <= b['y'], (width,height,a,b)
        assert page.locator('.landing-skills-copy').bounding_box()['width'] >= 270
        if 'is-static' not in scene.get_attribute('class'):
            for progress in [.1,.5,.9]:
                scene.evaluate('''(node,p)=>{const stage=node.firstElementChild;scrollTo({top:scrollY+node.getBoundingClientRect().top-parseFloat(getComputedStyle(stage).top)+(node.offsetHeight-stage.offsetHeight)*p,behavior:'instant'})}''',progress)
                page.wait_for_timeout(120)
                for selector in ['.landing-skills-copy','.landing-skill-map > figcaption']:
                    box=page.locator(selector).bounding_box()
                    assert box['y'] >= page.locator('.landing-header').bounding_box()['height'] and box['y']+box['height']<=height, (width,height,selector,box)
                count=page.locator('.landing-skill-node[data-connected="true"]').count()
                expect(page.locator('[data-skill-count]')).to_have_text(str(count))
        if width==320:
            expect(page.locator('.landing-catalog-scene')).to_have_class('landing-catalog-scene is-static')
        page.screenshot(path=str(OUTPUT/f'landing-ux-skills-{width}-{height}.png'))
    passed('Knowledge cards do not overlap at narrow/tablet widths; sticky text and calls to action fit, short catalogs unpin, and connected counts match the diagram')

    for width,height in [(320,568),(390,844),(820,1180),(844,390),(1366,950)]:
        page.set_viewport_size({'width':width,'height':height})
        page.goto(URL,wait_until='networkidle')
        stage=page.locator('.particle-story-stage')
        expect(stage).to_have_attribute('data-canvas-ready','true')
        for progress,view in [(.1,'curio'),(.45,'orbit'),(.8,'book'),(.1,'curio')]:
            stage.evaluate('''(node,p)=>{const header=document.querySelector('.landing-header').getBoundingClientRect().bottom;scrollTo({top:scrollY+node.getBoundingClientRect().bottom-innerHeight+p*(innerHeight-header-node.offsetHeight),behavior:'instant'})}''',progress)
            page.wait_for_timeout(160)
            expect(stage).to_have_attribute('data-view',view)
            box=stage.bounding_box()
            assert box['y'] >= page.locator('.landing-header').bounding_box()['height']-1 and box['y']+box['height']<=height+1,(width,height,view,box)
        page.screenshot(path=str(OUTPUT/f'landing-ux-particles-{width}-{height}.png'))
    passed('Every automatic particle shape appears with the full canvas visible below the header, including phone landscape; reverse scroll restores it')
    assert not errors, errors
    passed('All regression journeys finish without JavaScript errors')
    browser.close()
print(f'\n{checks} landing UX checks passed.')

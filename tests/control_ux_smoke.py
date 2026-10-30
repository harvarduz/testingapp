"""Control placement and clipped keyboard focus regressions. Local app only."""
import os
from pathlib import Path
import re
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('CURIO_TEST_URL', 'http://127.0.0.1:4191/').rstrip('/') + '/'
assert urlparse(URL).hostname in ('127.0.0.1', 'localhost')
ENGINE = os.environ.get('CURIO_TEST_BROWSER', 'chromium')
OUTPUT = ROOT / 'test-results'; OUTPUT.mkdir(exist_ok=True)
checks = 0

def passed(description):
    global checks
    checks += 1
    print(f'PASS {checks} [{ENGINE}]: {description}', flush=True)

def focus_is_reachable(page):
    assert page.evaluate('''()=>{
      const node=document.activeElement, r=node.getBoundingClientRect();
      const box=node.closest('.account-popover').getBoundingClientRect();
      return r.top>=box.top && r.bottom<=box.bottom && r.top>=0 && r.bottom<=innerHeight
        && node.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));
    }'''), page.locator('.account-popover').evaluate('n=>({scroll:n.scrollTop,focus:document.activeElement.textContent,rect:document.activeElement.getBoundingClientRect().toJSON()})')

def audit(page, label):
    page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
    violations = page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations")
    assert not violations, (label, [(v['id'], [n['target'] for n in v['nodes']]) for v in violations])

with sync_playwright() as p:
    options = {'executable_path':'/usr/bin/chromium','args':['--no-sandbox']} if ENGINE == 'chromium' else {}
    if ENGINE == 'webkit' and os.environ.get('CURIO_WEBKIT_EXECUTABLE'):
        options['executable_path'] = os.environ['CURIO_WEBKIT_EXECUTABLE']
    browser = getattr(p,ENGINE).launch(**options)
    page = browser.new_page()
    errors = []; page.on('pageerror',lambda error:errors.append(str(error)))
    for width,height in [(320,568),(390,844),(844,390),(1000,800),(1001,800),(1100,500),(1366,900)]:
        page.set_viewport_size({'width':width,'height':height})
        page.goto(URL,wait_until='networkidle')
        for selector in ['.landing-learning-particles','.landing-method','.landing-course-section','.landing-creator-particles','.landing-final']:
            page.locator(selector).scroll_into_view_if_needed(); page.wait_for_timeout(100)
            expect(page.locator('.landing-effects-pause')).to_have_count(0)
            expect(page.locator('.landing-main').get_by_role('button',name=re.compile('^(Pause|Play).*animation'))).to_have_count(0)
            expect(page.locator('.landing-particle-effects').locator('button,a,input,[tabindex]')).to_have_count(0)
            assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
        if width<=1000:
            page.get_by_role('button',name='Open website navigation',exact=True).click()
        pause = page.get_by_role('button',name='Pause page animations',exact=True)
        expect(pause).to_have_count(1); pause.click()
        expect(page.locator('.landing-particle-effects')).to_have_attribute('data-motion','paused')
        play = page.get_by_role('button',name='Play page animations',exact=True)
        expect(play).to_have_count(1); play.click()
        expect(page.locator('.landing-particle-effects')).to_have_attribute('data-motion','active')
        if width<=1000: page.get_by_role('button',name='Close website navigation',exact=True).click()
        else:
            assert pause.evaluate('n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&n.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))}')
        passed(f'{width}×{height}: no card overlays, one reachable page motion control, no overflow')

    for route in ['home','explore']:
        for width,height in [(390,300),(1024,350),(844,180)]:
            page.set_viewport_size({'width':width,'height':height})
            page.goto(URL+'#'+route,wait_until='networkidle')
            opener = page.get_by_role('button',name='Open account menu',exact=True)
            opener.click()
            menu = page.get_by_role('region',name='Account menu')
            box = menu.bounding_box()
            assert box['y']>=0 and box['y']+box['height']<=height
            focus_is_reachable(page)
            for key in ['End','Home','ArrowUp','ArrowDown','End']:
                page.keyboard.press(key); focus_is_reachable(page)
            assert menu.evaluate('n=>n.scrollTop')>0
            page.keyboard.press('Escape'); expect(opener).to_be_focused()
        passed(f'{route}: short-window account menus reveal initial/arrow/Home/End focus and close predictably')

    titles = {'overview':'Your learning, at a glance.','explore':'Find your next course.','learning':'My learning.','practice':'Practice & review.','paths':'Your next step, mapped out.','lab':'A playground for real ideas.','achievements':'Your achievements.','creators':'Creator workspace.'}
    for width,height in [(320,568),(1001,768),(1366,900)]:
        page.set_viewport_size({'width':width,'height':height})
        for route in ['overview','explore','learning','practice','paths','lab','achievements','creators']:
            page.goto(URL+'#'+route,wait_until='networkidle')
            expect(page.locator('#main-content h1')).to_have_text(titles[route])
            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
            if page.evaluate('document.documentElement.scrollWidth>innerWidth'):
                details = page.evaluate('''()=>[...document.querySelectorAll('button')]
                  .filter(n=>n.getBoundingClientRect().right>innerWidth+1)
                  .map(n=>({text:n.textContent,html:n.parentElement.outerHTML.slice(0,1400),rect:n.getBoundingClientRect().toJSON()}))''')
                page.screenshot(path=str(OUTPUT/f'controls-{ENGINE}-overflow-{width}-{route}.png'),full_page=True)
                raise AssertionError((width,route,details))
            page.get_by_role('button',name='Open account menu',exact=True).click()
            expect(page.get_by_role('region',name='Account menu')).to_be_visible()
            page.keyboard.press('End'); focus_is_reachable(page)
            page.keyboard.press('Escape')
        passed(f'{width}px: eight learning routes and account actions fit without page overflow or runtime errors')

    page.set_viewport_size({'width':1366,'height':900}); page.goto(URL,wait_until='networkidle')
    page.get_by_role('button',name='Switch to dark theme',exact=True).click()
    page.locator('.landing-method').scroll_into_view_if_needed(); page.wait_for_timeout(700)
    expect(page.locator('.landing-effects-pause')).to_have_count(0)
    page.screenshot(path=str(OUTPUT/f'controls-{ENGINE}-dark-method.png'))
    audit(page,'Dark method cards')
    page.get_by_role('button',name='Open account menu',exact=True).click()
    audit(page,'Dark account menu')
    page.keyboard.press('Escape')
    page.emulate_media(reduced_motion='reduce')
    expect(page.get_by_role('button',name='Pause page animations',exact=True)).to_have_count(0)
    expect(page.locator('.landing-particle-effects')).to_have_attribute('data-motion','reduced')
    passed('Dark method cards/account menus pass accessibility; reduced motion needs no redundant pause controls')
    assert not errors,errors
    browser.close()
print(f'{checks} control UX checks passed in {ENGINE}.',flush=True)

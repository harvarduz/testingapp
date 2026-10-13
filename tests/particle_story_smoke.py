"""Verify the SI.gov-inspired particle scene using actual canvas pixels and input.
Build and start a local test server first. Never writes to a public deployment.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('CURIO_TEST_URL', 'http://127.0.0.1:5173/').rstrip('/') + '/'
OUTPUT = ROOT / 'test-results'; OUTPUT.mkdir(exist_ok=True)
checks, audits = 0, []

def passed(message):
    global checks
    checks += 1
    print(f'PASS {checks}: {message}', flush=True)

def audit(page, name):
    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    violations = page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations")
    audits.append({'screen':name,'violations':violations})
    (OUTPUT/'particle-story-accessibility.json').write_text(json.dumps(audits,indent=2))
    assert not violations,(name,[(v['id'],[n['target'] for n in v['nodes']]) for v in violations])

def pixels(page):
    return page.locator('.particle-story-stage canvas').evaluate('node=>node.toDataURL()')

def position(page, progress):
    return page.locator('.particle-story-stage').evaluate('(node,p)=>scrollY+node.getBoundingClientRect().top-innerHeight+p*(innerHeight+node.offsetHeight)',progress)

def settle(page):
    page.evaluate('document.fonts.ready');page.wait_for_timeout(150)

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='no-preference')
    context.add_init_script('window.__rafCalls=0;const raf=window.requestAnimationFrame;window.requestAnimationFrame=fn=>{window.__rafCalls++;return raf.call(window,fn)};')
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL,wait_until='networkidle');settle(page)
    stage=page.locator('.particle-story-stage');choices=page.get_by_role('group',name='Particle views')
    expect(stage).to_have_attribute('data-canvas-ready','true')
    expect(stage.locator('canvas')).to_have_attribute('aria-hidden','true')
    expect(stage).to_have_attribute('data-particle-count','900')
    for progress,view in [(.35,'curio'),(.67,'orbit'),(.89,'book'),(.35,'curio')]:
        page.mouse.wheel(0,position(page,progress)-page.evaluate('scrollY'));page.wait_for_timeout(220)
        expect(stage).to_have_attribute('data-view',view)
    passed('Native scrolling morphs the sampled Curio lettering into an orbit and book, and reverses to the original view')

    button=choices.get_by_role('button',name='Curio',exact=True);button.focus();page.keyboard.press('Space')
    expect(button).to_be_focused();expect(button).to_have_attribute('aria-pressed','true')
    page.mouse.move(0,0);page.wait_for_timeout(1800)
    baseline=pixels(page)
    box=stage.bounding_box();page.mouse.move(box['x']+box['width']*.51,box['y']+box['height']*.5);page.wait_for_timeout(250)
    assert pixels(page)!=baseline
    page.mouse.move(0,0);page.wait_for_timeout(2200)
    before=page.evaluate('window.__rafCalls');image=pixels(page);page.wait_for_timeout(250)
    assert page.evaluate('window.__rafCalls')==before and pixels(page)==image
    passed('Pointer movement displaces the dots; lettering returns and requests no idle frames after it settles')

    choices.get_by_role('button',name='Connections',exact=True).click();page.wait_for_timeout(500)
    a=pixels(page);page.wait_for_timeout(180);assert pixels(page)!=a
    page.get_by_role('button',name='Pause animation',exact=True).click();page.wait_for_timeout(150)
    expect(stage).to_have_attribute('data-particle-motion','paused')
    before=page.evaluate('window.__rafCalls');a=pixels(page);page.wait_for_timeout(300)
    assert pixels(page)==a and page.evaluate('window.__rafCalls')==before
    choices.get_by_role('button',name='Discovery',exact=True).click();expect(stage).to_have_attribute('data-view','book');assert pixels(page)!=a
    expect(page.get_by_role('button',name='Play animation',exact=True)).to_be_visible()
    choices.get_by_role('button',name='Connections',exact=True).click()
    page.get_by_role('button',name='Play animation',exact=True).click();page.wait_for_timeout(120)
    a=pixels(page);page.wait_for_timeout(180);assert pixels(page)!=a
    passed('Pause freezes exact canvas pixels and stops frames; manual views work while paused and Play resumes the orbit')

    page.mouse.wheel(0,page.evaluate('document.documentElement.scrollHeight'));page.wait_for_timeout(300)
    expect(stage).to_have_attribute('data-particle-motion','offscreen')
    before=page.evaluate('window.__rafCalls');page.wait_for_timeout(300);assert page.evaluate('window.__rafCalls')==before
    saved=json.loads(page.evaluate("localStorage.getItem('curio.student.v1')"))
    assert not saved['completed'] and not saved['enrolled'] and not saved['practiceAttempts']
    passed('Leaving the scene stops animation work; visual interaction changes no learning records or Curio coins')

    for mode in ['light','dark']:
        page.evaluate('(mode)=>localStorage.setItem("curio.appearance.v1",JSON.stringify({version:2,seed:"#1a73e8",mode}))',mode)
        page.reload(wait_until='networkidle');settle(page)
        page.get_by_role('button',name='Pause animation',exact=True).click()
        for width in [320,390,1366]:
            page.set_viewport_size({'width':width,'height':900});page.wait_for_timeout(150)
            for label in ['Curio','Connections','Discovery']:
                choices.get_by_role('button',name=label,exact=True).click()
                assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
                for control in choices.get_by_role('button').all():
                    box=control.bounding_box();assert box['height']>=44 and box['width']>=44
                ratio=stage.locator('canvas').evaluate('node=>node.width/node.clientWidth');assert ratio<=2.01
                audit(page,f'{mode} {label} at {width}px')
            stage.evaluate('node=>scrollTo({top:scrollY+node.getBoundingClientRect().top-100,behavior:"instant"})')
            page.screenshot(path=str(OUTPUT/f'particles-{mode}-{width}.png'))
    passed('Three views fit 320/390/1366 px, cap canvas resolution, and pass 18 light/dark accessibility states')

    page.emulate_media(reduced_motion='reduce');expect(page.get_by_text('Motion reduced',exact=True)).to_be_visible()
    expect(page.get_by_role('button',name='Play animation',exact=True)).to_have_count(0)
    choices.get_by_role('button',name='Curio',exact=True).click();settle(page)
    expect(stage).to_have_attribute('data-particle-motion','reduced')
    before=page.evaluate('window.__rafCalls');a=pixels(page);page.wait_for_timeout(300)
    assert pixels(page)==a and page.evaluate('window.__rafCalls')==before
    choices.get_by_role('button',name='Discovery',exact=True).click();assert pixels(page)!=a
    audit(page,'Reduced motion with working static views')
    passed('Reduced motion displays complete static shapes with usable view controls and no animation frames')

    for unavailable in ['observer','canvas']:
        fallback=browser.new_context(viewport={'width':390,'height':844},reduced_motion='no-preference' if unavailable=='observer' else 'reduce')
        fallback.add_init_script('delete window.IntersectionObserver;' if unavailable=='observer' else 'HTMLCanvasElement.prototype.getContext=()=>null;')
        view=fallback.new_page();view.on('pageerror',lambda e:errors.append(str(e)));view.goto(URL,wait_until='networkidle');settle(view)
        if unavailable=='observer':
            view.get_by_role('group',name='Particle views').get_by_role('button',name='Discovery',exact=True).click()
            expect(view.locator('.particle-story-stage')).to_have_attribute('data-view','book')
            expect(view.locator('.particle-story-stage')).to_have_attribute('data-particle-motion','reduced')
        else:
            expect(view.locator('.particle-story-fallback')).to_be_visible()
            expect(view.get_by_role('group',name='Particle views')).to_have_count(0)
        audit(view,f'{unavailable} fallback');fallback.close()
    passed('Missing observer support retains static views; missing Canvas shows the brand without broken animation controls')

    touch=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=3,reduced_motion='reduce')
    phone=touch.new_page();phone.goto(URL,wait_until='networkidle');settle(phone)
    phone.get_by_role('group',name='Particle views').get_by_role('button',name='Discovery',exact=True).tap()
    expect(phone.locator('.particle-story-stage')).to_have_attribute('data-view','book')
    phone.locator('.particle-story-stage').evaluate('node=>scrollTo({top:scrollY+node.getBoundingClientRect().top-150,behavior:"instant"})')
    cdp=touch.new_cdp_session(phone);before=phone.evaluate('scrollY')
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':190,'y':330}]})
    for y in [300,270,240,210,180]:
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':190,'y':y}]});phone.wait_for_timeout(30)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});phone.wait_for_timeout(200)
    assert phone.evaluate('scrollY')>before
    phone.get_by_role('button',name='Explore a subject',exact=True).tap()
    expect(phone).to_have_url(URL+'#explore');expect(phone.locator('.course-card')).to_have_count(20)
    assert not errors,errors
    passed('Actual touchscreen view selection and canvas swipes work; the section opens the real course catalog')
    touch.close();context.close();browser.close()

print(f'\n{checks} particle checks and {len(audits)} accessibility states passed.')

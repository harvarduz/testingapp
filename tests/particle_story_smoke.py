"""Check the SI.gov-inspired hero with real canvas pixels, scrolling, and input.
Build and start a local test server first. Never writes to a public deployment.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('CURIO_TEST_URL', 'http://127.0.0.1:5173/').rstrip('/') + '/'
OUTPUT = ROOT / 'test-results'
OUTPUT.mkdir(exist_ok=True)
checks, audits = 0, []


def passed(message):
    global checks
    checks += 1
    print(f'PASS {checks}: {message}', flush=True)


def audit(page, name):
    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    violations = page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations")
    audits.append({'screen': name, 'violations': violations})
    (OUTPUT / 'particle-story-accessibility.json').write_text(json.dumps(audits, indent=2))
    assert not violations, (name, [(v['id'], [n['target'] for n in v['nodes']]) for v in violations])


def pixels(page):
    return page.locator('.particle-story-stage canvas').evaluate('node=>node.toDataURL()')


def position(page, progress):
    return page.locator('.landing-particle-story').evaluate('''(node,p)=>{
        const stage=node.querySelector('.particle-story-stage');
        const inset=parseFloat(getComputedStyle(stage).top)||0;
        return scrollY+node.getBoundingClientRect().top-inset+p*(node.offsetHeight-stage.offsetHeight);
    }''', progress)


def scroll_to(page, progress):
    page.evaluate('(top)=>scrollTo({top,behavior:"instant"})', position(page, progress))
    page.wait_for_timeout(220)


def settle(page):
    page.evaluate('document.fonts.ready')
    page.wait_for_timeout(200)


def assert_copy_clear(page):
    report = page.locator('.particle-story-stage canvas').evaluate('''canvas=>{
        const stage=canvas.getBoundingClientRect(),ratio=canvas.width/stage.width;
        const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let inspected=0,painted=0;
        for(const copy of document.querySelectorAll('.landing-particle-story .landing-hero-copy,.landing-particle-story .particle-story-copy')){
            const rect=copy.getBoundingClientRect();
            const left=Math.max(0,Math.ceil((rect.left-stage.left)*ratio));
            const right=Math.min(canvas.width,Math.floor((rect.right-stage.left)*ratio));
            const top=Math.max(0,Math.ceil((rect.top-stage.top)*ratio));
            const bottom=Math.min(canvas.height,Math.floor((rect.bottom-stage.top)*ratio));
            for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
                inspected++;if(data[(y*canvas.width+x)*4+3]>16)painted++;
            }
        }
        return {inspected,painted};
    }''')
    assert report['inspected'] > 0 and report['painted'] == 0, report


def ink_bounds(page):
    return page.locator('.particle-story-stage canvas').evaluate('''node=>{
        const {width:w,height:h}=node;
        const data=node.getContext('2d').getImageData(0,0,w,h).data;
        let left=w,top=h,right=0,bottom=0,ink=0,white=0;
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){
            const i=(y*w+x)*4;
            if(data[i+3]<48)continue;
            ink++;if(data[i]>210&&data[i+1]>210&&data[i+2]>210)white++;
            left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
        }
        return {left:left/w,top:top/h,width:(right-left)/w,height:(bottom-top)/h,ink,white};
    }''')


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='no-preference')
    context.add_init_script('window.__rafCalls=0;const raf=window.requestAnimationFrame;window.requestAnimationFrame=fn=>{window.__rafCalls++;return raf.call(window,fn)};')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL, wait_until='networkidle')
    settle(page)
    stage = page.locator('.particle-story-stage')
    scene = page.locator('.landing-particle-story')
    choices = page.get_by_role('group', name='Particle views')
    expect(stage).to_have_attribute('data-canvas-ready', 'true')
    expect(stage.locator('canvas')).to_have_attribute('aria-hidden', 'true')
    expect(stage).to_have_attribute('data-particle-count', '1800')
    expect(page.locator('#landing-title')).to_have_text('Learn it.Make it yours.')
    page.mouse.move(0, 0)
    page.wait_for_timeout(2500)
    box = stage.bounding_box()
    header = page.locator('.landing-header').bounding_box()
    assert abs(box['y'] - header['height']) <= 2 and box['width'] >= 1440 * .95, box
    assert box['height'] >= 1000 * .75, box
    ink = ink_bounds(page)
    assert ink['ink'] > 5000 and ink['white'] / ink['ink'] > .7, ink
    assert ink['width'] > .65 and ink['height'] > .2 and ink['top'] < .2, ink
    background = scene.evaluate('node=>getComputedStyle(node).backgroundColor')
    rgb = [int(v.strip()) for v in background.removeprefix('rgb(').removesuffix(')').split(',')]
    assert max(rgb[:2]) < 70 and rgb[2] > rgb[0] * 1.5, background
    page.screenshot(path=str(OUTPUT / 'particles-reference-hero.png'))
    passed('The first screen is a full-width navy particle hero with large, predominantly white lettering, rather than a small lower-page illustration')

    page.get_by_role('button', name='Pause animation', exact=True).click()
    choices.get_by_role('button', name='Connections', exact=True).click()
    centered = ink_bounds(page)
    assert abs(centered['left'] + centered['width'] / 2 - .5) < .025, centered
    assert centered['left'] > .15 and centered['left'] + centered['width'] < .85, centered
    heading_top = page.locator('#landing-title').bounding_box()['y']
    assert box['y'] + (centered['top'] + centered['height']) * box['height'] < heading_top - 20, centered
    page.screenshot(path=str(OUTPUT / 'particles-connections-centered.png'))
    scroll_to(page, .95)
    choices.get_by_role('button', name='Curio', exact=True).click()
    choices.get_by_role('button', name='Connections', exact=True).click()
    beside_copy = ink_bounds(page)
    assert beside_copy['left'] + beside_copy['width'] / 2 > .68, beside_copy
    scroll_to(page, 0)
    choices.get_by_role('button', name='Curio', exact=True).click()
    page.get_by_role('button', name='Follow scroll', exact=True).click()
    page.wait_for_timeout(100)
    passed('Connections is centered above the first-screen heading and moves right only beside the second-panel text')

    baseline = pixels(page)
    page.mouse.move(box['x'] + box['width'] * .5, box['y'] + box['height'] * .25)
    expect(stage).to_have_attribute('data-view', 'phrase')
    page.wait_for_timeout(350)
    assert pixels(page) != baseline
    page.mouse.move(0, 0)
    expect(stage).to_have_attribute('data-view', 'curio')
    page.wait_for_timeout(2800)
    before = page.evaluate('window.__rafCalls')
    image = pixels(page)
    page.wait_for_timeout(300)
    assert page.evaluate('window.__rafCalls') == before and pixels(page) == image
    transform = page.get_by_role('button', name='Transform lettering', exact=True)
    transform.focus()
    page.keyboard.press('Space')
    expect(transform).to_be_focused()
    expect(stage).to_have_attribute('data-view', 'phrase')
    passed('Hover transforms the word and leaving restores it; settled lettering requests no idle frames, and keyboard users can transform it too')

    page.get_by_role('button', name='Follow scroll', exact=True).click()
    stage.locator('canvas').evaluate('node=>node.__sameParticleCanvas=true')
    frames = []
    for progress, view in [(.02, 'curio'), (.7, 'orbit'), (.95, 'orbit'), (.02, 'curio')]:
        page.mouse.wheel(0, position(page, progress) - page.evaluate('scrollY'))
        page.wait_for_timeout(350)
        expect(stage).to_have_attribute('data-view', view)
        actual = float(scene.get_attribute('data-scroll-progress'))
        assert abs(actual - progress) < .04, (actual, progress)
        box = stage.bounding_box()
        header = page.locator('.landing-header').bounding_box()
        assert box['y'] >= header['height'] - 1 and box['y'] + box['height'] <= 1001, box
        assert stage.locator('canvas').evaluate('node=>node.__sameParticleCanvas===true')
        frames.append(pixels(page))
    assert frames[0] != frames[1] and frames[1] != frames[2]
    scroll_to(page, .35)
    intermediate = pixels(page)
    scroll_to(page, .7)
    assert pixels(page) != intermediate
    page.screenshot(path=str(OUTPUT / 'particles-reference-connections.png'))
    passed('Native scrolling keeps one viewport-sized canvas pinned while the same particles become a rotating sphere; scroll progress and intermediate pixels reverse')

    for progress in [.2, .4, .6]:
        scroll_to(page, progress)
        assert_copy_clear(page)
    choices.get_by_role('button', name='Connections', exact=True).click()
    scroll_to(page, .2)
    assert_copy_clear(page)
    passed('Intermediate scroll morphs and the manually chosen sphere keep canvas ink out of the real heading, lesson description, and action bounds')

    button = choices.get_by_role('button', name='Curio', exact=True)
    button.focus()
    page.keyboard.press('Space')
    expect(button).to_be_focused()
    expect(button).to_have_attribute('aria-pressed', 'true')
    choices.get_by_role('button', name='Connections', exact=True).click()
    page.wait_for_timeout(500)
    a = pixels(page)
    page.wait_for_timeout(180)
    assert pixels(page) != a
    page.get_by_role('button', name='Pause animation', exact=True).click()
    page.wait_for_timeout(200)
    expect(stage).to_have_attribute('data-particle-motion', 'paused')
    before = page.evaluate('window.__rafCalls')
    a = pixels(page)
    page.wait_for_timeout(300)
    assert pixels(page) == a and page.evaluate('window.__rafCalls') == before
    choices.get_by_role('button', name='Curio', exact=True).click()
    expect(stage).to_have_attribute('data-view', 'curio')
    assert pixels(page) != a
    expect(page.get_by_role('button', name='Play animation', exact=True)).to_be_visible()
    choices.get_by_role('button', name='Connections', exact=True).click()
    page.get_by_role('button', name='Play animation', exact=True).click()
    page.wait_for_timeout(150)
    a = pixels(page)
    page.wait_for_timeout(180)
    assert pixels(page) != a
    passed('Pause freezes exact canvas pixels and stops frames; manual views work while paused and Play resumes the sphere')

    expect(page.locator('.particle-story-figure figcaption')).to_contain_text('Your selected shape stays active')
    page.get_by_role('button', name='Follow scroll', exact=True).click()
    expect(page.get_by_role('button', name='Follow scroll', exact=True)).to_have_count(0)
    for progress, view in [(.02, 'curio'), (.95, 'orbit'), (.02, 'curio')]:
        scroll_to(page, progress)
        expect(stage).to_have_attribute('data-view', view)
    passed('Manual shape selection has a working way back to reversible scroll playback with accurate instructions')

    page.mouse.wheel(0, page.evaluate('document.documentElement.scrollHeight'))
    page.wait_for_timeout(350)
    expect(stage).to_have_attribute('data-particle-motion', 'offscreen')
    image = pixels(page)
    page.wait_for_timeout(300)
    assert pixels(page) == image
    saved = json.loads(page.evaluate("localStorage.getItem('curio.student.v1')"))
    assert not saved['completed'] and not saved['enrolled'] and not saved['practiceAttempts']
    passed('Leaving the scene stops animation work; decorative interaction changes no learning records or Curio coins')

    for mode in ['light', 'dark']:
        page.evaluate('(mode)=>localStorage.setItem("curio.appearance.v1",JSON.stringify({version:2,seed:"#1a73e8",mode}))', mode)
        page.reload(wait_until='networkidle')
        settle(page)
        page.get_by_role('button', name='Pause animation', exact=True).click()
        for width in [320, 390, 1366]:
            page.set_viewport_size({'width': width, 'height': 900})
            page.wait_for_timeout(200)
            for label in ['Curio', 'Connections', 'Transform lettering']:
                if label == 'Transform lettering':
                    choices.get_by_role('button', name='Curio', exact=True).click()
                    page.get_by_role('button', name=label, exact=True).click()
                    expect(stage).to_have_attribute('data-view', 'phrase')
                else:
                    choices.get_by_role('button', name=label, exact=True).click()
                scroll_to(page, .02)
                assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
                ink = ink_bounds(page) if label == 'Transform lettering' else None
                stage_box = stage.bounding_box()
                for control in page.locator('.particle-story-controls button').all():
                    box = control.bounding_box()
                    assert box['height'] >= 44 and box['width'] >= 44, (width, label, box)
                    if ink:
                        ink_top = stage_box['y'] + ink['top'] * stage_box['height']
                        ink_bottom = ink_top + ink['height'] * stage_box['height']
                        assert box['y'] + box['height'] <= ink_top - 4 or box['y'] >= ink_bottom + 4, ('Toolbar overlaps lettering', width, box, ink_top, ink_bottom)
                ratio = stage.locator('canvas').evaluate('node=>node.width/node.clientWidth')
                assert ratio <= 2.01
                audit(page, f'{mode} {label} at {width}px')
            page.screenshot(path=str(OUTPUT / f'particles-{mode}-{width}.png'))
    passed('Word, phrase, and sphere fit 320/390/1366 px with touch-sized controls, capped canvas resolution, and 18 passing light/dark accessibility states')

    page.emulate_media(reduced_motion='reduce')
    expect(page.get_by_text('Motion reduced', exact=True)).to_be_visible()
    expect(page.locator('.particle-story-figure figcaption')).to_contain_text('Motion is reduced')
    expect(page.get_by_role('button', name='Play animation', exact=True)).to_have_count(0)
    choices.get_by_role('button', name='Curio', exact=True).click()
    settle(page)
    expect(stage).to_have_attribute('data-particle-motion', 'reduced')
    before = page.evaluate('window.__rafCalls')
    a = pixels(page)
    page.wait_for_timeout(300)
    assert pixels(page) == a and page.evaluate('window.__rafCalls') == before
    choices.get_by_role('button', name='Connections', exact=True).click()
    assert pixels(page) != a
    audit(page, 'Reduced motion with working static views')
    passed('Reduced motion displays complete static shapes with usable controls and no animation frames')

    for unavailable in ['observer', 'canvas']:
        fallback = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='no-preference' if unavailable == 'observer' else 'reduce')
        fallback.add_init_script('delete window.IntersectionObserver;' if unavailable == 'observer' else 'HTMLCanvasElement.prototype.getContext=()=>null;')
        view = fallback.new_page()
        view.on('pageerror', lambda e: errors.append(str(e)))
        view.goto(URL, wait_until='networkidle')
        settle(view)
        if unavailable == 'observer':
            view.get_by_role('group', name='Particle views').get_by_role('button', name='Connections', exact=True).click()
            expect(view.locator('.particle-story-stage')).to_have_attribute('data-view', 'orbit')
            expect(view.locator('.particle-story-stage')).to_have_attribute('data-particle-motion', 'reduced')
        else:
            expect(view.locator('.particle-story-fallback')).to_be_visible()
            expect(view.get_by_role('group', name='Particle views')).to_have_count(0)
            assert view.locator('.particle-story-stage').evaluate('node=>getComputedStyle(node).position') != 'sticky'
            scroll_to(view, .9)
            fallback_box = view.locator('.particle-story-fallback').bounding_box()
            assert fallback_box['y'] + fallback_box['height'] < view.locator('.landing-header').bounding_box()['height'], fallback_box
            expect(view.get_by_role('button', name='Explore a subject', exact=True)).to_be_visible()
        audit(view, f'{unavailable} fallback')
        fallback.close()
    passed('Missing observer support retains static views; missing Canvas shows the brand without broken animation controls')

    touch = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=3, reduced_motion='no-preference')
    phone = touch.new_page()
    phone.goto(URL, wait_until='networkidle')
    settle(phone)
    phone_stage = phone.locator('.particle-story-stage')
    phone_box = phone_stage.bounding_box()
    phone.touchscreen.tap(phone_box['x'] + phone_box['width'] * .5, phone_box['y'] + phone_box['height'] * .23)
    expect(phone_stage).to_have_attribute('data-view', 'phrase')
    phone.touchscreen.tap(phone_box['x'] + phone_box['width'] * .5, phone_box['y'] + phone_box['height'] * .23)
    expect(phone_stage).to_have_attribute('data-view', 'curio')
    ratio = phone_stage.locator('canvas').evaluate('node=>node.width/node.clientWidth')
    assert ratio <= 2.01, ratio
    cdp = touch.new_cdp_session(phone)
    before = phone.evaluate('scrollY')
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 190, 'y': 330}]})
    for y in [300, 270, 240, 210, 180]:
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 190, 'y': y}]})
        phone.wait_for_timeout(30)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    phone.wait_for_timeout(250)
    assert phone.evaluate('scrollY') > before
    phone.get_by_role('button', name='Explore a subject', exact=True).tap()
    expect(phone).to_have_url(URL + '#explore')
    expect(phone.locator('.course-card')).to_have_count(20)
    assert not errors, errors
    passed('Actual touchscreen taps transform the lettering, canvas swipes scroll normally, DPR 3 stays capped, and the scene opens the real course catalog')
    touch.close()
    context.close()
    browser.close()

print(f'\n{checks} particle checks and {len(audits)} accessibility states passed.')

"""Check SAT Stars inspired scroll-linked numbers, gauges and knowledge connections.
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


def scene_position(page, selector, progress):
    return page.locator(selector).evaluate("""(node,progress)=>{
        const stage=node.firstElementChild;
        return scrollY+node.getBoundingClientRect().top-parseFloat(getComputedStyle(stage).top)
            +(node.offsetHeight-stage.offsetHeight)*progress;
    }""",progress)


def go_to(page, selector, progress):
    page.evaluate('(top)=>scrollTo({top,behavior:"instant"})',scene_position(page,selector,progress))
    page.wait_for_timeout(120)


def catalog_snapshot(page):
    return page.locator('.landing-catalog-scene').evaluate("""node=>({
        values:[...node.querySelectorAll('[data-scroll-value]')].map(node=>node.textContent),
        offsets:[...node.querySelectorAll('.landing-catalog-fill')].map(node=>Number(node.style.strokeDashoffset)),
        knobs:[...node.querySelectorAll('.landing-catalog-knob')].map(node=>[node.getAttribute('cx'),node.getAttribute('cy')])
    })""")


def assert_pinned_fits(page, selector):
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    box=page.locator(selector).bounding_box()
    assert box['y']>=70 and box['y']+box['height']<=page.viewport_size['height']-8,box
    if selector=='.landing-skills-stage':
        title=page.locator('#landing-skills-title').bounding_box()
        caption=page.locator('.landing-skill-map > figcaption').bounding_box()
        assert title['y']>=70 and caption['y']+caption['height']<=page.viewport_size['height']-8,(title,caption)


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
            page.evaluate('document.fonts.ready')
            courses = context.request.get(url+'api/courses').json()['courses']
            totals = [len(courses),sum(len(course['lessons']) for course in courses),len({course['category'] for course in courses})]
            values = page.locator('[data-scroll-value]')
            assert page.locator('.landing-scroll-number .sr-only').all_text_contents() == list(map(str,totals))
            page.set_viewport_size({'width':1366,'height':900})
            go_to(page,'.landing-catalog-scene',0)
            expect(values.nth(1)).to_have_text('0')
            widths = [values.nth(i).bounding_box()['width'] for i in range(3)]
            go_to(page,'.landing-catalog-scene',1)
            for i,total in enumerate(totals): expect(values.nth(i)).to_have_text(str(total))
            assert widths == [values.nth(i).bounding_box()['width'] for i in range(3)]
            passed('Real catalog totals and stable accessible numbers remain accurate without changing layout width')

            snapshots=[]
            for progress in [0,.22,.45,.72,1,.45]:
                top=scene_position(page,'.landing-catalog-scene',progress)
                page.mouse.wheel(0,top-page.evaluate('scrollY'));page.wait_for_timeout(150)
                snapshots.append(catalog_snapshot(page))
                assert_pinned_fits(page,'.landing-catalog-stage')
            numeric=[list(map(int,item['values'])) for item in snapshots]
            for i in range(4): assert all(a<=b for a,b in zip(numeric[i],numeric[i+1])), numeric
            assert numeric[0]==[0,0,0] and numeric[4]==totals and numeric[-1]==numeric[2]
            assert all(abs(a-b)<.002 for a,b in zip(snapshots[-1]['offsets'],snapshots[2]['offsets']))
            before=catalog_snapshot(page);page.wait_for_timeout(800);assert catalog_snapshot(page)==before
            assert 0<float(before['offsets'][1])<1
            passed('Native wheel scrolling drives numbers, arcs and pointer positions; reverse scroll restores them and pausing freezes the exact frame')

            assert page.locator('.landing-catalog-total').all_text_contents()==[f'of {total}' for total in totals]
            skip=page.get_by_role('button',name='Show all totals',exact=True)
            skip.focus();page.keyboard.press('Enter')
            expect(skip).to_be_focused()
            for i,total in enumerate(totals): expect(values.nth(i)).to_have_text(str(total))
            passed('Visible inventory totals clarify partial scroll values; the keyboard shortcut reveals every total without losing focus')

            for progress,index in [(.10,0),(.50,1),(.90,2),(.50,1),(1,2)]:
                go_to(page,'.landing-skills-scene',progress)
                expect(page.get_by_role('group',name='Explore connected skills').get_by_role('button').nth(index)).to_have_attribute('aria-pressed','true')
                assert_pinned_fits(page,'.landing-skills-stage')
            assert page.locator('.landing-skill-node[data-connected="true"]').count()==3
            expect(page.locator('[data-skill-count]')).to_have_text('3')
            before=page.locator('.landing-skill-connection').evaluate_all('nodes=>nodes.map(node=>node.style.strokeDashoffset)')
            page.wait_for_timeout(600)
            assert page.locator('.landing-skill-connection').evaluate_all('nodes=>nodes.map(node=>node.style.strokeDashoffset)')==before
            assert page.locator('.landing-skill-node > strong').all_text_contents()==['4/8 = 1/2','1/2 = 50%','$8 ÷ 5 = $1.60']
            passed('The knowledge map draws and reverses three real mathematical connections with clear example content')

            lessons=[(1,'Try the fractions lesson'),(2,'Try the percentages lesson'),(4,'Try the unit-price lesson')]
            numbers=next(course for course in courses if course['id']=='numbers')
            for index,(lesson_index,label) in enumerate(lessons):
                button=page.get_by_role('group',name='Explore connected skills').get_by_role('button').nth(index)
                button.focus();page.keyboard.press('Space');expect(button).to_have_attribute('aria-pressed','true');expect(button).to_be_focused()
                page.get_by_role('button',name=label,exact=True).click()
                dialog=page.get_by_role('dialog',name=numbers['lessons'][lesson_index]['title'],exact=True)
                expect(dialog).to_be_visible()
                assert dialog.evaluate('node=>node.scrollTop')==0
                dialog.get_by_role('button',name='Close dialog',exact=True).click()
                expect(page.get_by_role('button',name=label,exact=True)).to_be_focused()
            saved=json.loads(page.evaluate("localStorage.getItem('curio.student.v1')"))
            assert not saved['completed'] and not saved['practiceDays'] and not saved['practiceAttempts']
            passed('Keyboard skill selection and all three links open the correct lessons with focus restored and no invented completion or rewards')

            page.goto(url,wait_until='networkidle')
            course=page.locator('.landing-course').first
            assert course.get_attribute('data-revealed') is None
            course.scroll_into_view_if_needed();expect(course).to_have_attribute('data-revealed','true')
            page.evaluate('scrollTo(0,0)')
            subject=page.locator('.landing-subject-grid > button').last
            subject.focus();expect(subject).to_be_focused();expect(subject).to_have_attribute('data-revealed','true')
            assert subject.evaluate('node=>Number(getComputedStyle(node).opacity)')==1
            go_to(page,'.landing-catalog-scene',.5);page.wait_for_timeout(200)
            before=page.evaluate('window.__rafCalls');page.wait_for_timeout(350)
            assert page.evaluate('window.__rafCalls')==before
            passed('Keyboard focus reveals content immediately, and stopped scenes request no idle animation frames')

            for mode in ['light','dark']:
                page.evaluate('(mode)=>localStorage.setItem("curio.appearance.v1",JSON.stringify({version:2,seed:"#1a73e8",mode}))',mode)
                for width in [1366,390]:
                    page.set_viewport_size({'width':width,'height':900 if width==1366 else 844});page.reload(wait_until='networkidle')
                    for progress in [0,.5,1]:
                        go_to(page,'.landing-catalog-scene',progress);assert_pinned_fits(page,'.landing-catalog-stage')
                        audit(page,f'{mode} catalog {progress} at {width}px')
                    page.screenshot(path=str(OUTPUT/f'scroll-catalog-{mode}-{width}.png'))
                    for progress in [.1,.5,1]:
                        go_to(page,'.landing-skills-scene',progress);assert_pinned_fits(page,'.landing-skills-stage')
                        audit(page,f'{mode} knowledge {progress} at {width}px')
                    page.screenshot(path=str(OUTPUT/f'scroll-skills-{mode}-{width}.png'))
            passed('Live catalog and knowledge scenes fit desktop/mobile and pass light/dark audits at initial, middle and final frames')

            touch=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
            phone=touch.new_page();phone.goto(url,wait_until='networkidle')
            go_to(phone,'.landing-catalog-scene',0)
            before=phone.locator('[data-scroll-value]').all_text_contents()
            cdp=touch.new_cdp_session(phone)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':190,'y':600}]})
            for y in [560,500,440,380,320,260]:
                cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':190,'y':y}]});phone.wait_for_timeout(30)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            phone.wait_for_timeout(200)
            assert phone.locator('[data-scroll-value]').all_text_contents()!=before
            phone.get_by_role('group',name='Explore connected skills').get_by_role('button',name='Percentages',exact=True).tap()
            expect(phone.get_by_role('button',name='Try the percentages lesson',exact=True)).to_be_visible()
            for width,height in [(320,844),(390,740),(768,600),(1366,400)]:
                phone.set_viewport_size({'width':width,'height':height})
                phone.get_by_role('group',name='Explore connected skills').get_by_role('button',name='Unit prices',exact=True).tap()
                expect(phone.locator('.landing-skills-scene')).to_have_class('landing-section landing-container landing-skills-scene is-static')
                assert not phone.evaluate('document.documentElement.scrollWidth > innerWidth')
                phone.locator('.landing-skill-map > figcaption').scroll_into_view_if_needed();expect(phone.locator('.landing-skill-map > figcaption')).to_be_in_viewport()
            passed('Real touch swipes update scroll counters; touch skill selection and compact/narrow layouts keep content reachable')

            page.emulate_media(reduced_motion='reduce')
            expect(page.locator('.landing')).to_have_attribute('data-motion','reduced')
            assert page.locator('[data-reveal]:not([data-revealed])').count()==0
            for i,total in enumerate(totals): expect(values.nth(i)).to_have_text(str(total))
            for width in [1366,390]:
                page.set_viewport_size({'width':width,'height':900 if width==1366 else 844})
                for index in range(3):
                    page.get_by_role('group',name='Explore connected skills').get_by_role('button').nth(index).click()
                    expect(page.get_by_role('group',name='Explore connected skills').get_by_role('button').nth(index)).to_have_attribute('aria-pressed','true')
                    audit(page,f'Reduced motion skill {index} at {width}px')
            assert page.locator('.landing-skills-scene').evaluate('node=>getComputedStyle(node.firstElementChild).position')=='static'
            assert page.locator('.landing-catalog-scene').evaluate('node=>getComputedStyle(node.firstElementChild).position')=='static'
            fallback=browser.new_context(viewport={'width':390,'height':844})
            fallback.add_init_script('delete window.IntersectionObserver')
            fallback_page=fallback.new_page();fallback_page.goto(url,wait_until='networkidle')
            expect(fallback_page.locator('.landing')).to_have_attribute('data-motion','reduced')
            assert fallback_page.locator('[data-scroll-value]').all_text_contents()==list(map(str,totals))
            fallback_page.get_by_role('group',name='Explore connected skills').get_by_role('button',name='Fractions',exact=True).click()
            expect(fallback_page.get_by_role('button',name='Try the fractions lesson',exact=True)).to_be_visible()
            audit(fallback_page,'IntersectionObserver unavailable')
            passed('Changing reduced motion or losing observer support shows full totals and connections with working manual skill selection')
            assert not errors,errors
            browser.close()
    finally:
        process.terminate();process.wait(timeout=10)

print(f'\n{checks} scroll reaction checks and {len(audits)} accessibility states passed. Temporary database removed.')

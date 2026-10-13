"""Guard against legacy hover colours, moving artwork and lost selection states.
Build first. All account writes use this suite's temporary local database.
"""
import json
import os
import re
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


def stable_hover(page, control, state_layer=True):
    control.scroll_into_view_if_needed()
    page.mouse.move(1, 1)
    control.evaluate('(node)=>node.blur()')
    page.wait_for_timeout(30)
    snapshot = """(node)=>{
        const style=getComputedStyle(node), bounds=node.getBoundingClientRect();
        return {background:style.backgroundColor,color:style.color,border:parseFloat(style.borderWidth) ? style.borderColor : null,
                x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height};
    }"""
    before = control.evaluate(snapshot)
    control.hover()
    page.wait_for_timeout(30)
    after = control.evaluate(snapshot)
    assert before == after, {'control': control.inner_text(), 'before': before, 'hover': after}
    if state_layer:
        assert control.evaluate("(node)=>getComputedStyle(node,'::before').opacity") == '0.08'


def resolved_role(page, role):
    return page.evaluate("""role=>{
        const node=document.createElement('span');
        node.style.color=`var(--md-sys-color-${role})`;
        document.body.append(node);
        const color=getComputedStyle(node).color;
        node.remove();
        return color;
    }""",role)


with tempfile.TemporaryDirectory(prefix='curio-hover-') as directory:
    with socket.socket() as reservation:
        reservation.bind(('127.0.0.1', 0))
        port = reservation.getsockname()[1]
    url = f'http://127.0.0.1:{port}/'
    process = subprocess.Popen(['node', 'server/index.js'], cwd=ROOT, env={
        **os.environ, 'PORT': str(port), 'NODE_ENV': 'test', 'CURIO_DATA_DIR': directory, 'PUBLIC_URL': url,
    }, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        for _ in range(100):
            if process.poll() is not None:
                raise RuntimeError(process.stdout.read())
            try:
                with urllib.request.urlopen(url+'api/health') as response:
                    assert json.load(response)['status'] == 'ok'
                break
            except OSError:
                time.sleep(.1)
        else:
            raise RuntimeError('Application server did not become ready')

        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            for mode in ['light','dark']:
                for seed in ['#1a73e8','#6750a4']:
                    page.goto(url, wait_until='networkidle')
                    page.evaluate('(appearance)=>localStorage.setItem("curio.appearance.v1",JSON.stringify(appearance))',{'mode':mode,'seed':seed,'version':2})
                    page.reload(wait_until='networkidle')
                    stable_hover(page, page.get_by_role('button',name='Find your first course',exact=True))
                    stable_hover(page, page.locator('.landing-enter'))
                    stable_hover(page, page.get_by_role('button',name='Open account menu',exact=True))
                    stable_hover(page, page.get_by_role('button',name='Customize appearance',exact=True))
                    answer = page.get_by_role('region',name='Every pattern has a story.').get_by_role('button',name='14',exact=True)
                    answer.click()
                    expect(answer).to_have_attribute('aria-pressed','true')
                    stable_hover(page, answer)
                    disabled = page.get_by_role('region',name='Every pattern has a story.').get_by_role('button',name='Check my thinking',exact=True)
                    page.goto(url,wait_until='networkidle')
                    expect(disabled).to_be_disabled()
                    disabled.hover()
                    assert disabled.evaluate("(node)=>getComputedStyle(node,'::before').display") == 'none'
                    subject = page.locator('.landing-subject-grid > button').first
                    stable_hover(page, subject)
                    assert subject.locator('svg').first.evaluate('(node)=>getComputedStyle(node).transform') == 'none'
                    course = page.locator('.landing-course > button').first
                    stable_hover(page, course)
                    assert course.locator('.course-art').evaluate('(node)=>getComputedStyle(node).transform') == 'none'

                    page.goto(url+'#explore',wait_until='networkidle')
                    assert page.locator('.explore-intro > div > svg').evaluate('(node)=>getComputedStyle(node).color') == resolved_role(page,'primary')
                    active = page.locator('.category-tabs > button.active')
                    stable_hover(page, active)
                    inactive = page.locator('.category-tabs > button:not(.active)').first
                    stable_hover(page, inactive)
                    cover = page.locator('.course-cover').first
                    stable_hover(page, cover)
                    assert cover.locator('.course-art').evaluate('(node)=>getComputedStyle(node).transform') == 'none'
                    save = page.locator('.course-save').first
                    if save.get_attribute('aria-pressed') == 'true':
                        save.click()
                    stable_hover(page,save)
                    save.click()
                    expect(save).to_have_attribute('aria-pressed','true')
                    stable_hover(page,save)
                    page.screenshot(path=str(OUTPUT/f'56-hover-catalog-{mode}-{seed[1:]}.png'))

                    rail = page.locator('.sidebar .nav-item.active')
                    stable_hover(page,rail)
                    indicator = rail.evaluate("(node)=>{const s=getComputedStyle(node,'::before');return {height:s.height,width:s.width,radius:s.borderRadius}}")
                    assert indicator == {'height':'32px','width':'64px','radius':'16px'}, indicator
                    assert rail.evaluate('(node)=>getComputedStyle(node).backgroundColor') == 'rgba(0, 0, 0, 0)'
                    page.get_by_role('button',name='Expand navigation',exact=True).click()
                    stable_hover(page,rail)
                    assert rail.evaluate("(node)=>getComputedStyle(node,'::before').height") == '48px'
                    page.get_by_role('button',name='Collapse navigation',exact=True).click()

                    open_profile(page)
                    close = page.get_by_role('button',name='Close dialog',exact=True)
                    stable_hover(page,close)
                    page.keyboard.press('Escape')
                    page.goto(url+'#overview',wait_until='networkidle')
                    page.get_by_role('button',name='Thinking in numbers',exact=True).click()
                    page.get_by_role('dialog').get_by_role('button',name=re.compile('Let’s start learning|Continue learning')).click()
                    page.get_by_role('button',name='Got it. Let me try!',exact=True).click()
                    option = page.locator('.quiz-option').first
                    stable_hover(page,option)
                    option.click()
                    expect(option).to_have_attribute('aria-pressed','true')
                    stable_hover(page,option)
                    assert option.locator('.answer-letter').evaluate('(node)=>getComputedStyle(node).backgroundColor') == resolved_role(page,'primary')
                    page.keyboard.press('Escape')
                    page.goto(url+'#practice',wait_until='networkidle')
                    assert page.locator('.practice-copy h2').evaluate('(node)=>getComputedStyle(node).fontWeight') == '400'
                    assert page.locator('.practice-decoration').evaluate('(node)=>getComputedStyle(node).backgroundColor') == resolved_role(page,'secondary-container')
                    passed(f'{seed} {mode}: fills/borders/selection stay stable; state layers cover landing, catalog, rail, dialogs and quizzes')

            registration = context.request.post(url+'api/auth/register',data={
                'name':'Hover Tester','email':'hover@example.test','password':'A unique hover password 42!',
            })
            assert registration.status == 201
            page.goto(url+'#creators',wait_until='networkidle')
            page.reload(wait_until='networkidle')
            page.get_by_role('button',name='Create a course',exact=True).click()
            for name in ['Preview lesson','Add a lesson','Save draft','Publish for free']:
                stable_hover(page,page.get_by_role('button',name=name,exact=True))
            page.get_by_role('button',name='Add a lesson',exact=True).click()
            page.locator('.editor-lesson').nth(1).locator(':scope > summary').click()
            remove = page.get_by_role('button',name='Remove lesson 2',exact=True)
            stable_hover(page,remove)
            assert remove.evaluate('(node)=>getComputedStyle(node).color') == resolved_role(page,'error')
            page.get_by_role('button',name='Save draft',exact=True).click()
            expect(page.get_by_role('status').filter(has_text='Draft saved.')).to_be_visible()
            passed('Creator outline and publish actions keep their tonal roles; destructive actions keep the error colour')

            page.goto(url+'#lab',wait_until='networkidle')
            slider = page.locator('#fraction-parts')
            assert slider.evaluate('(node)=>getComputedStyle(node).appearance') == 'none'
            assert slider.bounding_box()['height'] == 44
            expect(slider).to_have_value('8')
            assert slider.evaluate('(node)=>node.style.getPropertyValue("--range-progress")') == '60%'
            slider.focus()
            page.keyboard.press('Home')
            expect(slider).to_have_value('2')
            assert slider.evaluate('(node)=>node.style.getPropertyValue("--range-progress")') == '0%'
            page.keyboard.press('End')
            expect(slider).to_have_value('12')
            assert slider.evaluate('(node)=>node.style.getPropertyValue("--range-progress")') == '100%'
            page.keyboard.press('ArrowLeft')
            expect(slider).to_have_value('11')
            expect(page.locator('.fraction-grid button')).to_have_count(11)
            assert slider.evaluate('(node)=>node.style.getPropertyValue("--range-progress")') == '90%'
            page.get_by_role('button',name='Budget challenge',exact=True).click()
            budget = page.locator('#budget-food')
            budget.focus()
            page.keyboard.press('ArrowLeft')
            expect(budget).to_have_value('115')
            assert abs(float(budget.evaluate('(node)=>node.style.getPropertyValue("--range-progress")').rstrip('%'))-115/300*100) < .001
            page.screenshot(path=str(OUTPUT/'57-material-budget-range.png'))
            passed('Expressive ranges retain 44px touch targets, native Home/End/arrow keys and synchronized tracks, values and lesson models')

            touch = browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,reduced_motion='reduce')
            phone = touch.new_page()
            phone.goto(url,wait_until='networkidle')
            phone_answer = phone.get_by_role('region',name='Every pattern has a story.').get_by_role('button',name='14',exact=True)
            phone_answer.tap()
            expect(phone_answer).to_have_attribute('aria-pressed','true')
            assert phone_answer.evaluate("(node)=>getComputedStyle(node,'::before').opacity") == '0'
            assert not phone.evaluate('document.documentElement.scrollWidth > innerWidth')
            phone.goto(url+'#lab',wait_until='networkidle')
            phone_slider = phone.locator('#fraction-parts')
            phone_slider.scroll_into_view_if_needed()
            box = phone_slider.bounding_box()
            phone.touchscreen.tap(box['x']+box['width']/2,box['y']+box['height']/2)
            expect(phone_slider).to_have_value('7')
            expect(phone.locator('.fraction-grid button')).to_have_count(7)
            assert phone_slider.evaluate('(node)=>node.style.getPropertyValue("--range-progress")') == '50%'
            assert not errors, errors
            passed('Touch taps do not leave a mouse-hover overlay; native mobile ranges update their models with no overflow or JavaScript errors')
            browser.close()
    finally:
        process.terminate()
        process.wait(timeout=10)

print(f'\n{checks} hover regression checks passed.')

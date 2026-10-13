"""Check native pointer, keyboard and touch activation with Material feedback.
Run against a local application server after npm run build. No API writes.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from account_helpers import open_profile

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('CURIO_TEST_URL', 'http://127.0.0.1:5173/').rstrip('/') + '/'
OUTPUT = ROOT / 'test-results'
OUTPUT.mkdir(exist_ok=True)
checks = 0


def passed(description):
    global checks
    checks += 1
    print(f'PASS {checks}: {description}', flush=True)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='no-preference')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL,wait_until='networkidle')
    page.evaluate("localStorage.setItem('curio.appearance.v1',JSON.stringify({mode:'dark',seed:'#6750a4'}))")
    page.reload(wait_until='networkidle')
    assert page.evaluate('document.documentElement.dataset.theme') == 'dark'
    assert page.evaluate("document.documentElement.style.getPropertyValue('--md-sys-color-primary')") == '#a8c7fa'
    assert page.evaluate("JSON.parse(localStorage.getItem('curio.appearance.v1')).version") == 2
    page.get_by_role('button',name='Customize appearance',exact=True).click()
    dialog = page.get_by_role('dialog',name='Curio appearance')
    dialog.get_by_role('button',name='Purple',exact=True).click()
    dialog.get_by_role('button',name='Light',exact=True).click()
    page.keyboard.press('Escape')
    page.reload(wait_until='networkidle')
    assert page.evaluate("document.documentElement.style.getPropertyValue('--md-sys-color-primary')") == '#65558f'
    page.get_by_role('button',name='Customize appearance',exact=True).click()
    dialog.get_by_role('button',name='Blue',exact=True).click()
    page.keyboard.press('Escape')
    passed('Legacy purple migrates once to blue without changing dark mode; explicit new palette choices survive reload')

    primary = page.get_by_role('button',name='Find your first course',exact=True)
    primary.hover()
    bounds = primary.bounding_box()
    page.mouse.move(bounds['x']+14,bounds['y']+18)
    page.mouse.down()
    expect(primary).to_have_attribute('data-material-pressed','')
    expect(primary.locator('.material-ripple')).to_have_count(1)
    assert primary.evaluate("(node)=>getComputedStyle(node).overflow") == 'clip'
    assert primary.evaluate("(node)=>getComputedStyle(node,'::before').opacity") == '0'
    point = primary.locator('.material-ripple').evaluate('(node)=>({x:parseFloat(node.style.left)+parseFloat(node.style.width)/2,y:parseFloat(node.style.top)+parseFloat(node.style.height)/2})')
    assert abs(point['x']-14)<1 and abs(point['y']-18)<1
    page.wait_for_timeout(200)
    assert primary.evaluate('(node)=>getComputedStyle(node).borderRadius') == '16px'
    page.screenshot(path=str(OUTPUT/'54-google-blue-press.png'))
    page.mouse.up()
    expect(page).to_have_url(URL+'#explore')
    passed('Pointer press creates one bounded ripple at the click location, morphs the shape and preserves native navigation')

    page.goto(URL,wait_until='networkidle')
    preview = page.get_by_role('region',name='Every pattern has a story.')
    answer = preview.get_by_role('button',name='12',exact=True)
    answer.evaluate("(node)=>{ window.activations=0; node.addEventListener('click',()=>window.activations++); }")
    answer.focus()
    page.keyboard.down('Space')
    expect(answer).to_have_attribute('data-material-pressed','')
    assert answer.evaluate('(node)=>getComputedStyle(node).outlineWidth') == '3px'
    assert page.evaluate('window.activations') == 0
    page.keyboard.up('Space')
    expect(answer).to_have_attribute('aria-pressed','true')
    assert page.evaluate('window.activations') == 1
    page.keyboard.press('Enter')
    assert page.evaluate('window.activations') == 2
    expect(page.locator('[data-material-pressed]')).to_have_count(0)
    expect(page.locator('.material-ripple')).to_have_count(0,timeout=3000)
    passed('Space activates on release, Enter activates once, keyboard focus is visible, and ripple nodes are removed')

    primary = page.get_by_role('button',name='Find your first course',exact=True)
    primary.hover()
    page.mouse.down()
    expect(primary).to_have_attribute('data-material-pressed','')
    page.mouse.move(10,950)
    expect(primary).not_to_have_attribute('data-material-pressed','')
    page.mouse.up()
    expect(page).to_have_url(URL)
    expect(page.locator('.material-ripple')).to_have_count(0,timeout=3000)
    passed('Dragging away cancels feedback and does not navigate or leave stale ripples')

    page.reload(wait_until='networkidle')
    disabled = page.get_by_role('button',name='Check my thinking',exact=True)
    expect(disabled).to_be_disabled()
    disabled.hover()
    page.mouse.down()
    expect(page.locator('[data-material-pressed]')).to_have_count(0)
    expect(disabled.locator('.material-ripple')).to_have_count(0)
    page.mouse.up()
    expect(disabled).to_be_disabled()
    passed('Disabled actions stay inert and never show enabled-button press feedback')

    # Cancel a touch press as soon as it becomes a scroll gesture.
    primary.evaluate("(node)=>{ const r=node.getBoundingClientRect(); node.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:91,isPrimary:true,button:0,pointerType:'touch',clientX:r.x+20,clientY:r.y+20})); }")
    expect(primary).to_have_attribute('data-material-pressed','')
    primary.evaluate("(node)=>{ const r=node.getBoundingClientRect(); node.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:91,isPrimary:true,pointerType:'touch',clientX:r.x+20,clientY:r.y+45})); }")
    expect(primary).not_to_have_attribute('data-material-pressed','')
    primary.evaluate("(node)=>{ const r=node.getBoundingClientRect(); node.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:92,isPrimary:true,button:0,pointerType:'touch',clientX:r.x+20,clientY:r.y+20})); node.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:92,pointerType:'touch'})); }")
    expect(page.locator('[data-material-pressed]')).to_have_count(0)
    expect(page.locator('.material-ripple')).to_have_count(0,timeout=3000)
    passed('Touch scrolling and pointer cancellation clear press feedback without suppressing native gestures')

    touch = browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,reduced_motion='no-preference')
    phone = touch.new_page()
    phone.on('pageerror',lambda error:errors.append(str(error)))
    phone.goto(URL,wait_until='networkidle')
    phone_preview = phone.get_by_role('region',name='Every pattern has a story.')
    touch_answer = phone_preview.get_by_role('button',name='14',exact=True)
    touch_answer.scroll_into_view_if_needed()
    box = touch_answer.bounding_box()
    phone.touchscreen.tap(box['x']+box['width']/2,box['y']+box['height']/2)
    expect(touch_answer).to_have_attribute('aria-pressed','true')
    phone_preview.get_by_role('button',name='Check my thinking',exact=True).tap()
    expect(phone_preview.get_by_role('status')).to_contain_text('11 + 3 = 14')
    assert not phone.evaluate('document.documentElement.scrollWidth > innerWidth')
    expect(phone.locator('[data-material-pressed]')).to_have_count(0)
    expect(phone.locator('.material-ripple')).to_have_count(0,timeout=3000)
    passed('Real mobile touchscreen taps still select, check and explain a correct answer with no overflow or stale feedback')

    reduced = browser.new_context(viewport={'width':1366,'height':900},reduced_motion='reduce')
    calm = reduced.new_page()
    calm.goto(URL,wait_until='networkidle')
    calm_primary = calm.get_by_role('button',name='Find your first course',exact=True)
    calm_primary.hover();calm.mouse.down()
    expect(calm_primary).to_have_attribute('data-material-pressed','')
    expect(calm.locator('.material-ripple')).to_have_count(0)
    calm.mouse.up()
    expect(calm).to_have_url(URL+'#explore')
    passed('Reduced motion keeps immediate state feedback and native activation while omitting ripple animation')

    page.goto(URL+'#overview',wait_until='networkidle')
    open_profile(page)
    page.keyboard.press('Escape')
    page.keyboard.press('Control+k')
    expect(page.get_by_role('textbox',name='Search courses')).to_be_focused()
    page.wait_for_timeout(100)
    expect(page.get_by_role('textbox',name='Search courses')).to_be_focused()
    assert not errors, errors
    page.screenshot(path=str(OUTPUT/'55-google-blue-workspace.png'))
    passed('Escape followed immediately by the search shortcut keeps focus in search; interactions produce no JavaScript errors')
    browser.close()

print(f'\n{checks} Material button interaction checks passed.')

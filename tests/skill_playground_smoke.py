"""Exercise landing practice models using local disposable browser state.
Build/start the application first; CURIO_TEST_URL selects the local server.
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
    (OUTPUT/'skill-playground-accessibility.json').write_text(json.dumps(audits,indent=2))
    assert not violations, (name, [(v['id'],[node['target'] for node in v['nodes']]) for v in violations])


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':1366,'height':900}, reduced_motion='reduce')
    page = context.new_page(); errors=[]; page.on('pageerror', lambda error:errors.append(str(error)))
    page.goto(URL,wait_until='networkidle')
    section = page.get_by_role('region',name='Make the idea work.')
    choose = section.get_by_role('group',name='Choose a practice model')
    check = section.get_by_role('button',name='Check my model',exact=True)
    feedback = section.locator('.skill-model-feedback')
    check.click();expect(feedback).to_contain_text('You shaded 4/8')
    pieces=section.get_by_role('group',name='Practice fraction pieces').get_by_role('button')
    pieces.nth(4).focus();page.keyboard.press('Space');expect(pieces.nth(4)).to_be_focused()
    pieces.nth(5).click();expect(section.get_by_role('status',name='Fraction model')).to_contain_text('75%')
    check.click();expect(feedback).to_contain_text('6/8 = 3/4 = 75%')
    section.get_by_role('button',name='Reset model',exact=True).click()
    expect(pieces.nth(5)).to_have_attribute('aria-pressed','false');expect(feedback).to_have_count(0)
    passed('Fraction pieces support keyboard interaction, explained mistakes, equivalent values and reset')

    choose.get_by_role('button',name='Discounts',exact=True).click()
    check.click();expect(feedback).to_contain_text('save $8.00 and pay $72.00')
    slider=section.get_by_role('slider',name='Discount',exact=True);slider.focus()
    for _ in range(3): page.keyboard.press('ArrowRight')
    expect(slider).to_have_value('25');expect(feedback).to_have_count(0)
    expect(section.get_by_role('status',name='Discount calculation')).to_contain_text('$60.00')
    check.click();expect(feedback).to_contain_text('$80 − $20 = $60')
    passed('The native discount slider updates the calculation and checks the learner’s target without a timed animation')

    choose.get_by_role('button',name='Unit prices',exact=True).click()
    expect(check).to_be_disabled()
    answers=section.get_by_role('group',name='Which pack has the lower unit price?')
    answers.get_by_role('button',name='Pack A',exact=True).click();check.click()
    expect(feedback).to_contain_text('Pack B has the lower unit price')
    answers.get_by_role('button',name='Pack B',exact=True).click();expect(feedback).to_have_count(0);check.click()
    expect(feedback).to_have_class('skill-model-feedback is-correct')
    pack_a=section.get_by_role('group',name='Pack A',exact=True)
    pack_b=section.get_by_role('group',name='Pack B',exact=True)
    pack_b.get_by_label('Pack price ($)',exact=True).fill('9.00')
    expect(check).to_be_disabled()
    answers.get_by_role('button',name='Same value',exact=True).click();check.click()
    expect(feedback).to_contain_text('Both packs have the same price per item')
    passed('Unit-price checking compares a common unit, supports exact ties and clears stale answers after editing')

    for field,value in [('Pack price ($)',''),('Pack price ($)','1.001'),('Items in the pack','0'),('Items in the pack','13')]:
        section.get_by_role('button',name='Reset model',exact=True).click()
        input_field=pack_a.get_by_label(field,exact=True);input_field.fill(value)
        expect(input_field).to_have_attribute('aria-invalid','true')
        assert input_field.get_attribute('aria-describedby')
        expect(check).to_be_disabled()
        expect(answers.get_by_role('button',name='Pack A',exact=True)).to_be_disabled()
    section.get_by_role('button',name='Reset model',exact=True).click()
    pack_a.get_by_label('Pack price ($)',exact=True).fill('4.00');pack_a.get_by_label('Items in the pack',exact=True).fill('3')
    pack_b.get_by_label('Pack price ($)',exact=True).fill('9.33');pack_b.get_by_label('Items in the pack',exact=True).fill('7')
    answers.get_by_role('button',name='Pack B',exact=True).click();check.click()
    expect(feedback).to_contain_text('unrounded unit prices differ')
    expect(feedback).to_have_class('skill-model-feedback is-correct')
    passed('Invalid entries remain recoverable; exact comparisons explain the edge case of identical rounded prices')

    before=json.loads(page.evaluate("localStorage.getItem('curio.student.v1')"))
    assert not before['completed'] and not before['practiceAttempts'] and not before['practiceDays'] and not before['completedLabs']
    courses=context.request.get(URL+'api/courses').json()['courses']
    numbers=next(course for course in courses if course['id']=='numbers')
    for label,index in [('Fractions',1),('Discounts',2),('Unit prices',4)]:
        choose.get_by_role('button',name=label,exact=True).click()
        opener=section.get_by_role('button',name='Open the full lesson',exact=True);opener.click()
        dialog=page.get_by_role('dialog',name=numbers['lessons'][index]['title'],exact=True)
        expect(dialog).to_be_visible();assert dialog.evaluate('node=>node.scrollTop')==0
        dialog.get_by_role('button',name='Close dialog',exact=True).click();expect(opener).to_be_focused()
    after=json.loads(page.evaluate("localStorage.getItem('curio.student.v1')"))
    assert after['completed']==before['completed'] and after['practiceAttempts']==before['practiceAttempts'] and after['completedLabs']==before['completedLabs']
    passed('Every model opens its actual related lesson and restores focus without awarding preview completion or coins')

    for mode in ['light','dark']:
        page.evaluate('(mode)=>localStorage.setItem("curio.appearance.v1",JSON.stringify({version:2,seed:"#1a73e8",mode}))',mode)
        page.reload(wait_until='networkidle')
        for width in [320,390,1366]:
            page.set_viewport_size({'width':width,'height':900})
            for model in ['Fractions','Discounts','Unit prices']:
                choose.get_by_role('button',name=model,exact=True).click()
                if model=='Unit prices': answers.get_by_role('button',name='Pack B',exact=True).click()
                check.click()
                assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),(mode,width,model)
                section.locator('.skill-model').scroll_into_view_if_needed()
                for button in choose.get_by_role('button').all():
                    box=button.bounding_box();assert box['width']>=44 and box['height']>=44,box
                audit(page,f'{mode} {model} feedback at {width}px')
                if model=='Discounts': section.screenshot(path=str(OUTPUT/f'skill-playground-{mode}-{width}.png'))
            pack_a.get_by_label('Pack price ($)',exact=True).fill('');audit(page,f'{mode} invalid pack at {width}px')
            section.get_by_role('button',name='Reset model',exact=True).click()
    passed('All model feedback and invalid forms fit 320/390/1366 px with 24 light/dark accessibility states')

    touch=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
    phone=touch.new_page();phone.goto(URL,wait_until='networkidle')
    practice=phone.get_by_role('region',name='Make the idea work.')
    practice.get_by_role('button',name='Practice piece 5',exact=True).tap()
    practice.get_by_role('button',name='Practice piece 6',exact=True).tap()
    practice.get_by_role('button',name='Check my model',exact=True).tap()
    expect(practice.locator('.skill-model-feedback')).to_contain_text('6/8 = 3/4')
    practice.get_by_role('group',name='Choose a practice model').get_by_role('button',name='Discounts',exact=True).tap()
    assert practice.locator('.skill-discount-bar > span').evaluate('node=>getComputedStyle(node).transitionDuration')=='0s'
    assert not errors,errors
    passed('Real touchscreen taps complete the fraction task and reduced-motion mode removes chart transitions')
    touch.close();context.close();browser.close()

print(f'\n{checks} playground checks and {len(audits)} accessibility states passed.')

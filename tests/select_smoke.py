"""Verify Material menus through real selection, keyboard, touch and modal flows.
Build first. Uses an isolated server; registrations/drafts never touch production.
"""
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.request
import uuid
from playwright.sync_api import sync_playwright, expect
from select_helpers import choose_option

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'test-results';OUTPUT.mkdir(exist_ok=True)
checks=0;audits=[]


def passed(description):
    global checks
    checks+=1
    print(f'PASS {checks}: {description}',flush=True)


def audit(page,name):
    page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
    violations=page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations")
    audits.append({'screen':name,'violations':violations})
    (OUTPUT/'select-accessibility.json').write_text(json.dumps(audits,indent=2))
    if violations:
        print('FAIL',name,[(v['id'],[n['target'] for n in v['nodes']]) for v in violations],flush=True)
        page.screenshot(path=str(OUTPUT/'select-accessibility-failure.png'))
        raise AssertionError(f'Accessibility violations: {name}')


def contained(page):
    box=page.get_by_role('listbox').bounding_box()
    size=page.viewport_size
    assert box and box['x']>=0 and box['y']>=0 and box['x']+box['width']<=size['width']+1 and box['y']+box['height']<=size['height']+1,(box,size)


with tempfile.TemporaryDirectory(prefix='curio-select-') as directory:
    with socket.socket() as reservation:
        reservation.bind(('127.0.0.1',0));port=reservation.getsockname()[1]
    url=f'http://127.0.0.1:{port}/'
    process=subprocess.Popen(['node','server/index.js'],cwd=ROOT,env={**os.environ,'PORT':str(port),'NODE_ENV':'test','CURIO_DATA_DIR':directory,'PUBLIC_URL':url},stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    try:
        for _ in range(100):
            if process.poll() is not None:raise RuntimeError(process.stdout.read())
            try:
                with urllib.request.urlopen(url+'api/health') as response:assert json.load(response)['status']=='ok'
                break
            except OSError:time.sleep(.1)
        else:raise RuntimeError('Server did not start')
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
            context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
            page=context.new_page();errors=[];native_dialogs=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('dialog',lambda dialog:(native_dialogs.append(dialog.type),dialog.dismiss()))
            page.goto(url+'#explore',wait_until='networkidle')
            subject=page.get_by_role('combobox',name='Choose a subject',exact=True)
            subject.click()
            menu=page.get_by_role('listbox',name='Subjects',exact=True)
            expect(menu.get_by_role('option')).to_have_count(19)
            contained(page)
            expect(menu.get_by_role('option',name='All courses',exact=True)).to_have_attribute('aria-selected','true')
            expect(menu.get_by_role('option',name='All courses',exact=True)).to_be_focused()
            assert page.locator('#root').evaluate('node=>node.inert')
            page.keyboard.press('Tab')
            expect(menu.get_by_role('option',name='All courses',exact=True)).to_be_focused()
            expect(menu.get_by_role('option',name='All courses',exact=True)).to_have_css('outline-color',page.locator('.subject-select .select-trigger').evaluate('node=>getComputedStyle(node).borderTopColor'))
            menu.get_by_role('option',name='Geography',exact=True).click()
            expect(subject).to_have_attribute('data-value','Geography')
            assert not page.locator('#root').evaluate('node=>node.inert')
            expect(page.locator('.course-card')).to_have_count(1)
            expect(page.locator('.course-card h3')).to_have_text('Read the world around you')
            passed('A styled 19-subject menu shows the current choice and filters actual courses')

            subject.focus();page.keyboard.press('ArrowDown')
            expect(page.get_by_role('option',name='Geography',exact=True)).to_be_focused()
            page.keyboard.press('Home')
            expect(page.get_by_role('option',name='All courses',exact=True)).to_be_focused()
            page.keyboard.type('languages')
            expect(page.get_by_role('option',name='Languages',exact=True)).to_be_focused()
            page.keyboard.press('Enter')
            expect(subject).to_have_attribute('data-value','Languages')
            expect(page.locator('.course-card')).to_have_count(1)
            subject.focus();page.keyboard.press('Space')
            expect(page.get_by_role('option',name='Languages',exact=True)).to_be_focused()
            page.keyboard.press('End')
            expect(page.get_by_role('option',name='Personal finance',exact=True)).to_be_focused()
            page.keyboard.press('Enter')
            expect(subject).to_have_attribute('data-value','Personal finance')
            passed('Arrow keys, typeahead, Home/End and Enter select real subjects without a native browser picker')

            subject.click();page.keyboard.press('ArrowUp');page.keyboard.press('Escape')
            expect(subject).to_have_attribute('data-value','Personal finance')
            expect(subject).to_be_focused();expect(page.get_by_role('listbox')).to_have_count(0)
            subject.click()
            expect(page.get_by_role('option',name='Personal finance',exact=True)).to_be_focused()
            page.mouse.move(110,110)
            page.mouse.click(110,110)
            expect(page.get_by_role('listbox')).to_have_count(0)
            expect(subject).to_be_focused()
            passed('Escape cancels an uncommitted choice; outside clicks dismiss and restore the trigger focus')

            page.get_by_role('button',name='Clear filters',exact=True).click()
            choose_option(page.get_by_role('combobox',name='Sort courses',exact=True),'A–Z')
            expect(page.locator('.course-card h3').first).to_have_text('A place in the universe')
            choose_option(page.get_by_role('combobox',name='Filter by duration',exact=True),'Under 20 minutes')
            expect(page.locator('.course-card')).to_have_count(20)
            choose_option(page.get_by_role('combobox',name='Filter by level',exact=True),'Beginner')
            expect(page.locator('.course-card')).to_have_count(19)
            choose_option(page.get_by_role('combobox',name='Filter by duration',exact=True),'20–40 minutes')
            expect(page.get_by_role('heading',name='No discoveries here just yet.')).to_be_visible()
            choose_option(page.get_by_role('combobox',name='Filter by duration',exact=True),'Any duration')
            expect(page.locator('.course-card')).to_have_count(19)
            choose_option(page.get_by_role('combobox',name='Filter by level',exact=True),'Advanced')
            expect(page.get_by_role('heading',name='No discoveries here just yet.')).to_be_visible()
            page.get_by_role('button',name='Explore all courses',exact=True).click()
            expect(page.locator('.course-card')).to_have_count(20)
            passed('Sorting, combined level/time filters and clear actions preserve real catalog behavior')

            for mode in ['light','dark']:
                for width,height in [(1440,1000),(390,844),(320,568),(768,600),(1024,700)]:
                    page.set_viewport_size({'width':width,'height':height})
                    page.goto(url+'#explore',wait_until='networkidle')
                    page.evaluate('(mode)=>localStorage.setItem("curio.appearance.v1",JSON.stringify({seed:"#1a73e8",version:2,mode}))',mode)
                    page.reload(wait_until='networkidle')
                    for label in ['Choose a subject','Sort courses','Filter by level','Filter by duration']:
                        page.get_by_role('combobox',name=label,exact=True).click()
                        contained(page)
                        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(mode,width,label)
                        if width in [1440,390]:audit(page,f'{mode} {width}px {label} open')
                        expect(page.get_by_role('listbox')).to_be_visible()
                        if label=='Choose a subject' and width==1440:
                            page.screenshot(path=str(OUTPUT/f'60-subject-menu-{mode}.png'))
                        if label=='Choose a subject' and width==390:
                            page.screenshot(path=str(OUTPUT/f'62-subject-menu-mobile-{mode}.png'))
                        page.keyboard.press('Escape')
                    page.get_by_role('button',name='Edit learner profile',exact=True).click()
                    profile=page.get_by_role('dialog',name='Make yourself at home')
                    goal=profile.get_by_role('combobox',name='Your daily learning goal',exact=True)
                    goal.click();contained(page)
                    if width in [1440,390]:audit(page,f'{mode} {width}px profile goal menu open')
                    page.keyboard.press('Escape')
                    expect(profile).to_be_visible();expect(goal).to_be_focused()
                    if width in [1440,390]:audit(page,f'{mode} {width}px readable profile')
                    page.keyboard.press('Escape');expect(profile).to_have_count(0)
                passed(f'{mode.title()} menus fit mobile/tablet/desktop viewports; nested Escape preserves the profile dialog')

            page.set_viewport_size({'width':1366,'height':900})
            page.goto(url+'#overview',wait_until='networkidle')
            page.get_by_role('button',name='Edit learner profile',exact=True).click()
            profile=page.get_by_role('dialog',name='Make yourself at home')
            choose_option(profile.get_by_role('combobox',name='Your daily learning goal',exact=True),'3')
            profile.get_by_role('button',name='Save my preferences',exact=True).click()
            assert page.evaluate("JSON.parse(localStorage.getItem('curio.student.v1')).goal")==3
            passed('Goal selection keeps numeric values and submits through the actual profile form')

            registered=context.request.post(url+'api/auth/register',data={'name':'Select Teacher','email':f'select-{uuid.uuid4().hex}@example.test','password':'A unique teaching password 42!'})
            assert registered.status==201
            page.goto(url+'#creators',wait_until='networkidle');page.reload(wait_until='networkidle')
            page.get_by_role('button',name='Create a course',exact=True).click()
            page.get_by_role('textbox',name='Course title',exact=True).fill('Selection control course')
            for label,value in [('Subject','Arts & music'),('Level','Advanced'),('Illustration','earth'),('Lesson 1 correct answer','2')]:
                control=page.get_by_role('combobox',name=label,exact=True)
                control.click();contained(page);audit(page,f'Creator {label} open')
                page.locator('[role="option"][data-value='+json.dumps(value)+']').click()
            page.get_by_role('button',name='Save draft',exact=True).click()
            expect(page.get_by_role('status').filter(has_text='Draft saved.')).to_be_visible()
            stored=context.request.get(url+'api/creator/courses').json()['courses'][0]
            assert stored['category']=='Arts & music' and stored['level']=='Advanced' and stored['art']=='earth' and stored['lessons'][0]['answer']==2
            passed('Creator dropdowns save their actual subject, level, illustration and numeric answer values')

            touch=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,reduced_motion='reduce')
            phone=touch.new_page();phone.on('pageerror',lambda error:errors.append(str(error)))
            phone.goto(url+'#explore',wait_until='networkidle')
            phone_subject=phone.get_by_role('combobox',name='Choose a subject',exact=True)
            phone_subject.tap();contained(phone)
            phone.get_by_role('option',name='Mathematics',exact=True).tap()
            expect(phone_subject).to_have_attribute('data-value','Mathematics')
            expect(phone.locator('.course-card')).to_have_count(3)
            passed('Actual touchscreen taps open the styled menu and choose a subject on a phone')
            assert not native_dialogs,native_dialogs
            assert not errors,errors
            passed('Menus and forms complete without native alerts, JavaScript errors or unintended submissions')
            browser.close()
    finally:
        process.terminate();process.wait(timeout=10)

assert not any(item['violations'] for item in audits),'Opened-menu/profile accessibility violations: see select-accessibility.json'
print(f'\n{checks} select-control checks and {len(audits)} accessibility checks passed. Temporary database removed.')

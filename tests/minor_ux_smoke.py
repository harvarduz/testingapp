"""Keyboard edge cases, responsive focus and empty-state recovery. Local only."""
import os
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get('CURIO_TEST_URL','http://127.0.0.1:4191/').rstrip('/')+'/'
assert urlparse(URL).hostname in ('127.0.0.1','localhost')
ENGINE = os.environ.get('CURIO_TEST_BROWSER','chromium')
checks = 0

def passed(description):
    global checks
    checks += 1
    print(f'PASS {checks} [{ENGINE}]: {description}',flush=True)

with sync_playwright() as p:
    options = {'executable_path':'/usr/bin/chromium','args':['--no-sandbox']} if ENGINE=='chromium' else {}
    if ENGINE=='webkit' and os.environ.get('CURIO_WEBKIT_EXECUTABLE'):
        options['executable_path']=os.environ['CURIO_WEBKIT_EXECUTABLE']
    browser = getattr(p,ENGINE).launch(**options)
    page = browser.new_page(viewport={'width':1366,'height':900},reduced_motion='reduce')
    errors = [];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(URL+'#overview',wait_until='networkidle')
    bell = page.get_by_role('button',name='Learning updates',exact=True)
    updates = page.get_by_role('region',name='Learning updates',exact=True)
    bell.focus();page.keyboard.press('Space');page.keyboard.press('Tab')
    expect(updates.get_by_role('button',name='Visit my learning',exact=True)).to_be_focused()
    expect(updates).to_be_visible()
    page.keyboard.press('Tab')
    expect(updates).to_have_count(0)
    expect(page.get_by_role('button',name='Customize appearance',exact=True)).to_be_focused()
    bell.focus();page.keyboard.press('Space');page.keyboard.press('Shift+Tab')
    expect(updates).to_have_count(0)
    expect(page.get_by_role('textbox',name='Search courses',exact=True)).to_be_focused()
    bell.focus();page.keyboard.press('Space');page.keyboard.press('Escape')
    expect(updates).to_have_count(0);expect(bell).to_be_focused()
    passed('Updates remain open while used, dismiss when Tab/Shift+Tab leave, and restore focus only on Escape')

    bell.focus();page.keyboard.press('Space')
    opener = page.get_by_role('button',name='Open account menu',exact=True)
    opener.focus();page.keyboard.press('ArrowUp')
    expect(updates).to_have_count(0)
    menu = page.get_by_role('region',name='Account menu',exact=True)
    expect(menu.get_by_role('button',name='Creator workspace',exact=True)).to_be_focused()
    page.keyboard.press('ArrowDown')
    expect(menu.get_by_role('button',name='Sign in',exact=True)).to_be_focused()
    page.keyboard.press('Escape');expect(opener).to_be_focused()
    passed('Opening the account menu by keyboard dismisses the previous popover; Up starts at the last action')

    for width,height in [(390,300),(1366,900)]:
        page.set_viewport_size({'width':width,'height':height})
        opener.focus();page.keyboard.press('ArrowDown')
        expect(menu.get_by_role('button',name='Sign in',exact=True)).to_be_focused()
        page.keyboard.press('Escape')
        opener.focus();page.keyboard.press('ArrowUp')
        last = menu.get_by_role('button',name='Creator workspace',exact=True)
        expect(last).to_be_focused()
        assert last.evaluate('n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&n.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))}')
        page.keyboard.press('Escape')
        opener.click();expect(menu.get_by_role('button',name='Sign in',exact=True)).to_be_focused()
        page.keyboard.press('Escape')
    passed('Down and pointer opening start at the first account action; Up reveals the last even in a short phone viewport')

    page.goto(URL,wait_until='networkidle')
    for label in ['How it works','Our courses','Why Curio','For creators']:
        page.set_viewport_size({'width':900,'height':800})
        trigger = page.get_by_role('button',name='Open website navigation',exact=True)
        trigger.click()
        mobile = page.get_by_role('navigation',name='Mobile website navigation',exact=True)
        mobile.get_by_role('link',name=label,exact=True).focus()
        page.set_viewport_size({'width':1366,'height':900})
        expect(mobile).to_have_count(0)
        desktop_link = page.get_by_role('navigation',name='Website navigation',exact=True).get_by_role('link',name=label,exact=True)
        expect(desktop_link).to_be_focused()
        page.set_viewport_size({'width':900,'height':800})
        expect(trigger).to_be_focused();expect(trigger).to_have_attribute('aria-expanded','false')
    passed('All four navigation links preserve keyboard position in both directions across the desktop breakpoint')

    page.get_by_role('button',name='Open website navigation',exact=True).focus()
    page.keyboard.press('Space')
    page.set_viewport_size({'width':1366,'height':900})
    expect(page.get_by_role('link',name='Curio home',exact=True).first).to_be_focused()
    # A resize while the reader is outside the header must not steal focus.
    page.get_by_role('button',name='Find your first course',exact=True).focus()
    page.set_viewport_size({'width':900,'height':800})
    expect(page.get_by_role('button',name='Find your first course',exact=True)).to_be_focused()
    passed('Resize recovers the hidden menu trigger but leaves reading/action focus alone')

    page.goto(URL+'#learning',wait_until='networkidle')
    filters=page.get_by_role('group',name='Filter my learning') if page.get_by_role('group',name='Filter my learning').count() else page.locator('[aria-label="Filter my learning"]')
    for label,heading in [('Saved','Keep a course for later.'),('Completed','Your first finish line is ahead.'),('In progress','Your next chapter is unwritten.')]:
        filters.get_by_role('button',name=label,exact=True).click()
        expect(page.get_by_role('heading',name=heading,exact=True)).to_be_visible()
    page.get_by_role('button',name='Find something to learn',exact=True).click()
    expect(page.locator('.course-card')).to_have_count(20)
    page.get_by_role('textbox',name='Search courses',exact=True).fill('no-course-with-this-title-9921')
    expect(page.get_by_role('heading',name='No discoveries here just yet.',exact=True)).to_be_visible()
    page.get_by_role('button',name='Explore all courses',exact=True).click()
    expect(page.locator('.course-card')).to_have_count(20)
    expect(page.get_by_role('textbox',name='Search courses',exact=True)).to_have_value('')
    passed('Saved/completed/in-progress empty states stay accurate; no-result search recovers the full real catalog')
    assert not errors,errors
    browser.close()
print(f'{checks} minor UX checks passed in {ENGINE}.',flush=True)

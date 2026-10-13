"""Validate the public landing page and its connection to the learning app."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

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
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, failed_resources = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    # React StrictMode cancels its first session/catalog request during effect cleanup.
    page.on('requestfailed', lambda request: failed_resources.append(request.url) if not (request.failure == 'net::ERR_ABORTED' and request.url.endswith(('/api/session', '/api/courses'))) else None)

    page.goto(URL, wait_until='networkidle')
    expect(page.locator('#landing-title')).to_have_text('Learn it.Make it yours.')
    expect(page.locator('.landing-course')).to_have_count(4)
    expect(page.locator('.landing-facts')).to_contain_text('121')
    expect(page.locator('.app-shell')).to_have_count(0)
    page.screenshot(path=str(OUTPUT / '06-landing-desktop.png'), full_page=True)
    page.screenshot(path=str(OUTPUT / '07-landing-hero.png'))
    passed('The public landing page is the default entry point; courses and lesson totals match the product')

    preview = page.get_by_role('region', name='Every pattern has a story.')
    expect(preview.get_by_role('button', name='Check my thinking')).to_be_disabled()
    preview.get_by_role('button', name='12', exact=True).click()
    preview.get_by_role('button', name='Check my thinking').click()
    expect(preview.get_by_role('status')).to_contain_text('Each number is 3 more')
    preview.get_by_role('button', name='14', exact=True).click()
    preview.get_by_role('button', name='Check my thinking').click()
    expect(preview.get_by_role('status')).to_contain_text('11 + 3 = 14')
    expect(page.locator('.landing-sequence-value.solved')).to_have_text('14')
    saved = page.evaluate("JSON.parse(localStorage.getItem('curio.student.v1'))")
    assert saved['enrolled'] == [] and saved['completed'] == {}, 'A marketing preview must not award course completion'
    passed('The live lesson preview supports wrong answers, retry, explanation, and honest completion state')

    preview.get_by_role('button', name='Keep learning').click()
    dialog = page.get_by_role('dialog')
    expect(dialog.get_by_role('heading', name='Thinking in numbers', exact=True)).to_be_visible()
    dialog.get_by_role('button', name='Let’s start learning').click()
    dialog.get_by_role('button', name='Got it. Let me try!').click()
    dialog.locator('.quiz-option').filter(has_text='14').click()
    dialog.get_by_role('button', name='Check my answer').click()
    dialog.get_by_role('button', name='Finish lesson').click()
    expect(dialog.get_by_role('status')).to_contain_text('1 of 7 lessons complete')
    page.keyboard.press('Escape')
    expect(dialog).to_have_count(0)
    expect(preview.get_by_role('button', name='Keep learning')).to_be_focused()
    passed('The preview opens a real course; a student can finish a lesson and return to the landing page')

    page.get_by_role('button', name='Explore The physics of everyday life', exact=True).click()
    expect(dialog.get_by_role('heading', name='The physics of everyday life', exact=True)).to_be_visible()
    dialog.get_by_role('button', name='Close dialog').click()
    expect(page.get_by_role('button', name='Explore The physics of everyday life', exact=True)).to_be_focused()
    passed('Featured course cards open their real course details and return focus to the selected card')

    for question, answer in [
        ('Do I need an account?', 'saved in this browser'),
        ('Is Curio free?', 'free to learn'),
        ('Can I stop and come back later?', 'continue on another device'),
    ]:
        item = page.locator('details').filter(has=page.locator('summary', has_text=question))
        item.locator('summary').click()
        expect(item.locator('p')).to_be_visible()
        expect(item.locator('p')).to_contain_text(answer)
        item.locator('summary').click()
        expect(item.locator('p')).not_to_be_visible()
    passed('FAQs expand and collapse with accurate account, pricing, and saved-progress information')

    page.get_by_role('navigation', name='Website navigation').get_by_role('link', name='Our courses').click()
    expect(page).to_have_url(f'{URL}#courses')
    page.reload(wait_until='networkidle')
    expect(page.locator('.landing-course-section')).to_be_visible()
    page.get_by_role('button', name='Explore all 20 courses').click()
    expect(page).to_have_url(f'{URL}#explore')
    expect(page.locator('.course-card')).to_have_count(20)
    page.go_back(wait_until='networkidle')
    expect(page.locator('.landing')).to_be_visible()
    expect(page).to_have_url(f'{URL}#courses')
    passed('Section links survive refresh; course discovery and browser Back return to the correct screen')

    page.get_by_role('button', name='My learning', exact=True).click()
    expect(page).to_have_url(f'{URL}#learning')
    expect(page.locator('.course-progress')).to_contain_text('1/7 complete')
    page.get_by_role('button', name='Curio home').click()
    expect(page.locator('#landing-title')).to_be_visible()
    passed('Returning learners reach their saved course; the app logo returns to the public homepage')

    page.get_by_role('button', name='Find your first course').click()
    expect(page).to_have_url(f'{URL}#explore')
    page.goto(URL, wait_until='networkidle')
    page.get_by_role('button', name='Find something to learn', exact=True).click()
    expect(page).to_have_url(f'{URL}#explore')
    passed('Both primary marketing calls to action lead to the working course catalog')

    for width in [320, 390, 768, 1366]:
        page.set_viewport_size({'width': width, 'height': 950})
        page.goto(URL, wait_until='networkidle')
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'Landing overflow at {width}px'
        if width <= 680:
            page.get_by_role('button', name='Open website navigation').click()
            mobile_navigation = page.get_by_role('navigation', name='Mobile website navigation')
            expect(mobile_navigation).to_be_visible()
            mobile_navigation.get_by_role('link', name='Our courses').click()
            expect(mobile_navigation).to_have_count(0)
            expect(page).to_have_url(f'{URL}#courses')
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
        if width == 390:
            page.goto(URL, wait_until='networkidle')
            page.screenshot(path=str(OUTPUT / '08-landing-mobile.png'), full_page=True)
    passed('Landing sections and mobile navigation fit 320, 390, 768, and 1366px screens')

    page.goto(URL, wait_until='networkidle')
    page.locator('summary').filter(has_text='Do I need an account?').focus()
    page.keyboard.press('Enter')
    expect(page.locator('details').filter(has_text='Do I need an account?').locator('p')).to_be_visible()
    page.keyboard.press('Enter')
    expect(page.locator('details').filter(has_text='Do I need an account?').locator('p')).not_to_be_visible()
    passed('FAQ disclosures work with a keyboard using native HTML behavior')

    assert not errors, f'JavaScript errors: {errors}'
    assert not failed_resources, f'Failed resources: {failed_resources}'
    passed('The landing-to-lesson journey has no JavaScript errors or failed asset requests')
    browser.close()

print(f'\n{checks} landing checks passed. Screenshots: {OUTPUT}', flush=True)

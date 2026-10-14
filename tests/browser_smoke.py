"""Exercise real student flows. Start npm run dev or preview before running."""
import json
import os
import re
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright, expect
from account_helpers import open_profile
from select_helpers import choose_option

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('CURIO_TEST_URL', 'http://127.0.0.1:5173/')
OUTPUT = ROOT / 'test-results'
OUTPUT.mkdir(exist_ok=True)
questions = json.loads(subprocess.check_output([
    'node', '--input-type=module', '-e',
    "import { courses, dailyChallenge } from './src/data.js'; console.log(JSON.stringify([dailyChallenge,...courses.flatMap(c=>c.lessons)]))"
], cwd=ROOT, text=True))
checks = 0


def passed(description):
    global checks
    checks += 1
    print(f'PASS {checks}: {description}', flush=True)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1366, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, failed_resources = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    # React StrictMode cancels its first session/catalog request during effect cleanup.
    page.on('requestfailed', lambda request: failed_resources.append(request.url) if not (request.failure == 'net::ERR_ABORTED' and request.url.endswith(('/api/session', '/api/courses'))) else None)
    page.goto(f'{URL.rstrip("/")}/#overview', wait_until='networkidle')
    expect(page.get_by_role('heading', name='Your learning, at a glance.')).to_be_visible()
    expect(page.locator('.course-card')).to_have_count(3)
    page.screenshot(path=str(OUTPUT / '01-dashboard-desktop.png'), full_page=True)
    passed('Dashboard loads three real featured courses with local fonts and artwork')

    navigation = page.get_by_role('navigation', name='Main navigation')
    navigation.get_by_role('button', name='Explore courses').click()
    expect(page.locator('.course-card')).to_have_count(20)
    page.get_by_role('button', name='Science', exact=True).click()
    expect(page.locator('.course-card')).to_have_count(1)
    expect(page.get_by_role('button', name='The physics of everyday life', exact=True)).to_be_visible()
    page.get_by_role('button', name='All courses', exact=True).click()
    choose_option(page.get_by_role('combobox', name='Sort courses'), 'A–Z')
    expect(page.locator('.course-card h3').first).to_have_text('A place in the universe')
    passed('Course categories and alphabetical sorting change the actual results')

    search = page.get_by_role('textbox', name='Search courses')
    search.fill('fractions-not-a-course')
    expect(page.get_by_role('heading', name='No discoveries here just yet.')).to_be_visible()
    page.get_by_role('button', name='Explore all courses', exact=True).click()
    expect(page.locator('.course-card')).to_have_count(20)
    search.fill('thinking in numbers')
    expect(page.locator('.course-card')).to_have_count(1)
    passed('Search filters courses; empty search results offer a working recovery')

    page.get_by_role('button', name='Explore course', exact=True).click()
    dialog = page.get_by_role('dialog')
    expect(dialog.get_by_role('heading', name='Thinking in numbers', exact=True)).to_be_visible()
    dialog.get_by_role('button', name='Let’s start learning').click()
    expect(dialog.get_by_role('heading', name='Find the pattern', exact=True)).to_be_visible()
    dialog.get_by_role('button', name='Increase step size').click()
    expect(dialog.locator('.sequence-number')).to_have_text(['2', '6', '10', '14', '18'])
    dialog.get_by_role('button', name='Decrease step size').click()
    expect(dialog.locator('.sequence-number')).to_have_text(['2', '5', '8', '11', '14'])
    passed('The sequence playground recalculates when students change the step size')

    dialog.get_by_role('button', name='Got it. Let me try!').click()
    expect(dialog.get_by_role('button', name='Check my answer')).to_be_disabled()
    dialog.locator('.quiz-option').filter(has_text='12').click()
    dialog.get_by_role('button', name='Check my answer').click()
    expect(dialog.get_by_role('status')).to_contain_text('Not quite')
    dialog.locator('.quiz-option').filter(has_text='14').click()
    dialog.get_by_role('button', name='Check my answer').click()
    expect(dialog.get_by_role('status')).to_contain_text('Each step adds 3')
    dialog.get_by_role('button', name='Finish lesson').click()
    expect(dialog.locator('.completion-notice')).to_contain_text('1 of 7 lessons complete')
    page.screenshot(path=str(OUTPUT / '02-lesson-completed.png'), full_page=True)
    dialog.get_by_role('button', name='Close dialog').click()
    passed('Wrong answers allow retry; a correct answer explains the idea and completes the lesson')

    navigation.get_by_role('button', name='My learning').click()
    expect(page.locator('.course-card')).to_have_count(1)
    expect(page.locator('.course-progress')).to_contain_text('1/7 complete')
    page.reload(wait_until='networkidle')
    expect(page.locator('.course-progress')).to_contain_text('1/7 complete')
    page.get_by_role('button', name='Continue learning', exact=True).click()
    dialog = page.get_by_role('dialog')
    dialog.get_by_role('button', name='Continue learning', exact=True).click()
    expect(dialog.get_by_role('heading', name='Parts of a whole', exact=True)).to_be_visible()
    passed('Course enrollment and completed lessons survive refresh; continue opens the next lesson')

    for answer in ['1/2', '$54', '1,000', '$1.50', '500 g', '25%']:
        dialog.get_by_role('button', name='Got it. Let me try!').click()
        dialog.locator('.quiz-option').filter(has_text=re.compile(r'^[A-D]\s*' + re.escape(answer) + r'$')).click()
        dialog.get_by_role('button', name='Check my answer').click()
        expect(dialog.get_by_role('status')).to_contain_text('That’s an aha moment')
        dialog.get_by_role('button', name='Finish lesson').click()
        if answer != '25%':
            dialog.get_by_role('button', name='Continue learning', exact=True).click()
    expect(dialog.locator('.completion-notice')).to_contain_text('Course complete')
    dialog.get_by_role('button', name='Close dialog').click()
    page.get_by_role('button', name='Completed', exact=True).click()
    expect(page.locator('.course-progress')).to_contain_text('7/7 complete')
    page.screenshot(path=str(OUTPUT / '03-my-learning.png'), full_page=True)
    passed('A full course can be completed and appears under the Completed filter')

    open_profile(page)
    dialog = page.get_by_role('dialog')
    dialog.get_by_role('textbox', name='What should we call you?').fill('   ')
    dialog.get_by_role('button', name='Save my preferences').click()
    expect(dialog.get_by_role('alert')).to_contain_text('Please enter a name')
    dialog.get_by_role('textbox', name='What should we call you?').fill('Azizbek')
    choose_option(dialog.get_by_role('combobox', name='Your daily learning goal'), '3')
    dialog.get_by_role('button', name='Save my preferences').click()
    navigation.get_by_role('button', name='Overview', exact=True).click()
    expect(page.locator('.greeting')).to_contain_text('AZIZBEK')
    page.reload(wait_until='networkidle')
    expect(page.locator('.greeting')).to_contain_text('AZIZBEK')
    passed('Profile rejects a blank name and saves valid preferences across reloads')

    navigation.get_by_role('button', name='Daily practice').click()
    page.get_by_role('button', name='Take today’s challenge').click()
    dialog = page.get_by_role('dialog')
    question_text = dialog.locator('.quiz h2').inner_text()
    question = next(q for q in questions if q['question'] == question_text)
    dialog.locator('.quiz-option').filter(has_text=question['options'][question['answer']]).click()
    dialog.get_by_role('button', name='Check my answer').click()
    dialog.get_by_role('button', name='Save my discovery').click()
    expect(page.locator('.completion-notice')).to_contain_text('Today’s challenge? Done.')
    before = page.evaluate("JSON.parse(localStorage.getItem('curio.student.v1')).activity")
    page.get_by_role('button', name='Review today’s challenge').click()
    dialog.locator('.quiz-option').filter(has_text=question['options'][question['answer']]).click()
    dialog.get_by_role('button', name='Check my answer').click()
    dialog.get_by_role('button', name='Back to practice').click()
    after = page.evaluate("JSON.parse(localStorage.getItem('curio.student.v1')).activity")
    assert before == after, 'Reviewing a challenge must not earn duplicate activity'
    passed('Daily practice records completion once; review does not inflate daily goals')

    navigation.get_by_role('button', name='Achievements').click()
    expect(page.locator('.badge-card.unlocked')).to_have_count(4)
    expect(page.locator('.badge-card.unlocked').filter(has_text='First spark')).to_be_visible()
    expect(page.locator('.badge-card.unlocked').filter(has_text='Chapter complete')).to_be_visible()
    passed('Achievements unlock from real lesson, course, and challenge progress')

    for width in [320, 390, 768, 1366]:
        page.set_viewport_size({'width': width, 'height': 950})
        for route in ['overview', 'explore', 'learning', 'practice', 'achievements']:
            page.goto(f'{URL.rstrip("/")}/#{route}', wait_until='networkidle')
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'{route} overflows at {width}px'
        page.goto(f'{URL.rstrip("/")}/#overview', wait_until='networkidle')
        if width <= 780:
            page.get_by_role('button', name='Open navigation').click()
            navigation.get_by_role('button', name='Explore courses').click()
            expect(page.get_by_role('heading', name='Find your next course.')).to_be_visible()
        if width == 390:
            page.screenshot(path=str(OUTPUT / '04-mobile-courses.png'), full_page=True)
        if width == 768:
            page.screenshot(path=str(OUTPUT / '05-tablet-courses.png'), full_page=True)
    passed('All five screens fit 320, 390, 768, and 1366px; mobile navigation works')

    open_profile(page)
    dialog = page.get_by_role('dialog')
    for _ in range(10):
        page.keyboard.press('Tab')
        assert page.evaluate("document.activeElement.closest('[role=dialog]') !== null"), 'Focus escaped the dialog'
    page.keyboard.press('Escape')
    expect(dialog).to_have_count(0)
    expect(page.get_by_role('button', name='Open account menu')).to_be_focused()
    page.keyboard.press('Control+k')
    expect(page.get_by_role('textbox', name='Search courses')).to_be_focused()
    passed('Dialog focus stays inside, Escape restores focus, and the search shortcut works')

    assert not errors, f'JavaScript errors: {errors}'
    assert not failed_resources, f'Failed resources: {failed_resources}'
    passed('No browser JavaScript errors or failed resource requests during the complete flow')

    restricted = browser.new_context(viewport={'width': 1366, 'height': 900})
    restricted.add_init_script("Storage.prototype.getItem = () => { throw new Error('Storage blocked'); }; Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };")
    restricted_page = restricted.new_page()
    restricted_page.goto(f'{URL.rstrip("/")}/#overview', wait_until='networkidle')
    expect(restricted_page.locator('.storage-warning')).to_contain_text('Your browser can’t save progress')
    expect(restricted_page.locator('.course-card')).to_have_count(3)
    passed('When browser storage is blocked, learning remains available and the limitation is explained')
    restricted.close()
    browser.close()

print(f'\n{checks} browser checks passed. Screenshots: {OUTPUT}', flush=True)

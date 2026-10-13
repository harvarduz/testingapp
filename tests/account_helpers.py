"""Open account actions through the same visible controls a learner uses."""
from playwright.sync_api import expect


def account_menu(page):
    trigger = page.get_by_role('button', name='Open account menu', exact=True)
    expect(trigger).to_be_enabled()
    expect(trigger).to_have_attribute('aria-busy', 'false')
    if trigger.get_attribute('aria-expanded') != 'true':
        trigger.click()
    menu = page.get_by_role('region', name='Account menu', exact=True)
    expect(menu).to_be_visible()
    return menu


def open_profile(page):
    account_menu(page).get_by_role('button', name='Learning profile', exact=True).click()
    expect(page.get_by_role('dialog', name='Learning profile', exact=True)).to_be_visible()


def open_account(page, mode='register'):
    account_menu(page).get_by_role('button', name='Create account' if mode == 'register' else 'Sign in', exact=True).click()
    expect(page.get_by_role('dialog', name='Your Curio account', exact=True)).to_be_visible()

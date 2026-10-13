"""Choose through the actual visible menu rather than a hidden form select."""
import json
from playwright.sync_api import expect


def choose_option(control, value):
    control.click()
    option = control.page.locator('[role="option"][data-value=' + json.dumps(str(value), ensure_ascii=False) + ']')
    expect(option).to_be_visible()
    option.click()
    expect(control).to_have_attribute('data-value', str(value))

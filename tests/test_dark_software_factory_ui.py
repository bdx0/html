"""Dark Software Factory browser UX smoke tests.

Install: pip install playwright && playwright install chromium
Run: python3 tests/test_dark_software_factory_ui.py
Tests emulate viewport sizes and user journeys. They are not real iPad Safari tests.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

HTML = Path(__file__).resolve().parents[1] / "dark-software-factory.html"
SIZES = [
    ("iphone-se", 320, 700),
    ("iphone", 390, 844),
    ("ipad-mini-portrait", 768, 1024),
    ("ipad-portrait", 820, 1180),
    ("ipad-landscape", 1180, 820),
    ("ipad-pro-landscape", 1366, 1024),
    ("desktop", 1600, 900),
]

def assert_no_horizontal_overflow(page, scenario):
    sizes = page.evaluate("""() => ({
        viewport: innerWidth,
        html: document.documentElement.scrollWidth,
        body: document.body.scrollWidth
    })""")
    assert sizes["html"] <= sizes["viewport"] + 2, (scenario, sizes)
    assert sizes["body"] <= sizes["viewport"] + 2, (scenario, sizes)

def test_user_journey(browser, name, width, height, html):
    page = browser.new_page(
        viewport={"width": width, "height": height},
        has_touch=width < 1400,
        is_mobile=width <= 430,
    )
    page.set_default_timeout(8000)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.set_content(html, wait_until="load")

    assert page.locator("#projectName").count() == 1, name
    assert page.locator("[data-scenario]").count() == 4, name
    assert_no_horizontal_overflow(page, (name, "new"))

    # Import GitHub, reject a wrong URL, and accept a valid URL.
    page.locator('[data-scenario="github"]').click()
    assert page.locator("#repo").count() == 1
    page.locator("#repo").fill("https://invalid.example/repo")
    page.locator("#generate").click()
    assert page.locator("#formError").is_visible()
    page.locator("#repo").fill("https://github.com/example/team-portal")
    page.locator("#generate").click()
    assert page.locator("#planBudget").count() == 1
    assert page.locator(".quick-plan").is_visible()
    assert_no_horizontal_overflow(page, (name, "plan"))

    # Expand a step, authorize, simulate, pause and reset.
    page.locator('[data-expand="3"]').click()
    assert page.get_by_text("Provisioning Runtime").count() >= 1
    page.locator("#confirm").check()
    assert page.locator("#approve").is_enabled()
    page.locator("#approve").click()
    assert page.locator("#runToggle").count() == 1
    page.locator("#runToggle").click()
    assert page.locator(".logs .log").count() >= 1
    page.locator("#runToggle").click()
    assert "Tiếp tục" in page.locator("#runToggle").inner_text()
    page.locator("#runReset").click()
    assert page.locator(".logs .log").count() == 0
    assert_no_horizontal_overflow(page, (name, "run"))

    # Budget too low must block approval; re-approval on new budget.
    page.locator('[data-route="new"]:visible').first.click()
    page.locator('[data-scenario="budget"]').click()
    page.locator("#generate").click()
    assert page.locator(".quick-plan .bad").count() == 1
    page.locator("#confirm").check()
    assert page.locator("#approve").is_disabled()
    page.locator("#planBudget").fill("300")
    page.locator("#planBudget").dispatch_event("change")
    assert not page.locator("#confirm").is_checked()
    page.locator("#confirm").check()
    assert page.locator("#approve").is_enabled()
    assert_no_horizontal_overflow(page, (name, "budget"))

    # Production case should prefill environment, no script error.
    page.locator('[data-route="new"]:visible').first.click()
    page.locator('[data-scenario="prod"]').click()
    assert page.locator("#env").input_value() == "production"
    assert not errors, (name, errors)
    page.close()

if __name__ == "__main__":
    html = HTML.read_text(encoding="utf-8")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for name, width, height in SIZES:
            test_user_journey(browser, name, width, height, html)
            print("PASS", name)
        browser.close()
    print("All responsive journey tests passed.")

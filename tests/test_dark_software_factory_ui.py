"""Responsive interaction smoke tests for the Dark Software Factory UX.

Install: pip install playwright && playwright install chromium
Run: python tests/test_dark_software_factory_ui.py
Viewport emulation does not replace Safari testing on a real iPad.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

HTML = (Path(__file__).resolve().parents[1] / "dark-software-factory.html").read_text(encoding="utf-8")
DEVICES = [
    ("iphone-se", 320, 700), ("iphone", 390, 844),
    ("ipad-mini", 768, 1024), ("ipad", 820, 1180),
    ("ipad-landscape", 1180, 820), ("ipad-pro", 1366, 1024),
    ("desktop", 1600, 900),
]

def check_width(page, context):
    values = page.evaluate("""() => ({
        viewport: innerWidth, html: document.documentElement.scrollWidth,
        body: document.body.scrollWidth
    })""")
    assert values["html"] <= values["viewport"] + 2, (context, values)
    assert values["body"] <= values["viewport"] + 2, (context, values)

def test_flow(browser, device, width, height):
    page = browser.new_page(viewport={"width": width, "height": height},
                            has_touch=width < 1400, is_mobile=width <= 430)
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    page.set_content(HTML)
    assert page.locator(".welcome-screen").is_visible(), device
    assert page.locator("#goal").input_value() == "", device
    assert page.locator("#advancedOptions:not([open])").count() == 1, device
    assert page.locator(".scenario-lab").count() == 0, device
    assert page.locator(".layout.welcome").count() == 1, device
    check_width(page, (device, "welcome"))

    # Empty submission and attachment flows.
    page.locator("#generate").click()
    assert page.locator("#formError").is_visible()
    page.locator("#fileInput").set_input_files({
        "name": "brief.md", "mimeType": "text/markdown", "buffer": b"# Brief"
    })
    assert page.locator(".attachment").count() == 1
    page.locator("#fileInput").set_input_files({
        "name": "payload.exe", "mimeType": "application/octet-stream", "buffer": b"bad"
    })
    assert page.locator(".attachment").count() == 1
    page.locator('[data-remove="0"]').click()
    assert page.locator(".attachment").count() == 0

    # Project request -> review -> approval -> execution.
    page.locator('[data-example="0"]').click()
    page.locator("#generate").click()
    assert page.locator(".quick-plan").is_visible()
    check_width(page, (device, "plan"))
    page.locator("#confirm").check()
    assert page.locator("#approve").is_enabled()
    page.locator("#approve").click()
    assert page.locator("#runToggle").is_visible()
    page.locator("#runToggle").click()
    assert page.locator(".logs .log").count() > 0
    page.locator("#runToggle").click()
    assert "Tiếp tục" in page.locator("#runToggle").inner_text()
    page.locator("#runReset").click()
    assert page.locator(".logs .log").count() == 0
    check_width(page, (device, "execution"))

    # GitHub opt-in with bad URL, then valid URL.
    page.locator('[data-route="new"]:visible').first.click()
    assert page.locator("#goal").input_value()
    page.locator('[data-source="github"]').click()
    assert page.locator("#repo").is_visible()
    page.locator("#repo").fill("https://invalid.example/repo")
    page.locator("#generate").click()
    assert page.locator("#formError").is_visible()
    page.locator("#repo").fill("https://github.com/example/team-portal")
    page.locator("#generate").click()
    assert page.locator("#planBudget").count() == 1
    check_width(page, (device, "github"))

    # A low cap blocks approval until user adjusts it and reconfirms.
    page.locator('[data-route="new"]:visible').first.click()
    page.locator("#advancedOptions > summary").click()
    page.locator("#budget").fill("3")
    page.locator("#generate").click()
    assert page.locator(".quick-plan .bad").count() == 1
    page.locator("#confirm").check()
    assert page.locator("#approve").is_disabled()
    page.locator("#planBudget").fill("300")
    page.locator("#planBudget").dispatch_event("change")
    assert not page.locator("#confirm").is_checked()
    page.locator("#confirm").check()
    assert page.locator("#approve").is_enabled()
    check_width(page, (device, "budget"))
    assert not errors, (device, errors)
    page.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for name, width, height in DEVICES:
            test_flow(browser, name, width, height)
            print("PASS", name)
        qa = browser.new_page(viewport={"width": 820, "height": 1180})
        qa.goto("about:blank?qa=1")
        qa.set_content(HTML)
        assert qa.locator(".scenario-chip").count() == 4
        qa.locator("#qaDetails > summary").click()
        qa.locator('[data-scenario="prod"]').click()
        assert qa.locator("#env").input_value() == "production"
        qa.close()
        browser.close()
    print("All UX journeys passed.")

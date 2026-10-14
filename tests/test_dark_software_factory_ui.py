"""Chat-first UX smoke tests for Dark Software Factory.

Install: pip install playwright && playwright install chromium
Run: python tests/test_dark_software_factory_ui.py
Viewport emulation does not replace testing with Safari on a physical iPad.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

HTML = (Path(__file__).resolve().parents[1] / "dark-software-factory.html").read_text(encoding="utf-8")
SIZES = [
    ("iphone-se", 320, 700), ("iphone", 390, 844),
    ("ipad-portrait", 768, 1024), ("ipad", 820, 1180),
    ("ipad-landscape", 1180, 820), ("ipad-pro", 1366, 1024),
    ("desktop", 1560, 900),
]


def no_overflow(page, name, stage):
    metrics = page.evaluate("""() => ({
        vw: innerWidth,
        html: document.documentElement.scrollWidth,
        body: document.body.scrollWidth
    })""")
    assert metrics["html"] <= metrics["vw"] + 1, (name, stage, metrics)
    assert metrics["body"] <= metrics["vw"] + 1, (name, stage, metrics)


def run(browser, name, width, height):
    page = browser.new_page(
        viewport={"width": width, "height": height},
        is_mobile=width <= 430,
        has_touch=width <= 1366,
    )
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.set_content(HTML)

    assert page.locator(".welcome h1").inner_text() == "Bạn muốn điều gì?"
    assert page.locator(".conversation").count() == 0
    assert page.locator(".child-offer").count() == 0
    no_overflow(page, name, "welcome")

    # A simple question stays inside the main conversation.
    page.locator("#messageInput").fill("Giải thích software factory là gì")
    page.locator('[data-action="send"]').click()
    assert page.locator(".conversation .message").count() == 2
    assert page.locator(".child-offer").count() == 0
    no_overflow(page, name, "simple")

    # Complex software goal creates a child discussion, not a project.
    page.locator("#messageInput").fill(
        "Xây dựng một ứng dụng quản lý công việc có API, PostgreSQL và triển khai production"
    )
    page.locator('[data-action="send"]').click()
    assert page.locator(".child-offer").count() == 1
    assert page.locator('[data-action="make-project"]').count() == 1
    assert page.locator('[data-tab="plan"]').count() == 0
    no_overflow(page, name, "child")

    # Parent can always be resumed; child state remains accessible.
    page.locator('.top-actions [data-action="main"]').click()
    assert page.locator(".conversation .message").count() == 4
    page.locator('.message [data-action="switch"]').last.click()
    page.locator('[data-action="make-project"]').click()
    assert page.locator("#budgetCap").count() == 1
    no_overflow(page, name, "plan")

    # Exceeding the budget prevents approval.
    page.locator("#budgetCap").fill("10")
    page.locator("#budgetCap").dispatch_event("change")
    assert page.locator('[data-action="approve"]').is_disabled()
    page.locator("#budgetCap").fill("100")
    page.locator("#budgetCap").dispatch_event("change")
    page.locator("#confirmApproval").check()
    assert page.locator('[data-action="approve"]').is_enabled()

    # Execution is a controlled simulation; pause and resume work.
    page.locator('[data-action="approve"]').click()
    page.locator('[data-action="pause"]').click()
    assert page.locator('[data-action="next-step"]').is_disabled()
    page.locator('[data-action="pause"]').click()
    for _ in range(6):
        page.locator('[data-action="next-step"]').click()
    assert page.locator(".plan-pill").filter(has_text="Hoàn tất").count() >= 1
    no_overflow(page, name, "execution")
    assert not errors, (name, errors)
    page.close()


if __name__ == "__main__":
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for name, width, height in SIZES:
            run(browser, name, width, height)
            print("PASS", name)
        browser.close()
    print("Chat-first UX tests passed")

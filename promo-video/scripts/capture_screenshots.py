#!/usr/bin/env python3
"""Capture screenshots from Upset app - main navigation screens."""
import os
import time
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = "/Users/obedlopez/Desktop/Dev/Upset/promo-video/public/screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def capture_screenshots():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=3,
        )
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:8081", timeout=30000)
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        # Skip through onboarding by clicking Skip
        print("Skipping onboarding...")
        try:
            skip = page.locator("text=Skip")
            if skip.is_visible():
                skip.click()
                time.sleep(1)
        except:
            pass

        # Click through any Continue buttons
        for i in range(5):
            try:
                cont = page.locator("text=CONTINUE")
                if cont.is_visible():
                    cont.click()
                    time.sleep(0.8)
            except:
                pass

        # Click GET STARTED
        try:
            get_started = page.locator("text=GET STARTED")
            if get_started.is_visible():
                print("Clicking GET STARTED...")
                get_started.click()
                time.sleep(2)
        except:
            pass

        print(f"After onboarding URL: {page.url}")
        page.screenshot(path=f"{SCREENSHOT_DIR}/after_onboarding.png")

        # Try navigating directly to tab routes
        tabs = [
            ("home", "/(tabs)/home"),
            ("pick", "/(tabs)/pick"),
            ("stats", "/(tabs)/stats"),
            ("leaderboards", "/(tabs)/leaderboards"),
        ]

        for name, route in tabs:
            try:
                print(f"Navigating to {name}...")
                page.goto(f"http://localhost:8081{route}", timeout=15000)
                page.wait_for_load_state("networkidle")
                time.sleep(3)
                page.screenshot(path=f"{SCREENSHOT_DIR}/{name}.png")
                print(f"  ✓ Captured {name}")
            except Exception as e:
                print(f"  ✗ Failed: {e}")

        browser.close()
        print(f"\nScreenshots saved to {SCREENSHOT_DIR}")

if __name__ == "__main__":
    capture_screenshots()

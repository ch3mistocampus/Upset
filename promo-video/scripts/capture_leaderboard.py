#!/usr/bin/env python3
"""Capture leaderboard without modal."""
import os
import time
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = "/Users/obedlopez/Desktop/Dev/Upset/promo-video/public/screenshots"

def capture():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=3,
        )
        page = context.new_page()

        print("Navigating to leaderboards...")
        page.goto("http://localhost:8081/(tabs)/leaderboards", timeout=15000)
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        # Try to dismiss the modal by clicking "NOT NOW"
        try:
            not_now = page.locator("text=NOT NOW")
            if not_now.is_visible():
                print("Dismissing modal...")
                not_now.click()
                time.sleep(1)
        except:
            pass

        # Also try clicking outside the modal or pressing Escape
        try:
            page.keyboard.press("Escape")
            time.sleep(0.5)
        except:
            pass

        page.screenshot(path=f"{SCREENSHOT_DIR}/leaderboards.png")
        print("✓ Captured leaderboards")
        browser.close()

if __name__ == "__main__":
    capture()

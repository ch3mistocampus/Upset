#!/usr/bin/env python3
"""Capture all screens needed for promo video."""
import os
import time
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = "/Users/obedlopez/Desktop/Dev/Upset/promo-video/public/screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def capture():
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

        # Skip through onboarding
        print("Skipping onboarding...")
        try:
            skip = page.locator("text=Skip")
            if skip.is_visible():
                skip.click()
                time.sleep(1)
        except:
            pass

        # Click through Continue buttons
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

        # Dismiss any modals
        def dismiss_modal():
            try:
                not_now = page.locator("text=NOT NOW")
                if not_now.is_visible():
                    not_now.click()
                    time.sleep(0.5)
            except:
                pass
            try:
                page.keyboard.press("Escape")
                time.sleep(0.3)
            except:
                pass

        # Capture main navigation screens
        tabs = [
            ("home", "/(tabs)/home"),
            ("pick", "/(tabs)/pick"),
            ("stats", "/(tabs)/stats"),
            ("leaderboards", "/(tabs)/leaderboards"),
            ("discover", "/(tabs)/discover"),
        ]

        for name, route in tabs:
            try:
                print(f"Navigating to {name}...")
                page.goto(f"http://localhost:8081{route}", timeout=15000)
                page.wait_for_load_state("networkidle")
                time.sleep(2)
                dismiss_modal()
                page.screenshot(path=f"{SCREENSHOT_DIR}/{name}.png")
                print(f"  ✓ Captured {name}")
            except Exception as e:
                print(f"  ✗ Failed: {e}")

        # Try to find a fighter profile - look for a fighter link on events page
        print("\nLooking for fighter profile...")
        try:
            # Go to pick/events page
            page.goto("http://localhost:8081/(tabs)/pick", timeout=15000)
            page.wait_for_load_state("networkidle")
            time.sleep(2)
            dismiss_modal()

            # Click on an event to see the fight card
            event_card = page.locator("[data-testid='event-card']").first
            if not event_card.is_visible():
                # Try clicking any card-like element
                event_card = page.locator("text=UFC").first

            if event_card.is_visible():
                event_card.click()
                time.sleep(2)
                page.wait_for_load_state("networkidle")
                print(f"  Navigated to event: {page.url}")

                # Look for a fighter name to click
                # Try common fighter name patterns
                fighter_link = page.locator("text=Paddy Pimblett").first
                if not fighter_link.is_visible():
                    fighter_link = page.locator("text=Gaethje").first
                if not fighter_link.is_visible():
                    # Try any fighter name pattern
                    fighter_link = page.locator("[data-testid='fighter-name']").first

                if fighter_link.is_visible():
                    fighter_link.click()
                    time.sleep(2)
                    page.wait_for_load_state("networkidle")
                    print(f"  Navigated to fighter: {page.url}")
                    dismiss_modal()
                    page.screenshot(path=f"{SCREENSHOT_DIR}/fighter-stats.png")
                    print("  ✓ Captured fighter-stats")
        except Exception as e:
            print(f"  ✗ Could not capture fighter stats: {e}")

        # Also try direct fighter URL if we know one exists
        try:
            print("\nTrying direct fighter URL...")
            # Try a known fighter ID (these are usually UUIDs or numeric IDs)
            page.goto("http://localhost:8081/fighter/1", timeout=10000)
            page.wait_for_load_state("networkidle")
            time.sleep(2)
            if "fighter" in page.url.lower():
                dismiss_modal()
                page.screenshot(path=f"{SCREENSHOT_DIR}/fighter-stats.png")
                print("  ✓ Captured fighter-stats via direct URL")
        except Exception as e:
            print(f"  Direct fighter URL failed: {e}")

        browser.close()
        print(f"\nScreenshots saved to {SCREENSHOT_DIR}")

if __name__ == "__main__":
    capture()

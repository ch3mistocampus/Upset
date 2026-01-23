# App Store Screenshot Checklist

## Device Sizes Required
- **6.7" Display** (iPhone 15 Pro Max, 14 Pro Max) - 1290 x 2796 px
- **6.5" Display** (iPhone 11 Pro Max, XS Max) - 1242 x 2688 px *(optional if you have 6.7")*
- **5.5" Display** (iPhone 8 Plus) - 1242 x 2208 px *(optional)*

**Tip:** Start with 6.7" - App Store can auto-generate smaller sizes.

---

## Screenshots to Capture (in order of importance)

### 1. Home Feed - Upcoming Events
**Path:** Open app → Home tab
**What to show:**
- Next UFC event card prominently displayed
- Countdown timer visible
- Clean, engaging first impression

**File name:** `01-home-feed.png`

---

### 2. Event Detail - Fight Card
**Path:** Home → Tap on an event
**What to show:**
- Full fight card with main event
- Fighter names and matchups visible
- Professional layout

**File name:** `02-event-detail.png`

---

### 3. Making Picks
**Path:** Event → Tap "Make Picks" or select fighters
**What to show:**
- Fighter selection UI (red/blue corners)
- At least one pick made (checkmark visible)
- Submit button visible

**File name:** `03-making-picks.png`

---

### 4. Fighter Stats
**Path:** Event → Tap on a fighter name
**What to show:**
- Fighter photo/avatar
- Key stats (record, reach, stance, etc.)
- Professional sports app feel

**File name:** `04-fighter-stats.png`

---

### 5. User Profile with Stats
**Path:** Profile tab (your own profile)
**What to show:**
- Accuracy percentage/ring
- Pick history
- Stats that show engagement

**File name:** `05-user-profile.png`

---

### 6. Leaderboard/Rankings
**Path:** Home → Leaderboard or Rankings section
**What to show:**
- Top pickers listed
- Your ranking visible
- Competitive/social aspect

**File name:** `06-leaderboard.png`

---

### 7. Social Feed (Optional)
**Path:** Feed tab with posts
**What to show:**
- User posts/discussions
- Community engagement
- Comments/interactions

**File name:** `07-social-feed.png`

---

### 8. Dark Mode (Optional but recommended)
**Path:** Settings → Theme → Dark
**What to show:**
- Same key screen (Home or Event) in dark mode
- Shows app polish and accessibility

**File name:** `08-dark-mode.png`

---

## How to Take Screenshots

### On Simulator:
1. Run app: `cd mobile && npx expo run:ios`
2. Select iPhone 15 Pro Max simulator
3. Navigate to each screen
4. Press `Cmd + S` to save screenshot
5. Screenshots save to Desktop by default

### On Physical Device:
1. Press `Side Button + Volume Up` simultaneously
2. Find in Photos app
3. AirDrop or transfer to computer

---

## Folder Structure
```
app-store-assets/
├── screenshots/
│   ├── 6.7-inch/
│   │   ├── 01-home-feed.png
│   │   ├── 02-event-detail.png
│   │   └── ...
│   ├── 6.5-inch/  (optional)
│   └── 5.5-inch/  (optional)
├── app-icon/
└── app-preview-video/  (optional)
```

---

## Screenshot Tips

1. **Use real data** - Make sure events and picks look realistic
2. **Hide status bar clutter** - Full battery, good signal, clean time
3. **Consistent theme** - All light mode OR all dark mode (not mixed)
4. **No personal info** - Use test account, not real email visible
5. **Landscape optional** - Portrait is standard for iPhone

---

## App Store Connect Upload

1. Go to App Store Connect → Your App → App Information
2. Select iOS app → Prepare for Submission
3. Upload screenshots under "App Preview and Screenshots"
4. Add optional promotional text for each screenshot

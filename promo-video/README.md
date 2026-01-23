# UPSET Promo Video

Cinematic promotional video for the UPSET MMA picks tracker app, built with [Remotion](https://remotion.dev).

## Quick Start

```bash
# Install dependencies
npm install

# Preview in browser
npm start

# Render final video
npx remotion render UpsetPromoPortrait out/promo-portrait.mp4
```

## Video Specs

- **Duration:** 16 seconds (480 frames @ 30fps)
- **Format:** Portrait 1080x1920 (TikTok, Instagram Reels, Stories)
- **Output:** MP4 (H.264)

## Scene Breakdown

| Scene | Frames | Duration | Description |
|-------|--------|----------|-------------|
| 1. Hook | 0-60 | 0-2s | Octagon animation + "UPSET" logo reveal |
| 2. Fight Card | 60-150 | 2-5s | Fight card + "Make Your Picks" |
| 3. Fighter Stats | 150-240 | 5-8s | Phone mockup with fighter comparison screen |
| 4. App Showcase | 240-390 | 8-13s | 4 screens cycling (Home, Feed, Stats, Rankings) |
| 5. CTA | 390-480 | 13-16s | "Join the Waitlist" with confetti |

## Visual Effects

### Phone Mockup Effects
- **3D Tilt Animation** - Phone tilts on entrance and sways during scene
- **Dynamic Shadow** - Shadow moves with the tilt animation
- **Screen Glow** - Soft light emanating from the phone screen
- **Shimmer Sweep** - Light reflection that moves across the screen
- **Tap Ripple** - Circular ripple simulating user interaction
- **Scroll Animation** - Content scrolls to show app depth

### Background Effects
- **Floating Particles** - Red accent dots drifting upward
- **Pulsing Gradient** - Background gradient that breathes/pulses

### Text Effects
- **Staggered Letter Reveal** - Letters animate in one-by-one with bounce

### CTA Scene Effects
- **Confetti Burst** - 30 colorful particles fall when button appears
- **Pulsing Button Glow** - Red glow that pulses to draw attention
- **Expanding Rings** - Circular rings emanating outward

## Project Structure

```
promo-video/
├── src/
│   ├── compositions/
│   │   └── UpsetPromo.tsx      # Main composition orchestrating scenes
│   ├── scenes/
│   │   ├── Scene1Hook.tsx      # Opening hook with octagon
│   │   ├── Scene2FightCard.tsx # Fight card display
│   │   ├── SceneFighterStats.tsx # Fighter comparison screen
│   │   ├── Scene3AppShowcase.tsx # App screens showcase
│   │   └── Scene5WaitlistCTA.tsx # Final CTA
│   ├── config/
│   │   └── video.ts            # Video config, timeline, types
│   ├── ui/
│   │   ├── theme.ts            # Colors, fonts, design tokens
│   │   ├── atoms.tsx           # Reusable UI components
│   │   ├── layout.ts           # Scaling utilities
│   │   └── Octagon.tsx         # Octagon shape component
│   └── Root.tsx                # Remotion entry point
├── public/
│   └── screenshots/            # App screenshots for mockups
│       ├── home.png
│       ├── discover-feed.png
│       ├── fighter-comparison.png
│       ├── bigfrank-stats.png
│       └── rankings.png
└── out/
    └── promo-portrait.mp4      # Rendered output
```

## Screenshots

Screenshots are captured from the iOS Simulator and placed in `public/screenshots/`. To update:

```bash
# Capture from running iOS Simulator
xcrun simctl io booted screenshot public/screenshots/screen-name.png
```

Required screenshots:
- `home.png` - Home screen with upcoming events
- `discover-feed.png` - Community feed with posts
- `fighter-comparison.png` - Fighter stats comparison modal
- `bigfrank-stats.png` - User profile with stats
- `rankings.png` - Leaderboard rankings

## Customization

### Adjusting Timing
Edit `src/config/video.ts` to change scene durations:

```typescript
export const TIMELINE = {
  scene1: { start: 0, end: 60 },
  scene2: { start: 60, end: 150 },
  sceneFighterStats: { start: 150, end: 240 },
  scene3: { start: 240, end: 390 },
  scene4: { start: 390, end: 480 },
};
```

### Adjusting Phone Size
In each scene file, modify the `phoneWidth` multiplier:

```typescript
const phoneWidth = isPortrait ? width * 0.65 : width * 0.35;
```

### Adding New Effects
Effects are implemented using Remotion's animation primitives:
- `interpolate()` - Linear/eased value mapping
- `spring()` - Physics-based spring animations
- `Easing` - Easing functions for smooth motion

See existing scenes for patterns.

## Rendering Options

```bash
# Standard render
npx remotion render UpsetPromoPortrait out/promo.mp4

# Higher quality (slower)
npx remotion render UpsetPromoPortrait out/promo.mp4 --crf 18

# GIF output
npx remotion render UpsetPromoPortrait out/promo.gif

# Specific frame range
npx remotion render UpsetPromoPortrait out/clip.mp4 --frames=0-60
```

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Accent | `#D11B2A` | UFC red, buttons, highlights |
| Background | `#FAFAFA` | Off-white page background |
| Text | `#1A1A1A` | Primary text |
| Muted | `#666666` | Secondary text |
| Display Font | BebasNeue | Titles, uppercase |
| Body Font | System (SF Pro) | Body text |

## Debug Mode

Enable debug overlay in `src/compositions/UpsetPromo.tsx`:

```typescript
const DEV_MODE = true;
```

Shows:
- Safe margin guides (6% on each side)
- Frame counter
- Current scene indicator

## Dependencies

- `remotion` - React video framework
- `@remotion/cli` - Rendering CLI
- `react`, `react-dom` - UI framework

## Legal Notes

- No UFC trademarks or logos used
- Fighter names used for demonstration only
- App screenshots are from the actual UPSET app

# 🎱 Marble Race

A physics-based marble racing game built with **Next.js 14**, **Matter.js**, **Tailwind CSS**, **shadcn/ui components**, and **Zustand**.

---

## 🎮 How It Works

1. **Setup screen** — Enter 2–48 player names. Each gets a unique colored marble. Select a map (Classic or custom). Enable Tournament Mode for multi-race championships.
2. **Race screen** — After a 3-second countdown, marbles spawn at the top and fall through an 8-zone obstacle course. Physics makes every race unpredictable.
3. **Winner announced** — The first marble to cross the finish line triggers a full-screen announcement with confetti and a fanfare.
4. **Results screen** — Full podium + rankings for every player, with finish times.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm / yarn / pnpm

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Open in browser
open http://localhost:3000
```

### Production Build

```bash
npm run build
npm start
```

### Tests

```bash
npm test
```

---

## 📁 Project Structure

```
marble-race/
├── app/
│   ├── globals.css               # Global styles, fonts, CSS variables
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Setup screen (player entry, map/audio/language)
│   ├── race/
│   │   └── page.tsx              # Race screen (canvas + sidebar)
│   ├── results/
│   │   └── page.tsx              # Results / podium screen
│   ├── editor/
│   │   └── page.tsx              # Custom map editor
│   └── tournament/
│       ├── page.tsx              # Tournament setup (players + map counts)
│       ├── race/
│       │   └── page.tsx          # Tournament race wrapper
│       ├── standings/
│       │   └── page.tsx          # Between-race standings with progress bar
│       └── results/
│           └── page.tsx          # Final tournament results & champion
│
├── components/
│   ├── LangToggle.tsx            # EN / CS language switcher
│   ├── LiveSidebar.tsx           # Live rank sidebar during race
│   ├── WinnerModal.tsx           # Winner announcement + confetti
│   └── ui/
│       ├── button.tsx            # Reusable button (CVA variants)
│       ├── input.tsx             # Reusable input
│       ├── badge.tsx             # Status badges
│       ├── card.tsx              # Card primitives
│       └── dialog.tsx            # Radix Dialog wrapper
│
├── hooks/
│   ├── useGameEngine.ts          # Matter.js physics engine + canvas renderer
│   ├── useAudio.ts               # Procedural Web Audio engine (music + SFX)
│   └── useLanguage.ts            # Language toggle with cross-component sync
│
├── store/
│   ├── raceStore.ts              # Zustand global race state
│   ├── mapStore.ts               # Custom maps persistence (localStorage)
│   └── tournamentStore.ts        # Tournament state & standings computation
│
├── lib/
│   ├── utils.ts                  # cn() helper (clsx + tailwind-merge)
│   ├── marbleUtils.ts            # Color utilities, podium constants
│   ├── trackBuilder.ts           # Pure track layout + validation (no Matter.js)
│   ├── themes.ts                 # 7 background visual themes
│   └── i18n.ts                   # English + Czech translation dictionary
│
├── __tests__/
│   └── trackBuilder.test.mjs     # 15-case track playability test suite
│
├── tailwind.config.ts            # Custom theme (Bebas Neue, DM Sans, arcade colors)
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## ✨ Features

### 🏆 Tournament Mode
A full multi-race championship system:
- Set up 2–48 players and choose how many times each map is raced (up to 9× each)
- Races are scheduled round-robin across maps
- Live standings update after every race, showing per-race placement chips
- Winner is determined by **lowest average finish place**, with average time as tiebreaker
- Final results screen declares the tournament champion

### 🗺️ Custom Map Editor
A full in-browser track designer:
- **7 obstacle types** to stamp: Peg, Rail, Platform, U-Ramp, Launch ←, Launch →, Boost ↑
- Click to stamp, drag-to-place, click obstacle to select, Del to remove
- Angle control for rails and platforms
- **7 background themes**: Default, Winter, Forest, Sci-Fi, Volcano, Ocean, Neon City
- Maps are saved to `localStorage` with auto-generated thumbnails
- Saved maps appear in the race setup map picker and tournament map list
- Load & edit previously saved maps at any time

### 🔊 Procedural Audio Engine
All audio is synthesised in real time — no audio files required:
- **6 sound effects**: peg bounce (throttled to ~15/s), pad fire (pitched by direction), countdown beep, shuffle whoosh, finish crossing (rank-dimmed), winner fanfare (ascending arpeggio with delay reverb)
- **Background music**: 128 BPM procedural techno loop — kick + snare + hi-hat + bass synth (A minor pentatonic, offbeat pattern) + chord pad (slow attack, 2-bar phrases)
- Mute toggle and master volume slider on the setup screen
- Preferences persisted to `localStorage`

### 🌍 Internationalisation (EN / CS)
- Full English and Czech translations across all screens
- Language toggle in the top-right corner of every page
- Selection persisted to `localStorage` and broadcast via `CustomEvent` so all mounted components update instantly

### 🎯 Anti-Stuck Track Guarantees
The track builder (`lib/trackBuilder.ts`) enforces six playability rules:
1. **Corridor**: every y-level has a horizontal gap ≥ 36 px free of solid obstacles
2. **No pockets**: U-ramp depth < width; each U-ramp has a launch pad at its floor
3. **Zone buffers**: obstacles stay within their zone with a 36 px border margin
4. **Platform cap**: platforms ≤ 30% of play width so the opposite side is always open
5. **Pad strength**: every launch pad fires at speed ≥ 5 px/frame
6. **Symmetry**: ramps, pads, and rails come in mirrored pairs

### 🏎️ Race Mechanics
- **Wind**: invisible lateral force applied to all marbles each frame
- **Stuck kick**: marbles idle for too long are launched in a random direction
- **Finish timing**: elapsed time from race start is recorded for each finisher
- **Progress tracking**: live sidebar updates ~60× per second via Zustand selectors
- Up to **48 players** per race

---

## 🎨 Design System

**Aesthetic:** Arcade dark mode — neon glow accents, physics-driven chaos, brutalist typography.

| Token | Value |
|-------|-------|
| Background | `#0a0a0f` |
| Panel | `#111118` |
| Border | `#1e1e2e` |
| Accent purple | `#7c3aed` |
| Accent cyan | `#06b6d4` |
| Accent amber (tournament) | `#fbbf24` |
| Display font | Bebas Neue |
| Body font | DM Sans |
| Mono font | JetBrains Mono |

---

## ⚙️ Physics Configuration

The physics engine (`hooks/useGameEngine.ts`) uses Matter.js with:

| Setting | Value | Effect |
|---------|-------|--------|
| Gravity Y | 1.2 | Slightly faster than real |
| Marble restitution | 0.6 | Bouncy but not chaotic |
| Peg restitution | 0.5 | Medium bounce off pegs |
| Bumper restitution | 0.7 | High bounce off ramps |
| Air friction | 0.008 | Slight drag, prevents infinite bouncing |
| Marble density | 0.003 | Light enough to drift |

**Obstacle layout (Classic map):**
- 8 named zones from spawn to finish line
- Zone 0–1: staggered peg field (3 rows × 4 cols)
- Zone 1–2: angled funnel rails + scatter pegs
- Zone 2–3: twin U-ramps with outward launch pads
- Zone 3–4: staircase of short angled platforms
- Zone 4–5: upward boost pads + 3-row peg cluster
- Zone 5–6: offset horizontal shelf rails + guide diagonals
- Zone 6–7: convergence funnel + centre boost pad
- Zone 7–finish: final scatter pegs for last-second drama

---

## 🏗️ Key Architectural Decisions

### Why Matter.js?
- Mature 2D physics with deterministic collision events
- Works cleanly in Next.js with dynamic import (avoids SSR issues)
- Sensor bodies make finish-line detection trivial

### Why Zustand?
- No boilerplate, works perfectly across Next.js pages
- Progress updates fire ~60 times/second — Zustand handles this without re-render storms thanks to selector-based subscriptions
- `getState()` is used directly in tournament navigation (outside React) which Zustand supports cleanly

### Why custom canvas renderer?
- Matter.js's built-in renderer (MatterRender) requires a DOM element passed at creation time and doesn't compose well with React refs
- Custom `requestAnimationFrame` loop gives full control over glow effects, labels, marble gradients, finish-line rendering, and theme `drawExtra` callbacks

### Why pure `trackBuilder.ts` with no Matter.js dependency?
- Enables full unit testing of track layout logic without a browser environment
- `validateTrack()` and `simulateStraightDrop()` can run in Node.js (used by the test suite)
- Separation of concerns: layout rules live in one file, physics wiring lives in the hook

### Why procedural audio?
- Zero asset loading, zero network requests
- Predictable sound on all platforms without codec concerns
- The Web Audio scheduling pattern (lookahead + setTimeout) avoids `ScriptProcessorNode` and runs glitch-free

### Map editor persistence
- Custom maps are stored as JSON in `localStorage` under `marble-race-maps`
- `mapStore` always initialises with safe SSR-compatible defaults and hydrates on the first client-side `useEffect`, avoiding Next.js hydration mismatches

---

## 🧪 Test Suite

`__tests__/trackBuilder.test.mjs` covers 15 cases:

1. Track structure — all obstacle kinds present, correct counts
2. Corridor guarantee — horizontal open gap ≥ CORRIDOR at every y-level
3. No-stuck layout — platform width, U-ramp depth/width, pad speed
4. U-ramp / pad pairing — every ramp has a launch pad within 25 px
5. Wall safety — no obstacle clips either side wall
6. Pad direction logic — vx/vy signs match declared direction
7. Straight-drop sim — marble can reach finish from any spawn x
8. Finish line clear — no solid obstacle within MARBLE_RADIUS of finishY
9. Even distribution — obstacles cover ≥ 70% of track height
10. Left-right symmetry — obstacle count ratio between halves ≥ 0.70
11. Determinism — identical output on repeated calls
12. Multi-size validity — passes `validateTrack` with zero errors at 3 canvas sizes
13. Race timing heuristic — track height implies ~15–45 s race
14. Redirector count — enough angled/pad obstacles for varied paths
15. `validateTrack` catches bad configs (regression tests)

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `next` | React framework + routing |
| `matter-js` | 2D physics engine |
| `zustand` | Global state management |
| `canvas-confetti` | Winner celebration |
| `@radix-ui/react-dialog` | Accessible modal primitive |
| `class-variance-authority` | Component variant styling |
| `clsx` + `tailwind-merge` | Conditional class merging |
| `lucide-react` | Icon set |

---

## 🪲 Known Quirks

- **SSR:** `matter-js` is dynamically imported inside `useEffect` to prevent server-side rendering errors (it accesses `window`).
- **Canvas sizing:** The canvas is sized to its `clientWidth/clientHeight` on engine init. If the window resizes mid-race, pegs and marbles may misalign. A `ResizeObserver` + engine restart would fix this.
- **Progress tracking:** Progress is approximated by Y-position, not actual path length. A marble that bounces backward will briefly show decreased progress.
- **Audio on mobile:** Some mobile browsers require a user gesture before `AudioContext` can be created. The `resumeCtx()` call on the first interaction handles this, but a brief moment of silence is possible on the very first race.
- **Map editor on touch:** The stamp/drag interaction is mouse-optimised. Touch support is not fully implemented.
- **Mute and SFX consistency:** `playShuffle` and `playWinnerFanfare` currently play even when muted (they don't guard against `prefs.muted`), while other SFX respect the mute flag. This is a minor known bug.

---

Built with ❤️ and physics.
"# marble-race" 

# ARCPLAY — Claude Code Session Protocol

You are the AI development team for ARCPLAY — a social-first competitive gaming ecosystem for mobile (iOS & Android). You operate as a senior software architect, lead developer, and product consultant simultaneously.

You are not a general assistant. You are a dedicated expert development partner who knows this codebase, every decision ever made, and every line of code. You speak with the confidence and directness of a senior technical co-founder.

The founder is non-technical. Always explain what to do in plain English. When errors occur, write the fix directly — never just describe it.

---

## IDENTITY & BEHAVIOUR

- Be direct and specific — no vague answers
- If something is a bad idea, say so clearly and explain why
- If a decision is already CLOSED, say so and refer to the decision ID
- Never say "it depends" without immediately explaining what it depends on and giving a recommendation
- Always give the founder enough information to make informed choices

---

## BEFORE EVERY SESSION — NON-NEGOTIABLE

Run these steps every time before touching any code:

1. **Read all three documents** — `CLAUDE.md`, `BUILD_LOG.md`, `DECISIONS_LOG.md`
2. **Document Integrity Check** — audit every document for:
   - Are all fields filled in? No placeholders remaining?
   - Does BUILD_LOG current status match the step tracker?
   - Are there decisions referenced but not logged in DECISIONS_LOG?
   - Are there any open bugs not reflected in blockers?
   - Any information that appears missing, inconsistent, or contradictory?
   - List every gap found and wait for founder confirmation before proceeding
   - If documents are clean, state this explicitly
3. **Report status** — current phase, current step, last completed, open bugs
4. **Estimate** — how much of the planned step can realistically be completed
5. **Propose agenda** — exactly what will be built, broken into sub-tasks
6. **Confirm** — founder confirms agenda before building starts. Never start a step that cannot be completed.

---

## DURING EVERY SESSION

- Always refer to the PRD (Section: PRD Reference) before building any screen or feature
- Always follow the folder structure and coding conventions below
- Always state the full file path before writing any code
- Always deliver complete, functional files — no placeholders, no TODOs, no fragments
- After every file: state exactly what command to run and what the user should see
- Never start a new step until the previous one is marked COMPLETE in BUILD_LOG.md
- Always fix all open bugs before starting any new step
- Never change the tech stack, folder structure, or conventions without flagging it and logging a new decision
- Check DECISIONS_LOG.md before any architectural choice
- Never build any financial feature until D-024 is CLOSED
- Never begin Phase 2 features until Phase 1 is fully QA-passed
- Every database schema change must have a migration file in /supabase/migrations

---

## BEFORE EVERY SESSION ENDS — NON-NEGOTIABLE

Produce a Session End Summary containing:
1. Every file completed this session with full paths
2. Exact state of anything in-progress
3. Pre-written BUILD_LOG.md update — ready to apply
4. Pre-written DECISIONS_LOG.md additions — ready to append
5. Pre-written CLAUDE.md Current Build Status section — updated values
6. Proposed next session agenda
7. Reminder to commit all document changes to GitHub

---

## WHAT ARCPLAY IS

ARCPLAY is a social-first competitive gaming ecosystem for mobile (iOS & Android). Users register once and subscribe to any game on the platform — launching with Chess and Rummy simultaneously. One identity, one wallet, one community across all games.

**Core Differentiator:** Every other gaming app puts players in a pool of strangers. ARCPLAY puts players in a world they build themselves — their communities, their championships, their sponsorships, their earnings.

| Attribute | Value |
|---|---|
| Platform Type | Mobile-first gaming ecosystem (iOS & Android) |
| Launch Games | Chess and Rummy — simultaneous dual launch |
| Rummy Variants | Points Rummy, Deals Rummy, Pool Rummy (101 and 201) |
| Phase 2 Games | Poker |
| Target User | Serious and competitive players — all ages, global |
| Min Age | 13+ for platform. Under-18: no real-money tournaments, no sponsorship contracts, no withdrawals |
| Language | English-first |
| Business Model | Free platform. Revenue: tournament prize pool cut (10-15%), sponsorship facilitation fees, premium features, ticketed broadcast share (10%), developer listing fee (Phase 3+) |
| PRD Reference | PRD v1.3 — see ARCPLAY_PRD_v1_3.md in repo root |

---

## TECH STACK — FIXED

Never suggest replacing any tool without flagging it as a new decision.

| Technology | Role |
|---|---|
| React Native + Expo SDK 54 | Cross-platform mobile. TypeScript strict mode. Expo Go for dev testing. |
| Supabase | PostgreSQL, auth, real-time sync, file storage. Monolith (D-026). Auth: email/password + Google (D-027). time_control column in rooms (D-028). |
| Stripe Connect | All payments, escrow, KYC, KYB. Phase 3+ only. Platform never holds funds. |
| Claude API (Anthropic) | All AI features. Chess: minimax + alpha-beta. Rummy: probability-based. |
| Agora.io | Live tournament broadcasting. Phase 3. |
| Expo Nearby / BLE | Bluetooth offline play. Deferred — Mac required (D-032). |
| React Native NetInfo + Sockets | Wi-Fi LAN offline play. Deferred — Mac required (D-032). |
| Cloudinary | Media hosting. Preset: arcplay_uploads (Unsigned). |
| Expo Notifications | Push notifications. |
| Stripe Identity | KYC verification. Phase 3. |
| Zustand | Global state. All global state in /store only. Never Redux or Context API. |
| Git + GitHub | Repo: NitAppDevOps/arcplay. .env never committed. |
| babel-plugin-module-resolver | Path alias resolution. Installed via npm --legacy-peer-deps. |

**Critical rules:**
- npm install flag: always use `--legacy-peer-deps` for non-Expo packages
- React must stay pinned at 19.1.0
- SafeAreaView: ALWAYS from `react-native-safe-area-context`, NEVER from `react-native`
- STRIPE_SECRET_KEY: only in Supabase Edge Functions, never client-side
- .env must never be committed to Git

---

## FOLDER STRUCTURE

Always state the full file path before writing any code. Never deviate.

```
/arcplay
  /src
    /screens              ← one file per screen
    /components           ← reusable UI components
    /hooks                ← shared logic hooks
    /services
      supabase.ts
      stripe.ts
      claude.ts
      agora.ts
      cloudinary.ts
      rooms.ts
      rummy.ts
      chess.ts
    /store
      authStore.ts
      gameStore.ts
      profileStore.ts
    /navigation
    /utils
    /constants
      colours.ts          ← all colour values — never hardcode hex
      fonts.ts
      spacing.ts
      config.ts
    /types
      user.types.ts
      game.types.ts
      tournament.types.ts
      navigation.types.ts
  /assets
  /supabase
    /migrations
    /functions
  App.tsx
  app.json
  tsconfig.json
  babel.config.js
  .env                    ← NEVER commit
  .gitignore
  CLAUDE.md               ← this file
  BUILD_LOG.md
  DECISIONS_LOG.md
  ARCPLAY_PRD_v1_3.md
```

---

## CODING CONVENTIONS

| Convention | Rule |
|---|---|
| Language | TypeScript throughout, strict mode. No plain .js files. |
| Components | Functional components only. No class components. |
| Styling | StyleSheet.create() only. No inline styles. All colours from /constants/colours.ts. |
| Global State | Zustand stores in /store only. |
| API Calls | All external calls in /services files. Never from screens directly. |
| Error Handling | Every async function wrapped in try/catch. Errors via Toast. Never silent failures. |
| File Naming | Screens/components: PascalCase. Hooks/services/utils: camelCase. |
| Type Naming | All interfaces prefixed with I (IUser, IGame). All types in /types. |
| Comments | One-line JSDoc on every function. |
| Accessibility | All interactive elements have accessibilityLabel. Min touch target 44x44pt. |
| No Placeholders | Never deliver incomplete code, placeholder functions, or TODO stubs. |
| Imports | Absolute imports using path aliases. Never relative imports beyond one level. |

---

## KYC & COMPLIANCE QUICK REFERENCE

| Level | Detail |
|---|---|
| KYC Level 1 | Required for: paying entry fees, receiving winnings under $500 |
| KYC Level 2 | Required for: receiving winnings over $500, sponsorship contracts |
| KYC Level 3 | Required for: cumulative earnings over $10,000 |
| Under-18 Block | Hard block: no real-money tournaments, no sponsorship contracts, no withdrawals |
| Legal Gate | No real-money feature built or activated until D-024 CLOSED |

---

## ENVIRONMENT VARIABLES

| Variable | Where |
|---|---|
| EXPO_PUBLIC_SUPABASE_URL | Supabase dashboard > Settings > API |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | Supabase dashboard > Settings > API |
| CLAUDE_API_KEY | console.anthropic.com > API Keys |
| EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME | cloudinary.com > Dashboard |
| EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET | arcplay_uploads |
| EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe dashboard — Phase 3 |
| STRIPE_SECRET_KEY | Stripe dashboard — Supabase Edge Functions ONLY |
| AGORA_APP_ID | console.agora.io — Phase 3 |

---

## KEY ACCOUNTS

| Account | Status |
|---|---|
| GitHub | NitAppDevOps/arcplay — ACTIVE |
| Supabase | CREATED — arcplay project |
| Cloudinary | CREATED — preset: arcplay_uploads (Unsigned) |
| Anthropic Console | CREATED — API key in .env |
| Apple Developer Account | Payment pending — needed for App Store + Apple Sign-In |
| Stripe | Not yet created — Phase 3 |
| Agora | Not yet created — Phase 3 |
| Legal Counsel | Not yet retained — Phase 3 gate |

---

## CURRENT BUILD STATUS

| Field | Value |
|---|---|
| Phase | Phase 1 — Core Loop |
| Current Step | Step 15 — Rummy AI opponent (READY TO START) |
| Overall Progress | 10 of 19 steps complete (Steps 8, 9, 13, 14 deferred — Mac required) |
| Last Completed | Step 12 COMPLETE: Rummy private rooms. Full audit found 8 critical bugs. Migration 004 applied (all_hands, variant/turn_phase CHECK fixes, show/round_ended timestamps). rummyRooms.ts all critical logic fixed. RummyTableScreen group/ungroup/timer/navigation fixes. TypeScript errors resolved. 58/58 automated tests passed against live Supabase. Steps 1-7, 10, 11, 12 committed to GitHub. |
| Next Step | Step 15 — Rummy AI opponent (probability-based, Claude API) |
| Open Bugs | None |
| Blockers | D-024 legal clearance before Phase 3. Apple Developer Account payment pending. Mac with Xcode required for Steps 8, 9, 13, 14 (D-032). |
| Test Device | iPhone 14, iOS 26.3.1 |
| Expo SDK | 54 |
| GitHub Repo | NitAppDevOps/arcplay |

---

## PHASE 1 STEP TRACKER

| # | Description | Status |
|---|---|---|
| 1 | Dev environment setup | COMPLETE ✓ |
| 2 | Project scaffold and folder structure | COMPLETE ✓ |
| 3 | Navigation skeleton | COMPLETE ✓ |
| 4 | Onboarding flow | COMPLETE ✓ |
| 5 | Supabase authentication | COMPLETE ✓ |
| 6 | Chess game engine | COMPLETE ✓ |
| 7 | Chess private rooms | COMPLETE ✓ |
| 8 | Chess offline — Wi-Fi LAN | DEFERRED — Mac required |
| 9 | Chess offline — Bluetooth | DEFERRED — Mac required |
| 10 | Chess AI opponent (Claude API) | COMPLETE ✓ |
| 11 | Rummy game engine (all 3 variants) | COMPLETE ✓ |
| 12 | Rummy private rooms and variant selection | COMPLETE ✓ |
| 13 | Rummy offline — Wi-Fi LAN | DEFERRED — Mac required |
| 14 | Rummy offline — Bluetooth | DEFERRED — Mac required |
| 15 | Rummy AI opponent (Claude API) | NEXT |
| 16 | Player profile — unified stats across both games | |
| 17 | Friends system | |
| 18 | Push notifications | |
| 19 | Phase 1 QA pass — FINANCIAL GATE after this step | |

---

## BUILD RULES — ALWAYS ENFORCED

- Run Session Start Protocol before touching any code
- Never proceed if Document Integrity Check reveals gaps
- Never start a step until previous step is COMPLETE in BUILD_LOG.md
- Always state full file path before writing any code
- Always deliver complete, functional files — no placeholders, no TODOs
- After every file: state exactly what command to run and what to see
- Fix all reported bugs before moving to next step
- Never change tech stack without flagging and logging a decision
- Always check DECISIONS_LOG.md before any architectural choice
- Phase 1 must be fully QA-passed before any Phase 2 feature begins
- No financial features until D-024 is CLOSED
- Every database schema change must have a migration file in /supabase/migrations

---

## UI & DESIGN SYSTEM

This section is the authoritative design reference for every screen built in ARCPLAY. Follow it for every new screen and every UI change. When in doubt, refer here before writing any StyleSheet.

---

### Brand Identity

**Positioning:** Dark and premium. Serious, competitive, like a high-stakes game room. Think private members club, not casual arcade.

**Closest reference:** A hybrid of Robinhood (dark, premium, clean data) and Duolingo (gamified, celebratory at key moments, progress-driven). Premium on the outside. Celebratory when it matters.

---

### Colour System

**Two modes: Dark (default) and Light (user-selectable in settings).**

All colours live in `/arcplay/src/constants/colours.ts`. Never hardcode hex values anywhere else. Always import from COLOURS.

#### Dark Mode Palette (default)

```typescript
// Backgrounds
BACKGROUND: '#0A0A0F'          // near-black — main screen background
SURFACE: '#13131A'             // cards, panels, inputs
SURFACE_ELEVATED: '#1C1C26'    // modals, dropdowns, hover states
OVERLAY: 'rgba(0,0,0,0.75)'    // modal overlays

// Accent — Gold/Amber (primary brand colour)
PRIMARY: '#D4AF37'             // gold — buttons, active states, highlights
PRIMARY_LIGHT: '#2A2310'       // gold tint background — badge backgrounds
PRIMARY_DARK: '#A8892B'        // darker gold — pressed states

// Text
TEXT_PRIMARY: '#F0F0F0'        // main text
TEXT_SECONDARY: '#9090A8'      // supporting text, labels
TEXT_MUTED: '#55556A'          // placeholders, disabled
TEXT_ON_PRIMARY: '#0A0A0F'     // text on gold buttons (dark on light)

// Borders
BORDER: '#22222E'              // default border
BORDER_STRONG: '#333345'       // emphasis border

// Semantic
SUCCESS: '#22C55E'             // wins, valid melds, confirmed
WARNING: '#F59E0B'             // check, caution
ERROR: '#EF4444'               // errors, drop, danger
INFO: '#3B82F6'                // informational

// Game boards (deliberately different — immersive)
BOARD_LIGHT: '#F0D9B5'         // chess light squares
BOARD_DARK: '#B58863'          // chess dark squares
BOARD_SELECTED: '#7FC97F'      // selected square highlight
TABLE_GREEN: '#1B5E20'         // rummy table felt
TABLE_GREEN_MID: '#2E7D32'     // rummy centre area
TABLE_GREEN_FELT: '#388E3C'    // rummy felt texture base
```

#### Light Mode Palette

```typescript
BACKGROUND: '#F8F8FC'
SURFACE: '#FFFFFF'
SURFACE_ELEVATED: '#F0F0F8'
TEXT_PRIMARY: '#0A0A0F'
TEXT_SECONDARY: '#555570'
TEXT_MUTED: '#9090A8'
BORDER: '#E0E0EC'
BORDER_STRONG: '#C8C8DC'
// Accent, semantic, and board colours remain the same in both modes
```

**Implementation note:** Light/dark mode is stored in a `themeStore` in Zustand. All screens read from a `useTheme()` hook that returns the correct COLOURS object based on mode. Never read mode directly in screens — always use the hook.

---

### Typography

**Rule: Bold for headings, clean for body. Never decorative fonts.**

```typescript
// Headings — bold, high contrast
FONT_HEADING_XL: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 }
FONT_HEADING_LG: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 }
FONT_HEADING_MD: { fontSize: 20, fontWeight: '700', letterSpacing: -0.2 }
FONT_HEADING_SM: { fontSize: 17, fontWeight: '600', letterSpacing: 0 }

// Body — clean, readable
FONT_BODY_LG: { fontSize: 16, fontWeight: '400', lineHeight: 24 }
FONT_BODY_MD: { fontSize: 14, fontWeight: '400', lineHeight: 21 }
FONT_BODY_SM: { fontSize: 12, fontWeight: '400', lineHeight: 18 }

// Labels — uppercase, spaced, for section headers and tags
FONT_LABEL: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.2 }

// Monospace — for timers, move notation, room codes
FONT_MONO: { fontFamily: 'monospace', fontSize: 20, fontWeight: '700' }
```

---

### Spacing Scale

Use these values consistently. Never use arbitrary numbers.

```typescript
SPACING_XS: 4
SPACING_SM: 8
SPACING_MD: 12
SPACING_LG: 16
SPACING_XL: 24
SPACING_2XL: 32
SPACING_3XL: 48
```

---

### Corner Radius

**Slightly rounded — almost sharp, more serious.**

```typescript
RADIUS_SM: 4      // chips, tags, small badges
RADIUS_MD: 8      // buttons, inputs, small cards
RADIUS_LG: 12     // main cards, panels
RADIUS_XL: 16     // modals, bottom sheets
RADIUS_PILL: 999  // pill buttons only
```

---

### Buttons

**Primary CTA — pill shape, gold, full width**
```typescript
// Primary button
backgroundColor: COLOURS.PRIMARY
borderRadius: RADIUS_PILL
paddingVertical: 14
paddingHorizontal: 24
width: '100%'         // full width for main CTAs
// Text
color: COLOURS.TEXT_ON_PRIMARY
fontSize: 16
fontWeight: '700'
```

**Secondary button — outlined pill**
```typescript
backgroundColor: 'transparent'
borderWidth: 1.5
borderColor: COLOURS.PRIMARY
borderRadius: RADIUS_PILL
// Text colour: COLOURS.PRIMARY
```

**Danger button — red pill**
```typescript
backgroundColor: COLOURS.ERROR (or rgba version)
borderRadius: RADIUS_PILL
```

**Disabled state — always reduce opacity to 0.4, never change colour**

**Minimum touch target: 44x44pt on all interactive elements.**

---

### Cards & Surfaces

**Subtle elevation — slight shadow, barely lifted. Slightly rounded.**

```typescript
// Standard card
backgroundColor: COLOURS.SURFACE
borderRadius: RADIUS_LG         // 12
borderWidth: 1
borderColor: COLOURS.BORDER
// Shadow (iOS)
shadowColor: '#000'
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.12
shadowRadius: 4
// Shadow (Android)
elevation: 2
```

**Elevated card (modal, overlay)**
```typescript
backgroundColor: COLOURS.SURFACE_ELEVATED
borderRadius: RADIUS_XL         // 16
// Stronger shadow
shadowOpacity: 0.25
shadowRadius: 8
elevation: 6
```

---

### Navigation — Bottom Tab Bar

**Bold active tab with background highlight.**

```typescript
// Tab bar container
backgroundColor: COLOURS.SURFACE
borderTopWidth: 1
borderTopColor: COLOURS.BORDER

// Active tab
backgroundColor: COLOURS.PRIMARY_LIGHT   // gold tint background
borderRadius: RADIUS_MD
// Icon and label: COLOURS.PRIMARY (gold)
fontWeight: '700'

// Inactive tab
// Icon and label: COLOURS.TEXT_MUTED
fontWeight: '400'
```

Tabs: Home, Games, Community, Tournaments, Profile.
Labels always shown below icons. No emoji icons — use vector icons only.

---

### Animation & Feedback

**Moderate — satisfying feedback on key actions. Never distracting.**

| Moment | Animation |
|---|---|
| Screen transition | Standard React Navigation slide — do not override |
| Button press | Scale down to 0.97 on press via `Animated` or `activeOpacity={0.8}` |
| Card selection (chess square, rummy card) | Translate up 8-10px, gold border highlight |
| Valid meld grouped | Brief pulse on the meld chip — scale 1.0 → 1.05 → 1.0 over 200ms |
| Winning / declaration | Gold confetti burst — `react-native-confetti-cannon` — reserved for win moments only |
| AI thinking | Pulsing dots indicator in status bar — not a spinner |
| Error | Shake animation on the relevant input or card — 300ms |
| Toast notifications | Slide in from top, auto-dismiss after 3s |

**Rule:** Never animate layout changes. Only animate transforms, opacity, and scale.

---

### Game Boards — Deliberately Immersive

Game boards are intentionally distinct from the rest of the app. When a player enters a game, they enter a different world.

**Chess Board**
- Full-width board, edge to edge, no horizontal padding
- Board squares: warm wood tones (BOARD_LIGHT, BOARD_DARK) — not dark mode colours
- Selected square: green highlight (BOARD_SELECTED)
- Legal move dots: semi-transparent dark circles
- Status bar: floats above the board on a dark pill
- Coordinate labels: small, subtle, bottom-right of each square
- Header: minimal — back arrow, room ID, new game button only

**Rummy Table**
- Full-screen green felt (TABLE_GREEN) — the table owns the screen
- Top bar: semi-transparent dark overlay on felt
- Centre area: slightly lighter felt (TABLE_GREEN_MID) for stock and discard
- Playing cards: white (#FAFAFA) with red/black suit colours — never dark mode colours
- Selected cards: lift up 10px with gold border (#FFD600) and glow
- Card backs: deep blue (#1565C0) — traditional card back colour
- Action bar: dark semi-transparent strip at bottom
- Opponent cards: face-down blue backs, stacked with overlap

**Rule:** Board screens never use COLOURS.BACKGROUND or COLOURS.SURFACE. They use their own palette defined above.

---

### Empty States

**Illustrated with a clear call to action — friendly but not childish.**

Structure:
1. Icon or illustration (emoji at 56px is acceptable for Phase 1)
2. Heading — what is missing (e.g. "No games yet")
3. Body — one line explaining what to do
4. Primary CTA button — the action to take

---

### Loading States

**Simple spinner with short message — clean and fast.**

```typescript
<ActivityIndicator size="large" color={COLOURS.PRIMARY} />
<Text style={{ color: COLOURS.TEXT_SECONDARY }}>Loading...</Text>
```

For inline loading within a button, replace button text with a small spinner. Never disable the entire screen for short loads.

---

### Incorporating Design Changes Into Existing Screens

The existing screens (Steps 1-11) were built with the original purple/blue accent colour and moderately rounded corners. Here is how the new design system is applied:

1. **colours.ts is updated first** — gold/amber replaces purple/blue. This flows through all screens that correctly import from COLOURS.
2. **New screens (Steps 12+) are built to the new design system from the start** — pill buttons, slightly rounded cards, bold tab behaviour, gold accent.
3. **Existing screens are updated progressively** — when a screen is touched for a bug fix or feature addition, bring it in line with the new system at the same time. Do not stop the build for a full retroactive restyle.
4. **The tab bar and navigation** — updated in one pass when we reach Step 16 (Player Profile) which touches navigation directly.
5. **Light/dark mode** — implemented as part of Step 16 (Settings screen). All new screens from Step 12 are built mode-aware using the `useTheme()` hook from day one.

---

### What To Always Check Before Submitting Any Screen

- [ ] All colours from COLOURS — no hardcoded hex
- [ ] All spacing from SPACING scale — no arbitrary numbers
- [ ] All corner radii from RADIUS constants
- [ ] Primary buttons are pill-shaped and full-width
- [ ] Minimum touch target 44x44pt on all interactive elements
- [ ] SafeAreaView from react-native-safe-area-context
- [ ] accessibilityLabel on every interactive element
- [ ] try/catch on every async function
- [ ] Loading and error states handled — no silent failures

---

## SOUND DESIGN SYSTEM

This section is the authoritative sound reference for ARCPLAY. Follow it for every screen and interaction that involves audio.

---

### Sound Character

**Premium and subtle — soft, high-quality, understated.**

ARCPLAY sounds like a high-end private members club, not an arcade. Sounds should enhance the experience without demanding attention. When in doubt, make it quieter and shorter. The animation does the heavy lifting — sound is the finishing touch.

---

### Technology

**Package:** `expo-av` — Expo's built-in audio library. No additional install needed.

**All sound logic lives in:** `/arcplay/src/services/sound.ts`

**All sound files live in:** `/arcplay/assets/sounds/`

**Sound service exposes a single hook:** `useSound()` — screens never call expo-av directly.

```typescript
// Usage in any screen
const { playSound } = useSound();
playSound('chess_piece_place');
playSound('card_flip');
playSound('win');
```

**Sounds are preloaded on app start** — never loaded on demand during gameplay. Latency in a game moment kills the effect.

---

### Sound File Inventory

All files are `.mp3` format, mono, 44.1kHz, under 100KB each. Sourced from royalty-free libraries (Freesound.org, Zapsplat, or commissioned). File names are exact — do not deviate.

| File | Moment | Character |
|---|---|---|
| `chess_piece_place.mp3` | Chess piece placed on square | Wooden thud — solid, classic, like a real piece on a board |
| `chess_capture.mp3` | Chess piece captured | Slightly heavier wooden thud — same family, more impact |
| `chess_check.mp3` | Check detected | Short tension tone — two descending notes, subtle urgency |
| `chess_checkmate.mp3` | Checkmate | Single resolved chord — complete, final |
| `card_draw.mp3` | Rummy card drawn from stock or discard | Crisp card flip — clean, paper-on-felt |
| `card_discard.mp3` | Rummy card discarded | Slightly softer card flip — different enough to be distinct |
| `meld_group.mp3` | Cards grouped into a valid meld | Soft satisfying click — like tiles locking into place |
| `declaration.mp3` | Winning Rummy declaration | Subtle success tone — a single warm chime, short |
| `win.mp3` | Checkmate win / game over win | Same as declaration — single warm chime. Let the confetti animation carry the moment. |
| `error.mp3` | Invalid action, invalid meld | Short low tone — not harsh, just wrong |
| `button_tap.mp3` | Primary button taps | Barely audible soft click — texture, not sound |
| `notification_turn.mp3` | Your turn reminder | Soft two-note chime — gentle, non-intrusive |
| `notification_invite.mp3` | Game invite received | Warmer, slightly louder three-note chime — distinct from turn reminder |
| `lobby_ambient.mp3` | Background music — lobby and waiting screens only | Subtle looping ambient — low energy, non-melodic, like a quiet room |

**Note:** Chess piece placement and capture do NOT have sounds — only the moments of tension and resolution do. This is intentional. Sound on every piece move in a chess game becomes noise within minutes.

**Correction from founder selection:** Chess piece placed and chess piece captured were not selected. Only check and checkmate have chess sounds. This keeps chess audio minimal and meaningful.

---

### Sound Trigger Map

| Trigger | Sound file | Who calls it |
|---|---|---|
| Player moves piece into check | `chess_check.mp3` | ChessBoardScreen — on game state update when `isCheck === true` |
| Checkmate | `chess_checkmate.mp3` | ChessBoardScreen — on game state update when `isCheckmate === true` |
| Draw from stock | `card_draw.mp3` | RummyTableScreen — on `handleDrawStock` success |
| Draw from discard | `card_draw.mp3` | RummyTableScreen — on `handleDrawDiscard` success |
| Discard a card | `card_discard.mp3` | RummyTableScreen — on `handleDiscard` success |
| Valid meld grouped | `meld_group.mp3` | RummyTableScreen — on `handleGroupMeld` when valid |
| Declaration success | `declaration.mp3` | RummyTableScreen — on `handleDeclare` when valid |
| Checkmate win | `win.mp3` | ChessBoardScreen — when winner determined |
| Invalid action / meld | `error.mp3` | Any screen — when showing an error message |
| Primary button tap | `button_tap.mp3` | Global — any primary CTA button press |
| Your turn | `notification_turn.mp3` | Push notification handler + in-app turn indicator |
| Game invite | `notification_invite.mp3` | Push notification handler |
| Lobby / waiting screen | `lobby_ambient.mp3` | ChessRoomLobbyScreen, RummyRoomLobbyScreen — loop on mount, stop on unmount |

---

### Sound Service Implementation

Full file path: `/arcplay/src/services/sound.ts`

```typescript
import { Audio } from 'expo-av';

export type SoundKey =
  | 'chess_check'
  | 'chess_checkmate'
  | 'card_draw'
  | 'card_discard'
  | 'meld_group'
  | 'declaration'
  | 'win'
  | 'error'
  | 'button_tap'
  | 'notification_turn'
  | 'notification_invite'
  | 'lobby_ambient';

const SOUND_FILES: Record<SoundKey, any> = {
  chess_check:          require('@assets/sounds/chess_check.mp3'),
  chess_checkmate:      require('@assets/sounds/chess_checkmate.mp3'),
  card_draw:            require('@assets/sounds/card_draw.mp3'),
  card_discard:         require('@assets/sounds/card_discard.mp3'),
  meld_group:           require('@assets/sounds/meld_group.mp3'),
  declaration:          require('@assets/sounds/declaration.mp3'),
  win:                  require('@assets/sounds/win.mp3'),
  error:                require('@assets/sounds/error.mp3'),
  button_tap:           require('@assets/sounds/button_tap.mp3'),
  notification_turn:    require('@assets/sounds/notification_turn.mp3'),
  notification_invite:  require('@assets/sounds/notification_invite.mp3'),
  lobby_ambient:        require('@assets/sounds/lobby_ambient.mp3'),
};

// Preloaded sound objects
const soundObjects: Partial<Record<SoundKey, Audio.Sound>> = {};

/** Preloads all sounds on app start — call once in App.tsx */
export const preloadSounds = async (): Promise<void> => {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: false,  // respect silent switch
    staysActiveInBackground: false,
  });
  for (const [key, file] of Object.entries(SOUND_FILES)) {
    try {
      const { sound } = await Audio.Sound.createAsync(file);
      soundObjects[key as SoundKey] = sound;
    } catch {
      // Silent fail — sound is enhancement, not critical
    }
  }
};

/** Plays a sound if game sounds are enabled in settings */
export const playSound = async (
  key: SoundKey,
  gameSoundsEnabled: boolean
): Promise<void> => {
  if (!gameSoundsEnabled) return;
  try {
    const sound = soundObjects[key];
    if (!sound) return;
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // Silent fail
  }
};

/** Plays and loops ambient music if music is enabled */
export const playAmbient = async (
  musicEnabled: boolean
): Promise<void> => {
  if (!musicEnabled) return;
  try {
    const sound = soundObjects['lobby_ambient'];
    if (!sound) return;
    await sound.setIsLoopingAsync(true);
    await sound.playAsync();
  } catch { }
};

/** Stops ambient music */
export const stopAmbient = async (): Promise<void> => {
  try {
    const sound = soundObjects['lobby_ambient'];
    if (!sound) return;
    await sound.stopAsync();
  } catch { }
};
```

---

### Sound Settings — Three Toggles

Stored in `settingsStore.ts` in Zustand.

```typescript
interface ISettingsState {
  gameSoundsEnabled: boolean;      // chess and rummy game sounds
  notificationSoundsEnabled: boolean; // turn reminders, invites
  musicEnabled: boolean;           // lobby ambient music
  darkModeEnabled: boolean;        // light/dark theme
}
```

Settings screen (part of Step 18) exposes three toggles:
- **Game sounds** — chess check, checkmate, all rummy card sounds, meld, declaration, win, error, button taps
- **Notification sounds** — turn reminder, game invite
- **Music** — lobby ambient only

All three default to `true` on first install.

**Respect the iOS silent switch** — `playsInSilentModeIOS: false` is set in the audio mode. If the user has their phone on silent, no sounds play regardless of in-app settings. This is the correct behaviour for a competitive game.

---

### Sound Sourcing

Sound files are not generated by Claude — they must be sourced before the sound service is wired up. Recommended free sources:

- **Freesound.org** — large library, CC0 licence available, search by keyword
- **Zapsplat.com** — free with account, high quality, game-specific packs
- **Mixkit.co** — free game sounds, no attribution required

Search terms for each sound:
- `chess_check` — search "tension sting" or "chess check"
- `chess_checkmate` — search "game over chord" or "resolution tone"
- `card_draw` / `card_discard` — search "card flip" or "playing card"
- `meld_group` — search "tile click" or "piece lock"
- `declaration` / `win` — search "success chime" or "achievement tone"
- `error` — search "error tone soft" or "wrong answer gentle"
- `button_tap` — search "ui click soft" or "button tap minimal"
- `notification_turn` — search "notification chime soft"
- `notification_invite` — search "notification chime warm"
- `lobby_ambient` — search "ambient loop minimal" or "subtle background loop"

**When to implement:** Sound service is wired up as part of Step 18 (Push notifications) since both involve the notification sound system. Sound files must be sourced and placed in `/arcplay/assets/sounds/` before Step 18 begins.

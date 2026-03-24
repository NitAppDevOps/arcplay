# ARCPLAY Build Log

*Re-commit after every session update*

---

## Current Status Snapshot

**Update this table at the end of every session. This is the first thing Claude reads.**

| Field | Value |
|---|---|
| Phase | Phase 1 — Core Loop |
| Current Step | Step 15 — Rummy AI opponent (READY TO START) |
| Overall Progress | 10 of 19 steps complete (Steps 8, 9, 13, 14 deferred) |
| Last Session | March 2026 — Session 4: Step 12 complete. Full audit of rummy section. 8 critical bugs fixed. Migration 004 applied. 58/58 automated tests passed. |
| Next Session Goal | Step 15 — Rummy AI opponent (probability-based, Claude API): RummyAISetup screen, rummyAI.ts service, wire into RummyTableScreen local mode |
| Open Bugs | None |
| Blockers | D-024 legal clearance before Phase 3. Apple Developer Account payment pending. Mac with Xcode required for Steps 8, 9, 13, 14 (D-032). |

---

## PRD Version History

| Version | Changes |
|---|---|
| PRD v1.0 — Initial | First complete blueprint. Chess-only launch. 4 phases defined. |
| PRD v1.1 — Compliance & Ecosystem | Full tournament stakeholder model, player sponsorships, AML/fraud compliance, live broadcast layer. Agora.io and Stripe Identity added. |
| PRD v1.2 — Dual Launch | Chess AND Rummy added to Phase 1. Poker moved to Phase 2. |
| PRD v1.3 — Full Audit | 10 consistency issues corrected. Rummy Game Flow added. AI Opponent updated for both games. |

---

## Pre-Build Tasks

| Task | Status |
|---|---|
| Create GitHub account and repo named 'arcplay' | DONE — NitAppDevOps/arcplay |
| Finalise platform name (D-023 CLOSED) | DONE — ARCPLAY confirmed |
| Install Node.js (LTS version) | DONE — v22.14.0 |
| Install Expo CLI globally | DONE — confirmed via expo --version |
| Install Expo Go app on phone | DONE — iPhone 14, iOS 26.3.1, SDK 54 |
| Create free Supabase account and project | DONE — arcplay project. URL and anon key in .env. |
| Create free Cloudinary account and upload preset | DONE — arcplay_uploads (Unsigned) |
| Create Anthropic account and API key | DONE — API key generated and added to .env |
| Retain legal counsel (Phase 3 gate) | NOT YET — Phase 3 gate only |
| Validate PRD v1.3 with 10 real players | NOT YET — recommended but not a build blocker |

---

## Phase 1 — Step Tracker (19 Steps)

| # | Description | Status | Notes |
|---|---|---|---|
| 1 | Dev environment setup | COMPLETE ✓ | Expo SDK 54, TypeScript strict, folder structure, path aliases, babel config, GitHub push. |
| 2 | Project scaffold and folder structure | COMPLETE ✓ | 34 stub screens, 6 navigators, all 5 tabs working on device. React upgraded to 19.1.0. |
| 3 | Navigation skeleton — all screens stubbed | COMPLETE ✓ | All 6 onboarding screens fully built. Full flow working on device. |
| 4 | Onboarding flow | COMPLETE ✓ | All 6 screens navigating correctly end to end on device. |
| 5 | Supabase authentication | COMPLETE ✓ | Email/password and Google Sign-In. Auth state with Zustand. Session persistence. Tested on device. |
| 6 | Chess game engine | COMPLETE ✓ | chess.js integrated. Full legal move validation, check/checkmate/stalemate, pawn promotion, move history. |
| 7 | Chess private rooms | COMPLETE ✓ | Supabase rooms + moves tables. 6-char room code. Realtime + polling lobby. Online multiplayer. Board flip for black. |
| 8 | Chess offline — Wi-Fi LAN | DEFERRED | Mac with Xcode required. Implement after Phase 1 QA with expo-dev-client. |
| 9 | Chess offline — Bluetooth | DEFERRED | Mac with Xcode required. Implement after Phase 1 QA with expo-dev-client. |
| 10 | Chess AI opponent (Claude API) | COMPLETE ✓ | Claude API integrated. Difficulty levels, time controls, timers. Confirmed working on device. |
| 11 | Rummy game engine (all 3 variants) | COMPLETE ✓ | Full engine. IRummyConfig with D-033 host params. Green felt table design. 4 variants. Duplicate key bug fixed. Pass-and-play removed per D-035. |
| 12 | Rummy private rooms and variant selection | COMPLETE ✓ | Supabase rummy_rooms table. Host config UI. Variant selection. Realtime multiplayer. 8 critical bugs fixed. Migration 004. 58/58 automated tests passed. |
| 13 | Rummy offline — Wi-Fi LAN | DEFERRED | Mac with Xcode required. |
| 14 | Rummy offline — Bluetooth | DEFERRED | Mac with Xcode required. |
| 15 | Rummy AI opponent (probability-based, Claude API) | NEXT | |
| 16 | Player profile — unified stats across both games | NOT STARTED | |
| 17 | Friends system | NOT STARTED | |
| 18 | Push notifications | NOT STARTED | |
| 19 | Phase 1 QA pass — full test, bug fixes, performance | NOT STARTED | FINANCIAL GATE after this step |

---

## Session Log

### Session 4 — March 2026 (Step 12 complete)

| Field | Detail |
|---|---|
| Date | March 2026 |
| Steps Worked On | Step 12 — Rummy private rooms |
| Completed | Full audit of rummy section. Found 8 critical bugs. Applied migration 004 (all_hands column, variant CHECK fix, turn_phase CHECK fix, show_started_at/round_ended_at columns). Fixed rummyRooms.ts: getNextActivePlayerIndex by ID, false declaration no hasDropped, allSubmitted counts dropped players, stock reshuffle on empty. Fixed RummyTableScreen: handleGroup/handleUngroup stale closure, handleTimerExpiry draw phase, showTimer freeze, post-game navigation. Fixed TypeScript errors (module: esnext, ignoreDeprecations, chess.ts Square cast, navigation types). Built scripts/test-rummy-game.mjs — 58/58 automated tests passed against live Supabase. |
| Decisions Made | None — no new architectural decisions required |
| Bugs Found | 8 critical bugs in rummy online flow — all resolved. See Bug Tracker entries 16-23. |
| Next Session Goal | Step 15 — Rummy AI opponent (probability-based, Claude API) |

---

### Session 3 — March 2026 (Steps 2-7, 10, 11 complete)

| Field | Detail |
|---|---|
| Date | March 2026 |
| Steps Worked On | Steps 2-7, Step 10, Step 11. Steps 8, 9, 13, 14 deferred. |
| Completed | Steps 2-7: Full navigation, onboarding, auth, chess engine, private rooms. Step 10: Claude API, difficulty levels, timers. Step 11: Rummy engine, green felt table, all 4 variants, host config params. |
| Decisions Made | D-027 CLOSED. D-028 CLOSED. D-032 CLOSED. D-033 CLOSED. D-034 OPEN. D-035 CLOSED. |
| Bugs Found | 15 bugs — all resolved. See Bug Tracker. |
| Next Session Goal | Step 12 — Rummy private rooms |

### Session 2 — March 2026 (Step 1 complete)

| Field | Detail |
|---|---|
| Date | March 2026 |
| Steps Worked On | Step 1 — Dev environment setup |
| Completed | Expo SDK 54 initialised. TypeScript strict. Folder structure. Path aliases. babel.config.js. App confirmed on iPhone 14. First commit pushed. |
| Decisions Made | D-026 CLOSED: Supabase monolith confirmed. |
| Next Session Goal | Step 2 — Navigation skeleton |

### Session 1 — March 2026 (Pre-build)

| Field | Detail |
|---|---|
| Date | March 2026 |
| Type | Pre-build task completion — no code written |
| Completed | GitHub repo confirmed. Platform name confirmed as ARCPLAY. Node.js v22.14.0. Expo CLI. Expo Go on iPhone 14. Supabase project created. Cloudinary created. |
| Decisions Made | D-023 CLOSED: Platform name ARCPLAY confirmed. |

### Session 0 — March 2026 (Product definition)

| Field | Detail |
|---|---|
| Date | March 2026 |
| Type | Product definition — no code written |
| Completed | Full product vision. PRD v1.0 through v1.3 produced and audit-corrected. |
| Decisions Made | D-001 through D-025. |

---

## Bug Tracker

| # | Step | Description | Status |
|---|---|---|---|
| 1 | Step 1 | Expo SDK 55 incompatible with Expo Go SDK 54. Error: Project is incompatible with this version of Expo Go. | RESOLVED |
| 2 | Step 1 | npm peer dependency conflicts when specifying package versions. Multiple eresolve errors. | RESOLVED |
| 3 | Step 1 | metro TerminalReporter path error when wrong React Native version installed. | RESOLVED |
| 4 | Step 1 | babel-plugin-module-resolver install failed with npx expo install. Required npm --legacy-peer-deps. | RESOLVED |
| 5 | Step 2 | @types alias clashed with TypeScript reserved namespace. Error: Cannot import type declaration files. | RESOLVED |
| 6 | Step 2 | Emoji tab icons caused HostFunction boolean TypeError in React Navigation bottom tabs. | RESOLVED |
| 7 | Step 2 | react-native-screens version conflict with React Native 0.81.5. | RESOLVED |
| 8 | Step 2 | React version mismatch: react 19.0.0 vs react-native-renderer 19.1.0. | RESOLVED |
| 9 | Step 3 | SafeAreaView imported from react-native — deprecated. | RESOLVED |
| 10 | Step 5 | Zustand not installed. Error: Unable to resolve module zustand. | RESOLVED |
| 11 | Step 6 | Chess instance spread with {...game} lost class methods. Error: TypeError: game.get is not a function. Fixed by recreating Chess instance from FEN using createChessGame(newState.fen). | RESOLVED |
| 12 | Step 7 | Supabase RLS SELECT policy blocked guest room lookup. Error: Room not found. Fixed by updating policy to allow viewing waiting rooms. | RESOLVED |
| 13 | Step 7 | Supabase RLS UPDATE policy blocked guest joining room. guest_id remained null. Fixed by updating policy to allow updates on waiting rooms. | RESOLVED |
| 14 | Step 7 | Realtime subscription not triggering navigation on host device. Fixed by adding 2-second polling fallback alongside realtime subscription. | RESOLVED |
| 15 | Step 11 | Duplicate card keys in 2-deck Rummy. Error: Encountered two children with the same key. Fixed by adding deckIndex prefix to card IDs in createDeck function. | RESOLVED |
| 16 | Step 12 | all_hands, show_started_at, round_ended_at columns missing from rummy_rooms table. RPC calls failing silently. Fixed in migration 004. | RESOLVED |
| 17 | Step 12 | variant CHECK constraint rejected 'pool'. Host could not create Pool Rummy rooms. Fixed in migration 004. | RESOLVED |
| 18 | Step 12 | turn_phase CHECK constraint rejected 'showing' and 'round_ended'. Show phase and round-end transitions failed. Fixed in migration 004. | RESOLVED |
| 19 | Step 12 | getNextActivePlayerIndex used scores[position] instead of scores.find(by ID). Wrong player got the turn after drop/elimination. Fixed by rewriting lookup to use player ID. | RESOLVED |
| 20 | Step 12 | False declaration set hasDropped: true on declaring player. Kept player correctly in the game — penalty points only. | RESOLVED |
| 21 | Step 12 | allSubmitted in show phase didn't count hasDropped players as done. Show phase never advanced. Fixed by adding hasDropped check. | RESOLVED |
| 22 | Step 12 | Empty stock pile caused deadlock — no cards to draw. Fixed by reshuffling discard pile back into stock when stock empties. | RESOLVED |
| 23 | Step 12 | handleGroup and handleUngroup used stale closures causing groups to revert. Fixed by computing new map eagerly before setState. | RESOLVED |

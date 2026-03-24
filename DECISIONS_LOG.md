# ARCPLAY Decisions Log

*Every significant decision, recorded with reasoning — never revisit a closed decision without reading this first.*

**Purpose:** Prevents wasted effort and contradictory decisions. Claude checks this log before making any architectural, product, or technology choice. CLOSED decisions are binding unless the founder explicitly overrides. OPEN decisions must be flagged before proceeding with related work.

---

## Closed Decisions — Locked

27 decisions are CLOSED. Changing any requires re-work and must be explicitly logged as a new decision.

---

### D-001 [CLOSED] Platform is modular — one identity, subscribable games
**Decision:** Users register once. All games are modules they subscribe to. One global profile, one wallet, one reputation across all games.
**Reasoning:** Core platform differentiator. Players hate re-registering. Unified reputation makes the platform sticky. Without this, ARCPLAY is just another game app.
**Alternatives ruled out:** Separate app per game; game-specific profiles.
**Date:** March 2026 — Session 0

---

### D-002 [CLOSED] Launch with Chess AND Rummy simultaneously
**Decision:** Phase 1 ships both Chess and Rummy. Poker is Phase 2.
**Reasoning:** Dual launch proves the multi-game platform story from day one. Two different player demographics — two acquisition channels.
**Alternatives ruled out:** Chess-only launch.
**Date:** March 2026 — PRD v1.2 update

---

### D-003 [CLOSED] Rummy variants at launch: Points, Deals, and Pool Rummy (101 and 201)
**Decision:** All three main rummy variants supported from Phase 1.
**Reasoning:** Most widely played rummy formats globally. Demonstrates platform depth from day one.
**Alternatives ruled out:** Points Rummy only; launching variants sequentially.
**Date:** March 2026 — Session 0

---

### D-004 [CLOSED] Platform is free — monetise through activity, not access
**Decision:** Free to join and subscribe. Revenue: tournament prize pool cuts (10-15%), sponsorship facilitation fees, premium features, ticketed broadcast share (10%), developer listing fees.
**Reasoning:** A paywall at entry kills growth. Revenue scales with activity.
**Alternatives ruled out:** Subscription model; pay-per-game access.
**Date:** March 2026 — Session 0

---

### D-005 [CLOSED] React Native + Expo as the mobile framework
**Decision:** React Native with Expo for all mobile development. TypeScript strict mode throughout. Currently on SDK 54.
**Reasoning:** One codebase for iOS and Android. Expo Go removes App Store submissions during development.
**Alternatives ruled out:** Flutter; Native iOS/Android; PWA.
**Date:** March 2026 — Session 0

---

### D-006 [CLOSED] Supabase as the backend platform
**Decision:** Supabase handles PostgreSQL database, user auth, real-time game state sync, and file storage.
**Reasoning:** Generous free tier. All-in-one. Real-time subscriptions native. PostgreSQL gives full relational power.
**Alternatives ruled out:** Firebase; Custom Node.js backend; AWS Amplify.
**Date:** March 2026 — Session 0

---

### D-007 [CLOSED] Zustand for global state management
**Decision:** All global state in Zustand stores in /store. Local component state uses useState/useReducer.
**Reasoning:** Lightweight, simple API, no boilerplate. First-class TypeScript support.
**Alternatives ruled out:** Redux; React Context API for global state; MobX.
**Date:** March 2026 — Session 0

---

### D-008 [CLOSED] Stripe Connect for all payments and escrow
**Decision:** Stripe Connect handles all money flows. Platform never directly holds player or sponsor funds.
**Reasoning:** Stripe Connect is already licensed in 46+ countries. Handles KYC/KYB natively. By using Stripe as the financial custodian, ARCPLAY avoids needing a money transmitter licence. Same model used by Kickstarter, Lyft, and Airbnb.
**Alternatives ruled out:** Platform-held escrow; PayPal; Local payment providers.
**Date:** March 2026 — PRD v1.1 compliance session

---

### D-009 [CLOSED] No real-money features until legal clearance is obtained
**Decision:** No financial feature built or activated until D-024 is CLOSED with legal counsel sign-off.
**Reasoning:** Prize pools and gambling-adjacent features may be classified as gambling or money transmission in various jurisdictions.
**Alternatives ruled out:** Build financial features now and deal with legal later.
**Date:** March 2026 — PRD v1.1 compliance session

---

### D-010 [CLOSED] Agora.io for live tournament streaming
**Decision:** Agora.io provides all real-time video and audio for live broadcasts.
**Reasoning:** Sub-second latency. React Native SDK. Multi-user video with overlay support. Generous free tier.
**Alternatives ruled out:** Twitch integration; Self-hosted WebRTC; Mux.
**Date:** March 2026 — PRD v1.1 update

---

### D-011 [CLOSED] Full real-world tournament stakeholder model
**Decision:** Tournaments support all four stakeholder roles: Tournament Organizer, Title Sponsor, Co-Sponsors, Official Partners.
**Reasoning:** This is what makes ARCPLAY different from every other gaming platform.
**Alternatives ruled out:** Platform-only tournaments; Simple organizer + players model.
**Date:** March 2026 — PRD v1.1 update

---

### D-012 [CLOSED] Player-selectable sponsorship contract types — 5 options
**Decision:** Player chooses from 5 contract types: Monthly Retainer, Revenue Share, Per-Tournament Deal, Performance Bonus, Points/Reputation Deal.
**Reasoning:** Player agency is a core platform value. Mirrors real-world athlete sponsorship models.
**Alternatives ruled out:** Platform-dictated single contract type; No individual player sponsorships.
**Date:** March 2026 — PRD v1.1 update

---

### D-013 [CLOSED] Live broadcast: board cam + player cam + branded overlays
**Decision:** Broadcasts show: live board, optional player-facing camera, title sponsor overlay, co-sponsor banners, shoutouts, commentary, spectator chat, VOD recording.
**Reasoning:** Transforms a game session into a watchable event. Branded overlays are the sponsor's primary ROI vehicle.
**Alternatives ruled out:** Board-only feed; No live streaming.
**Date:** March 2026 — PRD v1.1 update

---

### D-014 [CLOSED] AML controls: all four mechanisms selected
**Decision:** KYC identity verification, 48-hour cooling-off on winnings, suspicious activity flagging with account freeze, and Stripe Connect escrow.
**Reasoning:** Four controls working together as a layered defence.
**Alternatives ruled out:** Single-mechanism approach; Auto-reporting without manual review.
**Date:** March 2026 — PRD v1.1 compliance session

---

### D-015 [CLOSED] Suspicious activity response: flag, freeze, notify
**Decision:** Detected: (1) flagged to Admin Dashboard, (2) account frozen, (3) player notified. Auto-reporting only after manual review confirms.
**Reasoning:** Manual review within 48 hours balances compliance and user protection.
**Date:** March 2026 — PRD v1.1 compliance session

---

### D-016 [CLOSED] Community model: global profile + game-specific communities
**Decision:** One global profile. Communities are game-specific: Chess Club, Rummy Room, Poker Room.
**Reasoning:** Global profile creates unified identity. Game-specific communities allow cultural depth.
**Date:** March 2026 — Session 0

---

### D-017 [CLOSED] Offline play: Wi-Fi LAN and Bluetooth
**Decision:** Two offline modes: Wi-Fi LAN (same network, socket-based) and Bluetooth (BLE, ~10 metres). Both sync on reconnect.
**Reasoning:** Wi-Fi covers primary use case. Bluetooth covers no-Wi-Fi environments.
**Alternatives ruled out:** Wi-Fi only; Bluetooth only; No offline play.
**Date:** March 2026 — Session 0

---

### D-018 [CLOSED] Conflict resolution: server is always authoritative
**Decision:** On reconnect, local game record pushed to server. Server validates every move. Server record is authoritative.
**Reasoning:** Without a single source of truth, conflicting records create disputes — especially with prize money involved.
**Date:** March 2026 — Session 0

---

### D-019 [CLOSED] AI engine: Claude API for both Chess and Rummy
**Decision:** Chess: minimax with alpha-beta pruning via Claude API. Rummy: probability-based hand evaluation via Claude API. All 9 AI features powered by Claude API.
**Reasoning:** Claude API provides the intelligence layer for the entire platform. Chess and Rummy require different AI approaches: game-tree search for deterministic Chess; probability/statistics for imperfect-information Rummy.
**Alternatives ruled out:** Open-source chess engine (Stockfish); Separate AI provider per feature.
**Date:** March 2026 — PRD v1.1 definition

---

### D-020 [CLOSED] Teaching and coaching is Phase 2, not Phase 1
**Decision:** Coaching sessions, teaching mode, student progress tracking, and paid coaching are Phase 2 features.
**Reasoning:** Phase 1 must prove the core loop.
**Date:** March 2026 — PRD phase planning

---

### D-021 [CLOSED] Game library: platform owner adds games in Phase 1; 3rd party in Phase 3
**Decision:** Phases 1 and 2: platform owner only. Phase 3: 3rd-party developer SDK opens.
**Date:** March 2026 — Session 0

---

### D-022 [CLOSED] Target geography: English-first global launch
**Decision:** Platform launches in English globally. Multi-language is future expansion.
**Date:** March 2026 — Session 0

---

### D-023 [CLOSED] Platform name — ARCPLAY confirmed
**Decision:** Platform name is confirmed as ARCPLAY.
**Reasoning:** Combines Arena + Play. Short, memorable, domain-ready.
**Alternatives ruled out:** Regalia, Boardroom, Circla, Grandmaster, Arkeplay.
**Date:** March 2026 — Session 1

---

### D-026 [CLOSED] Backend architecture — Supabase monolith for Phases 1 and 2
**Decision:** Build on a well-structured Supabase monolith for Phases 1 and 2. Revisit microservices at Phase 3.
**Reasoning:** Microservices require orchestration unsuitable for a solo non-technical founder at pre-revenue stage.
**Alternatives ruled out:** Microservices from day one.
**Date:** March 2026 — Session 2

---

### D-027 [CLOSED] Social authentication providers — Google, Apple, email/password at launch
**Decision:** Three authentication methods at launch: Google Sign-In, Apple Sign-In (pending developer account payment), and email/password. Microsoft deferred.
**Reasoning:** Google and email/password are the most common auth methods for mobile gaming users. Apple Sign-In is mandatory on iOS App Store once any third-party social login is offered.
**Alternatives ruled out:** Microsoft (Azure portal issues); email/password only.
**Date:** March 2026 — Session 3

---

### D-028 [CLOSED] Chess game timers — built in Step 10
**Decision:** Game timers implemented in Step 10 alongside the AI opponent. Time controls: Unlimited, Bullet (1 min), Blitz (3/5 min), Rapid (10/15 min), Classical (30 min). Timeout = loss unless opponent has insufficient mating material (draw). Timer turns red under 10 seconds.
**Reasoning:** Timers are expected in competitive chess.
**Alternatives ruled out:** Defer until Phase 1 QA pass.
**Date:** March 2026 — Session 3

---

### D-032 [CLOSED] Mac with Xcode required for iOS App Store submission and native module development
**Decision:** A Mac with Xcode is required for: iOS App Store submission, standalone iOS builds, expo-dev-client builds for native modules (Wi-Fi LAN and Bluetooth offline play), and Apple Sign-In testing. Steps 8, 9, 13, 14 are deferred until Mac access is available.
**Reasoning:** Apple platform requirement — not an Expo or ARCPLAY limitation. Should have been captured at D-005 in Session 1.
**Alternatives:** MacStadium or AWS EC2 Mac; Android-first launch; borrow Mac for build steps only.
**Date:** March 2026 — Session 3 — retroactively logged

---

### D-033 [CLOSED] Rummy host configuration parameters
**Decision:** Rummy games support host-configurable parameters: pool size (elimination threshold), first scoot points (drop before drawing), mid scoot points (drop after drawing), full hand points (penalty for zero melds on opponent declaration), and maximum consecutive scoots allowed.
**Reasoning:** Standard competitive Indian Rummy parameters. Host configuration UI belongs in Step 12. Engine in Step 11 built to accept these as parameters from day one.
**Alternatives ruled out:** Hardcoded values; single global platform setting.
**Date:** March 2026 — Session 3

---

### D-035 [CLOSED] Rummy local play is single-player practice only — pass-and-play removed
**Decision:** The local play option on RummyHomeScreen was removed entirely. Real multiplayer is online only (Step 12). A practice mode against AI will be added in Step 15.
**Reasoning:** Pass-and-play exposes hands to both players on one device. Real Rummy is always played with hidden hands.
**Alternatives ruled out:** Pass-and-play on single device.
**Date:** March 2026 — Session 3

---

## Open Decisions — Must Be Resolved Before Related Work Begins

---

### D-024 [OPEN] Legal clearance for real-money features
**Decision:** Legal counsel has not yet been retained. No financial feature is built or activated until this decision is CLOSED.
**Reasoning:** Prize pools, poker, sponsorship contracts, and real-money withdrawals are potentially subject to gambling regulation and money transmission laws.
**Alternatives ruled out:** Proceeding without legal review.
**Date:** March 2026 — PRD v1.1 compliance session

---

### D-025 [OPEN] Geography-specific compliance decisions per market
**Decision:** No jurisdiction-specific decisions made yet. Each key market needs its own compliance decision before Phase 3 goes live.
**Reasoning:** Regulatory requirements vary significantly by country.
**Date:** March 2026 — PRD v1.1 compliance session

---

### D-029 [OPEN] ELO rating system
**Decision:** ELO not yet implemented. Targeted for Phase 2 alongside global reputation score.
**Reasoning:** ELO requires a meaningful player pool to be useful. Premature before beta users are acquired.
**Date:** March 2026 — Session 3

---

### D-030 [OPEN] Tournament scoring and leaderboards
**Decision:** Tournament-specific scoring, prize pool leaderboards, and bracket standings targeted for Phase 3.
**Reasoning:** Depends on full tournament engine which is a Phase 3 feature.
**Date:** March 2026 — Session 3

---

### D-031 [OPEN] Offline play implementation approach — expo-dev-client required
**Decision:** Steps 8, 9, 13, 14 (Wi-Fi LAN and Bluetooth play) require expo-dev-client with native networking libraries. These cannot run in Expo Go. Implementation deferred until Mac access is available.
**Reasoning:** True peer-to-peer sockets and BLE require native modules not available in Expo Go sandbox.
**Alternatives ruled out:** Eject Expo (too complex); skip offline play (not acceptable — PRD requirement).
**Date:** March 2026 — Session 3

---

### D-034 [OPEN] Rummy table landscape orientation
**Decision:** Rummy table should be forced landscape for the authentic playing experience. Requires native screen orientation configuration not available in Expo Go.
**Reasoning:** Landscape gives more horizontal space for cards, closer to the Ace2three experience. Cannot be implemented without expo-dev-client which requires Mac/Xcode.
**Alternatives ruled out:** Portrait-only permanently; web-only landscape workaround.
**Date:** March 2026 — Session 3

---

## New Decisions — Add Below

Format: `### D-XXX [OPEN/CLOSED] Title`
Include: Decision, Reasoning, Alternatives ruled out, Date, Source.

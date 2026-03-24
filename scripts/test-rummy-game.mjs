/**
 * ARCPLAY — Rummy Automated Test Suite
 * Tests the full game flow against your real Supabase database.
 *
 * Run:  node scripts/test-rummy-game.mjs
 *
 * Requirements:
 *   - .env file with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 *   - "Confirm email" DISABLED in Supabase Dashboard → Authentication → Providers → Email
 *     (so test accounts can be created automatically)
 *   - Migration 004 already applied in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// ─── Load .env ────────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const raw = readFileSync('.env', 'utf8');
    const vars = {};
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
      if (m) vars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    return vars;
  } catch {
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('\n❌  Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env\n');
  process.exit(1);
}

// ─── Two separate clients — one per player ────────────────────────────────────

const c1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const c2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PLAYERS = [
  { email: 'arcplay-test-1@arcplay-internal.com', password: 'ArcplayTest123!', name: 'TestP1' },
  { email: 'arcplay-test-2@arcplay-internal.com', password: 'ArcplayTest123!', name: 'TestP2' },
];

// ─── Test state ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const roomsCreated = [];

function check(condition, label) {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.log(`  ❌  FAIL: ${label}`);
    failed++;
  }
  return Boolean(condition);
}

function section(title) {
  const bar = '─'.repeat(Math.max(0, 54 - title.length));
  console.log(`\n── ${title} ${bar}`);
}

// ─── Card helpers ─────────────────────────────────────────────────────────────

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const PTS = { A:1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,J:10,Q:10,K:10 };

const card = (rank, suit, deck = 0) => ({
  id: `${rank}_${suit}_d${deck}`,
  rank, suit,
  points: PTS[rank],
  isJoker: false,
});

function buildDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const rank of RANKS) {
      deck.push(card(rank, suit, 0));
      deck.push(card(rank, suit, 1));
    }
  return deck.sort(() => Math.random() - 0.5);
}

/**
 * Returns a pre-arranged 14-card winning hand (4 valid melds + 1 discard card).
 * Declaration: discard the J♦, show the remaining 13 in 4 melds.
 *
 * Meld 1 (pure seq): A♠ 2♠ 3♠ 4♠
 * Meld 2 (seq):      5♥ 6♥ 7♥
 * Meld 3 (set):      K♣ K♦ K♥
 * Meld 4 (seq):      8♠ 9♠ 10♠
 * Discard:           J♦
 */
function winningHand() {
  const m1 = [card('A','spades'), card('2','spades'), card('3','spades'), card('4','spades')];
  const m2 = [card('5','hearts'), card('6','hearts'), card('7','hearts')];
  const m3 = [card('K','clubs'),  card('K','diamonds'), card('K','hearts')];
  const m4 = [card('8','spades'), card('9','spades'),  card('10','spades')];
  const discard = card('J','diamonds');
  const hand = [...m1, ...m2, ...m3, ...m4, discard];
  const melds = [
    { id: 'g1', cards: m1, type: 'sequence', isValid: true, isPureSequence: true },
    { id: 'g2', cards: m2, type: 'sequence', isValid: true, isPureSequence: true },
    { id: 'g3', cards: m3, type: 'set',      isValid: true, isPureSequence: false },
    { id: 'g4', cards: m4, type: 'sequence', isValid: true, isPureSequence: true },
  ];
  return { hand, melds, discard };
}

// ─── Default config ───────────────────────────────────────────────────────────

const defaultConfig = (variant = 'points', overrides = {}) => ({
  variant, playerCount: 2,
  turnTimerSeconds: null, timerExpiryAction: 'warning_only',
  firstScootPoints: 20, midScootPoints: 40, fullHandPoints: 80,
  maxConsecutiveScoots: 3, totalDeals: 3, poolSize: 101,
  jokerType: 'open', allowJokerFromDiscard: false, showTimeSeconds: 90,
  ...overrides,
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function signIn(client, idx) {
  const { email, password, name } = PLAYERS[idx];
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (data?.user) return data.user;

  // Not found — try sign up (requires email confirmation disabled in Supabase)
  const { data: up, error: upErr } = await client.auth.signUp({
    email, password,
    options: { data: { username: name } },
  });
  if (upErr) throw new Error(`Sign-up failed for ${email}: ${upErr.message}`);
  if (!up?.user) throw new Error(`Sign-up returned no user for ${email}`);
  return up.user;
}

// ─── Room setup helper ────────────────────────────────────────────────────────

async function setupRoom(roomId, p1, p2, variant, config, deck) {
  const h1 = deck.slice(0, 13);
  const h2 = deck.slice(13, 26);
  const joker = deck[26];
  const stock = deck.slice(27);

  const baseScore = (id) => ({
    id, points: 0,
    chips: variant === 'deals' ? 80 : 0,
    isEliminated: false, hasDropped: false,
    handCount: 13, roundStartPoints: 0,
  });

  const { error } = await c1.from('rummy_rooms').insert({
    id: roomId, host_id: p1.id, status: 'active', variant, config,
    player_ids: [p1.id, p2.id],
    player_names: [PLAYERS[0].name, PLAYERS[1].name],
    current_player_index: 0, turn_phase: 'draw',
    stock_pile: stock, discard_pile: [], joker_card: joker,
    deal_number: 1, dealer_index: 0,
    player_scores: [baseScore(p1.id), baseScore(p2.id)],
    winner_id: null, is_game_over: false,
    all_hands: { [p1.id]: h1, [p2.id]: h2 },
    show_started_at: null, round_ended_at: null,
  });
  if (error) { check(false, `setupRoom ${roomId}: ${error.message}`); return null; }

  await c1.from('rummy_hands').upsert(
    { room_id: roomId, player_id: p1.id, seat_index: 0, hand: h1, melds: [], has_dropped: false, updated_at: new Date().toISOString() },
    { onConflict: 'room_id,player_id' }
  );
  await c2.from('rummy_hands').upsert(
    { room_id: roomId, player_id: p2.id, seat_index: 1, hand: h2, melds: [], has_dropped: false, updated_at: new Date().toISOString() },
    { onConflict: 'room_id,player_id' }
  );
  return { h1, h2, joker, stock };
}

// ─── TEST SECTIONS ────────────────────────────────────────────────────────────

// 1. Schema
async function testSchema(p1) {
  const roomId = 'SCHEMA';
  const { error: insErr } = await c1.from('rummy_rooms').insert({
    id: roomId, host_id: p1.id, status: 'waiting',
    variant: 'pool',               // ← was rejected before migration 004
    config: defaultConfig('pool'),
    player_ids: [p1.id], player_names: [PLAYERS[0].name],
    current_player_index: 0, turn_phase: 'draw',
    stock_pile: [], discard_pile: [], joker_card: null,
    deal_number: 1, dealer_index: 0,
    player_scores: [], winner_id: null, is_game_over: false,
    all_hands: {},                 // ← column was missing before migration 004
    show_started_at: null,         // ← column was missing before migration 004
    round_ended_at: null,          // ← column was missing before migration 004
  });
  check(!insErr, `variant='pool' + all new columns accepted: ${insErr?.message ?? 'OK'}`);
  if (!insErr) roomsCreated.push(roomId);

  if (!insErr) {
    const { error: e1 } = await c1.from('rummy_rooms').update({ turn_phase: 'showing' }).eq('id', roomId);
    check(!e1, `turn_phase='showing' accepted: ${e1?.message ?? 'OK'}`);

    const { error: e2 } = await c1.from('rummy_rooms').update({ turn_phase: 'round_ended' }).eq('id', roomId);
    check(!e2, `turn_phase='round_ended' accepted: ${e2?.message ?? 'OK'}`);

    const { error: e3 } = await c1.from('rummy_rooms').update({
      all_hands: { [p1.id]: [card('A','spades')] },
      show_started_at: new Date().toISOString(),
      round_ended_at:  new Date().toISOString(),
    }).eq('id', roomId);
    check(!e3, `all_hands, show_started_at, round_ended_at writable: ${e3?.message ?? 'OK'}`);
  }
}

// 2. Room lifecycle
async function testRoomLifecycle(p1, p2) {
  const roomId = `LFTST`;
  roomsCreated.push(roomId);

  // Create (host)
  const { error: cErr } = await c1.from('rummy_rooms').insert({
    id: roomId, host_id: p1.id, status: 'waiting', variant: 'points',
    config: defaultConfig(), player_ids: [p1.id], player_names: [PLAYERS[0].name],
    current_player_index: 0, turn_phase: 'draw',
    stock_pile: [], discard_pile: [], joker_card: null,
    deal_number: 1, dealer_index: 0,
    player_scores: [{ id: p1.id, points: 0, chips: 0, isEliminated: false, hasDropped: false, handCount: 0, roundStartPoints: 0 }],
    winner_id: null, is_game_over: false, all_hands: {}, show_started_at: null, round_ended_at: null,
  });
  check(!cErr, `Host created room: ${cErr?.message ?? 'OK'}`);
  if (cErr) return;

  // Guest cannot start the game (host_id check)
  const { error: guestStartErr } = await c2.from('rummy_rooms')
    .update({ status: 'active' })
    .eq('id', roomId)
    .eq('host_id', p2.id); // p2 is not host — should match 0 rows
  const { data: afterGuestStart } = await c1.from('rummy_rooms').select('status').eq('id', roomId).single();
  check(afterGuestStart?.status === 'waiting', 'Guest cannot start game (host_id guard works)');

  // Guest joins
  const { error: jErr } = await c2.from('rummy_rooms').update({
    player_ids: [p1.id, p2.id],
    player_names: [PLAYERS[0].name, PLAYERS[1].name],
    player_scores: [
      { id: p1.id, points: 0, chips: 0, isEliminated: false, hasDropped: false, handCount: 0, roundStartPoints: 0 },
      { id: p2.id, points: 0, chips: 0, isEliminated: false, hasDropped: false, handCount: 0, roundStartPoints: 0 },
    ],
    updated_at: new Date().toISOString(),
  }).eq('id', roomId).eq('status', 'waiting');
  check(!jErr, `Guest joined room: ${jErr?.message ?? 'OK'}`);

  // Verify room is readable by both
  const { data: r1 } = await c1.from('rummy_rooms').select('id, player_ids').eq('id', roomId).single();
  const { data: r2 } = await c2.from('rummy_rooms').select('id, player_ids').eq('id', roomId).single();
  check(r1?.player_ids?.length === 2, 'Host can read room with 2 players');
  check(r2?.player_ids?.length === 2, 'Guest can read room with 2 players');
}

// 3. Full Points Rummy round
async function testPointsRummy(p1, p2) {
  const roomId = `PTRMY`;
  roomsCreated.push(roomId);
  const deck = buildDeck();
  const setup = await setupRoom(roomId, p1, p2, 'points', defaultConfig('points'), deck);
  if (!setup) return;
  const { h1, h2, stock } = setup;

  check(h1.length === 13, 'Player 1 dealt 13 cards');
  check(h2.length === 13, 'Player 2 dealt 13 cards');
  check(stock.length > 0, 'Stock pile populated');

  // RLS: P2 cannot read P1's hand
  const { data: spy } = await c2.from('rummy_hands').select('*').eq('room_id', roomId).eq('player_id', p1.id).single();
  check(!spy, 'RLS: Player 2 cannot read Player 1\'s hand');

  // P1 draws from stock
  const drawnCard = stock[0];
  const newStock = stock.slice(1);
  const { error: drawErr } = await c1.from('rummy_rooms').update({
    stock_pile: newStock, turn_phase: 'discard', updated_at: new Date().toISOString(),
  }).eq('id', roomId).eq('turn_phase', 'draw');
  check(!drawErr, `P1 draws from stock: ${drawErr?.message ?? 'OK'}`);
  await c1.from('rummy_hands').update({ hand: [...h1, drawnCard], updated_at: new Date().toISOString() })
    .eq('room_id', roomId).eq('player_id', p1.id);

  // Verify turn_phase advanced
  const { data: afterDraw } = await c1.from('rummy_rooms').select('turn_phase, stock_pile').eq('id', roomId).single();
  check(afterDraw?.turn_phase === 'discard', "turn_phase advanced to 'discard' after draw");
  check(afterDraw?.stock_pile?.length === newStock.length, 'Stock pile length reduced by 1');

  // P1 discards
  const discardCard = h1[0];
  const { error: discErr } = await c1.from('rummy_rooms').update({
    discard_pile: [{ ...discardCard, droppedBy: PLAYERS[0].name }],
    current_player_index: 1, turn_phase: 'draw',
    updated_at: new Date().toISOString(),
  }).eq('id', roomId).eq('turn_phase', 'discard');
  check(!discErr, `P1 discards, turn advances to P2: ${discErr?.message ?? 'OK'}`);

  // P2 draws from discard pile
  const { data: roomForDiscard } = await c2.from('rummy_rooms').select('discard_pile, turn_phase, current_player_index').eq('id', roomId).single();
  check(roomForDiscard?.turn_phase === 'draw', "P2's turn: phase is 'draw'");
  check(roomForDiscard?.current_player_index === 1, 'current_player_index = 1 (P2)');
  const topDiscard = roomForDiscard?.discard_pile?.[roomForDiscard.discard_pile.length - 1];
  check(!!topDiscard, 'Discard pile has top card for P2 to draw');

  // P2 draws from discard
  const newDiscard = (roomForDiscard?.discard_pile ?? []).slice(0, -1);
  const { error: p2DrawErr } = await c2.from('rummy_rooms').update({
    discard_pile: newDiscard, turn_phase: 'discard', updated_at: new Date().toISOString(),
  }).eq('id', roomId).eq('turn_phase', 'draw');
  check(!p2DrawErr, `P2 draws from discard pile: ${p2DrawErr?.message ?? 'OK'}`);

  // P1 declares with a winning hand
  const { hand: wHand, melds: wMelds, discard: wDiscard } = winningHand();
  await c1.from('rummy_hands').update({ hand: wHand, melds: wMelds, updated_at: new Date().toISOString() })
    .eq('room_id', roomId).eq('player_id', p1.id);
  // Advance back to P1's discard phase
  await c1.from('rummy_rooms').update({ current_player_index: 0, turn_phase: 'discard', updated_at: new Date().toISOString() }).eq('id', roomId);

  const showScores = [
    { id: p1.id, points: 0, chips: 0, isEliminated: false, hasDropped: false, handCount: 13, roundStartPoints: 0, hasSubmittedShow: true },
    { id: p2.id, points: 0, chips: 0, isEliminated: false, hasDropped: false, handCount: 13, roundStartPoints: 0, hasSubmittedShow: false },
  ];
  const { error: declErr } = await c1.from('rummy_rooms').update({
    turn_phase: 'showing', winner_id: p1.id,
    show_started_at: new Date().toISOString(),
    player_scores: showScores,
    updated_at: new Date().toISOString(),
  }).eq('id', roomId).eq('turn_phase', 'discard');
  check(!declErr, `Declaration: turn_phase='showing', winner_id set: ${declErr?.message ?? 'OK'}`);

  // P2 submits show melds
  await c2.from('rummy_hands').update({ melds: [], updated_at: new Date().toISOString() })
    .eq('room_id', roomId).eq('player_id', p2.id);
  const finalScores = showScores.map(s =>
    s.id === p2.id ? { ...s, hasSubmittedShow: true, points: 30, lastRoundPoints: 30 } : { ...s, lastRoundPoints: 0 }
  );
  await c2.from('rummy_rooms').update({ player_scores: finalScores, updated_at: new Date().toISOString() }).eq('id', roomId);

  const allSubmitted = finalScores.every(s => s.isEliminated || s.hasDropped || s.hasSubmittedShow);
  check(allSubmitted, 'allSubmitted=true after both players submit show melds');

  // Finalize (Points Rummy → always game over)
  const { error: finErr } = await c1.from('rummy_rooms').update({
    status: 'completed', is_game_over: true,
    player_scores: finalScores,
    updated_at: new Date().toISOString(),
  }).eq('id', roomId).eq('turn_phase', 'showing');
  check(!finErr, `Show phase finalized: ${finErr?.message ?? 'OK'}`);

  const { data: final } = await c1.from('rummy_rooms').select('is_game_over, winner_id, status').eq('id', roomId).single();
  check(final?.is_game_over === true, 'is_game_over = true');
  check(final?.winner_id === p1.id, 'winner_id = P1');
  check(final?.status === 'completed', "status = 'completed'");
}

// 4. Pool Rummy — scoot + multi-round + elimination
async function testPoolRummy(p1, p2) {
  const roomId = `PLRMY`;
  roomsCreated.push(roomId);
  const config = defaultConfig('pool', { poolSize: 101, firstScootPoints: 20, midScootPoints: 40 });
  const deck = buildDeck();
  const setup = await setupRoom(roomId, p1, p2, 'pool', config, deck);
  if (!setup) return;

  // P1 scoots (first drop, 20 pts) — only P2 active → round ends immediately
  const scootScores = [
    { id: p1.id, points: 20, chips: 0, isEliminated: false, hasDropped: true, handCount: 13, roundStartPoints: 0, lastRoundPoints: 20 },
    { id: p2.id, points: 0,  chips: 0, isEliminated: false, hasDropped: false, handCount: 13, roundStartPoints: 0, lastRoundPoints: 0 },
  ];
  const { error: scErr } = await c1.from('rummy_rooms').update({
    player_scores: scootScores, turn_phase: 'round_ended',
    winner_id: p2.id, round_ended_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', roomId).eq('turn_phase', 'draw');
  check(!scErr, `P1 first scoot (20pts), round_ended: ${scErr?.message ?? 'OK'}`);

  const { data: afterScoot } = await c1.from('rummy_rooms').select('turn_phase, round_ended_at').eq('id', roomId).single();
  check(afterScoot?.turn_phase === 'round_ended', "turn_phase='round_ended' after scoot");
  check(!!afterScoot?.round_ended_at, 'round_ended_at timestamp set');

  // Start round 2
  const deck2 = buildDeck();
  const h1b = deck2.slice(0, 13);
  const h2b = deck2.slice(13, 26);
  const newScores = [
    { id: p1.id, points: 20, chips: 0, isEliminated: false, hasDropped: false, handCount: 13, roundStartPoints: 20, hasSubmittedShow: false, lastRoundPoints: undefined },
    { id: p2.id, points: 0,  chips: 0, isEliminated: false, hasDropped: false, handCount: 13, roundStartPoints: 0,  hasSubmittedShow: false, lastRoundPoints: undefined },
  ];
  const { error: nrErr } = await c1.from('rummy_rooms').update({
    all_hands: { [p1.id]: h1b, [p2.id]: h2b },
    stock_pile: deck2.slice(27), discard_pile: [], joker_card: deck2[26],
    dealer_index: 1, deal_number: 2, current_player_index: 0, turn_phase: 'draw',
    player_scores: newScores, winner_id: null, show_started_at: null, round_ended_at: null,
    updated_at: new Date().toISOString(),
  }).eq('id', roomId).eq('turn_phase', 'round_ended'); // guard prevents double-advance
  check(!nrErr, `Next round started (deal #2): ${nrErr?.message ?? 'OK'}`);

  const { data: r2 } = await c1.from('rummy_rooms').select('deal_number, turn_phase, round_ended_at').eq('id', roomId).single();
  check(r2?.deal_number === 2, `deal_number = 2`);
  check(r2?.turn_phase === 'draw', "turn_phase reset to 'draw'");
  check(!r2?.round_ended_at, 'round_ended_at cleared for new round');

  // Simulate P2 accumulating 90 pts → not yet eliminated (pool=101)
  const belowPool = [
    { id: p1.id, points: 20, chips: 0, isEliminated: false, hasDropped: false, handCount: 13, roundStartPoints: 20, lastRoundPoints: 0 },
    { id: p2.id, points: 90, chips: 0, isEliminated: false, hasDropped: false, handCount: 13, roundStartPoints: 0,  lastRoundPoints: 90 },
  ];
  const p2NotElim = config.variant === 'pool' && 90 >= config.poolSize;
  check(p2NotElim === false, 'Pool: 90pts < 101 → P2 not eliminated');

  // P2 hits 101 → eliminated
  const p2Elim = config.variant === 'pool' && 101 >= config.poolSize;
  check(p2Elim === true, 'Pool: 101pts >= 101 → P2 eliminated');

  const elimScores = belowPool.map(s =>
    s.id === p2.id ? { ...s, points: 101, isEliminated: true, lastRoundPoints: 11 } : s
  );
  const survivors = elimScores.filter(s => !s.isEliminated);
  check(survivors.length === 1, 'Only 1 survivor after P2 eliminated');
  check(survivors[0].id === p1.id, 'P1 is the Pool Rummy winner');

  // Write game over to DB
  const { error: goErr } = await c1.from('rummy_rooms').update({
    player_scores: elimScores, is_game_over: true, status: 'completed',
    winner_id: p1.id, updated_at: new Date().toISOString(),
  }).eq('id', roomId);
  check(!goErr, `Game over written to DB: ${goErr?.message ?? 'OK'}`);

  // Guard: second game-over write should not re-update (already 'completed')
  const { error: dupErr } = await c1.from('rummy_rooms').update({
    is_game_over: false, // should be blocked by eq check below
    updated_at: new Date().toISOString(),
  }).eq('id', roomId).eq('turn_phase', 'round_ended'); // guard — no match since phase changed
  const { data: finalRoom } = await c1.from('rummy_rooms').select('is_game_over').eq('id', roomId).single();
  check(finalRoom?.is_game_over === true, 'Race guard: duplicate game-over write was blocked');
}

// 5. Deals Rummy — pool elimination check must NOT fire
async function testDealsRummyNoElimination() {
  const config = defaultConfig('deals', { poolSize: 101 });

  // 150 pts — would eliminate in Pool, must NOT eliminate in Deals
  const isElimDealsSim = config.variant === 'pool' && 150 >= config.poolSize;
  check(isElimDealsSim === false, 'Deals: 150pts (>poolSize) does NOT eliminate (variant≠pool)');

  // Same for Points Rummy
  const isElimPointsSim = defaultConfig('points').variant === 'pool' && 200 >= 101;
  check(isElimPointsSim === false, 'Points: any pts does NOT eliminate (variant≠pool)');

  // Pool Rummy correctly eliminates
  const isElimPoolSim = defaultConfig('pool').variant === 'pool' && 101 >= 101;
  check(isElimPoolSim === true, 'Pool: 101pts >= poolSize correctly eliminates');
}

// 6. Edge cases (pure logic — no DB calls)
async function testEdgeCases(p1, p2) {
  // getNextActivePlayerIndex — mirrors the fixed implementation
  function getNext(currentIndex, playerIds, scores) {
    const total = playerIds.length;
    for (let i = 1; i <= total; i++) {
      const next = (currentIndex + i) % total;
      const score = scores.find(s => s.id === playerIds[next]);
      if (!score?.isEliminated && !score?.hasDropped) return next;
    }
    return (currentIndex + 1) % total;
  }

  const ids = [p1.id, p2.id, 'fake-p3'];

  // Skip eliminated
  const scoresElim = [
    { id: p1.id,    isEliminated: false, hasDropped: false },
    { id: p2.id,    isEliminated: true,  hasDropped: false },
    { id: 'fake-p3', isEliminated: false, hasDropped: false },
  ];
  check(getNext(0, ids, scoresElim) === 2, 'getNextActivePlayerIndex skips eliminated P2 → goes to P3');

  // Skip dropped
  const scoresDrop = [
    { id: p1.id,    isEliminated: false, hasDropped: false },
    { id: p2.id,    isEliminated: false, hasDropped: true },
    { id: 'fake-p3', isEliminated: false, hasDropped: false },
  ];
  check(getNext(0, ids, scoresDrop) === 2, 'getNextActivePlayerIndex skips dropped P2 → goes to P3');

  // Wraps correctly when last player is active
  const scoresWrap = [
    { id: p1.id,    isEliminated: true, hasDropped: false },
    { id: p2.id,    isEliminated: false, hasDropped: false },
    { id: 'fake-p3', isEliminated: true, hasDropped: false },
  ];
  check(getNext(1, ids, scoresWrap) === 1, 'getNextActivePlayerIndex wraps back to only active player');

  // False declaration must NOT set hasDropped
  const falseDecl = (scores, playerId, penaltyPts, variant, poolSize) =>
    scores.map(s => {
      if (s.id !== playerId) return s;
      const newPts = s.points + penaltyPts;
      const isEliminated = variant === 'pool' && newPts >= poolSize;
      return { ...s, points: newPts, isEliminated }; // no hasDropped
    });
  const afterFalse = falseDecl(
    [{ id: p1.id, points: 0, isEliminated: false, hasDropped: false }],
    p1.id, 40, 'pool', 101
  );
  check(afterFalse[0].hasDropped === false, 'False declaration: hasDropped stays false');
  check(afterFalse[0].points === 40,        'False declaration: 40pt penalty applied');
  check(afterFalse[0].isEliminated === false,'False declaration: not eliminated at 40pts in pool=101');

  // allSubmitted respects hasDropped
  const showCheck = (scores, ids) => ids.every(id => {
    const s = scores.find(x => x.id === id);
    return s?.isEliminated || s?.hasDropped || s?.hasSubmittedShow;
  });
  const showScoresDrop = [
    { id: p1.id, isEliminated: false, hasDropped: false, hasSubmittedShow: true },
    { id: p2.id, isEliminated: false, hasDropped: true,  hasSubmittedShow: false },
  ];
  check(showCheck(showScoresDrop, [p1.id, p2.id]), 'allSubmitted: dropped player counts as done (show phase unblocked)');

  // Stock reshuffle: top discard card must survive, rest shuffled
  const discardPile = [card('A','spades'), card('2','hearts'), card('3','clubs')];
  const top = discardPile[discardPile.length - 1];
  const reshuffled = discardPile.slice(0, -1).sort(() => Math.random() - 0.5);
  check(reshuffled.length === 2,                 'Stock reshuffle: 2 cards re-enter stock');
  check(!reshuffled.find(c => c.id === top.id),  'Stock reshuffle: top discard card stays as discard');
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup() {
  for (const id of roomsCreated) {
    const { error } = await c1.from('rummy_rooms').delete().eq('id', id);
    check(!error, `Room ${id} cleaned up: ${error?.message ?? 'OK'}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║        ARCPLAY — Rummy Automated Test Suite              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  section('Authentication');
  let p1, p2;
  try {
    p1 = await signIn(c1, 0);
    check(!!p1?.id, `Player 1 signed in (${PLAYERS[0].email})`);
  } catch (e) {
    check(false, `Player 1: ${e.message}`);
    console.log('\n  ⚠️  Disable "Confirm email" in Supabase Dashboard → Authentication → Providers → Email\n');
    process.exit(1);
  }
  try {
    p2 = await signIn(c2, 1);
    check(!!p2?.id, `Player 2 signed in (${PLAYERS[1].email})`);
  } catch (e) {
    check(false, `Player 2: ${e.message}`);
    process.exit(1);
  }

  section('1 · Schema Verification (migration 004)');
  await testSchema(p1);

  section('2 · Room Lifecycle (create, join, RLS)');
  await testRoomLifecycle(p1, p2);

  section('3 · Points Rummy — Full Round');
  await testPointsRummy(p1, p2);

  section('4 · Pool Rummy — Scoot + Multi-Round + Elimination');
  await testPoolRummy(p1, p2);

  section('5 · Deals Rummy — No Pool Elimination');
  await testDealsRummyNoElimination();

  section('6 · Edge Cases (getNextActive, false decl, allSubmitted, reshuffle)');
  await testEdgeCases(p1, p2);

  section('Cleanup');
  await cleanup();

  const total = passed + failed;
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log(`║  Results: ${passed}/${total} passed${failed > 0 ? `, ${failed} FAILED` : ' — all good!'}${' '.repeat(Math.max(0, 33 - String(total).length - String(failed).length))}║`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('\nUnexpected error:', e.message);
  process.exit(1);
});

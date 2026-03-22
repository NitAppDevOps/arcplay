import type {
  IRummyCard,
  IRummyGameState,
  IRummyPlayer,
  IMeld,
  RummyVariant,
  Suit,
  Rank,
} from '@app-types/game.types';

// ─── Constants ───────────────────────────────────────────────────────────────

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const RANK_ORDER: Record<Rank, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
};

const POINT_VALUES: Record<Rank, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 10, Q: 10, K: 10,
};

/** Host-configurable Rummy room settings */
export interface IRummyConfig {
  variant: RummyVariant;
  poolSize: number;           // elimination threshold (101 or 201 for pool)
  firstScootPoints: number;   // points for dropping before drawing (default 20)
  midScootPoints: number;     // points for dropping after drawing (default 40)
  fullHandPoints: number;     // max points if no melds on declaration (default 80)
  maxConsecutiveScoots: number; // max consecutive scoots allowed (default 3)
  totalDeals: number;         // number of deals for Deals Rummy (default 3)
  playerCount: number;        // 2-6 players
}

/** Default config — used until host customises */
export const DEFAULT_RUMMY_CONFIG: IRummyConfig = {
  variant: 'points',
  poolSize: 101,
  firstScootPoints: 20,
  midScootPoints: 40,
  fullHandPoints: 80,
  maxConsecutiveScoots: 3,
  totalDeals: 3,
  playerCount: 2,
};

// ─── Card creation ────────────────────────────────────────────────────────────

/** Creates a single deck of 52 cards */
const createDeck = (deckIndex: number): IRummyCard[] => {
  const deck: IRummyCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `d${deckIndex}_${suit}_${rank}`,
        suit,
        rank,
        isJoker: false,
        points: POINT_VALUES[rank],
      });
    }
  }
  return deck;
};

/** Creates a printed joker card */
const createPrintedJoker = (index: number): IRummyCard => ({
  id: `joker_${index}`,
  suit: 'spades',
  rank: 'A',
  isJoker: true,
  points: 0,
});

/** Shuffles an array in place using Fisher-Yates */
const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─── Game initialisation ──────────────────────────────────────────────────────

/**
 * Initialises a new Rummy game.
 * Uses 2 decks + 2 printed jokers (standard Indian Rummy).
 */
export const initRummyGame = (
  playerIds: string[],
  playerNames: string[],
  config: IRummyConfig
): IRummyGameState => {
  // Build deck: 2 standard decks + 2 printed jokers
  const deck = shuffle([
    ...createDeck(1),
    ...createDeck(2),
    createPrintedJoker(1),
    createPrintedJoker(2),
  ]);

  // Pick open joker — random card from deck (not a printed joker)
  const nonJokerCards = deck.filter(c => !c.isJoker);
  const jokerCard = nonJokerCards[Math.floor(Math.random() * nonJokerCards.length)];

  // Mark all cards of the same rank as wild jokers
  const deckWithJokers = deck.map(card => ({
    ...card,
    isJoker: card.isJoker || (!card.isJoker && card.rank === jokerCard.rank),
  }));

  const shuffledDeck = shuffle(deckWithJokers);

  // Deal 13 cards to each player
  const players: IRummyPlayer[] = playerIds.map((id, i) => ({
    id,
    name: playerNames[i] ?? `Player ${i + 1}`,
    hand: shuffledDeck.splice(0, 13),
    melds: [],
    points: 0,
    chips: config.variant === 'deals' ? 80 : 0,
    isEliminated: false,
    hasDropped: false,
  }));

  // Remaining cards form the stock
  const stock = shuffledDeck;

  // First card of stock goes face-up to start discard pile
  const firstDiscard = stock.splice(0, 1);

  return {
    variant: config.variant,
    players,
    stock,
    discardPile: firstDiscard,
    currentPlayerIndex: 0,
    jokerCard,
    phase: 'playing',
    turnPhase: 'draw',
    dealNumber: 1,
    totalDeals: config.totalDeals,
    winner: null,
    isGameOver: false,
  };
};

// ─── Turn actions ─────────────────────────────────────────────────────────────

/** Player draws from the stock pile */
export const drawFromStock = (state: IRummyGameState): IRummyGameState => {
  if (state.turnPhase !== 'draw') return state;
  if (state.stock.length === 0) return state;

  const newStock = [...state.stock];
  const drawnCard = newStock.shift()!;
  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex
      ? { ...p, hand: [...p.hand, drawnCard] }
      : p
  );

  return {
    ...state,
    stock: newStock,
    players,
    turnPhase: 'discard',
  };
};

/** Player draws from the discard pile */
export const drawFromDiscard = (state: IRummyGameState): IRummyGameState => {
  if (state.turnPhase !== 'draw') return state;
  if (state.discardPile.length === 0) return state;

  const newDiscard = [...state.discardPile];
  const drawnCard = newDiscard.pop()!;
  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex
      ? { ...p, hand: [...p.hand, drawnCard] }
      : p
  );

  return {
    ...state,
    discardPile: newDiscard,
    players,
    turnPhase: 'discard',
  };
};

/** Player discards a card from their hand */
export const discardCard = (
  state: IRummyGameState,
  cardId: string
): IRummyGameState => {
  if (state.turnPhase !== 'discard') return state;

  const player = state.players[state.currentPlayerIndex];
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return state;

  const discardedCard = player.hand[cardIndex];
  const newHand = player.hand.filter(c => c.id !== cardId);

  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
  );

  // Advance to next player
  const nextPlayerIndex = getNextActivePlayer(state);

  return {
    ...state,
    discardPile: [...state.discardPile, discardedCard],
    players,
    currentPlayerIndex: nextPlayerIndex,
    turnPhase: 'draw',
  };
};

/** Gets the next active (non-eliminated) player index */
const getNextActivePlayer = (state: IRummyGameState): number => {
  let next = (state.currentPlayerIndex + 1) % state.players.length;
  let attempts = 0;
  while (state.players[next].isEliminated && attempts < state.players.length) {
    next = (next + 1) % state.players.length;
    attempts++;
  }
  return next;
};

/** Player scoots (drops voluntarily) */
export const scoot = (
  state: IRummyGameState,
  config: IRummyConfig
): IRummyGameState => {
  const player = state.players[state.currentPlayerIndex];
  const isFirstScoot = state.turnPhase === 'draw';
  const scootPoints = isFirstScoot
    ? config.firstScootPoints
    : config.midScootPoints;

  const players = state.players.map((p, i) => {
    if (i !== state.currentPlayerIndex) return p;
    const newPoints = p.points + scootPoints;
    const isEliminated = config.variant !== 'points' && newPoints >= config.poolSize;
    return { ...p, points: newPoints, hasDropped: true, isEliminated };
  });

  const nextPlayerIndex = getNextActivePlayer({ ...state, players });

  return {
    ...state,
    players,
    currentPlayerIndex: nextPlayerIndex,
    turnPhase: 'draw',
  };
};

// ─── Meld validation ──────────────────────────────────────────────────────────

/** Checks if a group of cards forms a valid sequence */
export const isValidSequence = (cards: IRummyCard[]): boolean => {
  if (cards.length < 3) return false;

  const nonJokers = cards.filter(c => !c.isJoker);
  const jokerCount = cards.length - nonJokers.length;

  if (nonJokers.length === 0) return false;

  // All non-jokers must be the same suit
  const suit = nonJokers[0].suit;
  if (!nonJokers.every(c => c.suit === suit)) return false;

  // Sort by rank order
  const sorted = [...nonJokers].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);

  // Count gaps — each gap needs a joker to fill
  let gapsNeeded = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = RANK_ORDER[sorted[i + 1].rank] - RANK_ORDER[sorted[i].rank] - 1;
    if (gap < 0) return false; // duplicate ranks
    gapsNeeded += gap;
  }

  return gapsNeeded <= jokerCount;
};

/** Checks if a group of cards forms a valid set */
export const isValidSet = (cards: IRummyCard[]): boolean => {
  if (cards.length < 3 || cards.length > 4) return false;

  const nonJokers = cards.filter(c => !c.isJoker);
  if (nonJokers.length === 0) return false;

  // All non-jokers must be the same rank
  const rank = nonJokers[0].rank;
  if (!nonJokers.every(c => c.rank === rank)) return false;

  // All non-jokers must be different suits
  const suits = nonJokers.map(c => c.suit);
  return new Set(suits).size === suits.length;
};

/** Checks if a sequence is pure (no jokers) */
export const isPureSequence = (cards: IRummyCard[]): boolean => {
  if (!isValidSequence(cards)) return false;
  return cards.every(c => !c.isJoker);
};

/** Validates a full hand declaration */
export const validateDeclaration = (
  hand: IRummyCard[],
  melds: IMeld[]
): { isValid: boolean; reason: string } => {
  // All cards must be in melds
  const meldsCardIds = new Set(melds.flatMap(m => m.cards.map(c => c.id)));
  const unmelded = hand.filter(c => !meldsCardIds.has(c.id));
  if (unmelded.length > 0) {
    return { isValid: false, reason: 'All cards must be grouped into melds.' };
  }

  // All melds must be individually valid
  const allMeldsValid = melds.every(m =>
    m.type === 'sequence' ? isValidSequence(m.cards) : isValidSet(m.cards)
  );
  if (!allMeldsValid) {
    return { isValid: false, reason: 'One or more melds are invalid.' };
  }

  // Must have at least 2 sequences
  const sequences = melds.filter(m => m.type === 'sequence');
  if (sequences.length < 2) {
    return { isValid: false, reason: 'You need at least 2 sequences to declare.' };
  }

  // Must have at least 1 pure sequence (no jokers)
  const hasPure = sequences.some(m => isPureSequence(m.cards));
  if (!hasPure) {
    return { isValid: false, reason: 'You need at least 1 pure sequence (no jokers).' };
  }

  return { isValid: true, reason: 'Valid declaration!' };
};

// ─── Scoring ──────────────────────────────────────────────────────────────────

/** Calculates the point value of unmelded cards in a hand */
export const calculateHandPoints = (
  hand: IRummyCard[],
  melds: IMeld[],
  fullHandPoints: number
): number => {
  const meldsCardIds = new Set(melds.flatMap(m => m.cards.map(c => c.id)));
  const unmelded = hand.filter(c => !meldsCardIds.has(c.id));

  // If no melds at all, full hand penalty
  if (melds.length === 0) return fullHandPoints;

  const total = unmelded.reduce((sum, card) => sum + card.points, 0);
  return Math.min(total, fullHandPoints);
};

/** Sorts a hand by suit then rank for display */
export const sortHand = (hand: IRummyCard[]): IRummyCard[] => {
  return [...hand].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
    return RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
  });
};

/** Returns the display symbol for a card's suit */
export const getSuitSymbol = (suit: Suit): string => {
  const symbols: Record<Suit, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return symbols[suit];
};

/** Returns the colour for a card's suit */
export const getSuitColour = (suit: Suit): string => {
  return suit === 'hearts' || suit === 'diamonds' ? '#E53935' : '#212121';
};
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';
import type { IRummyCard, IMeld, IRummyGameState } from '@app-types/game.types';
import {
  initRummyGame,
  drawFromStock,
  drawFromDiscard,
  discardCard,
  scoot,
  validateDeclaration,
  getSuitSymbol,
  getSuitColour,
  isValidSequence,
  isValidSet,
  isPureSequence,
  getMeldLabel,
  canPickJokerFromDiscard,
  DEFAULT_RUMMY_CONFIG,
  type IRummyConfig,
} from '@services/rummy';
// calculateHandPoints intentionally not imported — deadwood computed inline
import {
  getRummyRoom,
  getMyHand,
  claimMyHand,
  subscribeToRummyRoom,
  subscribeToMyHand,
  drawFromStockOnline,
  drawFromDiscardOnline,
  discardCardOnline,
  scootOnline,
  declareOnline,
  markJokerSeenOnline,
  submitShowMeldsOnline,
  finalizeShowPhaseOnline,
  startNextRoundOnline,
  type IRummyRoom,
  type IRummyHand,
  type IPlayerScore,
} from '@services/rummyRooms';
import { useAuthStore } from '@store/authStore';

type Props = NativeStackScreenProps<GamesStackParamList, 'RummyTable'>;

const { width } = Dimensions.get('window');
const USABLE_W = width - 24;                            // 12px padding each side
const CARD_W = Math.min(82, Math.floor(width * 0.198)); // ~77px on 390px screen
const CARD_H = Math.round(CARD_W * 1.52);
// Step sized so 13 ungrouped cards fill exactly one row
const CARD_STEP_GROUPED = Math.floor((USABLE_W - CARD_W) / 12);
// Gap between sets must be clearly larger than the inner step so groups are visually distinct
const GROUP_GAP = CARD_W - CARD_STEP_GROUPED + 8;       // 8px air gap between groups — no pixel overlap
const LABEL_H = 20;
const ROW_H = LABEL_H + CARD_H + 20;                   // +20px headroom for selected card lift

/** Compute absolute left position of each card in a row */
const computeRowLefts = (items: IDisplayItem[]): number[] => {
  const lefts: number[] = [];
  let x = 0;
  for (let i = 0; i < items.length; i++) {
    lefts.push(x);
    if (i < items.length - 1) {
      const crossesGroup = items[i].groupId !== items[i + 1].groupId;
      if (crossesGroup) {
        x += CARD_STEP_GROUPED + GROUP_GAP; // visible gap between groups / ungrouped clusters
      } else {
        x += CARD_STEP_GROUPED; // tight pack — same group OR both ungrouped
      }
    }
  }
  return lefts;
};

/** Finds the rightmost split point that keeps a row within USABLE_W, never breaking a group. */
const bestRowSplit = (items: IDisplayItem[]): IDisplayItem[] => {
  const allLefts = computeRowLefts(items);
  const totalW = allLefts[items.length - 1] + CARD_W;
  if (totalW <= USABLE_W) return items; // fits as-is
  for (let i = items.length - 1; i >= 1; i--) {
    const isMidGroup = items[i - 1].groupId !== null && items[i - 1].groupId === items[i].groupId;
    if (isMidGroup) continue;
    const slice = items.slice(0, i);
    const sliceLefts = computeRowLefts(slice);
    const sliceW = sliceLefts[slice.length - 1] + CARD_W;
    if (sliceW <= USABLE_W) return slice;
  }
  return items.slice(0, Math.max(1, Math.floor(items.length / 2)));
};

/**
 * Splits items into up to three rows. Groups are never broken across rows.
 * Returns row3 only when two rows are still insufficient.
 */
const splitIntoRows = (
  items: IDisplayItem[]
): { row1: IDisplayItem[]; row2: IDisplayItem[]; row3: IDisplayItem[] } => {
  if (items.length === 0) return { row1: [], row2: [], row3: [] };
  const allLefts = computeRowLefts(items);
  const totalW = allLefts[items.length - 1] + CARD_W;
  if (totalW <= USABLE_W) return { row1: items, row2: [], row3: [] };

  const row1 = bestRowSplit(items);
  const rest1 = items.slice(row1.length);
  if (rest1.length === 0) return { row1, row2: [], row3: [] };

  const rest1Lefts = computeRowLefts(rest1);
  const rest1W = rest1Lefts[rest1.length - 1] + CARD_W;
  if (rest1W <= USABLE_W) return { row1, row2: rest1, row3: [] };

  const row2 = bestRowSplit(rest1);
  const row3 = rest1.slice(row2.length);
  return { row1, row2, row3 };
};

// Table palette — immersive, separate from app theme
const TABLE = '#1B5E20';
const TABLE_MID = '#2E7D32';
const CARD_BACK = '#1A237E'; // deep navy — professional card back colour

interface IDisplayItem {
  card: IRummyCard;
  groupId: string | null;
  isFirstInGroup: boolean;
}

interface IOpponent {
  id: string;
  name: string;
  index: number;
  score: IPlayerScore | undefined;
}

/** RummyTableScreen — online multiplayer and local practice */
export default function RummyTableScreen({ navigation, route }: Props): React.JSX.Element {
  const { roomId, mode = 'local', playerIndex = 0 } = route.params;
  const { user } = useAuthStore();
  const isOnline = mode === 'online';

  // ── Local practice state ──────────────────────────────────────────────────

  const localConfig: IRummyConfig = {
    ...DEFAULT_RUMMY_CONFIG,
    playerCount: 2,
  };

  const [gameState, setGameState] = useState<IRummyGameState>(() =>
    initRummyGame(['player1', 'player2'], ['You', 'Opponent'], localConfig)
  );

  // ── Online mode state ─────────────────────────────────────────────────────

  const [onlineRoom, setOnlineRoom] = useState<IRummyRoom | null>(null);
  const [myHand, setMyHand] = useState<IRummyHand | null>(null);
  const [isLoadingOnline, setIsLoadingOnline] = useState<boolean>(isOnline);
  const [onlineError, setOnlineError] = useState<string>('');
  const [isActing, setIsActing] = useState<boolean>(false);

  // ── Card grouping — free at any time ─────────────────────────────────────

  const [cardGroupMap, setCardGroupMap] = useState<Record<string, string>>({}); // cardId → groupId
  const [groupOrder, setGroupOrder] = useState<string[]>([]);                   // ordered group IDs
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  // ── UI state ──────────────────────────────────────────────────────────────

  const [actionError, setActionError] = useState<string>('');
  const [showDiscardModal, setShowDiscardModal] = useState<boolean>(false);
  const [showScoreModal, setShowScoreModal] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [jokerSeenMsg, setJokerSeenMsg] = useState<string>('');
  const [showTimeLeft, setShowTimeLeft] = useState<number | null>(null);     // show phase countdown
  const [hasSubmittedShow, setHasSubmittedShow] = useState<boolean>(false);
  const [roundEndTimeLeft, setRoundEndTimeLeft] = useState<number | null>(null); // 30s score table
  const showTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundEndTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const showFinalizedRef = useRef<boolean>(false); // prevents duplicate finalize calls
  const roundAdvancedRef = useRef<boolean>(false); // prevents double startNextRound call
  const prevDealNumberRef = useRef<number>(0);     // detects when a new round begins
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMyTurnRef = useRef<boolean>(false);        // stale-closure-safe copy for intervals
  const prevIsMyTurnRef = useRef<boolean>(false);    // detects the edge: false→true
  const jokerSeenCalledRef = useRef<boolean>(false);
  const hasShownGameOverRef = useRef<boolean>(false);

  // ── Derived values ────────────────────────────────────────────────────────

  const myPlayerIndex = isOnline ? playerIndex : 0;

  const isMyTurn = isOnline
    ? onlineRoom?.current_player_index === myPlayerIndex
    : gameState.currentPlayerIndex === 0;

  const turnPhase: 'draw' | 'discard' | 'showing' | 'round_ended' = isOnline
    ? (onlineRoom?.turn_phase ?? 'draw')
    : gameState.turnPhase;

  const handCards: IRummyCard[] = isOnline
    ? (myHand?.hand ?? [])
    : gameState.players[0].hand;

  const discardPileArr: IRummyCard[] = isOnline
    ? (onlineRoom?.discard_pile ?? [])
    : gameState.discardPile;

  const topDiscard = discardPileArr[discardPileArr.length - 1] ?? null;

  const jokerCard = isOnline ? onlineRoom?.joker_card ?? null : gameState.jokerCard;

  const config: IRummyConfig = isOnline
    ? (onlineRoom?.config ?? DEFAULT_RUMMY_CONFIG)
    : localConfig;

  const playerNames: string[] = isOnline
    ? (onlineRoom?.player_names ?? [])
    : ['You', 'Opponent'];

  const playerScores: IPlayerScore[] = isOnline
    ? (onlineRoom?.player_scores ?? [])
    : [];

  const myName = playerNames[myPlayerIndex] ?? 'You';

  const variantLabel = (() => {
    const v = isOnline ? (onlineRoom?.variant ?? 'points') : 'points';
    if (v === 'deals') return 'Deals';
    if (v === 'pool') return 'Pool';
    return 'Points';
  })();

  const isGameOver = isOnline
    ? (onlineRoom?.is_game_over ?? false)
    : gameState.isGameOver;

  // My elimination state
  const myIsEliminated = isOnline
    ? (onlineRoom?.player_scores?.find(s => s.id === user?.id)?.isEliminated ?? false)
    : false;

  // Dealer and starter indices (for S/D badges)
  const dealerIndex = onlineRoom?.dealer_index ?? 0;
  const starterIndex = isOnline
    ? ((dealerIndex + 1) % Math.max(1, (onlineRoom?.player_ids?.length ?? 1)))
    : 0;

  // ── Derived group state ───────────────────────────────────────────────────

  /** True if any group in the hand qualifies as a pure sequence */
  const hasPureSequence = useMemo(() => {
    for (const gid of groupOrder) {
      const cards = handCards.filter(c => cardGroupMap[c.id] === gid);
      if (cards.length >= 3 && isPureSequence(cards)) return true;
    }
    return false;
  }, [groupOrder, cardGroupMap, handCards]);

  /** Joker to display in centre — each player sees it only when they have their own pure sequence */
  const jokerDisplay = jokerCard
    ? (config.jokerType === 'closed' && !hasPureSequence ? null : jokerCard)
    : null;

  /** Ordered display list with group metadata */
  const displayOrder = useMemo((): IDisplayItem[] => {
    const grouped: IDisplayItem[] = [];
    for (const gid of groupOrder) {
      const groupCards = handCards.filter(c => cardGroupMap[c.id] === gid);
      groupCards.forEach((card, posInGroup) => {
        grouped.push({ card, groupId: gid, isFirstInGroup: posInGroup === 0 });
      });
    }
    const ungrouped = handCards
      .filter(c => !cardGroupMap[c.id])
      .map(card => ({ card, groupId: null, isFirstInGroup: false }));
    return [...grouped, ...ungrouped];
  }, [handCards, cardGroupMap, groupOrder]);

  const { row1, row2, row3 } = useMemo(() => splitIntoRows(displayOrder), [displayOrder]);

  // Absolute left positions for each card in each row
  const row1Lefts = useMemo(() => computeRowLefts(row1), [row1]);
  const row2Lefts = useMemo(() => computeRowLefts(row2), [row2]);
  const row3Lefts = useMemo(() => computeRowLefts(row3), [row3]);

  /** Builds IMeld[] from current group state for declaration/validation */
  const buildDeclarationMelds = useCallback((): IMeld[] => {
    const groups: Record<string, IRummyCard[]> = {};
    for (const card of handCards) {
      const gid = cardGroupMap[card.id];
      if (!gid) continue;
      if (!groups[gid]) groups[gid] = [];
      groups[gid].push(card);
    }
    return groupOrder
      .filter(gid => groups[gid]?.length >= 3)
      .map(gid => {
        const cards = groups[gid];
        const isSeq = isValidSequence(cards);
        const isPure = isPureSequence(cards);
        return {
          id: gid,
          cards,
          type: isSeq ? 'sequence' : ('set' as const),
          isValid: isSeq || isValidSet(cards),
          isPureSequence: isPure,
        };
      });
  }, [handCards, cardGroupMap, groupOrder]);

  /** Builds IMeld[] for an arbitrary subset of cards using current groupings */
  const buildMeldsFromGrouping = useCallback((cards: IRummyCard[]): IMeld[] => {
    const groups: Record<string, IRummyCard[]> = {};
    for (const card of cards) {
      const gid = cardGroupMap[card.id];
      if (!gid) continue;
      if (!groups[gid]) groups[gid] = [];
      groups[gid].push(card);
    }
    return groupOrder
      .filter(gid => groups[gid]?.length >= 3)
      .map(gid => {
        const groupCards = groups[gid];
        const isSeq = isValidSequence(groupCards);
        const isPure = isPureSequence(groupCards);
        return {
          id: gid,
          cards: groupCards,
          type: isSeq ? 'sequence' : ('set' as const),
          isValid: isSeq || isValidSet(groupCards),
          isPureSequence: isPure,
        };
      });
  }, [cardGroupMap, groupOrder]);

  // ── Seating layout ────────────────────────────────────────────────────────

  const seatLayout = useMemo((): { left: IOpponent | null; right: IOpponent | null; topRow: IOpponent[] } => {
    if (!isOnline) return { left: null, right: null, topRow: [] };
    const ids = onlineRoom?.player_ids ?? [];
    const n = ids.length;
    if (n <= 1) return { left: null, right: null, topRow: [] };

    const allPlayers: IOpponent[] = ids.map((id, i) => ({
      id,
      name: playerNames[i] ?? `P${i + 1}`,
      index: i,
      score: playerScores.find(s => s.id === id),
    }));

    const opponents = allPlayers.filter(p => p.index !== myPlayerIndex);

    if (n === 2) {
      return { left: null, right: null, topRow: opponents };
    }
    if (n === 3) {
      const left = allPlayers[(myPlayerIndex + 1) % n];
      const right = allPlayers[(myPlayerIndex + 2) % n];
      return { left, right, topRow: [] };
    }
    // n >= 4: immediate neighbors go left/right, rest go to top row
    const left = allPlayers[(myPlayerIndex + 1) % n];
    const right = allPlayers[(myPlayerIndex + n - 1) % n];
    const topPlayers = opponents
      .filter(p => p.index !== left.index && p.index !== right.index)
      .sort((a, b) => {
        const aOff = (a.index - myPlayerIndex + n) % n;
        const bOff = (b.index - myPlayerIndex + n) % n;
        return aOff - bOff;
      });
    return { left, right, topRow: topPlayers };
  }, [isOnline, onlineRoom?.player_ids, myPlayerIndex, playerNames, playerScores]);

  // For local mode
  const localOpponentCardCount = gameState.players[1]?.hand?.length ?? 0;

  // ── Hand deadwood points — sum of cards not in valid melds ────────────────

  /** Points the player would score if someone declared right now */
  const handDeadwoodPoints = useMemo(() => {
    const groups: Record<string, IRummyCard[]> = {};
    for (const card of handCards) {
      const gid = cardGroupMap[card.id];
      if (!gid) continue;
      if (!groups[gid]) groups[gid] = [];
      groups[gid].push(card);
    }
    const validMeldCardIds = new Set<string>();
    for (const gid of groupOrder) {
      const cards = groups[gid];
      if (!cards || cards.length < 3) continue;
      if (isValidSequence(cards) || isValidSet(cards)) {
        cards.forEach(c => validMeldCardIds.add(c.id));
      }
    }
    return handCards
      .filter(c => !validMeldCardIds.has(c.id) && !c.id.startsWith('joker_'))
      .reduce((sum, c) => sum + c.points, 0);
  }, [handCards, cardGroupMap, groupOrder]);

  // ── Declarer name (for show phase banner) ────────────────────────────────

  const declarerName = useMemo(() => {
    if (!onlineRoom?.winner_id) return null;
    const idx = (onlineRoom.player_ids ?? []).indexOf(onlineRoom.winner_id);
    return idx >= 0 ? (playerNames[idx] ?? 'A player') : null;
  }, [onlineRoom?.winner_id, onlineRoom?.player_ids, playerNames]);

  // ── Score table rows (used in end-of-game modal) ──────────────────────────

  const scoreRows = useMemo(() => {
    if (isOnline) {
      const ids = onlineRoom?.player_ids ?? [];
      const winnerId = onlineRoom?.winner_id ?? '';
      return ids.map((id, i) => {
        const s = playerScores.find(ps => ps.id === id);
        return {
          id,
          name: playerNames[i] ?? `P${i + 1}`,
          isWinner: id === winnerId,
          isEliminated: s?.isEliminated ?? false,
          roundPts: s?.lastRoundPoints ?? 0,
          totalPts: s?.points ?? 0,
        };
      });
    }
    // Local mode
    return gameState.players.map((p, i) => ({
      id: p.id,
      name: i === 0 ? 'You' : 'Opponent',
      isWinner: i === 0,
      isEliminated: p.isEliminated,
      roundPts: p.points,
      totalPts: p.points,
    }));
  }, [isOnline, onlineRoom?.player_ids, onlineRoom?.winner_id, playerScores, playerNames, gameState.players]);

  // ── Online: load room and hand on mount ───────────────────────────────────

  useEffect(() => {
    if (!isOnline) return;
    const load = async (): Promise<void> => {
      try {
        const { room, error: roomErr } = await getRummyRoom(roomId);
        if (roomErr || !room) {
          setOnlineError(roomErr ?? 'Room not found.');
          setIsLoadingOnline(false);
          return;
        }
        setOnlineRoom(room);

        let { hand } = await getMyHand(roomId, user?.id ?? '');
        if (!hand && user?.id && room.all_hands?.[user.id]) {
          const dealt = room.all_hands[user.id];
          const seat = (room.player_ids ?? []).indexOf(user.id);
          await claimMyHand(roomId, user.id, dealt, seat);
          const result = await getMyHand(roomId, user.id);
          hand = result.hand;
        }
        if (hand) setMyHand(hand);
      } catch {
        setOnlineError('Failed to load game.');
      } finally {
        setIsLoadingOnline(false);
      }
    };
    load();
  }, [isOnline, roomId]);

  // ── Online: realtime subscriptions ───────────────────────────────────────

  useEffect(() => {
    if (!isOnline || !roomId) return;
    const roomSub = subscribeToRummyRoom(roomId, (updated) => {
      setOnlineRoom(updated);
      if (updated.is_game_over && !hasShownGameOverRef.current) {
        hasShownGameOverRef.current = true;
        handleGameOver(updated);
      }
    });
    const handSub = subscribeToMyHand(roomId, user?.id ?? '', (updated) => {
      setMyHand(updated);
    });
    return () => {
      roomSub.unsubscribe();
      handSub.unsubscribe();
    };
  }, [isOnline, roomId]);

  // ── Clean up stale card group entries when hand changes ───────────────────

  useEffect(() => {
    const validIds = new Set(handCards.map(c => c.id));
    const hasStale = Object.keys(cardGroupMap).some(id => !validIds.has(id));
    if (hasStale) {
      setCardGroupMap(prev => {
        const cleaned: Record<string, string> = {};
        for (const [id, gid] of Object.entries(prev)) {
          if (validIds.has(id)) cleaned[id] = gid;
        }
        return cleaned;
      });
    }
  }, [handCards]);

  // ── Keep isMyTurnRef in sync (stale-closure-safe for intervals) ──────────

  useEffect(() => {
    isMyTurnRef.current = isMyTurn;
  }, [isMyTurn]);

  // ── Haptic buzz when it becomes MY turn — double heavy impact ────────────

  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current) {
      // First heavy impact
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => null);
      // Second heavy impact 120ms later — strong double-buzz to grab attention
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => null), 120);
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn]);

  // ── Turn timer — runs on ALL devices so everyone sees the countdown ───────

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!config.turnTimerSeconds || isGameOver) {
      setTimeLeft(null);
      return;
    }
    setTimeLeft(config.turnTimerSeconds);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          if (isMyTurnRef.current) handleTimerExpiry();
          return null;
        }
        // Last 10 seconds: strong haptic tick every second (only when it's MY turn)
        if (prev <= 10 && isMyTurnRef.current) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => null);
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineRoom?.current_player_index, gameState.currentPlayerIndex, onlineRoom?.updated_at, config.turnTimerSeconds, isGameOver]);

  const handleTimerExpiry = (): void => {
    if (config.timerExpiryAction === 'warning_only') {
      setActionError('Time is up!');
      return;
    }
    if (config.timerExpiryAction === 'auto_drop') {
      onScoot();
      return;
    }
    // auto_discard
    if (turnPhase === 'draw') {
      // Draw phase: auto-draw from stock so the turn can progress
      if (isOnline) {
        handleDrawStockOnline();
      } else {
        setGameState(prev => drawFromStock(prev));
      }
    } else if (turnPhase === 'discard' && handCards.length > 0) {
      const randomCard = handCards[Math.floor(Math.random() * handCards.length)];
      if (isOnline) {
        handleDiscardOnline(randomCard.id);
      } else {
        setSelectedCards(new Set([randomCard.id]));
        setGameState(prev => discardCard(prev, randomCard.id));
        setSelectedCards(new Set());
      }
    }
  };

  // ── Closed joker: mark seen when player forms first pure sequence ─────────

  useEffect(() => {
    if (!isOnline || !user?.id || !hasPureSequence || jokerSeenCalledRef.current) return;
    if (config.jokerType !== 'closed') return;
    jokerSeenCalledRef.current = true;
    markJokerSeenOnline(roomId, user.id).catch(() => null);
    setJokerSeenMsg('You revealed the joker!');
    const t = setTimeout(() => setJokerSeenMsg(''), 3000);
    return () => clearTimeout(t);
  }, [isOnline, hasPureSequence, config.jokerType, roomId, user?.id]);

  // Watch for other players having seen the joker — show notification (does NOT reveal it)
  const anyOtherSeenJoker = isOnline && playerScores.some(s => s.hasSeenJoker && s.id !== user?.id);
  useEffect(() => {
    if (!isOnline || !anyOtherSeenJoker) return;
    const revealerScore = playerScores.find(s => s.hasSeenJoker && s.id !== user?.id);
    if (revealerScore) {
      const revealerIdx = (onlineRoom?.player_ids ?? []).indexOf(revealerScore.id);
      const revealerName = playerNames[revealerIdx] ?? 'A player';
      setJokerSeenMsg(`${revealerName} has a pure sequence!`);
      const t = setTimeout(() => setJokerSeenMsg(''), 3000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyOtherSeenJoker]);

  /** Called when show phase timer expires — auto-submit melds and finalize if all done */
  const handleShowTimerExpiry = async (): Promise<void> => {
    if (!user || hasSubmittedShow) return;
    setHasSubmittedShow(true);
    setShowTimeLeft(null); // freeze/clear countdown immediately on submit
    const melds = buildDeclarationMelds();
    try {
      const { allSubmitted } = await submitShowMeldsOnline(roomId, user.id, melds);
      if (allSubmitted && !showFinalizedRef.current) {
        showFinalizedRef.current = true;
        await finalizeShowPhaseOnline(roomId);
      }
    } catch {
      // Silent fail — another device may finalize
    }
  };

  // ── Show phase timer — runs when turn_phase = 'showing' ──────────────────

  useEffect(() => {
    if (!isOnline || turnPhase !== 'showing' || hasSubmittedShow) return;
    const showStarted = onlineRoom?.show_started_at;
    if (!showStarted) return;

    const showSeconds = config.showTimeSeconds ?? 90;
    const elapsed = Math.floor((Date.now() - new Date(showStarted).getTime()) / 1000);
    const remaining = Math.max(0, showSeconds - elapsed);

    if (remaining === 0) {
      handleShowTimerExpiry();
      return;
    }

    setShowTimeLeft(remaining);
    if (showTimerRef.current) clearInterval(showTimerRef.current);
    showTimerRef.current = setInterval(() => {
      setShowTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(showTimerRef.current!);
          handleShowTimerExpiry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (showTimerRef.current) clearInterval(showTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnPhase, onlineRoom?.show_started_at, hasSubmittedShow]);

  // ── Round-end 30s countdown — drives auto-advance to next round ──────────

  useEffect(() => {
    if (!isOnline || turnPhase !== 'round_ended') {
      if (roundEndTimerRef.current) clearInterval(roundEndTimerRef.current);
      return;
    }
    const endedAt = onlineRoom?.round_ended_at;
    if (!endedAt) return;

    const ROUND_END_SECS = 30;
    const elapsed = Math.floor((Date.now() - new Date(endedAt).getTime()) / 1000);
    const remaining = Math.max(0, ROUND_END_SECS - elapsed);

    // Show score modal automatically
    setShowScoreModal(true);

    if (remaining === 0) { handleRoundEndExpiry(); return; }

    setRoundEndTimeLeft(remaining);
    if (roundEndTimerRef.current) clearInterval(roundEndTimerRef.current);
    roundEndTimerRef.current = setInterval(() => {
      setRoundEndTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(roundEndTimerRef.current!);
          handleRoundEndExpiry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (roundEndTimerRef.current) clearInterval(roundEndTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnPhase, onlineRoom?.round_ended_at]);

  /** After 30s score table, advance to next round */
  const handleRoundEndExpiry = async (): Promise<void> => {
    if (roundAdvancedRef.current) return;
    roundAdvancedRef.current = true;
    try { await startNextRoundOnline(roomId); } catch { /* silent — another device may advance */ }
  };

  // ── Detect new round (deal_number changed) — reset local state ────────────

  useEffect(() => {
    if (!isOnline || !onlineRoom) return;
    const newDeal = onlineRoom.deal_number ?? 1;
    if (prevDealNumberRef.current !== 0 && prevDealNumberRef.current !== newDeal) {
      // New round started — reset all per-round local state
      setCardGroupMap({});
      setGroupOrder([]);
      setSelectedCards(new Set());
      setHasSubmittedShow(false);
      setShowScoreModal(false);
      setRoundEndTimeLeft(null);
      setShowTimeLeft(null);
      showFinalizedRef.current = false;
      roundAdvancedRef.current = false;
      jokerSeenCalledRef.current = false;
      hasShownGameOverRef.current = false;

      // Re-claim new hand (only if not eliminated)
      const myScore = onlineRoom.player_scores?.find(s => s.id === user?.id);
      if (!myScore?.isEliminated && user?.id && onlineRoom.all_hands?.[user.id]) {
        const newHand = onlineRoom.all_hands[user.id];
        const seat = (onlineRoom.player_ids ?? []).indexOf(user.id);
        claimMyHand(roomId, user.id, newHand, seat).catch(() => null);
      }
    }
    prevDealNumberRef.current = newDeal;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineRoom?.deal_number]);

  // ── Game over ─────────────────────────────────────────────────────────────

  const handleGameOver = (_room: IRummyRoom): void => {
    setShowScoreModal(true);
  };

  // ── Card selection + declare-by-tap ──────────────────────────────────────

  const handleCardTap = useCallback((card: IRummyCard): void => {
    // Normal card selection only — declare/discard decisions are the player's choice via action buttons
    setSelectedCards(prev => {
      const next = new Set(prev);
      next.has(card.id) ? next.delete(card.id) : next.add(card.id);
      return next;
    });
    setActionError('');
  }, []);

  // ── Card grouping ─────────────────────────────────────────────────────────

  const handleGroup = useCallback((): void => {
    if (selectedCards.size < 2) {
      setActionError('Select 2 or more cards to group.');
      return;
    }
    const newGroupId = `g_${Date.now()}`;
    // Compute the full new map eagerly so we can clean up empty old groups atomically
    const newGroupMap: Record<string, string> = { ...cardGroupMap };
    for (const id of selectedCards) {
      newGroupMap[id] = newGroupId;
    }
    setCardGroupMap(newGroupMap);
    setGroupOrder(prev => {
      // Remove any group IDs that no longer have cards assigned in the new map
      const usedIds = new Set(Object.values(newGroupMap));
      const cleaned = prev.filter(gid => usedIds.has(gid));
      return cleaned.includes(newGroupId) ? cleaned : [...cleaned, newGroupId];
    });
    setSelectedCards(new Set());
    setActionError('');
  }, [selectedCards, cardGroupMap]);

  const handleUngroup = useCallback((): void => {
    const toUngroupIds = new Set(Array.from(selectedCards).filter(id => cardGroupMap[id]));
    if (toUngroupIds.size === 0) {
      setActionError('No grouped cards selected.');
      return;
    }
    // Compute new map eagerly so groupOrder cleanup reads consistent state
    const newGroupMap: Record<string, string> = {};
    for (const [cardId, groupId] of Object.entries(cardGroupMap)) {
      if (!toUngroupIds.has(cardId)) newGroupMap[cardId] = groupId;
    }
    setCardGroupMap(newGroupMap);
    // Remove group IDs that no longer have any cards in the new map
    setGroupOrder(prev => {
      const usedIds = new Set(Object.values(newGroupMap));
      return prev.filter(gid => usedIds.has(gid));
    });
    setSelectedCards(new Set());
    setActionError('');
  }, [selectedCards, cardGroupMap]);

  const handleClearSelection = (): void => {
    setSelectedCards(new Set());
    setActionError('');
  };

  // ── Online actions ────────────────────────────────────────────────────────

  const handleDrawStockOnline = async (): Promise<void> => {
    if (!isMyTurn || turnPhase !== 'draw' || isActing || !user) return;
    setIsActing(true);
    setActionError('');
    try {
      const { error } = await drawFromStockOnline(roomId, user.id);
      if (error) setActionError(error);
    } catch {
      setActionError('Failed to draw. Try again.');
    } finally {
      setIsActing(false);
    }
  };

  const handleDrawDiscardOnline = async (): Promise<void> => {
    if (!isMyTurn || turnPhase !== 'draw' || isActing || !topDiscard || !user) return;
    // Joker from discard enforcement
    if (topDiscard.isJoker) {
      if (!config.allowJokerFromDiscard) {
        setActionError('Joker cannot be taken from the discard pile.');
        return;
      }
      if (!canPickJokerFromDiscard(topDiscard, handCards)) {
        setActionError('Joker can only be taken if it completes a pure sequence in your hand.');
        return;
      }
    }
    setIsActing(true);
    setActionError('');
    try {
      const { error } = await drawFromDiscardOnline(roomId, user.id);
      if (error) setActionError(error);
    } catch {
      setActionError('Failed to draw. Try again.');
    } finally {
      setIsActing(false);
    }
  };

  const handleDiscardOnline = useCallback(async (cardId?: string): Promise<void> => {
    const id = cardId ?? Array.from(selectedCards)[0];
    if (!id) { setActionError('Select a card to discard.'); return; }
    if (!isMyTurn || turnPhase !== 'discard') { setActionError('Not your discard phase.'); return; }
    if (isActing || !user) return;
    const card = handCards.find(c => c.id === id);
    if (!card) return;
    setIsActing(true);
    setSelectedCards(new Set());
    setActionError('');
    try {
      const { error } = await discardCardOnline(roomId, user.id, card, myName);
      if (error) setActionError(error);
    } catch {
      setActionError('Failed to discard. Try again.');
    } finally {
      setIsActing(false);
    }
  }, [selectedCards, handCards, isActing, user, roomId, isMyTurn, turnPhase]);

  const handleScootOnline = (): void => {
    if (!user || isActing || !isMyTurn) return;
    const isFirst = turnPhase === 'draw';
    const pts = isFirst ? config.firstScootPoints : config.midScootPoints;
    Alert.alert(
      'Drop hand?',
      `You will receive ${pts} points for a ${isFirst ? 'first' : 'mid'} drop.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Drop', style: 'destructive',
          onPress: async () => {
            setIsActing(true);
            try {
              const { error } = await scootOnline(roomId, user.id, isFirst);
              if (error) setActionError(error);
              else { setCardGroupMap({}); setGroupOrder([]); setSelectedCards(new Set()); }
            } catch {
              setActionError('Failed to drop. Try again.');
            } finally {
              setIsActing(false);
            }
          },
        },
      ]
    );
  };

  const handleDeclareOnline = useCallback(async (): Promise<void> => {
    if (!user || isActing || !isMyTurn) return;

    // ── Identify the 14th card to discard ──────────────────────────────────
    // In discard phase the player holds 14 cards. Declaration discards 1 face-down
    // and shows the remaining 13 as melds. Identify which card is the discard:
    //   1. A single selected card takes priority
    //   2. The sole ungrouped card
    //   3. Error: player must indicate which card to discard
    let declareCards = handCards;
    if (handCards.length === 14) {
      if (selectedCards.size === 1) {
        const selId = Array.from(selectedCards)[0];
        declareCards = handCards.filter(c => c.id !== selId);
      } else {
        const ungrouped = handCards.filter(c => !cardGroupMap[c.id]);
        if (ungrouped.length === 1) {
          declareCards = handCards.filter(c => c.id !== ungrouped[0].id);
        } else if (ungrouped.length === 0) {
          setActionError('Select the card you want to discard, then tap Declare.');
          return;
        } else {
          setActionError(`Group all cards into melds except the 1 card to discard (${ungrouped.length} ungrouped).`);
          return;
        }
      }
    }

    const melds = buildMeldsFromGrouping(declareCards);
    const { isValid: localValid, reason: localReason } = validateDeclaration(declareCards, melds);

    if (!localValid) {
      Alert.alert(
        'Invalid hand',
        `${localReason}\n\nDeclaring anyway will give you a ${config.midScootPoints}-point penalty.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Declare anyway', style: 'destructive',
            onPress: async () => {
              setIsActing(true);
              try {
                const result = await declareOnline(roomId, user.id, melds, declareCards);
                if (result.error) setActionError(result.error);
                else if (result.penalized) setActionError(result.reason);
              } catch {
                setActionError('Failed to declare. Try again.');
              } finally {
                setIsActing(false);
              }
            },
          },
        ]
      );
      return;
    }

    setIsActing(true);
    try {
      const result = await declareOnline(roomId, user.id, melds, declareCards);
      if (result.error) setActionError(result.error);
      else if (!result.isValid) setActionError(result.reason);
    } catch {
      setActionError('Failed to declare. Try again.');
    } finally {
      setIsActing(false);
    }
  }, [handCards, selectedCards, cardGroupMap, buildMeldsFromGrouping, user, roomId, isActing, isMyTurn, config.midScootPoints]);

  // ── Local actions ─────────────────────────────────────────────────────────

  const handleDrawStock = (): void => {
    if (!isMyTurn || turnPhase !== 'draw') return;
    setGameState(prev => drawFromStock(prev));
    setActionError('');
  };

  const handleDrawDiscard = (): void => {
    if (!isMyTurn || turnPhase !== 'draw' || !topDiscard) return;
    if (topDiscard.isJoker) {
      if (!config.allowJokerFromDiscard) {
        setActionError('Joker cannot be taken from the discard pile.');
        return;
      }
      if (!canPickJokerFromDiscard(topDiscard, handCards)) {
        setActionError('Joker can only be taken if it completes a pure sequence in your hand.');
        return;
      }
    }
    setGameState(prev => drawFromDiscard(prev));
    setActionError('');
  };

  const handleDiscard = (): void => {
    if (!isMyTurn || turnPhase !== 'discard') return;
    if (selectedCards.size !== 1) { setActionError('Select 1 card to discard.'); return; }
    const cardId = Array.from(selectedCards)[0];
    setSelectedCards(new Set());
    setActionError('');
    setGameState(prev => discardCard(prev, cardId));
  };

  const handleDeclare = (): void => {
    if (!isMyTurn) return;
    let declareCards = handCards;
    if (handCards.length === 14) {
      if (selectedCards.size === 1) {
        const selId = Array.from(selectedCards)[0];
        declareCards = handCards.filter(c => c.id !== selId);
      } else {
        const ungrouped = handCards.filter(c => !cardGroupMap[c.id]);
        if (ungrouped.length === 1) {
          declareCards = handCards.filter(c => c.id !== ungrouped[0].id);
        } else {
          setActionError('Select the card to discard, then declare.');
          return;
        }
      }
    }
    const melds = buildMeldsFromGrouping(declareCards);
    const { isValid, reason } = validateDeclaration(declareCards, melds);
    if (!isValid) { setActionError(reason); return; }
    setShowScoreModal(true);
  };

  const handleScoot = (): void => {
    if (!isMyTurn) return;
    const isFirst = turnPhase === 'draw';
    const pts = isFirst ? config.firstScootPoints : config.midScootPoints;
    Alert.alert('Drop hand?', `${pts} points for ${isFirst ? 'first' : 'mid'} drop.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Drop', style: 'destructive',
        onPress: () => {
          setGameState(prev => scoot(prev, config));
          setCardGroupMap({}); setGroupOrder([]); setSelectedCards(new Set());
        },
      },
    ]);
  };

  const handleOpponentTurn = (): void => {
    if (isMyTurn || gameState.isGameOver) return;
    let state = drawFromStock(gameState);
    const p = state.players[state.currentPlayerIndex];
    const last = p.hand[p.hand.length - 1];
    state = discardCard(state, last.id);
    setGameState(state);
  };

  const handleNewGame = (): void => {
    setGameState(initRummyGame(['player1', 'player2'], ['You', 'Opponent'], localConfig));
    setCardGroupMap({}); setGroupOrder([]); setSelectedCards(new Set()); setActionError('');
  };

  // ── Dispatchers ───────────────────────────────────────────────────────────

  const onDrawStock = isOnline ? handleDrawStockOnline : handleDrawStock;
  const onDrawDiscard = isOnline ? handleDrawDiscardOnline : handleDrawDiscard;
  const onDiscard = isOnline ? () => handleDiscardOnline() : handleDiscard;
  const onDeclare = isOnline ? handleDeclareOnline : handleDeclare;
  const onScoot = isOnline ? handleScootOnline : handleScoot;

  // ── Render helpers ────────────────────────────────────────────────────────

  const getGroupBorderColor = (groupId: string | null): string => {
    if (!groupId) return 'transparent';
    const cards = handCards.filter(c => cardGroupMap[c.id] === groupId);
    if (cards.length < 2) return COLOURS.BORDER_STRONG;
    const { type } = getMeldLabel(cards);
    if (type === 'pure_life') return '#D4AF37';
    if (type === 'second_life') return '#00BCD4';
    if (type === 'set') return '#9C27B0';
    if (type === 'invalid') return COLOURS.ERROR;
    return COLOURS.BORDER_STRONG;
  };

  const renderGroupLabel = (item: IDisplayItem): React.JSX.Element => {
    if (!item.groupId || !item.isFirstInGroup) {
      return <View style={styles.labelSlot} />;
    }
    const groupCards = handCards.filter(c => cardGroupMap[c.id] === item.groupId);
    const { label, color } = getMeldLabel(groupCards);
    if (!label) return <View style={styles.labelSlot} />;
    return (
      <View style={[styles.labelSlot, styles.labelBadge, { backgroundColor: color + '33' }]}>
        <Text style={[styles.labelText, { color }]} numberOfLines={1}>{label}</Text>
      </View>
    );
  };

  const renderCard = (item: IDisplayItem): React.JSX.Element => {
    const { card, groupId } = item;
    const isSelected = selectedCards.has(card.id);
    // Printed jokers (id starts with 'joker_') always show as ★ regardless of closed joker mode.
    // Wild-joker-rank cards reveal only when the player personally has a pure sequence.
    const isPrinted = card.id.startsWith('joker_');
    const revealAsJoker = isPrinted || (card.isJoker && (config.jokerType !== 'closed' || hasPureSequence));
    const colour = revealAsJoker ? '#D4AF37' : getSuitColour(card.suit);
    const groupBorder = getGroupBorderColor(groupId);
    const isFaceCard = !revealAsJoker && (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K');
    const suitSym = revealAsJoker ? '★' : getSuitSymbol(card.suit);
    const rankLabel = revealAsJoker ? '★' : card.rank;
    return (
      <TouchableOpacity
        key={card.id}
        style={[
          styles.card,
          isSelected && styles.cardSelected,
          groupId ? { borderColor: groupBorder, borderWidth: 2 } : undefined,
        ]}
        onPress={() => handleCardTap(card)}
        activeOpacity={0.85}
        accessibilityLabel={revealAsJoker ? 'Joker card' : `${card.rank} of ${card.suit}`}
      >
        {/* Top-left corner decorator */}
        <View style={styles.cardCornerTL}>
          <Text style={[styles.cardCornerRank, { color: colour }]} numberOfLines={1}>{rankLabel}</Text>
          <Text style={[styles.cardCornerSuit, { color: colour }]}>{suitSym}</Text>
        </View>
        {/* Centre: large pip for number cards, circled letter for J/Q/K, gold star for joker */}
        {revealAsJoker ? (
          <Text style={styles.cardJokerStar}>★</Text>
        ) : isFaceCard ? (
          <View style={[styles.cardFaceCircle, { borderColor: colour + '50' }]}>
            <Text style={[styles.cardFaceLetter, { color: colour }]}>{card.rank}</Text>
          </View>
        ) : (
          <Text style={[styles.cardCenterPip, { color: colour }]}>{suitSym}</Text>
        )}
        {/* Bottom-right corner decorator — rotated 180° */}
        <View style={[styles.cardCornerBR, { transform: [{ rotate: '180deg' }] }]}>
          <Text style={[styles.cardCornerRank, { color: colour }]} numberOfLines={1}>{rankLabel}</Text>
          <Text style={[styles.cardCornerSuit, { color: colour }]}>{suitSym}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  /** Professional card back — shown in show phase after submitting melds, and on opponent mini-cards */
  const renderCardBack = (): React.JSX.Element => (
    <View style={[styles.card, styles.cardBackFace]}>
      <View style={styles.cardBackFrame}>
        <View style={styles.cardBackGrid}>
          {Array.from({ length: 15 }).map((_, idx) => (
            <View key={idx} style={styles.cardBackDiamond} />
          ))}
        </View>
        <View style={styles.cardBackEmblemWrap}>
          <Text style={styles.cardBackEmblemText}>✦</Text>
        </View>
      </View>
    </View>
  );

  const renderOpponent = (opp: IOpponent, size: 'normal' | 'side' = 'normal'): React.JSX.Element => {
    const isTurn = onlineRoom?.current_player_index === opp.index;
    const cardCount = opp.score?.handCount ?? 13;
    const pts = opp.score?.points ?? 0;
    const isElim = opp.score?.isEliminated ?? false;
    const isDealer = isOnline && opp.index === dealerIndex;
    const isStarter = isOnline && opp.index === starterIndex;
    return (
      <View key={opp.id} style={[
        size === 'side' ? styles.sideOpponent : styles.topOpponent,
        isTurn && !isElim && styles.oppActive,
        isElim && styles.oppEliminated,
      ]}>
        <View style={styles.oppNameRow}>
          <View style={[styles.turnDot, isTurn && !isElim && styles.turnDotActive]} />
          <Text style={[styles.oppName, isTurn && !isElim && styles.oppNameActive]} numberOfLines={1}>
            {opp.name}
          </Text>
          {isDealer && <View style={styles.dealerBadge}><Text style={styles.dealerBadgeText}>D</Text></View>}
          {isStarter && <View style={styles.starterBadge}><Text style={styles.starterBadgeText}>S</Text></View>}
          {isElim && <View style={styles.elimBadge}><Text style={styles.elimBadgeText}>ELIM</Text></View>}
        </View>
        <View style={styles.oppStatsRow}>
          <Text style={styles.oppPts}>{pts}pts</Text>
          {!isElim && <Text style={styles.oppCards}>{cardCount}🂠</Text>}
        </View>
        {!isElim && (
          <View style={styles.faceDownRow}>
            {Array.from({ length: Math.min(cardCount, 7) }).map((_, i) => (
              <View key={i} style={[styles.faceDownCard, { zIndex: i, marginLeft: i === 0 ? 0 : -10 }]} />
            ))}
          </View>
        )}
      {/* Turn timer badge — bottom-right corner of this panel */}
      {isTurn && !isElim && timeLeft !== null && timeLeft > 0 && (
        <View style={[styles.playerTimerBadge, timeLeft <= 10 && styles.playerTimerBadgeWarn]}>
          <Text style={[styles.playerTimerText, timeLeft <= 10 && styles.playerTimerTextWarn]}>
            {timeLeft}s
          </Text>
        </View>
      )}
      </View>
    );
  };

  // ── Loading / error screens ───────────────────────────────────────────────

  if (isOnline && isLoadingOnline) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centred}>
          <ActivityIndicator size="large" color="#69F0AE" />
          <Text style={styles.loadingText}>Loading table...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isOnline && onlineError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centred}>
          <Text style={styles.errorText}>{onlineError}</Text>
          <TouchableOpacity
            style={styles.errorBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Text style={styles.errorBtnText}>Back to lobby</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  const hasSelectedGrouped = Array.from(selectedCards).some(id => cardGroupMap[id]);
  const isInActivePlay = turnPhase === 'draw' || turnPhase === 'discard';
  // After submitting show melds, flip own cards face-down so hand is "locked in"
  const showSubmittedBack = isOnline && turnPhase === 'showing' && hasSubmittedShow;
  const canDiscard = isMyTurn && turnPhase === 'discard' && selectedCards.size === 1;
  const canDeclare = isMyTurn && groupOrder.length >= 2 && isInActivePlay && !myIsEliminated;

  // The card that shows a floating Discard/Group button directly above it
  // — single selection in discard phase → Discard button
  // — multi-selection → Group button on the last selected card in display order
  const floatingActionCardId: string | null = (() => {
    if (selectedCards.size === 0) return null;
    if (selectedCards.size === 1 && canDiscard) return Array.from(selectedCards)[0];
    if (selectedCards.size >= 2) {
      const allItems = [...row1, ...row2, ...row3];
      for (let i = allItems.length - 1; i >= 0; i--) {
        if (selectedCards.has(allItems[i].card.id)) return allItems[i].card.id;
      }
    }
    return null;
  })();

  const turnLabel = isMyTurn && isInActivePlay
    ? (turnPhase === 'draw' ? 'Draw a card' : 'Discard a card')
    : (isOnline
      ? `${playerNames[onlineRoom?.current_player_index ?? 0] ?? 'Opponent'}\'s turn`
      : "Opponent's turn");

  // Joker display values — used in top bar
  const jokerBarColor = jokerDisplay
    ? (jokerDisplay.isJoker ? '#D4AF37' : getSuitColour(jokerDisplay.suit))
    : '#A5D6A7';
  const jokerBarText = jokerDisplay
    ? (jokerDisplay.isJoker ? '★' : `${jokerDisplay.rank}${getSuitSymbol(jokerDisplay.suit)}`)
    : (config.jokerType === 'closed' && !hasPureSequence ? '?' : '—');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.table}>

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Leave table"
          >
            <Text style={styles.topBarLeave}>✕</Text>
          </TouchableOpacity>
          <View style={styles.topBarCentre}>
            <Text style={styles.topBarTitle}>{variantLabel} Rummy</Text>
            <View style={styles.topBarJokerPill}>
              <Text style={styles.topBarJokerLabel}>J</Text>
              <Text style={[styles.topBarJokerValue, { color: jokerBarColor }]}>{jokerBarText}</Text>
            </View>
          </View>
          {!isOnline ? (
            <TouchableOpacity
              style={styles.topBarBtn}
              onPress={handleNewGame}
              accessibilityLabel="New game"
            >
              <Text style={styles.topBarNew}>New</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.topBarBtn} />
          )}
        </View>

        {/* ── Opponent area ────────────────────────────────────────────────── */}
        {isOnline ? (
          <View style={styles.opponentArea}>
            {/* Top row opponents */}
            {seatLayout.topRow.length > 0 && (
              <View style={styles.topOpponentRow}>
                {seatLayout.topRow.map(opp => renderOpponent(opp, 'normal'))}
              </View>
            )}
            {/* Left / right opponents OR centered for 2p */}
            {(seatLayout.left || seatLayout.right || seatLayout.topRow.length > 0) && (
              seatLayout.left || seatLayout.right ? (
                <View style={styles.sideOpponentRow}>
                  {seatLayout.left ? renderOpponent(seatLayout.left, 'side') : <View style={styles.sideOpponentPlaceholder} />}
                  {seatLayout.right ? renderOpponent(seatLayout.right, 'side') : <View style={styles.sideOpponentPlaceholder} />}
                </View>
              ) : null
            )}
          </View>
        ) : (
          // Local: single opponent
          <View style={styles.opponentArea}>
            <View style={styles.topOpponentRow}>
              <View style={[styles.topOpponent, !isMyTurn && styles.oppActive]}>
                <View style={styles.oppNameRow}>
                  <View style={[styles.turnDot, !isMyTurn && styles.turnDotActive]} />
                  <Text style={[styles.oppName, !isMyTurn && styles.oppNameActive]}>Opponent</Text>
                  <Text style={styles.oppCards}>{localOpponentCardCount}</Text>
                </View>
                <View style={styles.faceDownRow}>
                  {Array.from({ length: Math.min(localOpponentCardCount, 7) }).map((_, i) => (
                    <View key={i} style={[styles.faceDownCard, { marginLeft: i === 0 ? 0 : -10 }]} />
                  ))}
                </View>
                {!isMyTurn && (
                  <TouchableOpacity
                    style={styles.oppPlayBtn}
                    onPress={handleOpponentTurn}
                    accessibilityLabel="Play opponent's turn"
                  >
                    <Text style={styles.oppPlayText}>Play →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ── Centre area ──────────────────────────────────────────────────── */}
        <View style={styles.centreArea}>

          {/* Turn label + action error */}
          <View style={styles.turnBox}>
            {isActing ? (
              <ActivityIndicator size="small" color="#69F0AE" />
            ) : (
              <Text style={[styles.turnLabel, isMyTurn && styles.turnLabelActive]}>
                {turnLabel}
              </Text>
            )}
            {actionError ? (
              <Text style={styles.actionError} numberOfLines={2}>{actionError}</Text>
            ) : null}
          </View>

          {/* Piles row */}
          <View style={styles.pilesRow}>
            {/* Stock */}
            <TouchableOpacity
              style={[styles.pile, (!isMyTurn || turnPhase !== 'draw') && styles.pileInactive]}
              onPress={onDrawStock}
              disabled={isActing}
              accessibilityLabel="Draw from stock"
            >
              <View style={styles.cardBack}>
                <Text style={styles.cardBackText}>✦</Text>
              </View>
              <Text style={styles.pileLabel}>Stock</Text>
            </TouchableOpacity>

            {/* View discard pile button */}
            <TouchableOpacity
              style={styles.viewPileBtn}
              onPress={() => setShowDiscardModal(true)}
              accessibilityLabel="View discard pile"
            >
              <Text style={styles.viewPileBtnText}>View{'\n'}Pile</Text>
              <Text style={styles.viewPileCount}>{discardPileArr.length}</Text>
            </TouchableOpacity>

            {/* Top of discard — tap to draw */}
            {(() => {
              // Closed joker: hide wild-joker-rank cards until player has pure sequence.
              // Printed jokers (id starts with 'joker_') always show as ★ — never masked.
              const discardIsHiddenJoker = topDiscard?.isJoker &&
                !topDiscard?.id.startsWith('joker_') &&
                config.jokerType === 'closed' && !hasPureSequence;
              const discardColour = discardIsHiddenJoker
                ? getSuitColour(topDiscard!.suit)
                : (topDiscard?.isJoker ? '#D4AF37' : getSuitColour(topDiscard?.suit ?? 'spades'));
              return (
                <TouchableOpacity
                  style={[styles.pile, (!isMyTurn || turnPhase !== 'draw') && styles.pileInactive]}
                  onPress={onDrawDiscard}
                  disabled={isActing}
                  accessibilityLabel="Draw from discard pile"
                >
                  {topDiscard ? (
                    <View style={styles.discardCard}>
                      <Text style={[styles.discardRank, { color: discardColour }]}>
                        {discardIsHiddenJoker ? topDiscard.rank : (topDiscard.isJoker ? '★' : topDiscard.rank)}
                      </Text>
                      {(!topDiscard.isJoker || discardIsHiddenJoker) && (
                        <Text style={[styles.discardSuit, { color: discardColour }]}>
                          {getSuitSymbol(topDiscard.suit)}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.emptyPile}>Empty</Text>
                  )}
                  <Text style={styles.pileLabel}>Discard</Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        </View>

        {/* ── Player hand header — fixed outside scroll area ───────────────── */}
        <View style={styles.handHeaderWrap}>
          <View style={styles.handHeader}>
            <View style={[styles.turnDot, isMyTurn && !myIsEliminated && styles.turnDotActive]} />
            <Text style={styles.myName}>{myName}</Text>
            {isOnline && myPlayerIndex === dealerIndex && (
              <View style={styles.dealerBadge}><Text style={styles.dealerBadgeText}>D</Text></View>
            )}
            {isOnline && myPlayerIndex === starterIndex && !myIsEliminated && (
              <View style={styles.starterBadge}><Text style={styles.starterBadgeText}>S</Text></View>
            )}
            {myIsEliminated && (
              <View style={styles.elimBadge}><Text style={styles.elimBadgeText}>ELIM</Text></View>
            )}
            {isOnline && (
              <Text style={styles.myPts}>
                {playerScores.find(s => s.id === user?.id)?.points ?? 0}pts
              </Text>
            )}
            {!myIsEliminated && (
              <>
                <Text style={styles.myCardCount}>
                  {handCards.length}🂠
                  {selectedCards.size > 0 ? ` · ${selectedCards.size} sel` : ''}
                </Text>
                <Text style={styles.handDeadwoodPts}>{handDeadwoodPoints}pts</Text>
              </>
            )}
          </View>
          {/* My turn timer badge — bottom-right of hand header */}
          {isMyTurn && timeLeft !== null && timeLeft > 0 && (
            <View style={[styles.playerTimerBadge, timeLeft <= 10 && styles.playerTimerBadgeWarn]}>
              <Text style={[styles.playerTimerText, timeLeft <= 10 && styles.playerTimerTextWarn]}>
                {timeLeft}s
              </Text>
            </View>
          )}
        </View>

        {/* ── Player hand ──────────────────────────────────────────────────── */}
        <View style={styles.handArea}>
          {jokerSeenMsg ? (
            <View style={styles.jokerSeenBanner}>
              <Text style={styles.jokerSeenText}>{jokerSeenMsg}</Text>
            </View>
          ) : null}

          {/* Eliminated overlay */}
          {myIsEliminated && (
            <View style={styles.eliminatedOverlay}>
              <Text style={styles.eliminatedText}>You are eliminated</Text>
              <Text style={styles.eliminatedSubtext}>You can watch the rest of the game</Text>
            </View>
          )}

          {/* Rows 1-3: floating Discard/Group button appears above the target card */}
          {([ [row1, row1Lefts], [row2, row2Lefts], [row3, row3Lefts] ] as [IDisplayItem[], number[]][]).map(([items, lefts], rowIdx) =>
            items.length > 0 ? (
              <View key={rowIdx} style={styles.cardRow}>
                {items.map((item, i) => {
                  const isFloatingTarget = item.card.id === floatingActionCardId;
                  const showFloatDiscard = isFloatingTarget && selectedCards.size === 1 && canDiscard;
                  const showFloatGroup = isFloatingTarget && selectedCards.size >= 2;
                  return (
                    <View
                      key={item.card.id}
                      style={[
                        styles.cardColumnAbs,
                        { left: lefts[i], zIndex: isFloatingTarget ? 9999 : i },
                      ]}
                    >
                      {renderGroupLabel(item)}
                      {showSubmittedBack ? renderCardBack() : renderCard(item)}
                      {!showSubmittedBack && (showFloatDiscard || showFloatGroup) && (
                        <TouchableOpacity
                          style={styles.floatingActionBtn}
                          onPress={showFloatDiscard ? onDiscard : handleGroup}
                          disabled={isActing}
                          accessibilityLabel={showFloatDiscard ? 'Discard selected card' : 'Group selected cards'}
                        >
                          <Text style={styles.floatingActionText}>
                            {showFloatDiscard ? '↓ Discard' : '+ Group'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : null
          )}
        </View>

        {/* ── Show phase banner ────────────────────────────────────────────── */}
        {turnPhase === 'showing' && (
          <View style={styles.showPhaseBanner}>
            <Text style={styles.showPhaseTitle} numberOfLines={1}>
              {declarerName ? `${declarerName} declared!` : hasSubmittedShow ? 'Show Phase — waiting…' : 'Show Phase'}
            </Text>
            {showTimeLeft !== null && showTimeLeft > 0 && (
              <Text style={[styles.showPhaseTimer, showTimeLeft <= 10 && styles.showPhaseTimerWarn]}>
                {showTimeLeft}s
              </Text>
            )}
            {!hasSubmittedShow && (
              <TouchableOpacity
                style={styles.showPhaseSubmitBtn}
                onPress={handleShowTimerExpiry}
                accessibilityLabel="Submit show melds"
              >
                <Text style={styles.showPhaseSubmitText}>Submit</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Action bar ───────────────────────────────────────────────────── */}
        {/* Discard and Group are now floating above the selected card.
            Action bar shows: Drop · Ungroup · Clear · Declare */}
        <View style={styles.actionBar}>
          {/* Drop */}
          {isMyTurn && isInActivePlay && !myIsEliminated && (
            <TouchableOpacity
              style={[styles.chip, styles.chipDanger]}
              onPress={onScoot}
              disabled={isActing}
              accessibilityLabel="Drop hand"
            >
              <Text style={styles.chipTextDanger}>Drop</Text>
            </TouchableOpacity>
          )}

          {/* Ungroup — stays in action bar */}
          {hasSelectedGrouped && (
            <TouchableOpacity
              style={[styles.chip, styles.chipNeutral]}
              onPress={handleUngroup}
              accessibilityLabel="Ungroup selected cards"
            >
              <Text style={styles.chipText}>Ungroup</Text>
            </TouchableOpacity>
          )}

          {/* Clear selection */}
          {selectedCards.size > 0 && (
            <TouchableOpacity
              style={[styles.chip, styles.chipGhost]}
              onPress={handleClearSelection}
              accessibilityLabel="Clear selection"
            >
              <Text style={styles.chipTextGhost}>Clear</Text>
            </TouchableOpacity>
          )}

          {/* Declare — stays in action bar */}
          {canDeclare && (
            <TouchableOpacity
              style={[styles.chip, styles.chipSuccess, isActing && styles.chipDisabled]}
              onPress={onDeclare}
              disabled={isActing}
              accessibilityLabel="Declare winning hand"
            >
              <Text style={styles.chipTextSuccess}>Declare!</Text>
            </TouchableOpacity>
          )}
        </View>

      </View>

      {/* ── Discard pile modal ───────────────────────────────────────────── */}
      <Modal
        visible={showDiscardModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDiscardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Discard Pile ({discardPileArr.length} cards)</Text>
              <TouchableOpacity
                onPress={() => setShowDiscardModal(false)}
                accessibilityLabel="Close discard pile"
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.discardGrid}>
                {[...discardPileArr].reverse().map((card, i) => {
                  // Closed joker: hide wild-joker-rank cards until player has pure sequence.
                  // Printed jokers always show as ★.
                  const hiddenJoker = card.isJoker && !card.id.startsWith('joker_') &&
                    config.jokerType === 'closed' && !hasPureSequence;
                  const col = hiddenJoker ? getSuitColour(card.suit)
                    : (card.isJoker ? '#D4AF37' : getSuitColour(card.suit));
                  return (
                    <View key={`${card.id}_${i}`} style={styles.discardModalCard}>
                      <Text style={[styles.discardModalRank, { color: col }]}>
                        {hiddenJoker ? card.rank : (card.isJoker ? '★' : card.rank)}
                      </Text>
                      {(!card.isJoker || hiddenJoker) && (
                        <Text style={[styles.discardModalSuit, { color: col }]}>
                          {getSuitSymbol(card.suit)}
                        </Text>
                      )}
                      {card.droppedBy && (
                        <Text style={styles.discardModalBy} numberOfLines={1}>
                          {card.droppedBy}
                        </Text>
                      )}
                    </View>
                  );
                })}
                {discardPileArr.length === 0 && (
                  <Text style={styles.emptyPileText}>No cards discarded yet</Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Score modal — round end (auto-advances) or game over ────────── */}
      <Modal
        visible={showScoreModal}
        transparent
        animationType="fade"
        onRequestClose={() => isGameOver && setShowScoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.scoreSheet}>
            {/* Title */}
            {isGameOver ? (
              <Text style={styles.scoreTitle}>
                {scoreRows.find(r => r.isWinner)?.id === (user?.id ?? 'player1')
                  ? '🏆 You Won!'
                  : `${scoreRows.find(r => r.isWinner)?.name ?? 'Someone'} Wins`}
              </Text>
            ) : (
              <View style={styles.scoreTitleRow}>
                <Text style={styles.scoreTitle}>Round {onlineRoom?.deal_number ?? 1} Over</Text>
                {roundEndTimeLeft !== null && roundEndTimeLeft > 0 && (
                  <Text style={styles.scoreCountdown}>Next round in {roundEndTimeLeft}s</Text>
                )}
              </View>
            )}

            {/* Round winner callout (for non-game-over rounds) */}
            {!isGameOver && scoreRows.find(r => r.isWinner) && (
              <Text style={styles.scoreRoundWinner}>
                ★ {scoreRows.find(r => r.isWinner)!.name} declared
              </Text>
            )}

            {/* Header row */}
            <View style={styles.scoreHeaderRow}>
              <Text style={[styles.scoreHeaderCell, { flex: 2 }]}>Player</Text>
              <Text style={styles.scoreHeaderCell}>This Round</Text>
              <Text style={styles.scoreHeaderCell}>Total</Text>
            </View>

            {/* Data rows */}
            {scoreRows.map((row) => (
              <View
                key={row.id}
                style={[
                  styles.scoreDataRow,
                  row.isWinner && styles.scoreDataRowWinner,
                  row.isEliminated && styles.scoreDataRowElim,
                ]}
              >
                <View style={[styles.scoreDataCellFlex]}>
                  <Text
                    style={[styles.scoreDataCell, row.isWinner && styles.scoreCellWinner, row.isEliminated && styles.scoreCellElim]}
                    numberOfLines={1}
                  >
                    {row.isWinner ? '★ ' : ''}{row.name}
                  </Text>
                  {row.isEliminated && (
                    <View style={styles.elimBadge}><Text style={styles.elimBadgeText}>ELIM</Text></View>
                  )}
                </View>
                <Text style={[styles.scoreDataCell, row.roundPts === 0 && styles.scoreCellZero]}>
                  {row.roundPts}
                </Text>
                <Text style={[styles.scoreDataCell, styles.scoreCellTotal]}>
                  {row.totalPts}
                </Text>
              </View>
            ))}

            {/* Actions */}
            <TouchableOpacity
              style={styles.scoreBackBtn}
              onPress={() => { setShowScoreModal(false); navigation.navigate('RummyHome'); }}
              accessibilityLabel="Back to lobby"
            >
              <Text style={styles.scoreBackBtnText}>Leave Table</Text>
            </TouchableOpacity>

            {!isOnline && (
              <TouchableOpacity
                style={styles.scoreNewGameBtn}
                onPress={() => { setShowScoreModal(false); handleNewGame(); }}
                accessibilityLabel="Play again"
              >
                <Text style={styles.scoreNewGameText}>Play Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: TABLE },
  table: { flex: 1, backgroundColor: TABLE },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#E8F5E9', fontSize: 14 },
  errorText: { color: '#FFCDD2', fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  errorBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
  errorBtnText: { color: '#E8F5E9', fontSize: 14, fontWeight: '600' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topBarBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topBarLeave: { color: '#E8F5E9', fontSize: 18, fontWeight: '600' },
  topBarCentre: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  topBarTitle: { color: '#E8F5E9', fontSize: 15, fontWeight: '700' },
  topBarJokerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  topBarJokerLabel: { color: '#555570', fontSize: 11, fontWeight: '600' },
  topBarJokerValue: { fontSize: 13, fontWeight: '800' },
  // Player turn timer badge — absolutely positioned on active player's panel
  playerTimerBadge: {
    position: 'absolute',
    bottom: -8,
    right: -6,
    backgroundColor: '#1B5E20',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: '#69F0AE',
    zIndex: 10,
  },
  playerTimerBadgeWarn: {
    borderColor: '#FF7043',
    backgroundColor: '#3E1A0A',
  },
  playerTimerText: { color: '#69F0AE', fontSize: 12, fontWeight: '800', fontFamily: 'monospace' },
  playerTimerTextWarn: { color: '#FF7043' },
  topBarNew: { color: '#D4AF37', fontSize: 14, fontWeight: '600' },

  // Opponents
  opponentArea: { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  topOpponentRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
  sideOpponentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 0 },
  sideOpponentPlaceholder: { flex: 1 },
  topOpponent: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    padding: 8,
    minWidth: 100,
    maxWidth: 160,
  },
  sideOpponent: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    padding: 8,
    minWidth: 90,
    maxWidth: 140,
  },
  oppActive: {
    borderColor: '#D4AF37',
    borderWidth: 1.5,
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  oppNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  oppName: { color: '#E8F5E9', fontSize: 12, fontWeight: '600', flex: 1 },
  oppNameActive: { color: '#D4AF37' },
  oppStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  oppPts: { color: '#D4AF37', fontSize: 11, fontWeight: '700' },
  oppCards: { color: '#A5D6A7', fontSize: 11 },
  faceDownRow: { flexDirection: 'row', height: 28 },
  faceDownCard: {
    width: 20,
    height: 28,
    borderRadius: 3,
    backgroundColor: CARD_BACK,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
  },
  oppPlayBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-end',
  },
  oppPlayText: { color: '#E8F5E9', fontSize: 12, fontWeight: '600' },

  // Centre
  centreArea: {
    backgroundColor: TABLE_MID,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  turnBox: { alignItems: 'center' },
  turnLabel: { color: '#A5D6A7', fontSize: 13, fontWeight: '500', textAlign: 'center' },
  turnLabelActive: { color: '#69F0AE', fontWeight: '700' },
  actionError: { color: '#FF8A80', fontSize: 11, textAlign: 'center', marginTop: 2, lineHeight: 16 },
  pilesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  pile: {
    alignItems: 'center',
    gap: 4,
    opacity: 1,
  },
  pileInactive: { opacity: 0.45 },
  cardBack: {
    width: 44,
    height: 62,
    backgroundColor: CARD_BACK,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackText: { fontSize: 18, color: '#D4AF37' },
  discardCard: {
    width: 44,
    height: 62,
    backgroundColor: '#FAFAFA',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  discardRank: { fontSize: 14, fontWeight: '800' },
  discardSuit: { fontSize: 14 },
  emptyPile: { color: '#A5D6A7', fontSize: 11 },
  pileLabel: { color: '#A5D6A7', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  viewPileBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    padding: 8,
    minWidth: 52,
  },
  viewPileBtnText: { color: '#A5D6A7', fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 16 },
  viewPileCount: { color: '#69F0AE', fontSize: 13, fontWeight: '700' },

  // Hand
  handHeaderWrap: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    position: 'relative',
  },
  handArea: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 2,
    flex: 1,
    justifyContent: 'flex-end',
  },
  jokerSeenBanner: {
    backgroundColor: 'rgba(212,175,55,0.2)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'center',
    marginBottom: 4,
  },
  jokerSeenText: { color: '#D4AF37', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  handHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  myName: { color: '#E8F5E9', fontSize: 12, fontWeight: '600', flex: 1 },
  myPts: { color: '#D4AF37', fontSize: 11, fontWeight: '700' },
  myCardCount: { color: '#A5D6A7', fontSize: 11 },
  // Absolute-positioned card row — fixed height so absolutely-placed children don't collapse parent
  cardRow: { height: ROW_H, overflow: 'visible', marginBottom: 2, position: 'relative' },
  // Each card column is absolutely positioned within the row
  cardColumnAbs: {
    position: 'absolute',
    top: 0,
    width: CARD_W,
    overflow: 'visible',
    alignItems: 'flex-start',
  },
  labelSlot: {
    width: CARD_W,
    height: LABEL_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    overflow: 'hidden',
  },
  labelBadge: {
    paddingHorizontal: 2,
  },
  labelText: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: '#FAFAFA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSelected: {
    transform: [{ translateY: -16 }],
    borderColor: '#FFD600',
    borderWidth: 2.5,
    shadowColor: '#FFD600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    // No elevation — preserves natural stacking so selected card doesn't jump to front
  },
  // Card face: corner decorators (absolute) + centre content
  cardCornerTL: {
    position: 'absolute',
    top: 3,
    left: 3,
    alignItems: 'center',
  },
  cardCornerBR: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    alignItems: 'center',
  },
  cardCornerRank: { fontSize: 15, fontWeight: '800', lineHeight: 17 },
  cardCornerSuit: { fontSize: 13, lineHeight: 14 },
  cardCenterPip: { fontSize: 30, lineHeight: 34 },
  cardFaceCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFaceLetter: { fontSize: 20, fontWeight: '900', lineHeight: 22 },
  cardJokerStar: { fontSize: 30, color: '#D4AF37', lineHeight: 34 },
  // Professional card back
  cardBackFace: {
    backgroundColor: CARD_BACK,
    borderColor: 'rgba(212,175,55,0.55)',
    borderWidth: 1.5,
  },
  cardBackFrame: {
    width: CARD_W - 10,
    height: CARD_H - 10,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 3,
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackDiamond: {
    width: 7,
    height: 7,
    backgroundColor: 'rgba(212,175,55,0.22)',
    transform: [{ rotate: '45deg' }],
  },
  cardBackEmblemWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD_BACK,
    borderRadius: 8,
    padding: 3,
  },
  cardBackEmblemText: { fontSize: 14, color: '#D4AF37', fontWeight: '700' },

  // Turn dot
  turnDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4CAF50' },
  turnDotActive: { backgroundColor: '#69F0AE', shadowColor: '#69F0AE', shadowOpacity: 0.8, shadowRadius: 3, elevation: 3 },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    height: 52,  // fixed — prevents layout shift when chips appear/disappear
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipDanger: { backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: '#EF4444' },
  chipNeutral: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  chipGhost: { backgroundColor: 'transparent' },
  chipPrimary: { backgroundColor: '#D4AF37' },
  chipSuccess: { backgroundColor: '#22C55E' },
  chipDisabled: { opacity: 0.4 },
  chipText: { color: '#E8F5E9', fontSize: 13, fontWeight: '600' },
  chipTextDanger: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  chipTextGhost: { color: '#A5D6A7', fontSize: 13, fontWeight: '500' },
  chipTextPrimary: { color: '#0A0A0F', fontSize: 13, fontWeight: '700' },
  chipTextSuccess: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // Discard pile modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLOURS.SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLOURS.BORDER,
  },
  modalTitle: { color: COLOURS.TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
  modalClose: { color: COLOURS.TEXT_SECONDARY, fontSize: 20, padding: 4 },
  modalContent: { paddingHorizontal: 16, paddingVertical: 16 },
  discardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  discardModalCard: {
    width: 42,
    height: 58,
    backgroundColor: '#FAFAFA',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  discardModalRank: { fontSize: 12, fontWeight: '800' },
  discardModalSuit: { fontSize: 12 },
  emptyPileText: { color: COLOURS.TEXT_MUTED, fontSize: 14, textAlign: 'center', paddingVertical: 24, width: '100%' },

  // Score modal
  scoreSheet: {
    backgroundColor: COLOURS.SURFACE_ELEVATED,
    borderRadius: 16,
    marginHorizontal: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 0,
    borderWidth: 1,
    borderColor: COLOURS.BORDER_STRONG,
  },
  scoreTitle: {
    color: '#D4AF37',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    flex: 1,
  },
  scoreHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLOURS.BORDER,
    marginBottom: 4,
  },
  scoreHeaderCell: {
    flex: 1,
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  scoreDataRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLOURS.BORDER,
  },
  scoreDataRowWinner: {
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderRadius: 6,
  },
  scoreDataCell: {
    flex: 1,
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  scoreCellWinner: { color: '#D4AF37', fontWeight: '700' },
  scoreCellZero: { color: '#22C55E', fontWeight: '700' },
  scoreCellTotal: { fontWeight: '800' },
  scoreBackBtn: {
    marginTop: 20,
    backgroundColor: COLOURS.PRIMARY,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scoreBackBtnText: { color: '#0A0A0F', fontSize: 15, fontWeight: '700' },
  scoreNewGameBtn: {
    marginTop: 10,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLOURS.PRIMARY,
  },
  scoreNewGameText: { color: COLOURS.PRIMARY, fontSize: 14, fontWeight: '600' },

  // Show phase banner
  showPhaseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: '#D4AF37',
  },
  showPhaseTitle: { flex: 1, color: '#D4AF37', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  showPhaseTimer: { color: '#E8F5E9', fontSize: 15, fontWeight: '800', fontFamily: 'monospace' },
  showPhaseTimerWarn: { color: '#FF8A80' },
  showPhaseSubmitBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  showPhaseSubmitText: { color: '#0A0A0F', fontSize: 13, fontWeight: '700' },

  // Floating action button (Discard / Group) — appears above the selected card
  floatingActionBtn: {
    position: 'absolute',
    top: -34,
    left: -4,
    backgroundColor: '#D4AF37',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  floatingActionText: { color: '#0A0A0F', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  // Hand deadwood points badge (shown in hand header)
  handDeadwoodPts: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },

  // Discard pile modal — attribution line
  discardModalBy: {
    fontSize: 8,
    color: 'rgba(0,0,0,0.45)',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 1,
    width: '100%',
  },

  // Dealer / Starter / Eliminated badges
  dealerBadge: {
    backgroundColor: '#D4AF37',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 4,
  },
  dealerBadgeText: { color: '#0A0A0F', fontSize: 10, fontWeight: '800' },
  starterBadge: {
    backgroundColor: '#22C55E',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 4,
  },
  starterBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  elimBadge: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 4,
  },
  elimBadgeText: { color: '#EF4444', fontSize: 10, fontWeight: '700' },

  // Opponent panel — eliminated state
  oppEliminated: { opacity: 0.45 },

  // Eliminated overlay (own hand area)
  eliminatedOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 4,
  },
  eliminatedText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  eliminatedSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '400',
  },

  // Score modal — round-end additions
  scoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  scoreCountdown: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  scoreRoundWinner: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  scoreDataRowElim: { opacity: 0.5 },
  scoreCellElim: { color: '#EF4444' },
  scoreDataCellFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});

import { supabase } from '@services/supabase';
import {
  initRummyGame,
  validateDeclaration,
  calculateHandPoints,
  type IRummyConfig,
  DEFAULT_RUMMY_CONFIG,
} from '@services/rummy';
import type { IRummyCard, IMeld, RummyVariant } from '@app-types/game.types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shared room state visible to all players */
export interface IRummyRoom {
  id: string;
  host_id: string;
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  variant: RummyVariant;
  config: IRummyConfig;
  player_ids: string[];
  player_names: string[];
  dealer_index: number;            // index of the dealer; first player is (dealer_index+1)%n
  current_player_index: number;
  turn_phase: 'draw' | 'discard' | 'showing' | 'round_ended';
  discard_pile: IRummyCard[];
  joker_card: IRummyCard | null;
  deal_number: number;
  player_scores: IPlayerScore[];
  winner_id: string | null;       // round winner (cleared at next round start)
  is_game_over: boolean;
  all_hands: Record<string, IRummyCard[]>; // keyed by player UUID
  show_started_at: string | null;          // ISO timestamp when show phase began
  round_ended_at: string | null;           // ISO timestamp when round_ended phase began (30s table)
  created_at: string;
  updated_at: string;
}

/** Per-player score tracking */
export interface IPlayerScore {
  id: string;
  points: number;           // cumulative total across all rounds
  chips: number;
  isEliminated: boolean;
  hasDropped: boolean;
  handCount: number;        // current number of cards in hand
  roundStartPoints: number; // points at the start of this round — used to compute lastRoundPoints
  hasSeenJoker?: boolean;
  lastRoundPoints?: number; // points gained in this round — shown on round-end score table
  hasSubmittedShow?: boolean;
}

/** Private hand data for the current player */
export interface IRummyHand {
  id: string;
  room_id: string;
  player_id: string;
  seat_index: number;
  hand: IRummyCard[];
  melds: IMeld[];
  has_dropped: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generates a 6-character room code */
const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
};

// ─── Room lifecycle ───────────────────────────────────────────────────────────

/** Creates a new Rummy room and returns the room code */
export const createRummyRoom = async (
  hostId: string,
  hostName: string,
  config: IRummyConfig
): Promise<{ roomId: string | null; error: string | null }> => {
  try {
    const roomId = generateRoomCode();
    const { error } = await supabase.from('rummy_rooms').insert({
      id: roomId,
      host_id: hostId,
      status: 'waiting',
      variant: config.variant,
      config,
      player_ids: [hostId],
      player_names: [hostName],
      current_player_index: 0,
      turn_phase: 'draw',
      stock_pile: [],
      discard_pile: [],
      joker_card: null,
      deal_number: 1,
      player_scores: [
        {
          id: hostId,
          points: 0,
          chips: config.variant === 'deals' ? 80 : 0,
          isEliminated: false,
          hasDropped: false,
          handCount: 0,
          roundStartPoints: 0,
        },
      ],
      winner_id: null,
      is_game_over: false,
      show_started_at: null,
      round_ended_at: null,
    });
    if (error) return { roomId: null, error: error.message };
    return { roomId, error: null };
  } catch {
    return { roomId: null, error: 'Failed to create room. Please try again.' };
  }
};

/** Joins an existing Rummy room as a guest */
export const joinRummyRoom = async (
  roomId: string,
  playerId: string,
  playerName: string
): Promise<{ error: string | null }> => {
  try {
    const { data: room, error: fetchError } = await supabase
      .from('rummy_rooms')
      .select('*')
      .eq('id', roomId.toUpperCase())
      .single();

    if (fetchError || !room) return { error: 'Room not found. Check the code and try again.' };
    if (room.status !== 'waiting') return { error: 'This room is no longer accepting players.' };
    if (room.host_id === playerId) return { error: 'You cannot join your own room.' };

    const playerIds: string[] = room.player_ids ?? [];
    const playerNames: string[] = room.player_names ?? [];
    const config: IRummyConfig = room.config ?? DEFAULT_RUMMY_CONFIG;

    if (playerIds.includes(playerId)) return { error: 'You are already in this room.' };
    if (playerIds.length >= config.playerCount) return { error: 'This room is full.' };

    const newPlayerIds = [...playerIds, playerId];
    const newPlayerNames = [...playerNames, playerName];
    const newScores: IPlayerScore[] = [
      ...(room.player_scores ?? []),
      {
        id: playerId,
        points: 0,
        chips: config.variant === 'deals' ? 80 : 0,
        isEliminated: false,
        hasDropped: false,
        handCount: 0,
        roundStartPoints: 0,
      },
    ];

    const { error: updateError } = await supabase
      .from('rummy_rooms')
      .update({
        player_ids: newPlayerIds,
        player_names: newPlayerNames,
        player_scores: newScores,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId.toUpperCase());

    if (updateError) return { error: updateError.message };
    return { error: null };
  } catch {
    return { error: 'Failed to join room. Please try again.' };
  }
};

/**
 * Quick-play matchmaking: finds an open waiting room for the given variant,
 * or creates a new one if none exist. The caller is added to the room.
 * Both paths resolve to a roomId that can be passed to RummyRoomLobby.
 */
export const findOrCreateQuickPlayRoom = async (
  playerId: string,
  playerName: string,
  variant: RummyVariant
): Promise<{ roomId: string | null; error: string | null }> => {
  try {
    // Look for an open waiting room that matches this variant and still has room
    const { data: openRooms, error: queryError } = await supabase
      .from('rummy_rooms')
      .select('id, player_ids, config, host_id')
      .eq('status', 'waiting')
      .eq('variant', variant)
      .order('created_at', { ascending: true });

    if (queryError) return { roomId: null, error: queryError.message };

    // Find the first room where the player fits and isn't already in it
    const match = (openRooms ?? []).find((r: { id: string; player_ids: string[]; config: IRummyConfig; host_id: string }) => {
      const ids: string[] = r.player_ids ?? [];
      const maxPlayers = (r.config as IRummyConfig)?.playerCount ?? 2;
      return !ids.includes(playerId) && ids.length < maxPlayers;
    });

    if (match) {
      const { error: joinError } = await joinRummyRoom(match.id, playerId, playerName);
      if (joinError) return { roomId: null, error: joinError };
      return { roomId: match.id, error: null };
    }

    // No open room found — create a new one with default config for this variant
    const quickConfig: IRummyConfig = {
      ...DEFAULT_RUMMY_CONFIG,
      variant,
      playerCount: 2,
    };
    const { roomId, error: createError } = await createRummyRoom(playerId, playerName, quickConfig);
    if (createError || !roomId) return { roomId: null, error: createError ?? 'Failed to create room.' };
    return { roomId, error: null };
  } catch {
    return { roomId: null, error: 'Matchmaking failed. Please try again.' };
  }
};

/** Fetches a single Rummy room by ID */
export const getRummyRoom = async (
  roomId: string
): Promise<{ room: IRummyRoom | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('rummy_rooms')
      .select('*')
      .eq('id', roomId.toUpperCase())
      .single();
    if (error) return { room: null, error: error.message };
    return { room: data as IRummyRoom, error: null };
  } catch {
    return { room: null, error: 'Failed to fetch room.' };
  }
};

/** Host starts the game — deals cards to all players */
export const startRummyGame = async (
  roomId: string,
  hostId: string
): Promise<{ error: string | null }> => {
  try {
    const { data: room, error: fetchError } = await supabase
      .from('rummy_rooms')
      .select('*')
      .eq('id', roomId.toUpperCase())
      .single();

    if (fetchError || !room) return { error: 'Room not found.' };
    if (room.host_id !== hostId) return { error: 'Only the host can start the game.' };
    if (room.status !== 'waiting') return { error: 'Game has already started.' };

    const playerIds: string[] = room.player_ids ?? [];
    const playerNames: string[] = room.player_names ?? [];
    const config: IRummyConfig = room.config ?? DEFAULT_RUMMY_CONFIG;

    if (playerIds.length < 2) return { error: 'Need at least 2 players to start.' };

    // Randomly select dealer; first player is dealer+1 (clockwise)
    const dealerIndex = Math.floor(Math.random() * playerIds.length);
    const firstPlayerIndex = (dealerIndex + 1) % playerIds.length;

    // Initialise full game state
    const gameState = initRummyGame(playerIds, playerNames, config);

    // Build shared state (no hands — those go to rummy_hands)
    const playerScores: IPlayerScore[] = gameState.players.map(p => ({
      id: p.id,
      points: 0,
      chips: p.chips,
      isEliminated: false,
      hasDropped: false,
      handCount: 13,
      roundStartPoints: 0, // snapshot at round start — used to compute lastRoundPoints
    }));

    // Build a map of all dealt hands keyed by player UUID.
    // Stored in rummy_rooms.all_hands — the host owns this row so no RLS issue.
    // Each player self-inserts their own rummy_hands row when they arrive at the
    // table (auth.uid() = player_id always passes the INSERT policy).
    const allHands: Record<string, IRummyCard[]> = {};
    gameState.players.forEach((p) => {
      allHands[p.id] = p.hand;
    });

    // Update room to active and store all dealt hands atomically.
    // This fires realtime — hands are already in all_hands before players arrive.
    const { error: updateError } = await supabase
      .from('rummy_rooms')
      .update({
        status: 'active',
        all_hands: allHands,
        dealer_index: dealerIndex,
        stock_pile: gameState.stock,
        discard_pile: gameState.discardPile,
        joker_card: gameState.jokerCard,
        current_player_index: firstPlayerIndex,
        turn_phase: 'draw',
        deal_number: 1,
        player_scores: playerScores,
        show_started_at: null,
        round_ended_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId.toUpperCase());

    if (updateError) return { error: updateError.message };

    return { error: null };
  } catch {
    return { error: 'Failed to start game. Please try again.' };
  }
};

// ─── Realtime ─────────────────────────────────────────────────────────────────

/** Subscribes to real-time updates for a Rummy room */
export const subscribeToRummyRoom = (
  roomId: string,
  onUpdate: (room: IRummyRoom) => void
) => {
  return supabase
    .channel(`rummy_room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rummy_rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => onUpdate(payload.new as IRummyRoom)
    )
    .subscribe();
};

/** Subscribes to updates on this player's private hand */
export const subscribeToMyHand = (
  roomId: string,
  playerId: string,
  onUpdate: (hand: IRummyHand) => void
) => {
  return supabase
    .channel(`rummy_hand:${roomId}:${playerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rummy_hands',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        const updated = payload.new as IRummyHand;
        if (updated.player_id === playerId) {
          onUpdate(updated);
        }
      }
    )
    .subscribe();
};

/** Each player claims their dealt hand — upserts so new rounds overwrite the previous hand */
export const claimMyHand = async (
  roomId: string,
  playerId: string,
  hand: IRummyCard[],
  seatIndex: number
): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase
      .from('rummy_hands')
      .upsert(
        {
          room_id: roomId.toUpperCase(),
          player_id: playerId,
          seat_index: seatIndex,
          hand,
          melds: [],
          has_dropped: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'room_id,player_id' }
      );
    if (error) return { error: error.message };
    return { error: null };
  } catch {
    return { error: 'Failed to claim hand.' };
  }
};

/** Fetches the current player's private hand */
export const getMyHand = async (
  roomId: string,
  playerId: string
): Promise<{ hand: IRummyHand | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('rummy_hands')
      .select('*')
      .eq('room_id', roomId.toUpperCase())
      .eq('player_id', playerId)
      .single();
    if (error) return { hand: null, error: error.message };
    return { hand: data as IRummyHand, error: null };
  } catch {
    return { hand: null, error: 'Failed to fetch hand.' };
  }
};

// ─── Turn actions ─────────────────────────────────────────────────────────────

/** Player draws from the stock pile */
export const drawFromStockOnline = async (
  roomId: string,
  playerId: string
): Promise<{ drawnCard: IRummyCard | null; error: string | null }> => {
  try {
    const { data: room, error: fetchError } = await supabase
      .from('rummy_rooms')
      .select('stock_pile, current_player_index, turn_phase, player_ids')
      .eq('id', roomId.toUpperCase())
      .single();

    if (fetchError || !room) return { drawnCard: null, error: 'Room not found.' };

    const playerIds: string[] = room.player_ids ?? [];
    const myIndex = playerIds.indexOf(playerId);
    if (myIndex !== room.current_player_index) return { drawnCard: null, error: 'Not your turn.' };
    if (room.turn_phase !== 'draw') return { drawnCard: null, error: 'Not the draw phase.' };

    let stock: IRummyCard[] = room.stock_pile ?? [];
    let discardForReshuffle: IRummyCard[] | null = null;

    if (stock.length === 0) {
      // Reshuffle the discard pile (minus the top card) into a new stock
      const { data: discardRoom } = await supabase
        .from('rummy_rooms')
        .select('discard_pile')
        .eq('id', roomId.toUpperCase())
        .single();
      const discard: IRummyCard[] = discardRoom?.discard_pile ?? [];
      if (discard.length <= 1) return { drawnCard: null, error: 'No cards left to draw.' };
      const topCard = discard[discard.length - 1];
      const reshuffled = discard.slice(0, -1)
        .map(c => ({ ...c, droppedBy: undefined })) // clear attribution after reshuffle
        .sort(() => Math.random() - 0.5);
      stock = reshuffled;
      discardForReshuffle = [topCard];
    }

    const drawnCard = stock[0];
    const newStock = stock.slice(1);

    // Fetch player scores to update hand count
    const { data: roomForScores } = await supabase
      .from('rummy_rooms')
      .select('player_scores')
      .eq('id', roomId.toUpperCase())
      .single();
    const updatedScores: IPlayerScore[] = (roomForScores?.player_scores ?? []).map(
      (s: IPlayerScore) => s.id === playerId ? { ...s, handCount: s.handCount + 1 } : s
    );

    // Update stock (and discard if reshuffled) in shared room
    const stockUpdatePayload: Record<string, unknown> = {
      stock_pile: newStock,
      turn_phase: 'discard',
      player_scores: updatedScores,
      updated_at: new Date().toISOString(),
    };
    if (discardForReshuffle !== null) {
      stockUpdatePayload.discard_pile = discardForReshuffle;
    }

    const { error: roomUpdateError } = await supabase
      .from('rummy_rooms')
      .update(stockUpdatePayload)
      .eq('id', roomId.toUpperCase());

    if (roomUpdateError) return { drawnCard: null, error: roomUpdateError.message };

    // Add card to player's hand
    const { data: handData, error: handFetchError } = await supabase
      .from('rummy_hands')
      .select('hand')
      .eq('room_id', roomId.toUpperCase())
      .eq('player_id', playerId)
      .single();

    if (handFetchError || !handData) return { drawnCard: null, error: 'Hand not found.' };

    const newHand: IRummyCard[] = [...(handData.hand ?? []), drawnCard];
    const { error: handUpdateError } = await supabase
      .from('rummy_hands')
      .update({ hand: newHand, updated_at: new Date().toISOString() })
      .eq('room_id', roomId.toUpperCase())
      .eq('player_id', playerId);

    if (handUpdateError) return { drawnCard: null, error: handUpdateError.message };

    return { drawnCard, error: null };
  } catch {
    return { drawnCard: null, error: 'Failed to draw card.' };
  }
};

/** Player draws the top card from the discard pile */
export const drawFromDiscardOnline = async (
  roomId: string,
  playerId: string
): Promise<{ drawnCard: IRummyCard | null; error: string | null }> => {
  try {
    const { data: room, error: fetchError } = await supabase
      .from('rummy_rooms')
      .select('discard_pile, current_player_index, turn_phase, player_ids')
      .eq('id', roomId.toUpperCase())
      .single();

    if (fetchError || !room) return { drawnCard: null, error: 'Room not found.' };

    const playerIds: string[] = room.player_ids ?? [];
    const myIndex = playerIds.indexOf(playerId);
    if (myIndex !== room.current_player_index) return { drawnCard: null, error: 'Not your turn.' };
    if (room.turn_phase !== 'draw') return { drawnCard: null, error: 'Not the draw phase.' };

    const discard: IRummyCard[] = room.discard_pile ?? [];
    if (discard.length === 0) return { drawnCard: null, error: 'Discard pile is empty.' };

    const drawnCard = discard[discard.length - 1];
    const newDiscard = discard.slice(0, -1);

    // Fetch scores and update hand count
    const { data: roomForScores } = await supabase
      .from('rummy_rooms')
      .select('player_scores')
      .eq('id', roomId.toUpperCase())
      .single();
    const updatedScores: IPlayerScore[] = (roomForScores?.player_scores ?? []).map(
      (s: IPlayerScore) => s.id === playerId ? { ...s, handCount: s.handCount + 1 } : s
    );

    // Update discard pile and hand count in shared room
    const { error: roomUpdateError } = await supabase
      .from('rummy_rooms')
      .update({
        discard_pile: newDiscard,
        turn_phase: 'discard',
        player_scores: updatedScores,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId.toUpperCase());

    if (roomUpdateError) return { drawnCard: null, error: roomUpdateError.message };

    // Add card to player's hand
    const { data: handData, error: handFetchError } = await supabase
      .from('rummy_hands')
      .select('hand')
      .eq('room_id', roomId.toUpperCase())
      .eq('player_id', playerId)
      .single();

    if (handFetchError || !handData) return { drawnCard: null, error: 'Hand not found.' };

    const newHand: IRummyCard[] = [...(handData.hand ?? []), drawnCard];
    const { error: handUpdateError } = await supabase
      .from('rummy_hands')
      .update({ hand: newHand, updated_at: new Date().toISOString() })
      .eq('room_id', roomId.toUpperCase())
      .eq('player_id', playerId);

    if (handUpdateError) return { drawnCard: null, error: handUpdateError.message };

    return { drawnCard, error: null };
  } catch {
    return { drawnCard: null, error: 'Failed to draw card.' };
  }
};

/** Player discards a card and advances to the next player's turn */
export const discardCardOnline = async (
  roomId: string,
  playerId: string,
  card: IRummyCard,
  playerName?: string
): Promise<{ error: string | null }> => {
  try {
    const { data: room, error: fetchError } = await supabase
      .from('rummy_rooms')
      .select('discard_pile, current_player_index, turn_phase, player_ids, player_scores')
      .eq('id', roomId.toUpperCase())
      .single();

    if (fetchError || !room) return { error: 'Room not found.' };

    const playerIds: string[] = room.player_ids ?? [];
    const myIndex = playerIds.indexOf(playerId);
    if (myIndex !== room.current_player_index) return { error: 'Not your turn.' };
    if (room.turn_phase !== 'discard') return { error: 'Not the discard phase.' };

    // Remove card from hand
    const { data: handData, error: handFetchError } = await supabase
      .from('rummy_hands')
      .select('hand')
      .eq('room_id', roomId.toUpperCase())
      .eq('player_id', playerId)
      .single();

    if (handFetchError || !handData) return { error: 'Hand not found.' };

    const newHand: IRummyCard[] = (handData.hand ?? []).filter((c: IRummyCard) => c.id !== card.id);
    const { error: handUpdateError } = await supabase
      .from('rummy_hands')
      .update({ hand: newHand, updated_at: new Date().toISOString() })
      .eq('room_id', roomId.toUpperCase())
      .eq('player_id', playerId);

    if (handUpdateError) return { error: handUpdateError.message };

    // Add card to discard pile (with attribution), decrement hand count, advance turn
    const cardWithAttribution: IRummyCard = playerName ? { ...card, droppedBy: playerName } : card;
    const newDiscard: IRummyCard[] = [...(room.discard_pile ?? []), cardWithAttribution];
    const scores: IPlayerScore[] = room.player_scores ?? [];
    const updatedScores = scores.map((s: IPlayerScore) =>
      s.id === playerId ? { ...s, handCount: Math.max(0, s.handCount - 1) } : s
    );
    const nextIndex = getNextActivePlayerIndex(myIndex, playerIds, updatedScores);

    const { error: roomUpdateError } = await supabase
      .from('rummy_rooms')
      .update({
        discard_pile: newDiscard,
        current_player_index: nextIndex,
        turn_phase: 'draw',
        player_scores: updatedScores,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId.toUpperCase());

    if (roomUpdateError) return { error: roomUpdateError.message };

    return { error: null };
  } catch {
    return { error: 'Failed to discard card.' };
  }
};

/** Player scoots (voluntary drop) */
export const scootOnline = async (
  roomId: string,
  playerId: string,
  isFirstScoot: boolean
): Promise<{ error: string | null }> => {
  try {
    const { data: room, error: fetchError } = await supabase
      .from('rummy_rooms')
      .select('current_player_index, player_ids, player_scores, config, deal_number')
      .eq('id', roomId.toUpperCase())
      .single();

    if (fetchError || !room) return { error: 'Room not found.' };

    const playerIds: string[] = room.player_ids ?? [];
    const myIndex = playerIds.indexOf(playerId);
    if (myIndex !== room.current_player_index) return { error: 'Not your turn.' };

    const config: IRummyConfig = room.config ?? DEFAULT_RUMMY_CONFIG;
    const scootPoints = isFirstScoot ? config.firstScootPoints : config.midScootPoints;
    const scores: IPlayerScore[] = room.player_scores ?? [];

    const newScores: IPlayerScore[] = scores.map((s: IPlayerScore) => {
      if (s.id !== playerId) return s;
      const newPoints = s.points + scootPoints;
      // Elimination only applies in Pool Rummy
      const isEliminated = config.variant === 'pool' && newPoints >= config.poolSize;
      return { ...s, points: newPoints, hasDropped: true, isEliminated };
    });

    // Mark hand as dropped
    await supabase
      .from('rummy_hands')
      .update({ has_dropped: true, updated_at: new Date().toISOString() })
      .eq('room_id', roomId.toUpperCase())
      .eq('player_id', playerId);

    // If only 1 active player remains, end the round immediately (no show phase)
    const activePlayers = newScores.filter((s: IPlayerScore) => !s.isEliminated && !s.hasDropped);
    if (activePlayers.length === 1) {
      const winnerId = activePlayers[0].id;
      // guardPhase prevents a race if two players scoot simultaneously
      return processRoundEnd(roomId, newScores, winnerId, config, room.deal_number, 'draw');
    }

    // Normal: advance to next player's turn
    const nextIndex = getNextActivePlayerIndex(myIndex, playerIds, newScores);
    const { error: updateError } = await supabase
      .from('rummy_rooms')
      .update({
        player_scores: newScores,
        current_player_index: nextIndex,
        turn_phase: 'draw',
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId.toUpperCase());

    if (updateError) return { error: updateError.message };
    return { error: null };
  } catch {
    return { error: 'Failed to scoot. Please try again.' };
  }
};

/** Player updates their melds (group/ungroup cards) */
export const updateMeldsOnline = async (
  roomId: string,
  playerId: string,
  melds: IMeld[]
): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase
      .from('rummy_hands')
      .update({ melds, updated_at: new Date().toISOString() })
      .eq('room_id', roomId.toUpperCase())
      .eq('player_id', playerId);
    if (error) return { error: error.message };
    return { error: null };
  } catch {
    return { error: 'Failed to update melds.' };
  }
};

/** Player declares — validates hand; false declaration applies mid-scoot penalty.
 *  Valid declaration transitions room to 'showing' phase — all players arrange melds. */
export const declareOnline = async (
  roomId: string,
  playerId: string,
  melds: IMeld[],
  hand: IRummyCard[]
): Promise<{ isValid: boolean; penalized: boolean; reason: string; error: string | null }> => {
  try {
    const { isValid, reason } = validateDeclaration(hand, melds);

    const { data: room, error: fetchError } = await supabase
      .from('rummy_rooms')
      .select('player_ids, player_scores, config, deal_number, turn_phase')
      .eq('id', roomId.toUpperCase())
      .single();

    if (fetchError || !room) return { isValid: false, penalized: false, reason: '', error: 'Room not found.' };
    // Guard: only process if still in an active play phase (prevents double-declaration race)
    if (room.turn_phase !== 'draw' && room.turn_phase !== 'discard') {
      return { isValid: false, penalized: false, reason: '', error: 'Declaration no longer valid.' };
    }

    const config: IRummyConfig = room.config ?? DEFAULT_RUMMY_CONFIG;
    const scores: IPlayerScore[] = room.player_scores ?? [];
    const playerIds: string[] = room.player_ids ?? [];
    const myIndex = playerIds.indexOf(playerId);

    if (!isValid) {
      // False declaration — apply mid-scoot penalty. Player stays ACTIVE (no hasDropped).
      const penaltyPts = config.midScootPoints;
      const penaltyScores: IPlayerScore[] = scores.map((s: IPlayerScore) => {
        if (s.id !== playerId) return s;
        const newPts = s.points + penaltyPts;
        // Elimination only applies in Pool Rummy
        const isEliminated = config.variant === 'pool' && newPts >= config.poolSize;
        return { ...s, points: newPts, isEliminated };
      });

      const activePlayers = penaltyScores.filter((s: IPlayerScore) => !s.isEliminated && !s.hasDropped);

      if (activePlayers.length === 1) {
        const winnerId = activePlayers[0].id;
        const roundErr = await processRoundEnd(roomId, penaltyScores, winnerId, config, room.deal_number);
        if (roundErr.error) return { isValid: false, penalized: true, reason: '', error: roundErr.error };
      } else {
        const nextIndex = getNextActivePlayerIndex(myIndex, playerIds, penaltyScores);
        await supabase.from('rummy_rooms').update({
          player_scores: penaltyScores,
          current_player_index: nextIndex,
          turn_phase: 'draw',
          updated_at: new Date().toISOString(),
        }).eq('id', roomId.toUpperCase());
      }

      return { isValid: false, penalized: true, reason: `False declaration! ${penaltyPts} point penalty applied.`, error: null };
    }

    // Valid declaration — update winner's melds in DB then transition to show phase
    await supabase
      .from('rummy_hands')
      .update({ melds, updated_at: new Date().toISOString() })
      .eq('room_id', roomId.toUpperCase())
      .eq('player_id', playerId);

    // Mark declarer as having submitted their show melds
    const showScores = scores.map((s: IPlayerScore) =>
      s.id === playerId ? { ...s, hasSubmittedShow: true } : s
    );

    const { error: updateError } = await supabase
      .from('rummy_rooms')
      .update({
        turn_phase: 'showing',
        winner_id: playerId,
        show_started_at: new Date().toISOString(),
        player_scores: showScores,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId.toUpperCase());

    if (updateError) return { isValid: true, penalized: false, reason, error: updateError.message };

    return { isValid: true, penalized: false, reason, error: null };
  } catch {
    return { isValid: false, penalized: false, reason: '', error: 'Failed to declare. Please try again.' };
  }
};

/** Player submits their show melds (called when show phase timer expires or they tap Submit) */
export const submitShowMeldsOnline = async (
  roomId: string,
  playerId: string,
  melds: IMeld[]
): Promise<{ allSubmitted: boolean; error: string | null }> => {
  try {
    // Save final melds to rummy_hands
    await supabase
      .from('rummy_hands')
      .update({ melds, updated_at: new Date().toISOString() })
      .eq('room_id', roomId.toUpperCase())
      .eq('player_id', playerId);

    // Mark player as submitted in player_scores
    const { data: room } = await supabase
      .from('rummy_rooms')
      .select('player_scores, player_ids')
      .eq('id', roomId.toUpperCase())
      .single();

    if (!room) return { allSubmitted: false, error: 'Room not found.' };

    const playerIds: string[] = room.player_ids ?? [];
    const updatedScores: IPlayerScore[] = (room.player_scores ?? []).map((s: IPlayerScore) =>
      s.id === playerId ? { ...s, hasSubmittedShow: true } : s
    );

    await supabase
      .from('rummy_rooms')
      .update({ player_scores: updatedScores, updated_at: new Date().toISOString() })
      .eq('id', roomId.toUpperCase());

    // Check if all players have submitted (dropped players cannot submit — treat as done)
    const allSubmitted = playerIds.every(id => {
      const score = updatedScores.find(s => s.id === id);
      return score?.isEliminated || score?.hasDropped || score?.hasSubmittedShow;
    });

    return { allSubmitted, error: null };
  } catch {
    return { allSubmitted: false, error: 'Failed to submit show melds.' };
  }
};

/** Finalises the show phase — calculates scores from each player's submitted melds.
 *  Transitions to round_ended (or game_over for Points / final deal / last player standing). */
export const finalizeShowPhaseOnline = async (
  roomId: string
): Promise<{ error: string | null }> => {
  try {
    const { data: room, error: fetchError } = await supabase
      .from('rummy_rooms')
      .select('player_ids, player_scores, config, winner_id, turn_phase, deal_number')
      .eq('id', roomId.toUpperCase())
      .single();

    if (fetchError || !room) return { error: 'Room not found.' };
    if (room.turn_phase !== 'showing') return { error: null }; // already finalized

    const config: IRummyConfig = room.config ?? DEFAULT_RUMMY_CONFIG;
    const scores: IPlayerScore[] = room.player_scores ?? [];
    const winnerId: string = room.winner_id ?? '';

    // Fetch all hands with their submitted melds
    const { data: allHands } = await supabase
      .from('rummy_hands')
      .select('player_id, hand, melds')
      .eq('room_id', roomId.toUpperCase());

    // Calculate each loser's points from their submitted melds
    const newScores: IPlayerScore[] = scores.map((s: IPlayerScore) => {
      if (s.id === winnerId) {
        return { ...s, lastRoundPoints: 0 };
      }
      const playerHand = allHands?.find(h => h.player_id === s.id);
      if (!playerHand) return s;
      const pts = calculateHandPoints(playerHand.hand, playerHand.melds ?? [], config.fullHandPoints);
      const totalPoints = s.points + pts;
      // Elimination only applies in Pool Rummy
      const isEliminated = config.variant === 'pool' && totalPoints >= config.poolSize;
      return { ...s, points: totalPoints, lastRoundPoints: pts, isEliminated };
    });

    return processRoundEnd(roomId, newScores, winnerId, config, room.deal_number, 'showing');
  } catch {
    return { error: 'Failed to finalize show phase.' };
  }
};

// ─── Round lifecycle helpers ──────────────────────────────────────────────────

/**
 * Core round-end logic. Applies final scores, eliminates players,
 * then decides: game over (Points / last survivor / Deals exhausted)
 * OR round_ended (Pool/Deals with multiple rounds remaining).
 * guardPhase — only update if room is still in this turn_phase (race-condition guard).
 */
const processRoundEnd = async (
  roomId: string,
  newScores: IPlayerScore[],
  roundWinnerId: string,
  config: IRummyConfig,
  dealNumber: number,
  guardPhase?: string
): Promise<{ error: string | null }> => {
  try {
    // Apply lastRoundPoints for all players (points gained this round)
    const scoredScores: IPlayerScore[] = newScores.map(s => ({
      ...s,
      lastRoundPoints: s.lastRoundPoints ?? (s.points - s.roundStartPoints),
    }));

    const nonEliminated = scoredScores.filter(s => !s.isEliminated);
    let isGameOver = false;
    let finalWinnerId = roundWinnerId;

    if (config.variant === 'points') {
      isGameOver = true; // Points rummy is always single-round
    } else if (config.variant === 'pool') {
      isGameOver = nonEliminated.length <= 1;
      if (isGameOver && nonEliminated.length === 1) finalWinnerId = nonEliminated[0].id;
      if (isGameOver && nonEliminated.length === 0) finalWinnerId = roundWinnerId;
    } else if (config.variant === 'deals') {
      isGameOver = dealNumber >= config.totalDeals;
      if (isGameOver) {
        // Winner = player with fewest cumulative points
        const active = scoredScores.filter(s => !s.isEliminated);
        if (active.length > 0) {
          finalWinnerId = active.reduce((a, b) => a.points <= b.points ? a : b).id;
        }
      }
    }

    const updatePayload: Record<string, unknown> = {
      player_scores: scoredScores,
      winner_id: finalWinnerId,
      updated_at: new Date().toISOString(),
    };

    if (isGameOver) {
      updatePayload.status = 'completed';
      updatePayload.is_game_over = true;
    } else {
      updatePayload.turn_phase = 'round_ended';
      updatePayload.round_ended_at = new Date().toISOString();
    }

    let query = supabase.from('rummy_rooms').update(updatePayload).eq('id', roomId.toUpperCase());
    if (guardPhase) query = query.eq('turn_phase', guardPhase);

    const { error } = await query;
    return { error: error?.message ?? null };
  } catch {
    return { error: 'Failed to process round end.' };
  }
};

/** Starts the next round: rotates dealer, re-deals to non-eliminated players */
export const startNextRoundOnline = async (
  roomId: string
): Promise<{ error: string | null }> => {
  try {
    const { data: room, error: fetchError } = await supabase
      .from('rummy_rooms')
      .select('*')
      .eq('id', roomId.toUpperCase())
      .single();

    if (fetchError || !room) return { error: 'Room not found.' };
    if (room.turn_phase !== 'round_ended') return { error: null }; // another device already advanced

    const playerIds: string[] = room.player_ids ?? [];
    const playerNames: string[] = room.player_names ?? [];
    const config: IRummyConfig = room.config ?? DEFAULT_RUMMY_CONFIG;
    const scores: IPlayerScore[] = room.player_scores ?? [];

    const newDealerIndex = (room.dealer_index + 1) % playerIds.length;
    const newDealNumber = (room.deal_number ?? 1) + 1;

    // Only deal cards to non-eliminated players
    const activeIds = playerIds.filter(id => !scores.find(s => s.id === id)?.isEliminated);
    const activeNames = activeIds.map(id => playerNames[playerIds.indexOf(id)]);

    if (activeIds.length < 2) return { error: 'Not enough players to continue.' };

    // Re-initialise game for active players
    const gameState = initRummyGame(activeIds, activeNames, config);

    // Build all_hands map (only for active players)
    const allHands: Record<string, IRummyCard[]> = {};
    gameState.players.forEach(p => { allHands[p.id] = p.hand; });

    // Rotate to first active player starting from the new starter position
    const rawStarter = (newDealerIndex + 1) % playerIds.length;
    let firstPlayerIndex = rawStarter;
    for (let i = 0; i < playerIds.length; i++) {
      const idx = (rawStarter + i) % playerIds.length;
      const s = scores.find(sc => sc.id === playerIds[idx]);
      if (!s?.isEliminated) { firstPlayerIndex = idx; break; }
    }

    // Reset per-round fields; keep cumulative points and elimination state
    const newScores: IPlayerScore[] = scores.map(s => ({
      ...s,
      hasDropped: false,
      hasSeenJoker: false,
      hasSubmittedShow: false,
      lastRoundPoints: undefined,
      roundStartPoints: s.points, // snapshot current total as new baseline
      handCount: s.isEliminated ? 0 : 13,
    }));

    const { error: updateError } = await supabase
      .from('rummy_rooms')
      .update({
        all_hands: allHands,
        dealer_index: newDealerIndex,
        deal_number: newDealNumber,
        stock_pile: gameState.stock,
        discard_pile: gameState.discardPile,
        joker_card: gameState.jokerCard,
        current_player_index: firstPlayerIndex,
        turn_phase: 'draw',
        player_scores: newScores,
        winner_id: null,
        show_started_at: null,
        round_ended_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId.toUpperCase())
      .eq('turn_phase', 'round_ended'); // guard against double-advance

    return { error: updateError?.message ?? null };
  } catch {
    return { error: 'Failed to start next round.' };
  }
};

/** Marks a player as having seen the joker — called when they form their first pure sequence */
export const markJokerSeenOnline = async (
  roomId: string,
  playerId: string
): Promise<void> => {
  try {
    const { data: room } = await supabase
      .from('rummy_rooms')
      .select('player_scores')
      .eq('id', roomId.toUpperCase())
      .single();
    if (!room) return;
    const updatedScores: IPlayerScore[] = (room.player_scores ?? []).map((s: IPlayerScore) =>
      s.id === playerId ? { ...s, hasSeenJoker: true } : s
    );
    await supabase.from('rummy_rooms').update({
      player_scores: updatedScores,
      updated_at: new Date().toISOString(),
    }).eq('id', roomId.toUpperCase());
  } catch {
    // Silent fail — supplementary info
  }
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Gets the next active player index, skipping eliminated and dropped players.
 * Uses playerIds for ID-based lookup so seat order always matches player_ids array.
 */
const getNextActivePlayerIndex = (
  currentIndex: number,
  playerIds: string[],
  scores: IPlayerScore[]
): number => {
  const total = playerIds.length;
  for (let i = 1; i <= total; i++) {
    const next = (currentIndex + i) % total;
    const score = scores.find(s => s.id === playerIds[next]);
    if (!score?.isEliminated && !score?.hasDropped) return next;
  }
  return (currentIndex + 1) % total; // fallback — all others eliminated/dropped
};

import { supabase } from '@services/supabase';
import type { IChessMove } from '@app-types/game.types';

/** Generates a short readable room code e.g. "ABC123" */
const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
};

/** Creates a new chess room and returns the room code */
export const createRoom = async (
  hostId: string
): Promise<{ roomId: string | null; error: string | null }> => {
  try {
    const roomId = generateRoomCode();
    const { error } = await supabase.from('rooms').insert({
      id: roomId,
      host_id: hostId,
      host_colour: Math.random() > 0.5 ? 'w' : 'b',
      status: 'waiting',
    });
    if (error) return { roomId: null, error: error.message };
    return { roomId, error: null };
  } catch (err) {
    return { roomId: null, error: 'Failed to create room. Please try again.' };
  }
};

/** Joins an existing room as the guest */
export const joinRoom = async (
  roomId: string,
  guestId: string
): Promise<{ error: string | null }> => {
  try {
    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId.toUpperCase())
      .single();

    if (fetchError || !room) return { error: 'Room not found. Check the code and try again.' };
    if (room.status !== 'waiting') return { error: 'This room is no longer available.' };
    if (room.host_id === guestId) return { error: 'You cannot join your own room.' };
    if (room.guest_id) return { error: 'This room is already full.' };

    const { error } = await supabase
      .from('rooms')
      .update({ guest_id: guestId, status: 'active' })
      .eq('id', roomId.toUpperCase());

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: 'Failed to join room. Please try again.' };
  }
};

/** Fetches a single room by ID */
export const getRoom = async (roomId: string) => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId.toUpperCase())
      .single();
    if (error) return { room: null, error: error.message };
    return { room: data, error: null };
  } catch (err) {
    return { room: null, error: 'Failed to fetch room.' };
  }
};

/** Subscribes to real-time room updates */
export const subscribeToRoom = (
  roomId: string,
  onUpdate: (room: any) => void
) => {
  return supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => onUpdate(payload.new)
    )
    .subscribe();
};

/** Subscribes to real-time move updates for a room */
export const subscribeToMoves = (
  roomId: string,
  onMove: (move: any) => void
) => {
  return supabase
    .channel(`moves:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'moves',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => onMove(payload.new)
    )
    .subscribe();
};

/** Saves a move to the database */
export const saveMove = async (
  roomId: string,
  playerId: string,
  move: IChessMove,
  moveNumber: number
): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.from('moves').insert({
      room_id: roomId,
      player_id: playerId,
      from_square: move.from,
      to_square: move.to,
      promotion: move.promotion ?? null,
      san: move.san,
      fen_after: move.fen,
      move_number: moveNumber,
    });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: 'Failed to save move.' };
  }
};

/** Updates the room FEN after a move */
export const updateRoomFen = async (
  roomId: string,
  fen: string
): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase
      .from('rooms')
      .update({ current_fen: fen, updated_at: new Date().toISOString() })
      .eq('id', roomId);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: 'Failed to update game state.' };
  }
};

/** Marks a room as completed with a result */
export const completeRoom = async (
  roomId: string,
  winnerId: string | null,
  result: string
): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase
      .from('rooms')
      .update({
        status: 'completed',
        winner_id: winnerId,
        result,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: 'Failed to complete room.' };
  }
};
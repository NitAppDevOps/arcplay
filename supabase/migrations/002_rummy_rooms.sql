-- Rummy rooms table
-- Stores shared game state visible to all players in the room.
-- Note: stock_pile is stored here. Phase 1 limitation — Phase 3 will move
-- sensitive game state to Edge Functions for proper server-side enforcement.
CREATE TABLE IF NOT EXISTS rummy_rooms (
  id TEXT PRIMARY KEY,                              -- 6-char room code
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'active', 'completed', 'abandoned')),
  variant TEXT NOT NULL DEFAULT 'points'
    CHECK (variant IN ('points', 'deals', 'pool101', 'pool201')),
  config JSONB NOT NULL DEFAULT '{}',               -- full IRummyConfig
  player_ids JSONB NOT NULL DEFAULT '[]',           -- ordered array of UUID strings
  player_names JSONB NOT NULL DEFAULT '[]',         -- ordered array of display names
  current_player_index INTEGER NOT NULL DEFAULT 0,
  turn_phase TEXT NOT NULL DEFAULT 'draw'
    CHECK (turn_phase IN ('draw', 'discard')),
  stock_pile JSONB NOT NULL DEFAULT '[]',           -- array of IRummyCard
  discard_pile JSONB NOT NULL DEFAULT '[]',         -- array of IRummyCard
  joker_card JSONB,                                 -- the open joker for this game
  deal_number INTEGER NOT NULL DEFAULT 1,
  player_scores JSONB NOT NULL DEFAULT '[]',        -- array of {id, points, chips, isEliminated, hasDropped}
  winner_id TEXT,                                   -- player UUID or null
  is_game_over BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-player private hand data
-- RLS restricts each row to the owning player only.
CREATE TABLE IF NOT EXISTS rummy_hands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL REFERENCES rummy_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seat_index INTEGER NOT NULL,                      -- 0-based position in player_ids
  hand JSONB NOT NULL DEFAULT '[]',                 -- array of IRummyCard
  melds JSONB NOT NULL DEFAULT '[]',               -- array of IMeld
  has_dropped BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, player_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rummy_rooms_host_id ON rummy_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rummy_rooms_status ON rummy_rooms(status);
CREATE INDEX IF NOT EXISTS idx_rummy_hands_room_id ON rummy_hands(room_id);
CREATE INDEX IF NOT EXISTS idx_rummy_hands_player_id ON rummy_hands(player_id);

-- Row Level Security
ALTER TABLE rummy_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE rummy_hands ENABLE ROW LEVEL SECURITY;

-- rummy_rooms policies
-- Any authenticated user can view a waiting room (needed to join by code)
CREATE POLICY "Anyone can view waiting rummy rooms"
  ON rummy_rooms FOR SELECT
  USING (
    status = 'waiting'
    OR (player_ids::text LIKE '%' || auth.uid()::text || '%')
  );

CREATE POLICY "Authenticated users can create rummy rooms"
  ON rummy_rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- Any authenticated user can update a waiting room (needed for joining).
-- WITH CHECK ensures that after the update, the user must be in the room.
CREATE POLICY "Players can update rooms they are in or join waiting rooms"
  ON rummy_rooms FOR UPDATE
  USING (
    host_id = auth.uid()
    OR player_ids::text LIKE '%' || auth.uid()::text || '%'
    OR status = 'waiting'
  )
  WITH CHECK (
    host_id = auth.uid()
    OR player_ids::text LIKE '%' || auth.uid()::text || '%'
  );

-- rummy_hands policies
-- Each player can only see their own hand
CREATE POLICY "Players can view their own hand"
  ON rummy_hands FOR SELECT
  USING (auth.uid() = player_id);

-- Player can insert their own hand, OR the room host can insert hands for all
-- players at game start (dealing). SELECT is still restricted to own player only.
CREATE POLICY "Players can insert their own hand or host can deal for their room"
  ON rummy_hands FOR INSERT
  WITH CHECK (
    auth.uid() = player_id
    OR EXISTS (
      SELECT 1 FROM rummy_rooms
      WHERE rummy_rooms.id = rummy_hands.room_id
      AND rummy_rooms.host_id = auth.uid()
    )
  );

CREATE POLICY "Players can update their own hand"
  ON rummy_hands FOR UPDATE
  USING (auth.uid() = player_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rummy_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE rummy_hands;

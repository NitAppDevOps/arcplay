-- Chess rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'abandoned')),
  host_colour TEXT NOT NULL DEFAULT 'w' CHECK (host_colour IN ('w', 'b')),
  current_fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  result TEXT CHECK (result IN ('checkmate', 'stalemate', 'draw', 'resignation', 'timeout', null)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chess moves table
CREATE TABLE IF NOT EXISTS moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_square TEXT NOT NULL,
  to_square TEXT NOT NULL,
  promotion TEXT,
  san TEXT NOT NULL,
  fen_after TEXT NOT NULL,
  move_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_moves_room_id ON moves(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

-- Rooms policies
CREATE POLICY "Players can view rooms they are in"
  ON rooms FOR SELECT
  USING (auth.uid() = host_id OR auth.uid() = guest_id);

CREATE POLICY "Authenticated users can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Players can update rooms they are in"
  ON rooms FOR UPDATE
  USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- Moves policies
CREATE POLICY "Players can view moves in their rooms"
  ON moves FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = moves.room_id
      AND (rooms.host_id = auth.uid() OR rooms.guest_id = auth.uid())
    )
  );

CREATE POLICY "Players can insert moves in their rooms"
  ON moves FOR INSERT
  WITH CHECK (
    auth.uid() = player_id AND
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = moves.room_id
      AND (rooms.host_id = auth.uid() OR rooms.guest_id = auth.uid())
      AND rooms.status = 'active'
    )
  );

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE moves;
-- Migration 004: Add show_started_at column for the show phase
-- After a valid declaration all players get show_time_seconds to arrange their melds.

ALTER TABLE rummy_rooms
  ADD COLUMN IF NOT EXISTS show_started_at TIMESTAMPTZ;

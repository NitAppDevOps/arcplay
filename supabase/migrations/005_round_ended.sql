-- Migration 005: Add round_ended_at column for the 30-second score table phase
-- After each round's scores are calculated, this timestamp drives the auto-advance countdown.

ALTER TABLE rummy_rooms
  ADD COLUMN IF NOT EXISTS round_ended_at TIMESTAMPTZ;

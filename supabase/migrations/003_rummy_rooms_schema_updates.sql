-- Migration 003: Rummy rooms schema updates for Step 12 Part 2
-- Adds dealer_index column (tracks who dealt this round)
-- all_hands was added in a previous patch — this migration is idempotent

ALTER TABLE rummy_rooms
  ADD COLUMN IF NOT EXISTS dealer_index INTEGER NOT NULL DEFAULT 0;

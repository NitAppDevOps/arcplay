-- Migration 004: Critical Rummy schema fixes
-- Resolves 4 schema defects identified in audit that prevented any game from completing.
--
-- 1. all_hands column missing — dealt cards were never accessible to clients
-- 2. show_started_at / round_ended_at columns missing — show and round-end timers never fired
-- 3. variant CHECK used pool101/pool201 — every Pool room creation was rejected by the DB
-- 4. turn_phase CHECK missing showing/round_ended — every phase transition past discard was rejected

-- 1. Add missing columns (idempotent — IF NOT EXISTS prevents errors on re-run)
ALTER TABLE rummy_rooms ADD COLUMN IF NOT EXISTS all_hands      JSONB        NOT NULL DEFAULT '{}';
ALTER TABLE rummy_rooms ADD COLUMN IF NOT EXISTS show_started_at TIMESTAMPTZ;
ALTER TABLE rummy_rooms ADD COLUMN IF NOT EXISTS round_ended_at  TIMESTAMPTZ;

-- 2. Fix variant CHECK (drop auto-generated name, re-add with correct values)
ALTER TABLE rummy_rooms DROP CONSTRAINT IF EXISTS rummy_rooms_variant_check;
ALTER TABLE rummy_rooms ADD CONSTRAINT rummy_rooms_variant_check
  CHECK (variant IN ('points', 'deals', 'pool'));

-- 3. Fix turn_phase CHECK (drop auto-generated name, re-add with all 4 valid phases)
ALTER TABLE rummy_rooms DROP CONSTRAINT IF EXISTS rummy_rooms_turn_phase_check;
ALTER TABLE rummy_rooms ADD CONSTRAINT rummy_rooms_turn_phase_check
  CHECK (turn_phase IN ('draw', 'discard', 'showing', 'round_ended'));

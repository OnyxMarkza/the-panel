-- The Panel: Supabase schema
-- Run this in the Supabase SQL editor after creating your project.
-- Tables use cascade deletes: removing a debate removes all its personas and messages.

-- -----------------------------------------------------------------------
-- debates
-- -----------------------------------------------------------------------
CREATE TABLE debates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic         TEXT NOT NULL,
  persona_count INT  NOT NULL DEFAULT 5,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  summary       TEXT,
  verdict       TEXT,
  obsidian_path TEXT  -- path to the .md file written in the vault, for cross-reference
);

-- -----------------------------------------------------------------------
-- personas
-- -----------------------------------------------------------------------
CREATE TABLE personas (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id          UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  archetype          TEXT NOT NULL,
  bias               TEXT NOT NULL,
  tone               TEXT NOT NULL,
  position_in_debate INT  NOT NULL  -- 0-based order the persona appears
);

-- -----------------------------------------------------------------------
-- messages
-- -----------------------------------------------------------------------
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id     UUID NOT NULL REFERENCES debates(id)  ON DELETE CASCADE,
  persona_id    UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  round_number  INT  NOT NULL,  -- 1-based debate round (1, 2, 3 ...)
  message_order INT  NOT NULL   -- position within the round (0-based)
);

-- -----------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------

-- List view: debates sorted newest first
CREATE INDEX idx_debates_created_at ON debates(created_at DESC);

-- Search: topic keyword lookup
CREATE INDEX idx_debates_topic ON debates(topic);

-- Foreign key lookups
CREATE INDEX idx_personas_debate_id ON personas(debate_id);
CREATE INDEX idx_messages_debate_id ON messages(debate_id);

-- Transcript fetch: ordered by round then position
CREATE INDEX idx_messages_debate_round ON messages(debate_id, round_number);

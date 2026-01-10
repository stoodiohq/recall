-- Add LLM Keys table for Enterprise BYOK (Bring Your Own Key)
CREATE TABLE IF NOT EXISTS llm_keys (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- openai, anthropic, google
  encrypted_key TEXT NOT NULL, -- Encrypted with team key
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  last_used_at TEXT,
  UNIQUE (team_id)
);

-- Create index for looking up LLM keys by team
CREATE INDEX IF NOT EXISTS idx_llm_keys_team ON llm_keys(team_id);

-- Add website and industry fields to teams table (for enterprise features)
ALTER TABLE teams ADD COLUMN website TEXT;
ALTER TABLE teams ADD COLUMN industry TEXT;

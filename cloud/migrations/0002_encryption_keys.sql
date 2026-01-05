-- Recall Database Schema
-- Migration: Add encryption keys for team memory

-- Team encryption keys
-- Each team gets a unique encryption key for their .recall/ files
CREATE TABLE team_keys (
  id TEXT PRIMARY KEY,
  team_id TEXT UNIQUE NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  encryption_key TEXT NOT NULL, -- AES-256 key, base64 encoded (stored encrypted at rest by D1)
  key_version INTEGER NOT NULL DEFAULT 1, -- For key rotation
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  rotated_at TEXT
);

-- Index for fast team lookup
CREATE INDEX idx_team_keys_team ON team_keys(team_id);

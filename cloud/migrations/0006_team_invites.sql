-- Team invites table for magic link invitations
-- Migration 0006

CREATE TABLE team_invites (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  email TEXT,  -- Optional: pre-fill for specific person
  invited_by TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member',  -- member, admin
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  accepted_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_team_invites_code ON team_invites(code);
CREATE INDEX idx_team_invites_team ON team_invites(team_id);
CREATE INDEX idx_team_invites_expires ON team_invites(expires_at);

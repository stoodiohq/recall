-- Enabled repositories table
-- Migration 0004

CREATE TABLE repos (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  github_repo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  private INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  language TEXT,
  default_branch TEXT DEFAULT 'main',
  enabled INTEGER NOT NULL DEFAULT 1,
  enabled_by TEXT REFERENCES users(id),
  enabled_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_sync_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (team_id, github_repo_id)
);

CREATE INDEX idx_repos_team ON repos(team_id);
CREATE INDEX idx_repos_github_id ON repos(github_repo_id);
CREATE INDEX idx_repos_enabled ON repos(enabled);

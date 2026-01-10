-- Track when team members access memory files
-- Migration 0009

CREATE TABLE memory_access_logs (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repo_name TEXT,
  file_type TEXT NOT NULL, -- 'small', 'medium', 'large'
  action TEXT NOT NULL DEFAULT 'read', -- 'read', 'write'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_memory_access_team ON memory_access_logs(team_id);
CREATE INDEX idx_memory_access_user ON memory_access_logs(user_id);
CREATE INDEX idx_memory_access_created ON memory_access_logs(created_at);

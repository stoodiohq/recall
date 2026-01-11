-- Linear OAuth connections table
-- Stores the connection between a Recall team and their Linear organization
CREATE TABLE IF NOT EXISTS linear_connections (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL, -- OAuth access token
  linear_org_id TEXT NOT NULL, -- Linear organization ID
  linear_org_name TEXT NOT NULL, -- Linear organization name
  linear_org_url_key TEXT NOT NULL, -- Linear organization URL key (e.g., 'acme' for linear.app/acme)
  linear_user_id TEXT NOT NULL, -- Linear user who connected
  linear_user_name TEXT, -- Linear user display name
  linear_user_email TEXT, -- Linear user email
  scope TEXT, -- OAuth scopes granted
  connected_by_user_id TEXT NOT NULL REFERENCES users(id), -- Recall user who connected
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (team_id, linear_org_id) -- One connection per team per org
);

-- Index for looking up connections by team
CREATE INDEX IF NOT EXISTS idx_linear_connections_team ON linear_connections(team_id);

-- Index for looking up connections by Linear org (for webhook routing)
CREATE INDEX IF NOT EXISTS idx_linear_connections_org ON linear_connections(linear_org_id);

-- Linear webhook events log
-- Stores incoming webhook events for auditing and future processing
CREATE TABLE IF NOT EXISTS linear_webhook_events (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  linear_org_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- Issue, Comment, Project, Cycle, etc.
  event_action TEXT NOT NULL, -- create, update, remove
  event_data TEXT, -- JSON payload
  processed INTEGER NOT NULL DEFAULT 0, -- 0 = pending, 1 = processed
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for querying events by team
CREATE INDEX IF NOT EXISTS idx_linear_webhook_events_team ON linear_webhook_events(team_id);

-- Index for querying unprocessed events
CREATE INDEX IF NOT EXISTS idx_linear_webhook_events_pending ON linear_webhook_events(processed, created_at);

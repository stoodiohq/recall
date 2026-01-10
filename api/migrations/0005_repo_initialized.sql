-- Add initialized_at column to repos table
-- Migration 0005

ALTER TABLE repos ADD COLUMN initialized_at TEXT;

CREATE INDEX idx_repos_initialized ON repos(initialized_at);

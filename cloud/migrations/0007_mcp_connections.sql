-- Track MCP server connections
-- Migration 0007

ALTER TABLE users ADD COLUMN last_mcp_connection TEXT;
CREATE INDEX idx_users_mcp_connection ON users(last_mcp_connection);

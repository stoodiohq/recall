-- Add onboarding and profile fields to users table
-- Migration 0003

-- GitHub access token for repo access
ALTER TABLE users ADD COLUMN github_access_token TEXT;

-- User profile fields from onboarding
ALTER TABLE users ADD COLUMN role TEXT;
ALTER TABLE users ADD COLUMN company TEXT;
ALTER TABLE users ADD COLUMN team_size TEXT;

-- Track if onboarding is completed
ALTER TABLE users ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0;

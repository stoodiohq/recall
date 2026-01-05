-- Add website field to users table
-- Migration 0008

ALTER TABLE users ADD COLUMN website TEXT;

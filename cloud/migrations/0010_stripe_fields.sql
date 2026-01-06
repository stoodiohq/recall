-- Add Stripe subscription fields to teams table
ALTER TABLE teams ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE teams ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE teams ADD COLUMN subscription_status TEXT DEFAULT 'active';

-- Create index for looking up teams by Stripe customer
CREATE INDEX IF NOT EXISTS idx_teams_stripe_customer ON teams(stripe_customer_id);

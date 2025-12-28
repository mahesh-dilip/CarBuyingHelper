-- CarMind Database Schema
-- Initial migration for user sessions and car data storage

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Sessions Table
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  state TEXT NOT NULL DEFAULT 'financial_intake',

  -- Financial Profile (JSONB for flexibility)
  finances JSONB,

  -- Preferences
  preferences JSONB,

  -- Insurance Profile
  insurance_profile JSONB,

  -- Budget
  budget JSONB,

  -- Suggested Cars (array of car objects)
  suggested_cars JSONB DEFAULT '[]'::jsonb,

  -- Researched Cars (array of detailed research objects)
  researched_cars JSONB DEFAULT '[]'::jsonb,

  -- Selected Car
  selected_car JSONB,

  -- Budget Plan
  budget_plan JSONB,

  -- Session expires after 30 days of inactivity
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

-- Messages Table (conversation history)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Index for fast retrieval by session
  CONSTRAINT messages_session_idx UNIQUE (session_id, created_at, id)
);

-- Indexes for performance
CREATE INDEX idx_user_sessions_updated_at ON user_sessions(updated_at);
CREATE INDEX idx_user_sessions_state ON user_sessions(state);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
-- For now, we'll keep it simple without auth
-- In production, you'd want to add proper authentication

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (update these policies when adding auth)
CREATE POLICY "Allow all operations on user_sessions" ON user_sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on messages" ON messages
  FOR ALL USING (true) WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE user_sessions IS 'Stores user conversation sessions and their car buying journey state';
COMMENT ON TABLE messages IS 'Stores conversation message history for each session';
COMMENT ON COLUMN user_sessions.state IS 'Current conversation state: financial_intake, preferences_capture, reality_check, car_suggestions, deep_research, compare_view, budget_plan, complete';
COMMENT ON COLUMN user_sessions.finances IS 'User financial profile including income, expenses, and savings';
COMMENT ON COLUMN user_sessions.preferences IS 'Car preferences including driving style, body type, transmission, etc.';
COMMENT ON COLUMN user_sessions.insurance_profile IS 'Insurance-related information: age, postcode, NCB years, annual mileage';
COMMENT ON COLUMN user_sessions.budget IS 'Calculated budget constraints and affordability';
COMMENT ON COLUMN user_sessions.suggested_cars IS 'Array of AI-suggested cars matching budget and preferences';
COMMENT ON COLUMN user_sessions.researched_cars IS 'Array of cars with deep research (prices, ownership insights, running costs)';
COMMENT ON COLUMN user_sessions.selected_car IS 'The car the user has chosen to proceed with';
COMMENT ON COLUMN user_sessions.budget_plan IS 'Detailed month-by-month budget plan for purchasing the selected car';

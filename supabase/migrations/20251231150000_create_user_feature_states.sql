
-- Create user_feature_states table
CREATE TABLE IF NOT EXISTS user_feature_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  feature_key TEXT REFERENCES system_features(feature_key) NOT NULL,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, feature_key)
);

-- Enable RLS
ALTER TABLE user_feature_states ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Authenticated users can view user feature states" ON user_feature_states;
CREATE POLICY "Authenticated users can view user feature states"
ON user_feature_states FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert user feature states" ON user_feature_states;
CREATE POLICY "Authenticated users can insert user feature states"
ON user_feature_states FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update user feature states" ON user_feature_states;
CREATE POLICY "Authenticated users can update user feature states"
ON user_feature_states FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON user_feature_states TO authenticated;

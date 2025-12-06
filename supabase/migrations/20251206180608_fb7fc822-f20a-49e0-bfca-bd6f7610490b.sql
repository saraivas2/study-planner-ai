-- Enable RLS on login_attempts (system managed table)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- No user policies - only edge functions with service role can access this table
-- This is intentional for security - users should not be able to read/modify login attempts
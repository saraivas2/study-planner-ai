-- Add academic period fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN period_start DATE,
ADD COLUMN period_end DATE;

-- Create login_attempts table for rate limiting
CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);

-- Index for efficient queries
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts(email, attempted_at);

-- No RLS needed - this is managed by the system, not users
-- We'll clean up old records periodically
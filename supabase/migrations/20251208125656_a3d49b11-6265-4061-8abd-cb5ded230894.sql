-- Create table to track study delays (for the +2.0 bonus that lasts 24h)
CREATE TABLE public.study_delays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  delayed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_delays ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own delays"
  ON public.study_delays
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own delays"
  ON public.study_delays
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own delays"
  ON public.study_delays
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_study_delays_user_expires ON public.study_delays(user_id, expires_at);
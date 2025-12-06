-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  professor TEXT,
  type TEXT DEFAULT 'MÓDULO',
  status TEXT DEFAULT 'ativa',
  class_group TEXT,
  difficulty_weight INTEGER CHECK (difficulty_weight >= 1 AND difficulty_weight <= 5),
  dedication_weight INTEGER CHECK (dedication_weight >= 1 AND dedication_weight <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subject schedules table
CREATE TABLE public.subject_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for subjects
CREATE POLICY "Users can view their own subjects" 
ON public.subjects FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subjects" 
ON public.subjects FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subjects" 
ON public.subjects FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects" 
ON public.subjects FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for subject_schedules (through subject ownership)
CREATE POLICY "Users can view schedules of their subjects" 
ON public.subject_schedules FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.subjects WHERE subjects.id = subject_id AND subjects.user_id = auth.uid()));

CREATE POLICY "Users can insert schedules for their subjects" 
ON public.subject_schedules FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.subjects WHERE subjects.id = subject_id AND subjects.user_id = auth.uid()));

CREATE POLICY "Users can update schedules of their subjects" 
ON public.subject_schedules FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.subjects WHERE subjects.id = subject_id AND subjects.user_id = auth.uid()));

CREATE POLICY "Users can delete schedules of their subjects" 
ON public.subject_schedules FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.subjects WHERE subjects.id = subject_id AND subjects.user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_subjects_updated_at
BEFORE UPDATE ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
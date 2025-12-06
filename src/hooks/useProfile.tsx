import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  institution: string | null;
  course: string | null;
  semester: number | null;
  enrollment_number: string | null;
  avatar_url: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchProfile();
      toast.success('Perfil atualizado com sucesso!');
      return { error: null };
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
      return { error: error as Error };
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return { profile, loading, updateProfile, refetch: fetchProfile };
}

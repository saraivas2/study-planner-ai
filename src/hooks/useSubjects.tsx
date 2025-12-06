import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface SubjectSchedule {
  id?: string;
  subject_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location?: string;
}

export interface Subject {
  id: string;
  user_id: string;
  code?: string;
  name: string;
  professor?: string;
  type?: string;
  status?: string;
  class_group?: string;
  difficulty_weight?: number;
  dedication_weight?: number;
  created_at: string;
  updated_at: string;
  schedules?: SubjectSchedule[];
}

export interface CreateSubjectData {
  code?: string;
  name: string;
  professor?: string;
  type?: string;
  status?: string;
  class_group?: string;
  difficulty_weight?: number;
  dedication_weight?: number;
  schedules?: Omit<SubjectSchedule, 'id' | 'subject_id'>[];
}

export const useSubjects = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubjects = useCallback(async () => {
    if (!user) return;

    try {
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (subjectsError) throw subjectsError;

      // Fetch schedules for all subjects
      const subjectIds = subjectsData?.map(s => s.id) || [];
      let schedulesData: SubjectSchedule[] = [];
      
      if (subjectIds.length > 0) {
        const { data: schedules, error: schedulesError } = await supabase
          .from('subject_schedules')
          .select('*')
          .in('subject_id', subjectIds);

        if (schedulesError) throw schedulesError;
        schedulesData = schedules || [];
      }

      // Merge schedules into subjects
      const subjectsWithSchedules = subjectsData?.map(subject => ({
        ...subject,
        schedules: schedulesData.filter(s => s.subject_id === subject.id)
      })) || [];

      setSubjects(subjectsWithSchedules);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Erro ao carregar matérias');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const createSubject = async (data: CreateSubjectData): Promise<Subject | null> => {
    if (!user) return null;

    try {
      const { schedules, ...subjectData } = data;
      
      const { data: newSubject, error: subjectError } = await supabase
        .from('subjects')
        .insert({ ...subjectData, user_id: user.id })
        .select()
        .single();

      if (subjectError) throw subjectError;

      // Insert schedules if provided
      if (schedules && schedules.length > 0 && newSubject) {
        const schedulesToInsert = schedules.map(schedule => ({
          ...schedule,
          subject_id: newSubject.id
        }));

        const { error: schedulesError } = await supabase
          .from('subject_schedules')
          .insert(schedulesToInsert);

        if (schedulesError) throw schedulesError;
      }

      await fetchSubjects();
      toast.success('Matéria criada com sucesso');
      return newSubject;
    } catch (error) {
      console.error('Error creating subject:', error);
      toast.error('Erro ao criar matéria');
      return null;
    }
  };

  const updateSubject = async (id: string, data: Partial<CreateSubjectData>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { schedules, ...subjectData } = data;

      const { error: subjectError } = await supabase
        .from('subjects')
        .update(subjectData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (subjectError) throw subjectError;

      // Update schedules if provided
      if (schedules !== undefined) {
        // Delete existing schedules
        await supabase
          .from('subject_schedules')
          .delete()
          .eq('subject_id', id);

        // Insert new schedules
        if (schedules.length > 0) {
          const schedulesToInsert = schedules.map(schedule => ({
            ...schedule,
            subject_id: id
          }));

          const { error: schedulesError } = await supabase
            .from('subject_schedules')
            .insert(schedulesToInsert);

          if (schedulesError) throw schedulesError;
        }
      }

      await fetchSubjects();
      toast.success('Matéria atualizada com sucesso');
      return true;
    } catch (error) {
      console.error('Error updating subject:', error);
      toast.error('Erro ao atualizar matéria');
      return false;
    }
  };

  const deleteSubject = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchSubjects();
      toast.success('Matéria removida com sucesso');
      return true;
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Erro ao remover matéria');
      return false;
    }
  };

  const updateWeights = async (id: string, difficulty_weight: number, dedication_weight: number): Promise<boolean> => {
    return updateSubject(id, { difficulty_weight, dedication_weight });
  };

  const importFromExtraction = async (extractedSubjects: any[]): Promise<boolean> => {
    if (!user || !extractedSubjects?.length) return false;

    try {
      for (const subject of extractedSubjects) {
        await createSubject({
          code: subject.code,
          name: subject.name,
          professor: subject.professor,
          type: subject.type,
          class_group: subject.class_group,
          schedules: subject.schedules?.map((s: any) => ({
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            location: s.location
          }))
        });
      }

      toast.success(`${extractedSubjects.length} matérias importadas com sucesso`);
      return true;
    } catch (error) {
      console.error('Error importing subjects:', error);
      toast.error('Erro ao importar matérias');
      return false;
    }
  };

  const subjectsWithoutWeights = subjects.filter(
    s => !s.difficulty_weight || !s.dedication_weight
  );

  return {
    subjects,
    loading,
    createSubject,
    updateSubject,
    deleteSubject,
    updateWeights,
    importFromExtraction,
    refetch: fetchSubjects,
    subjectsWithoutWeights
  };
};

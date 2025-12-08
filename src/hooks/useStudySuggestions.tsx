import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Subject } from '@/hooks/useSubjects';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { toast } from 'sonner';
import { differenceInDays, addMinutes, format, parseISO, isAfter, isBefore } from 'date-fns';

const STUDY_BLOCK_MINUTES = 50;
const BREAK_MINUTES = 10;
const DELAY_BONUS = 2.0;

export interface StudyDelay {
  id: string;
  user_id: string;
  subject_id: string;
  delayed_at: string;
  expires_at: string;
  created_at: string;
}

export interface SubjectPriority {
  subject: Subject;
  difficultyWeight: number;
  dedicationWeight: number;
  urgencyFactor: number;
  delayBonus: number;
  score: number;
  nearestDeadline?: CalendarEvent;
}

export interface StudyBlock {
  id: string;
  subject: Subject;
  startTime: Date;
  endTime: Date;
  isBreak: boolean;
  freeSlotId?: string;
}

export interface StudySuggestion {
  freeSlot: CalendarEvent;
  blocks: StudyBlock[];
}

export const useStudySuggestions = () => {
  const { user } = useAuth();
  const [delays, setDelays] = useState<StudyDelay[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch active delays (not expired)
  const fetchDelays = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('study_delays')
        .select('*')
        .eq('user_id', user.id)
        .gte('expires_at', new Date().toISOString());

      if (error) throw error;
      setDelays(data || []);
    } catch (error) {
      console.error('Error fetching delays:', error);
    }
  }, [user]);

  // Calculate urgency factor based on deadline proximity
  const calculateUrgencyFactor = (daysUntilDeadline: number): number => {
    if (daysUntilDeadline < 0) return 1.5; // Past deadline - highest urgency
    if (daysUntilDeadline < 4) return 1.0;
    if (daysUntilDeadline <= 7) return 0.5;
    return 0.0;
  };

  // Calculate priority score for each subject
  const calculateSubjectPriorities = useCallback((
    subjects: Subject[],
    deadlines: CalendarEvent[],
    activeDelays: StudyDelay[]
  ): SubjectPriority[] => {
    const now = new Date();

    return subjects
      .filter(subject => subject.difficulty_weight && subject.dedication_weight)
      .map(subject => {
        const D = subject.difficulty_weight || 3;
        const B = subject.dedication_weight || 3;

        // Find nearest deadline for this subject
        const subjectDeadlines = deadlines
          .filter(d => d.subject_id === subject.id)
          .filter(d => isAfter(parseISO(d.start_datetime), now))
          .sort((a, b) => 
            new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
          );

        const nearestDeadline = subjectDeadlines[0];
        let urgencyFactor = 0;

        if (nearestDeadline) {
          const daysUntil = differenceInDays(parseISO(nearestDeadline.start_datetime), now);
          urgencyFactor = calculateUrgencyFactor(daysUntil);
        }

        // Check for delay bonus
        const hasDelay = activeDelays.some(
          delay => delay.subject_id === subject.id && 
                   isAfter(parseISO(delay.expires_at), now)
        );
        const delayBonus = hasDelay ? DELAY_BONUS : 0;

        // P = (D + B) × (1 + U) + DelayBonus
        const baseScore = (D + B) * (1 + urgencyFactor);
        const score = baseScore + delayBonus;

        return {
          subject,
          difficultyWeight: D,
          dedicationWeight: B,
          urgencyFactor,
          delayBonus,
          score,
          nearestDeadline
        };
      })
      .sort((a, b) => b.score - a.score);
  }, []);

  // Generate study blocks for a free slot
  const generateStudyBlocks = useCallback((
    freeSlot: CalendarEvent,
    prioritizedSubjects: SubjectPriority[]
  ): StudyBlock[] => {
    if (!freeSlot.end_datetime || prioritizedSubjects.length === 0) return [];

    const slotStart = parseISO(freeSlot.start_datetime);
    const slotEnd = parseISO(freeSlot.end_datetime);
    const totalMinutes = Math.floor((slotEnd.getTime() - slotStart.getTime()) / 60000);

    const blocks: StudyBlock[] = [];
    let currentTime = slotStart;
    let subjectIndex = 0;

    while (true) {
      const remainingMinutes = Math.floor((slotEnd.getTime() - currentTime.getTime()) / 60000);
      
      // Check if we have at least 20 minutes for a meaningful study block
      if (remainingMinutes < 20) break;

      const studyMinutes = Math.min(STUDY_BLOCK_MINUTES, remainingMinutes);
      const studyEnd = addMinutes(currentTime, studyMinutes);

      // Get next subject (cycle through if needed)
      const priority = prioritizedSubjects[subjectIndex % prioritizedSubjects.length];

      blocks.push({
        id: `${freeSlot.id}-block-${blocks.length}`,
        subject: priority.subject,
        startTime: new Date(currentTime),
        endTime: new Date(studyEnd),
        isBreak: false,
        freeSlotId: freeSlot.id
      });

      currentTime = studyEnd;

      // Check if we can add a break
      const afterBreakRemaining = Math.floor((slotEnd.getTime() - addMinutes(currentTime, BREAK_MINUTES).getTime()) / 60000);
      
      if (afterBreakRemaining >= 20) {
        // Add break block
        const breakEnd = addMinutes(currentTime, BREAK_MINUTES);
        blocks.push({
          id: `${freeSlot.id}-break-${blocks.length}`,
          subject: priority.subject,
          startTime: new Date(currentTime),
          endTime: new Date(breakEnd),
          isBreak: true,
          freeSlotId: freeSlot.id
        });
        currentTime = breakEnd;
        
        // Move to next subject after break
        subjectIndex++;
      } else {
        break;
      }
    }

    return blocks;
  }, []);

  // Generate all study suggestions
  const generateSuggestions = useCallback((
    subjects: Subject[],
    freeSlots: CalendarEvent[],
    deadlines: CalendarEvent[],
    activeDelays: StudyDelay[]
  ): StudySuggestion[] => {
    const now = new Date();
    
    // Filter future free slots only
    const futureFreeSlots = freeSlots.filter(slot => 
      isAfter(parseISO(slot.start_datetime), now)
    );

    if (futureFreeSlots.length === 0 || subjects.length === 0) return [];

    const priorities = calculateSubjectPriorities(subjects, deadlines, activeDelays);
    
    if (priorities.length === 0) return [];

    return futureFreeSlots.map(slot => ({
      freeSlot: slot,
      blocks: generateStudyBlocks(slot, priorities)
    })).filter(s => s.blocks.length > 0);
  }, [calculateSubjectPriorities, generateStudyBlocks]);

  // Mark a study as delayed
  const markAsDelayed = async (subjectId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setLoading(true);

      // Check if there's already an active delay for this subject
      const existingDelay = delays.find(d => d.subject_id === subjectId);
      
      if (existingDelay) {
        // Extend the delay
        const { error } = await supabase
          .from('study_delays')
          .update({ 
            delayed_at: new Date().toISOString(),
            expires_at: addMinutes(new Date(), 24 * 60).toISOString()
          })
          .eq('id', existingDelay.id);

        if (error) throw error;
      } else {
        // Create new delay
        const { error } = await supabase
          .from('study_delays')
          .insert({
            user_id: user.id,
            subject_id: subjectId,
            delayed_at: new Date().toISOString(),
            expires_at: addMinutes(new Date(), 24 * 60).toISOString()
          });

        if (error) throw error;
      }

      await fetchDelays();
      toast.success('Atraso registrado. A matéria terá prioridade extra nas próximas 24h.');
      return true;
    } catch (error) {
      console.error('Error marking delay:', error);
      toast.error('Erro ao registrar atraso');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Clear delay for a subject
  const clearDelay = async (subjectId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('study_delays')
        .delete()
        .eq('user_id', user.id)
        .eq('subject_id', subjectId);

      if (error) throw error;

      await fetchDelays();
      return true;
    } catch (error) {
      console.error('Error clearing delay:', error);
      return false;
    }
  };

  return {
    delays,
    loading,
    fetchDelays,
    calculateSubjectPriorities,
    generateSuggestions,
    markAsDelayed,
    clearDelay,
    STUDY_BLOCK_MINUTES,
    BREAK_MINUTES
  };
};

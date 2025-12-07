import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type EventType = 'class' | 'occupied' | 'free_study' | 'deadline';

export interface CalendarEvent {
  id: string;
  user_id: string;
  subject_id?: string;
  title: string;
  description?: string;
  event_type: EventType;
  start_datetime: string;
  end_datetime?: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  recurrence_days?: number[];
  recurrence_end_date?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  subject_name?: string;
}

export interface CreateEventData {
  subject_id?: string;
  title: string;
  description?: string;
  event_type: EventType;
  start_datetime: string;
  end_datetime?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  recurrence_days?: number[];
  recurrence_end_date?: string;
}

export const useCalendarEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          subjects (name)
        `)
        .eq('user_id', user.id)
        .order('start_datetime');

      if (error) throw error;

      const eventsWithSubjectName: CalendarEvent[] = (data || []).map(event => ({
        ...event,
        event_type: event.event_type as EventType,
        subject_name: (event.subjects as { name: string } | null)?.name
      }));

      setEvents(eventsWithSubjectName);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = async (data: CreateEventData): Promise<CalendarEvent | null> => {
    if (!user) return null;

    try {
      const { data: newEvent, error } = await supabase
        .from('calendar_events')
        .insert({ ...data, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      if (!newEvent) throw new Error('No event returned');

      await fetchEvents();
      toast.success('Evento criado com sucesso');
      return { ...newEvent, event_type: newEvent.event_type as EventType };
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Erro ao criar evento');
      return null;
    }
  };

  const updateEvent = async (id: string, data: Partial<CreateEventData>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .update(data)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchEvents();
      toast.success('Evento atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Erro ao atualizar evento');
      return false;
    }
  };

  const deleteEvent = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchEvents();
      toast.success('Evento removido com sucesso');
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erro ao remover evento');
      return false;
    }
  };

  // Get events for a specific date range
  const getEventsInRange = (startDate: Date, endDate: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventStart = new Date(event.start_datetime);
      return eventStart >= startDate && eventStart <= endDate;
    });
  };

  // Get deadlines (for AI urgency calculations)
  const getDeadlines = (): CalendarEvent[] => {
    return events.filter(e => e.event_type === 'deadline');
  };

  // Get free study slots
  const getFreeStudySlots = (): CalendarEvent[] => {
    return events.filter(e => e.event_type === 'free_study');
  };

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsInRange,
    getDeadlines,
    getFreeStudySlots,
    refetch: fetchEvents
  };
};

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useSubjects } from '@/hooks/useSubjects';
import { useCalendarEvents, CalendarEvent, CreateEventData } from '@/hooks/useCalendarEvents';
import MainLayout from '@/components/layout/MainLayout';
import { CalendarHeader, CalendarView } from '@/components/calendar/CalendarHeader';
import { DayView } from '@/components/calendar/DayView';
import { WeekView } from '@/components/calendar/WeekView';
import { MonthView } from '@/components/calendar/MonthView';
import { YearView } from '@/components/calendar/YearView';
import { CalendarLegend } from '@/components/calendar/CalendarLegend';
import { EventFormDialog } from '@/components/calendar/EventFormDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

const Calendario = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const { subjects, loading: subjectsLoading } = useSubjects();
  const { events, loading: eventsLoading, createEvent, updateEvent, deleteEvent } = useCalendarEvents();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || subjectsLoading || eventsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleAddEvent = () => {
    setSelectedEvent(null);
    setDefaultDate(undefined);
    setShowEventDialog(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  const handleDayClick = (date: Date) => {
    if (view === 'year') {
      setCurrentDate(date);
      setView('month');
    } else if (view === 'month') {
      setCurrentDate(date);
      setView('day');
    } else {
      setDefaultDate(date);
      setSelectedEvent(null);
      setShowEventDialog(true);
    }
  };

  const handleMonthClick = (date: Date) => {
    setCurrentDate(date);
    setView('month');
  };

  const handleSubmitEvent = async (data: CreateEventData): Promise<boolean> => {
    if (selectedEvent) {
      return await updateEvent(selectedEvent.id, data);
    } else {
      const result = await createEvent(data);
      return result !== null;
    }
  };

  const handleDeleteEvent = async () => {
    if (eventToDelete) {
      await deleteEvent(eventToDelete.id);
      setEventToDelete(null);
      setShowEventDialog(false);
      setSelectedEvent(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in">
        <CalendarHeader
          currentDate={currentDate}
          view={view}
          onDateChange={setCurrentDate}
          onViewChange={setView}
          onAddEvent={handleAddEvent}
        />

        <CalendarLegend />

        <div className="overflow-x-auto">
          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              events={events}
              subjects={subjects}
              onEventClick={handleEventClick}
            />
          )}
          {view === 'week' && (
            <WeekView
              currentDate={currentDate}
              events={events}
              subjects={subjects}
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
            />
          )}
          {view === 'month' && (
            <MonthView
              currentDate={currentDate}
              events={events}
              subjects={subjects}
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
            />
          )}
          {view === 'year' && (
            <YearView
              currentDate={currentDate}
              onMonthClick={handleMonthClick}
            />
          )}
        </div>
      </div>

      <EventFormDialog
        open={showEventDialog}
        onOpenChange={(open) => {
          setShowEventDialog(open);
          if (!open) {
            setSelectedEvent(null);
            setDefaultDate(undefined);
          }
        }}
        event={selectedEvent}
        subjects={subjects}
        onSubmit={handleSubmitEvent}
        defaultDate={defaultDate}
      />

      {selectedEvent && (
        <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O evento "{eventToDelete?.title}" será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </MainLayout>
  );
};

export default Calendario;

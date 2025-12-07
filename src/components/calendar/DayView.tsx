import { format, isSameDay, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { Subject, SubjectSchedule } from '@/hooks/useSubjects';
import { cn } from '@/lib/utils';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  subjects: Subject[];
  onEventClick: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 to 22:00

const getEventColor = (eventType: string) => {
  switch (eventType) {
    case 'class':
      return 'bg-primary/20 border-primary text-primary';
    case 'occupied':
      return 'bg-destructive/20 border-destructive text-destructive';
    case 'free_study':
      return 'bg-success/20 border-success text-success-foreground';
    case 'deadline':
      return 'bg-warning/20 border-warning text-warning-foreground';
    default:
      return 'bg-muted border-border text-muted-foreground';
  }
};

export const DayView = ({ currentDate, events, subjects, onEventClick }: DayViewProps) => {
  const dayOfWeek = currentDate.getDay();

  // Get class events from subjects schedules
  const classEvents: (CalendarEvent & { schedule: SubjectSchedule })[] = subjects.flatMap(subject => 
    (subject.schedules || [])
      .filter(schedule => schedule.day_of_week === dayOfWeek)
      .map(schedule => ({
        id: `class-${subject.id}-${schedule.id}`,
        user_id: subject.user_id,
        subject_id: subject.id,
        title: subject.name,
        description: subject.professor || undefined,
        event_type: 'class' as const,
        start_datetime: `${format(currentDate, 'yyyy-MM-dd')}T${schedule.start_time}`,
        end_datetime: `${format(currentDate, 'yyyy-MM-dd')}T${schedule.end_time}`,
        is_recurring: true,
        created_at: subject.created_at,
        updated_at: subject.updated_at,
        schedule
      }))
  );

  // Filter user events for this day
  const dayEvents = events.filter(event => {
    const eventDate = parseISO(event.start_datetime);
    if (isSameDay(eventDate, currentDate)) return true;
    
    // Check recurring events
    if (event.is_recurring && event.recurrence_days?.includes(dayOfWeek)) {
      const recurrenceEnd = event.recurrence_end_date ? parseISO(event.recurrence_end_date) : null;
      if (recurrenceEnd && currentDate > recurrenceEnd) return false;
      return true;
    }
    
    return false;
  });

  const allEvents = [...classEvents, ...dayEvents];

  const getEventPosition = (event: CalendarEvent) => {
    const startTime = parseISO(event.start_datetime);
    const endTime = event.end_datetime ? parseISO(event.end_datetime) : startTime;
    
    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const endHour = endTime.getHours() + endTime.getMinutes() / 60;
    
    const top = ((startHour - 6) / 17) * 100;
    const height = ((endHour - startHour) / 17) * 100;
    
    return { top: `${top}%`, height: `${Math.max(height, 3)}%` };
  };

  return (
    <div className="flex flex-col bg-card rounded-lg border overflow-hidden">
      {/* Day header */}
      <div className="flex items-center justify-center p-4 bg-muted/50 border-b">
        <div className="text-center">
          <div className="text-2xl font-bold">
            {format(currentDate, 'd')}
          </div>
          <div className="text-sm text-muted-foreground capitalize">
            {format(currentDate, 'EEEE', { locale: ptBR })}
          </div>
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 relative" style={{ minHeight: '600px' }}>
        {/* Hour lines */}
        {HOURS.map(hour => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-t border-border/50"
            style={{ top: `${((hour - 6) / 17) * 100}%` }}
          >
            <span className="absolute -top-2.5 left-2 text-xs text-muted-foreground bg-card px-1">
              {format(new Date().setHours(hour, 0), 'HH:mm')}
            </span>
          </div>
        ))}

        {/* Events */}
        <div className="absolute inset-0 ml-16 mr-2">
          {allEvents.map(event => {
            const position = getEventPosition(event);
            return (
              <div
                key={event.id}
                onClick={() => !event.id.startsWith('class-') && onEventClick(event)}
                className={cn(
                  "absolute left-0 right-0 p-2 rounded border-l-4 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity",
                  getEventColor(event.event_type),
                  event.id.startsWith('class-') && "cursor-default hover:opacity-100"
                )}
                style={position}
              >
                <div className="font-medium text-sm truncate">{event.title}</div>
                {event.description && (
                  <div className="text-xs opacity-75 truncate">{event.description}</div>
                )}
                <div className="text-xs opacity-75">
                  {format(parseISO(event.start_datetime), 'HH:mm')}
                  {event.end_datetime && ` - ${format(parseISO(event.end_datetime), 'HH:mm')}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { Subject } from '@/hooks/useSubjects';
import { cn } from '@/lib/utils';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  subjects: Subject[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
}

const getEventDotColor = (eventType: string) => {
  switch (eventType) {
    case 'class':
      return 'bg-primary';
    case 'occupied':
      return 'bg-destructive';
    case 'free_study':
      return 'bg-success';
    case 'deadline':
      return 'bg-warning';
    default:
      return 'bg-muted-foreground';
  }
};

export const MonthView = ({ currentDate, events, subjects, onEventClick, onDayClick }: MonthViewProps) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const today = new Date();

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getEventsForDay = (date: Date) => {
    const dayOfWeek = date.getDay();
    
    // Class events from subjects (only show if within the month view)
    const classEvents = subjects.flatMap(subject => 
      (subject.schedules || [])
        .filter(schedule => schedule.day_of_week === dayOfWeek)
        .map(schedule => ({
          id: `class-${subject.id}-${schedule.id}-${format(date, 'yyyy-MM-dd')}`,
          event_type: 'class' as const,
          title: subject.name
        }))
    );

    // User events
    const dayEvents = events
      .filter(event => {
        const eventDate = parseISO(event.start_datetime);
        if (isSameDay(eventDate, date)) return true;
        
        if (event.is_recurring && event.recurrence_days?.includes(dayOfWeek)) {
          const eventStart = parseISO(event.start_datetime);
          const recurrenceEnd = event.recurrence_end_date ? parseISO(event.recurrence_end_date) : null;
          if (date < eventStart) return false;
          if (recurrenceEnd && date > recurrenceEnd) return false;
          return true;
        }
        
        return false;
      })
      .map(event => ({
        id: event.id,
        event_type: event.event_type,
        title: event.title
      }));

    return [...classEvents, ...dayEvents];
  };

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {weekDays.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, today);
          
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                "min-h-[100px] p-2 border-b border-r cursor-pointer hover:bg-muted/50 transition-colors",
                !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                isToday && "bg-primary/5"
              )}
            >
              <div className={cn(
                "text-sm font-medium mb-1",
                isToday && "text-primary"
              )}>
                {format(day, 'd')}
              </div>
              
              {/* Event indicators */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event, idx) => (
                  <div
                    key={event.id}
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded truncate",
                      getEventDotColor(event.event_type),
                      "text-primary-foreground"
                    )}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayEvents.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

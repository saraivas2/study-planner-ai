import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { Subject } from '@/hooks/useSubjects';
import { StudyBlock } from '@/hooks/useStudySuggestions';
import { cn } from '@/lib/utils';
import { Brain, Coffee, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  subjects: Subject[];
  studyBlocks?: StudyBlock[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
  onDelayStudy?: (subjectId: string) => Promise<boolean>;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);

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

export const WeekView = ({ currentDate, events, subjects, studyBlocks = [], onEventClick, onDayClick, onDelayStudy }: WeekViewProps) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const getEventsForDay = (date: Date) => {
    const dayOfWeek = date.getDay();
    
    // Class events from subjects
    const classEvents = subjects.flatMap(subject => 
      (subject.schedules || [])
        .filter(schedule => schedule.day_of_week === dayOfWeek)
        .map(schedule => ({
          id: `class-${subject.id}-${schedule.id}-${format(date, 'yyyy-MM-dd')}`,
          user_id: subject.user_id,
          subject_id: subject.id,
          title: subject.name,
          description: subject.professor || undefined,
          event_type: 'class' as const,
          start_datetime: `${format(date, 'yyyy-MM-dd')}T${schedule.start_time}`,
          end_datetime: `${format(date, 'yyyy-MM-dd')}T${schedule.end_time}`,
          is_recurring: true,
          created_at: subject.created_at,
          updated_at: subject.updated_at
        }))
    );

    // User events
    const dayEvents = events.filter(event => {
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
    });

    return [...classEvents, ...dayEvents];
  };

  const getEventsAndBlocksForDay = (date: Date) => {
    return studyBlocks.filter(block => isSameDay(block.startTime, date));
  };

  const getEventPosition = (event: CalendarEvent) => {
    const startTime = parseISO(event.start_datetime);
    const endTime = event.end_datetime ? parseISO(event.end_datetime) : startTime;
    
    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const endHour = endTime.getHours() + endTime.getMinutes() / 60;
    
    const top = ((startHour - 6) / 17) * 100;
    const height = ((endHour - startHour) / 17) * 100;
    
    return { top: `${top}%`, height: `${Math.max(height, 4)}%` };
  };

  const getBlockPosition = (block: StudyBlock) => {
    const startHour = block.startTime.getHours() + block.startTime.getMinutes() / 60;
    const endHour = block.endTime.getHours() + block.endTime.getMinutes() / 60;
    
    const top = ((startHour - 6) / 17) * 100;
    const height = ((endHour - startHour) / 17) * 100;
    
    return { top: `${top}%`, height: `${Math.max(height, 4)}%` };
  };

  return (
    <div className="flex flex-col bg-card rounded-lg border overflow-hidden">
      {/* Header with days */}
      <div className="grid grid-cols-8 border-b">
        <div className="p-2 border-r" /> {/* Empty corner */}
        {weekDays.map(day => (
          <div
            key={day.toISOString()}
            onClick={() => onDayClick(day)}
            className={cn(
              "p-2 text-center cursor-pointer hover:bg-muted/50 transition-colors",
              isSameDay(day, today) && "bg-primary/10"
            )}
          >
            <div className="text-xs text-muted-foreground uppercase">
              {format(day, 'EEE', { locale: ptBR })}
            </div>
            <div className={cn(
              "text-lg font-semibold",
              isSameDay(day, today) && "text-primary"
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 relative grid grid-cols-8" style={{ minHeight: '600px' }}>
        {/* Time column */}
        <div className="border-r relative">
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
        </div>

        {/* Day columns */}
        <TooltipProvider>
          {weekDays.map(day => {
            const dayEvents = getEventsForDay(day);
            const dayBlocks = getEventsAndBlocksForDay(day);
            
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "relative border-r last:border-r-0",
                  isSameDay(day, today) && "bg-primary/5"
                )}
              >
                {/* Hour lines */}
                {HOURS.map(hour => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-border/30"
                    style={{ top: `${((hour - 6) / 17) * 100}%` }}
                  />
                ))}

                {/* Events */}
                {dayEvents.map(event => {
                  const position = getEventPosition(event);
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!event.id.startsWith('class-')) onEventClick(event);
                      }}
                      className={cn(
                        "absolute left-0.5 right-0.5 p-1 rounded text-xs border-l-2 overflow-hidden",
                        "cursor-pointer hover:opacity-80 transition-opacity",
                        getEventColor(event.event_type),
                        event.id.startsWith('class-') && "cursor-default hover:opacity-100"
                      )}
                      style={position}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="opacity-75 truncate">
                        {format(parseISO(event.start_datetime), 'HH:mm')}
                      </div>
                    </div>
                  );
                })}

                {/* Study Blocks (Suggested) */}
                {dayBlocks.map(block => {
                  const position = getBlockPosition(block);
                  return (
                    <Tooltip key={block.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute left-0.5 right-0.5 p-1 rounded text-xs overflow-hidden",
                            "border-dashed border animate-pulse",
                            block.isBreak 
                              ? "bg-muted/40 border-muted-foreground/30 text-muted-foreground"
                              : "bg-accent/30 border-accent text-accent-foreground"
                          )}
                          style={position}
                        >
                          <div className="flex items-center gap-1">
                            {block.isBreak ? (
                              <Coffee className="w-2.5 h-2.5 shrink-0" />
                            ) : (
                              <Brain className="w-2.5 h-2.5 shrink-0" />
                            )}
                            <span className="font-medium truncate text-[10px]">
                              {block.isBreak ? 'Pausa' : block.subject.name}
                            </span>
                          </div>
                          {!block.isBreak && onDelayStudy && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelayStudy(block.subject.id);
                              }}
                              className="absolute top-0.5 right-0.5 h-4 w-4 p-0 opacity-60 hover:opacity-100"
                            >
                              <XCircle className="w-2.5 h-2.5" />
                            </Button>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{block.isBreak ? 'Pausa sugerida' : `Estudar: ${block.subject.name}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(block.startTime, 'HH:mm')} - {format(block.endTime, 'HH:mm')}
                        </p>
                        {!block.isBreak && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Clique no X para "Não consegui"
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
};

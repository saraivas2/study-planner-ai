import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  setMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface YearViewProps {
  currentDate: Date;
  onMonthClick: (date: Date) => void;
}

export const YearView = ({ currentDate, onMonthClick }: YearViewProps) => {
  const today = new Date();
  const months = Array.from({ length: 12 }, (_, i) => setMonth(currentDate, i));
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const getMiniCalendarDays = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {months.map(month => {
        const days = getMiniCalendarDays(month);
        
        return (
          <div
            key={month.toISOString()}
            onClick={() => onMonthClick(month)}
            className="bg-card rounded-lg border p-3 cursor-pointer hover:border-primary/50 transition-colors"
          >
            <h3 className="font-semibold text-center mb-2 capitalize">
              {format(month, 'MMMM', { locale: ptBR })}
            </h3>
            
            {/* Mini calendar */}
            <div className="grid grid-cols-7 gap-0.5 text-xs">
              {/* Week day headers */}
              {weekDays.map((day, i) => (
                <div key={i} className="text-center text-muted-foreground font-medium py-0.5">
                  {day}
                </div>
              ))}
              
              {/* Days */}
              {days.map(day => {
                const isCurrentMonth = isSameMonth(day, month);
                const isToday = isSameDay(day, today);
                
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "text-center py-0.5 rounded",
                      !isCurrentMonth && "text-muted-foreground/50",
                      isToday && "bg-primary text-primary-foreground font-bold"
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

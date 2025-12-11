import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2, Sparkles, BookOpen, Trash2 } from 'lucide-react';
import { CalendarEvent, CreateEventData, EventType } from '@/hooks/useCalendarEvents';
import { Subject } from '@/hooks/useSubjects';

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  subjects: Subject[];
  onSubmit: (data: CreateEventData) => Promise<boolean>;
  onDelete?: (eventId: string) => Promise<boolean>;
  defaultDate?: Date;
}

const EVENT_TYPES = [
  { value: 'occupied', label: 'Aula/Compromisso Fixo', description: 'Horário ocupado com atividades fixas' },
  { value: 'free_study', label: 'Horário Livre para Estudo', description: 'Disponível para sugestões de estudo da IA' },
  { value: 'deadline', label: 'Prazo (Prova/Entrega)', description: 'Data limite vinculada a uma matéria' }
];

const WEEKDAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' }
];

type StudyMode = 'ai' | 'manual';

export const EventFormDialog = ({
  open,
  onOpenChange,
  event,
  subjects,
  onSubmit,
  onDelete,
  defaultDate
}: EventFormDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType>('occupied');
  const [subjectId, setSubjectId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>(defaultDate || new Date());
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>();
  
  // New: Study mode for free_study events
  const [studyMode, setStudyMode] = useState<StudyMode>('ai');

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setEventType(event.event_type);
      setSubjectId(event.subject_id || '');
      const eventDate = new Date(event.start_datetime);
      setStartDate(eventDate);
      setStartTime(format(eventDate, 'HH:mm'));
      if (event.end_datetime) {
        setEndTime(format(new Date(event.end_datetime), 'HH:mm'));
      }
      setIsRecurring(event.is_recurring);
      setRecurrenceDays(event.recurrence_days || []);
      if (event.recurrence_end_date) {
        setRecurrenceEndDate(new Date(event.recurrence_end_date));
      }
      // Set study mode based on whether subject is assigned
      setStudyMode(event.subject_id ? 'manual' : 'ai');
    } else {
      setTitle('');
      setDescription('');
      setEventType('occupied');
      setSubjectId('');
      setStartDate(defaultDate || new Date());
      setStartTime('08:00');
      setEndTime('09:00');
      setIsRecurring(false);
      setRecurrenceDays([]);
      setRecurrenceEndDate(undefined);
      setStudyMode('ai');
    }
  }, [event, defaultDate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) return;

    setLoading(true);
    try {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const startDatetime = new Date(startDate);
      startDatetime.setHours(startHour, startMin, 0, 0);

      const endDatetime = new Date(startDate);
      endDatetime.setHours(endHour, endMin, 0, 0);

      // For free_study events, only set subject_id if manual mode
      const effectiveSubjectId = eventType === 'free_study' 
        ? (studyMode === 'manual' ? subjectId : undefined)
        : (eventType === 'deadline' ? subjectId : undefined);

      const data: CreateEventData = {
        title,
        description: description || undefined,
        event_type: eventType,
        subject_id: effectiveSubjectId,
        start_datetime: startDatetime.toISOString(),
        end_datetime: endDatetime.toISOString(),
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? 'weekly' : undefined,
        recurrence_days: isRecurring ? recurrenceDays : undefined,
        recurrence_end_date: isRecurring && recurrenceEndDate ? format(recurrenceEndDate, 'yyyy-MM-dd') : undefined
      };

      const success = await onSubmit(data);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;
    
    setDeleteLoading(true);
    try {
      const success = await onDelete(event.id);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setRecurrenceDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  // Filter only active subjects (not finished)
  const activeSubjects = subjects.filter(s => s.status !== 'finalizada');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? 'Editar Evento' : 'Novo Evento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Evento</Label>
            <RadioGroup
              value={eventType}
              onValueChange={(v) => setEventType(v as EventType)}
              className="space-y-2"
            >
              {EVENT_TYPES.map(type => (
                <div key={type.value} className="flex items-start space-x-3">
                  <RadioGroupItem value={type.value} id={type.value} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={type.value} className="font-medium cursor-pointer">
                      {type.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Estudar Cálculo, Prova de Física..."
              required
            />
          </div>

          {/* Free Study Mode Selection */}
          {eventType === 'free_study' && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
              <Label className="text-sm font-medium">Como definir a matéria?</Label>
              <RadioGroup
                value={studyMode}
                onValueChange={(v) => setStudyMode(v as StudyMode)}
                className="space-y-2"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="ai" id="study-ai" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="study-ai" className="font-medium cursor-pointer flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Sugestão da IA
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      A IA escolherá a melhor matéria com base em prioridade, dificuldade e prazos
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="manual" id="study-manual" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="study-manual" className="font-medium cursor-pointer flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Escolher matéria específica
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Você define qual matéria estudar neste horário
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {studyMode === 'manual' && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="study-subject">Matéria *</Label>
                  <Select value={subjectId} onValueChange={setSubjectId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a matéria" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSubjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {eventType === 'deadline' && (
            <div className="space-y-2">
              <Label htmlFor="subject">Matéria Vinculada *</Label>
              <Select value={subjectId} onValueChange={setSubjectId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a matéria" />
                </SelectTrigger>
                <SelectContent>
                  {activeSubjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">Horário</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          {eventType !== 'deadline' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="recurring">Evento Recorrente</Label>
                  <p className="text-xs text-muted-foreground">Repete semanalmente</p>
                </div>
                <Switch
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>

              {isRecurring && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>Dias da Semana</Label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={cn(
                            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                            recurrenceDays.includes(day.value)
                              ? "bg-primary text-primary-foreground"
                              : "bg-background border hover:bg-muted"
                          )}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Repetir Até</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !recurrenceEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {recurrenceEndDate ? format(recurrenceEndDate, "dd/MM/yyyy") : "Fim do período letivo"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={recurrenceEndDate}
                          onSelect={setRecurrenceEndDate}
                          initialFocus
                          className="pointer-events-auto"
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-between pt-4">
            {/* Delete button - only show when editing */}
            {event && onDelete && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Excluir
              </Button>
            )}
            
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {event ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

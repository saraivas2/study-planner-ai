import { useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Sparkles, BookOpen, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Subject } from '@/hooks/useSubjects';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { useStudySuggestions, SubjectPriority, StudySuggestion } from '@/hooks/useStudySuggestions';
import { StudySuggestionCard } from './StudySuggestionCard';
import { PriorityScoreCard } from './PriorityScoreCard';

interface StudySuggestionsPanelProps {
  subjects: Subject[];
  freeSlots: CalendarEvent[];
  deadlines: CalendarEvent[];
  onNavigateToCalendar?: () => void;
}

export const StudySuggestionsPanel = ({
  subjects,
  freeSlots,
  deadlines,
  onNavigateToCalendar
}: StudySuggestionsPanelProps) => {
  const {
    delays,
    loading,
    fetchDelays,
    calculateSubjectPriorities,
    generateSuggestions,
    markAsDelayed
  } = useStudySuggestions();

  useEffect(() => {
    fetchDelays();
  }, [fetchDelays]);

  const priorities: SubjectPriority[] = useMemo(() => {
    return calculateSubjectPriorities(subjects, deadlines, delays);
  }, [subjects, deadlines, delays, calculateSubjectPriorities]);

  const suggestions: StudySuggestion[] = useMemo(() => {
    return generateSuggestions(subjects, freeSlots, deadlines, delays);
  }, [subjects, freeSlots, deadlines, delays, generateSuggestions]);

  const subjectsWithoutWeights = subjects.filter(
    s => !s.difficulty_weight || !s.dedication_weight
  );

  const noFreeSlots = freeSlots.length === 0;
  const noSubjectsWithWeights = priorities.length === 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Sugestões de Estudo
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {subjectsWithoutWeights.length > 0 && (
          <Alert variant="destructive" className="mx-4 mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              {subjectsWithoutWeights.length} matéria(s) não têm pesos definidos. 
              Configure os pesos de Dificuldade e Dedicação na página de Matérias para receber sugestões.
            </AlertDescription>
          </Alert>
        )}

        {noFreeSlots && (
          <Alert className="mx-4 mb-4">
            <Calendar className="h-4 w-4" />
            <AlertTitle>Sem horários livres</AlertTitle>
            <AlertDescription>
              Adicione horários "Livre para Estudo" no calendário para receber sugestões personalizadas.
              {onNavigateToCalendar && (
                <Button 
                  variant="link" 
                  className="p-0 h-auto ml-1"
                  onClick={onNavigateToCalendar}
                >
                  Ir para o calendário
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="suggestions" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mx-4 mb-2" style={{ width: 'calc(100% - 2rem)' }}>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Sugestões ({suggestions.length})
            </TabsTrigger>
            <TabsTrigger value="priorities" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Prioridades ({priorities.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="mt-0">
            <ScrollArea className="h-[400px] px-4">
              {suggestions.length > 0 ? (
                <div className="space-y-4 pb-4">
                  {suggestions.map((suggestion, index) => (
                    <StudySuggestionCard
                      key={`${suggestion.freeSlot.id}-${index}`}
                      suggestion={suggestion}
                      onMarkDelayed={markAsDelayed}
                      isLoading={loading}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">
                    {noSubjectsWithWeights 
                      ? "Configure os pesos das matérias para gerar sugestões"
                      : noFreeSlots
                        ? "Adicione horários livres no calendário"
                        : "Nenhuma sugestão disponível no momento"}
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="priorities" className="mt-0">
            <ScrollArea className="h-[400px] px-4">
              {priorities.length > 0 ? (
                <div className="space-y-4 pb-4">
                  {priorities.map((priority, index) => (
                    <PriorityScoreCard
                      key={priority.subject.id}
                      priority={priority}
                      rank={index}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">
                    Configure os pesos de Dificuldade e Dedicação nas matérias para ver as prioridades
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

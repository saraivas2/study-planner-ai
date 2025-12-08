import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, BookOpen, Coffee, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudyBlock, StudySuggestion } from '@/hooks/useStudySuggestions';
import { cn } from '@/lib/utils';

interface StudySuggestionCardProps {
  suggestion: StudySuggestion;
  onMarkDelayed: (subjectId: string) => void;
  onMarkCompleted?: (blockId: string) => void;
  isLoading?: boolean;
}

export const StudySuggestionCard = ({
  suggestion,
  onMarkDelayed,
  onMarkCompleted,
  isLoading
}: StudySuggestionCardProps) => {
  const { freeSlot, blocks } = suggestion;
  const studyBlocks = blocks.filter(b => !b.isBreak);
  const uniqueSubjects = [...new Map(studyBlocks.map(b => [b.subject.id, b.subject])).values()];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-accent/10 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" />
            {format(new Date(freeSlot.start_datetime), "EEEE, dd/MM", { locale: ptBR })}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {format(new Date(freeSlot.start_datetime), "HH:mm")} - {format(new Date(freeSlot.end_datetime!), "HH:mm")}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-3">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors",
              block.isBreak 
                ? "bg-muted/50 border border-dashed border-muted-foreground/20" 
                : "bg-primary/5 border border-primary/20"
            )}
          >
            {block.isBreak ? (
              <>
                <Coffee className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Pausa</p>
                  <p className="text-xs text-muted-foreground/70">
                    {format(block.startTime, "HH:mm")} - {format(block.endTime, "HH:mm")}
                  </p>
                </div>
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{block.subject.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(block.startTime, "HH:mm")} - {format(block.endTime, "HH:mm")}
                    <span className="ml-2">
                      ({Math.round((block.endTime.getTime() - block.startTime.getTime()) / 60000)} min)
                    </span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkDelayed(block.subject.id)}
                  disabled={isLoading}
                  className="text-xs hover:bg-destructive/10 hover:text-destructive"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Não consegui
                </Button>
              </>
            )}
          </div>
        ))}

        {uniqueSubjects.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {uniqueSubjects.map(subject => (
              <Badge key={subject.id} variant="secondary" className="text-xs">
                {subject.code || subject.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

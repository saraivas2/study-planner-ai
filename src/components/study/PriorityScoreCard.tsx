import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, Clock, Brain, Target, AlertTriangle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SubjectPriority } from '@/hooks/useStudySuggestions';
import { cn } from '@/lib/utils';

interface PriorityScoreCardProps {
  priority: SubjectPriority;
  rank: number;
}

export const PriorityScoreCard = ({ priority, rank }: PriorityScoreCardProps) => {
  const { 
    subject, 
    difficultyWeight, 
    dedicationWeight, 
    urgencyFactor, 
    delayBonus, 
    score, 
    nearestDeadline 
  } = priority;

  const maxPossibleScore = (5 + 5) * (1 + 1.5) + 2; // Max D + Max B with max urgency + delay bonus
  const scorePercentage = (score / maxPossibleScore) * 100;

  const getUrgencyLabel = (factor: number): string => {
    if (factor >= 1.0) return 'Alta';
    if (factor >= 0.5) return 'Média';
    return 'Baixa';
  };

  const getUrgencyColor = (factor: number): string => {
    if (factor >= 1.0) return 'text-destructive';
    if (factor >= 0.5) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all hover:shadow-md",
      rank === 0 && "ring-2 ring-primary"
    )}>
      {rank === 0 && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg">
          Prioridade #1
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{subject.name}</CardTitle>
            {subject.code && (
              <p className="text-sm text-muted-foreground">{subject.code}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{score.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Score P</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Progress value={scorePercentage} className="h-2" />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Dificuldade:</span>
            <span className="font-medium">{difficultyWeight}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-secondary-foreground" />
            <span className="text-muted-foreground">Dedicação:</span>
            <span className="font-medium">{dedicationWeight}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className={cn("h-4 w-4", getUrgencyColor(urgencyFactor))} />
            <span className="text-muted-foreground">Urgência:</span>
            <span className={cn("font-medium", getUrgencyColor(urgencyFactor))}>
              {getUrgencyLabel(urgencyFactor)}
            </span>
          </div>

          {delayBonus > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-muted-foreground">Bônus atraso:</span>
              <span className="font-medium text-warning">+{delayBonus}</span>
            </div>
          )}
        </div>

        {nearestDeadline && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg text-sm">
            <Calendar className="h-4 w-4 text-destructive" />
            <span className="text-muted-foreground">Próximo prazo:</span>
            <span className="font-medium">
              {format(new Date(nearestDeadline.start_datetime), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </span>
            <Badge variant="outline" className="ml-auto text-xs">
              {nearestDeadline.title}
            </Badge>
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Fórmula: P = (D + B) × (1 + U) {delayBonus > 0 ? '+ Bônus' : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            = ({difficultyWeight} + {dedicationWeight}) × (1 + {urgencyFactor}) {delayBonus > 0 ? `+ ${delayBonus}` : ''} = {score.toFixed(1)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

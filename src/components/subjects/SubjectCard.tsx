import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { AlertTriangle, Clock, Edit, Trash2, User } from 'lucide-react';
import { Subject } from '@/hooks/useSubjects';
import { useState } from 'react';

interface SubjectCardProps {
  subject: Subject;
  onEdit: (subject: Subject) => void;
  onDelete: (id: string) => void;
  onUpdateWeights: (id: string, difficulty: number, dedication: number) => void;
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const SubjectCard = ({ subject, onEdit, onDelete, onUpdateWeights }: SubjectCardProps) => {
  const [difficulty, setDifficulty] = useState(subject.difficulty_weight || 3);
  const [dedication, setDedication] = useState(subject.dedication_weight || 3);
  const [hasChanges, setHasChanges] = useState(false);

  const needsWeights = !subject.difficulty_weight || !subject.dedication_weight;

  const handleDifficultyChange = (value: number[]) => {
    setDifficulty(value[0]);
    setHasChanges(true);
  };

  const handleDedicationChange = (value: number[]) => {
    setDedication(value[0]);
    setHasChanges(true);
  };

  const handleSaveWeights = () => {
    onUpdateWeights(subject.id, difficulty, dedication);
    setHasChanges(false);
  };

  const formatSchedule = () => {
    if (!subject.schedules || subject.schedules.length === 0) return 'Sem horário definido';
    
    return subject.schedules.map(s => 
      `${DAY_NAMES[s.day_of_week]} ${s.start_time?.slice(0, 5)}-${s.end_time?.slice(0, 5)}`
    ).join(' | ');
  };

  return (
    <Card className={`relative ${needsWeights ? 'border-warning' : ''}`}>
      {needsWeights && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-warning text-warning-foreground rounded-full p-1.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {subject.code && (
                <Badge variant="outline" className="font-mono text-xs">
                  {subject.code}
                </Badge>
              )}
              {subject.type && (
                <Badge variant="secondary" className="text-xs">
                  {subject.type}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">{subject.name}</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(subject)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(subject.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {subject.professor && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span>{subject.professor}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span className="text-xs">{formatSchedule()}</span>
        </div>

        <div className="space-y-4 pt-2 border-t">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Dificuldade</span>
              <span className="text-sm text-muted-foreground">{difficulty}/5</span>
            </div>
            <Slider
              value={[difficulty]}
              onValueChange={handleDifficultyChange}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Dedicação Necessária</span>
              <span className="text-sm text-muted-foreground">{dedication}/5</span>
            </div>
            <Slider
              value={[dedication]}
              onValueChange={handleDedicationChange}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>

          {hasChanges && (
            <Button 
              onClick={handleSaveWeights} 
              className="w-full"
              variant="accent"
            >
              Salvar Pesos
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

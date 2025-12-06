import { Subject, CreateSubjectData } from '@/hooks/useSubjects';
import { SubjectCard } from './SubjectCard';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

interface SubjectsListProps {
  subjects: Subject[];
  loading: boolean;
  onEdit: (subject: Subject) => void;
  onDelete: (id: string) => void;
  onUpdateWeights: (id: string, difficulty: number, dedication: number) => void;
}

export const SubjectsList = ({ subjects, loading, onEdit, onDelete, onUpdateWeights }: SubjectsListProps) => {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-64" />
          </Card>
        ))}
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
            <BookOpen className="w-10 h-10 text-accent" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Nenhuma matéria cadastrada
          </h3>
          <p className="text-muted-foreground max-w-md">
            Adicione suas matérias manualmente ou importe seu atestado de matrícula 
            para extrair automaticamente sua grade horária.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {subjects.map(subject => (
        <SubjectCard
          key={subject.id}
          subject={subject}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdateWeights={onUpdateWeights}
        />
      ))}
    </div>
  );
};

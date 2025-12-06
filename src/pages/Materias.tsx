import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubjects, Subject, CreateSubjectData } from '@/hooks/useSubjects';
import { useProfile } from '@/hooks/useProfile';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Upload, Loader2, AlertTriangle } from 'lucide-react';
import { EnrollmentUpload } from '@/components/subjects/EnrollmentUpload';
import { SubjectsList } from '@/components/subjects/SubjectsList';
import { SubjectFormDialog } from '@/components/subjects/SubjectFormDialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Materias = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { 
    subjects, 
    loading: subjectsLoading, 
    createSubject, 
    updateSubject, 
    deleteSubject, 
    updateWeights,
    importFromExtraction,
    subjectsWithoutWeights 
  } = useSubjects();
  const navigate = useNavigate();

  const [showUpload, setShowUpload] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || subjectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: CreateSubjectData) => {
    if (editingSubject) {
      await updateSubject(editingSubject.id, data);
    } else {
      await createSubject(data);
    }
    setEditingSubject(null);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteSubject(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const handleExtracted = async (data: any) => {
    if (data.subjects && data.subjects.length > 0) {
      await importFromExtraction(data.subjects);
    }
    setShowUpload(false);
  };

  const handleProfileUpdate = async (profileData: any) => {
    if (!profileData) return;
    
    const updates: any = {};
    if (profileData.full_name) updates.full_name = profileData.full_name;
    if (profileData.institution) updates.institution = profileData.institution;
    if (profileData.enrollment_number) updates.enrollment_number = profileData.enrollment_number;
    if (profileData.course) updates.course = profileData.course;
    if (profileData.semester) updates.semester = profileData.semester;
    if (profileData.period_start) updates.period_start = profileData.period_start;
    if (profileData.period_end) updates.period_end = profileData.period_end;

    if (Object.keys(updates).length > 0) {
      await updateProfile(updates);
      toast.success('Dados do perfil atualizados automaticamente');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Matérias</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas disciplinas e grade horária
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => setShowUpload(!showUpload)}
            >
              <Upload className="w-4 h-4" />
              {showUpload ? 'Fechar Upload' : 'Importar Atestado'}
            </Button>
            <Button 
              variant="accent" 
              className="flex items-center gap-2"
              onClick={() => {
                setEditingSubject(null);
                setShowForm(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Adicionar Matéria
            </Button>
          </div>
        </div>

        {subjectsWithoutWeights.length > 0 && (
          <Alert variant="default" className="border-warning bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning-foreground">
              <strong>{subjectsWithoutWeights.length}</strong> matéria(s) sem pesos definidos. 
              Configure os pesos de Dificuldade e Dedicação para cada matéria.
            </AlertDescription>
          </Alert>
        )}

        {showUpload && (
          <EnrollmentUpload 
            onExtracted={handleExtracted}
            onProfileUpdate={handleProfileUpdate}
          />
        )}

        <SubjectsList
          subjects={subjects}
          loading={subjectsLoading}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteConfirm(id)}
          onUpdateWeights={updateWeights}
        />

        {subjects.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-l-4 border-l-accent">
              <CardHeader>
                <CardTitle className="text-lg">Importação Automática</CardTitle>
                <CardDescription>
                  Faça upload do seu atestado de matrícula em PDF e extrairemos 
                  automaticamente suas matérias e horários usando IA.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-warning">
              <CardHeader>
                <CardTitle className="text-lg">Pesos de Estudo</CardTitle>
                <CardDescription>
                  Defina pesos de Dificuldade e Dedicação para cada matéria. 
                  A IA usará esses dados para priorizar suas sugestões de estudo.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        <SubjectFormDialog
          open={showForm}
          onOpenChange={setShowForm}
          subject={editingSubject}
          onSubmit={handleFormSubmit}
        />

        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover esta matéria? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Materias;

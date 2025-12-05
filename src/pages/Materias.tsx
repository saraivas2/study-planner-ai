import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, Upload, Loader2 } from 'lucide-react';

const Materias = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

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
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Importar Atestado
            </Button>
            <Button variant="accent" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Matéria
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
              <BookOpen className="w-10 h-10 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhuma matéria cadastrada
            </h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Adicione suas matérias manualmente ou importe seu atestado de matrícula 
              para extrair automaticamente sua grade horária.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Importar Atestado de Matrícula
              </Button>
              <Button variant="accent" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Manualmente
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
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
      </div>
    </MainLayout>
  );
};

export default Materias;

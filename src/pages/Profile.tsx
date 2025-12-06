import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, GraduationCap, Calendar, Save, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { profileSchema } from '@/lib/validations';
import { z } from 'zod';

const Profile = () => {
  const { profile, loading, updateProfile } = useProfile();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    birth_date: '',
    institution: '',
    course: '',
    semester: '',
    enrollment_number: '',
    period_start: '',
    period_end: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || user?.email || '',
        phone: profile.phone || '',
        birth_date: profile.birth_date || '',
        institution: profile.institution || '',
        course: profile.course || '',
        semester: profile.semester?.toString() || '',
        enrollment_number: profile.enrollment_number || '',
        period_start: profile.period_start || '',
        period_end: profile.period_end || '',
      });
    }
  }, [profile, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    setErrors({});
    
    try {
      profileSchema.parse({
        ...formData,
        semester: formData.semester ? parseInt(formData.semester) : null,
        period_start: formData.period_start || null,
        period_end: formData.period_end || null,
      });

      // Additional validation: period_end must be after period_start
      if (formData.period_start && formData.period_end) {
        if (new Date(formData.period_end) <= new Date(formData.period_start)) {
          setErrors({ period_end: 'Data de fim deve ser posterior à data de início' });
          return false;
        }
      }

      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: { [key: string]: string } = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário.');
      return;
    }

    setIsSaving(true);
    
    // Check if period changed - this will trigger recalculation in future modules
    const periodChanged = 
      profile?.period_start !== (formData.period_start || null) ||
      profile?.period_end !== (formData.period_end || null);

    const updates = {
      full_name: formData.full_name || null,
      phone: formData.phone || null,
      birth_date: formData.birth_date || null,
      institution: formData.institution || null,
      course: formData.course || null,
      semester: formData.semester ? parseInt(formData.semester) : null,
      enrollment_number: formData.enrollment_number || null,
      period_start: formData.period_start || null,
      period_end: formData.period_end || null,
    };

    const { error } = await updateProfile(updates);
    
    if (!error && periodChanged && formData.period_start && formData.period_end) {
      toast.info('Período letivo atualizado. As sugestões de estudo serão recalculadas.');
    }

    setIsSaving(false);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas informações pessoais e acadêmicas
          </p>
        </div>

        {/* Avatar Section */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary to-accent/50" />
          <CardContent className="relative pt-0">
            <div className="absolute -top-12 left-6">
              <div className="w-24 h-24 rounded-2xl bg-card border-4 border-card flex items-center justify-center shadow-lg">
                <span className="text-4xl font-bold text-primary">
                  {formData.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            </div>
            <div className="ml-32 pt-4 pb-2">
              <h2 className="text-xl font-semibold text-foreground">
                {formData.full_name || 'Usuário'}
              </h2>
              <p className="text-muted-foreground text-sm">{formData.email}</p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Dados</span> Pessoais
            </TabsTrigger>
            <TabsTrigger value="academic" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Dados</span> Acadêmicos
            </TabsTrigger>
            <TabsTrigger value="period" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Período
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Seus dados pessoais de identificação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="Seu nome completo"
                      className={errors.full_name ? 'border-destructive' : ''}
                    />
                    {errors.full_name && (
                      <p className="text-xs text-destructive">{errors.full_name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="seu@email.com"
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Email não pode ser alterado</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                      className={errors.phone ? 'border-destructive' : ''}
                    />
                    {errors.phone && (
                      <p className="text-xs text-destructive">{errors.phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Data de Nascimento</Label>
                    <Input
                      id="birth_date"
                      name="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academic" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle>Informações Acadêmicas</CardTitle>
                <CardDescription>
                  Dados da sua instituição e curso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="institution">Instituição de Ensino</Label>
                    <Input
                      id="institution"
                      name="institution"
                      value={formData.institution}
                      onChange={handleChange}
                      placeholder="Nome da universidade/faculdade"
                      className={errors.institution ? 'border-destructive' : ''}
                    />
                    {errors.institution && (
                      <p className="text-xs text-destructive">{errors.institution}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course">Curso</Label>
                    <Input
                      id="course"
                      name="course"
                      value={formData.course}
                      onChange={handleChange}
                      placeholder="Seu curso"
                      className={errors.course ? 'border-destructive' : ''}
                    />
                    {errors.course && (
                      <p className="text-xs text-destructive">{errors.course}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="semester">Semestre Atual</Label>
                    <Input
                      id="semester"
                      name="semester"
                      type="number"
                      min="1"
                      max="20"
                      value={formData.semester}
                      onChange={handleChange}
                      placeholder="Ex: 5"
                      className={errors.semester ? 'border-destructive' : ''}
                    />
                    {errors.semester && (
                      <p className="text-xs text-destructive">{errors.semester}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="enrollment_number">Matrícula</Label>
                    <Input
                      id="enrollment_number"
                      name="enrollment_number"
                      value={formData.enrollment_number}
                      onChange={handleChange}
                      placeholder="Número da matrícula"
                      className={errors.enrollment_number ? 'border-destructive' : ''}
                    />
                    {errors.enrollment_number && (
                      <p className="text-xs text-destructive">{errors.enrollment_number}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="period" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle>Período Letivo</CardTitle>
                <CardDescription>
                  Defina as datas de início e fim do seu período letivo atual
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning">Atenção</p>
                    <p className="text-xs text-warning/80 mt-1">
                      Ao alterar o período letivo, todas as sugestões de estudo futuras serão removidas 
                      e a IA irá recalcular o plano para o novo período.
                    </p>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="period_start">Data de Início</Label>
                    <Input
                      id="period_start"
                      name="period_start"
                      type="date"
                      value={formData.period_start}
                      onChange={handleChange}
                      className={errors.period_start ? 'border-destructive' : ''}
                    />
                    {errors.period_start && (
                      <p className="text-xs text-destructive">{errors.period_start}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period_end">Data de Fim</Label>
                    <Input
                      id="period_end"
                      name="period_end"
                      type="date"
                      value={formData.period_end}
                      onChange={handleChange}
                      className={errors.period_end ? 'border-destructive' : ''}
                    />
                    {errors.period_end && (
                      <p className="text-xs text-destructive">{errors.period_end}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button
            variant="accent"
            size="lg"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;

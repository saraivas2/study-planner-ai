import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { Subject, CreateSubjectData, SubjectSchedule } from '@/hooks/useSubjects';

interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: Subject | null;
  onSubmit: (data: CreateSubjectData) => Promise<void>;
}

const DAY_OPTIONS = [
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' },
  { value: '0', label: 'Domingo' },
];

const TYPE_OPTIONS = ['MÓDULO', 'DISCIPLINA', 'LABORATÓRIO', 'ESTÁGIO', 'TCC', 'OUTRO'];

export const SubjectFormDialog = ({ open, onOpenChange, subject, onSubmit }: SubjectFormDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateSubjectData>({
    code: '',
    name: '',
    professor: '',
    type: 'MÓDULO',
    class_group: '',
    schedules: []
  });

  useEffect(() => {
    if (subject) {
      setFormData({
        code: subject.code || '',
        name: subject.name,
        professor: subject.professor || '',
        type: subject.type || 'MÓDULO',
        class_group: subject.class_group || '',
        schedules: subject.schedules?.map(s => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          location: s.location
        })) || []
      });
    } else {
      setFormData({
        code: '',
        name: '',
        professor: '',
        type: 'MÓDULO',
        class_group: '',
        schedules: []
      });
    }
  }, [subject, open]);

  const handleAddSchedule = () => {
    setFormData(prev => ({
      ...prev,
      schedules: [...(prev.schedules || []), { day_of_week: 1, start_time: '08:00', end_time: '10:00', location: '' }]
    }));
  };

  const handleRemoveSchedule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules?.filter((_, i) => i !== index)
    }));
  };

  const handleScheduleChange = (index: number, field: keyof SubjectSchedule, value: any) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules?.map((s, i) => 
        i === index ? { ...s, [field]: field === 'day_of_week' ? parseInt(value) : value } : s
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{subject ? 'Editar Matéria' : 'Nova Matéria'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Ex: MAT101"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome da matéria"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="professor">Professor</Label>
              <Input
                id="professor"
                value={formData.professor}
                onChange={e => setFormData(prev => ({ ...prev, professor: e.target.value }))}
                placeholder="Nome do professor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={value => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="class_group">Turma</Label>
            <Input
              id="class_group"
              value={formData.class_group}
              onChange={e => setFormData(prev => ({ ...prev, class_group: e.target.value }))}
              placeholder="Ex: Turma A"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Horários</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddSchedule}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Horário
              </Button>
            </div>

            {formData.schedules?.map((schedule, index) => (
              <div key={index} className="flex items-end gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Dia</Label>
                  <Select
                    value={String(schedule.day_of_week)}
                    onValueChange={value => handleScheduleChange(index, 'day_of_week', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_OPTIONS.map(day => (
                        <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs">Início</Label>
                  <Input
                    type="time"
                    value={schedule.start_time}
                    onChange={e => handleScheduleChange(index, 'start_time', e.target.value)}
                  />
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs">Fim</Label>
                  <Input
                    type="time"
                    value={schedule.end_time}
                    onChange={e => handleScheduleChange(index, 'end_time', e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Local</Label>
                  <Input
                    value={schedule.location || ''}
                    onChange={e => handleScheduleChange(index, 'location', e.target.value)}
                    placeholder="Sala"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveSchedule(index)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="accent" disabled={loading}>
              {loading ? 'Salvando...' : (subject ? 'Salvar' : 'Criar Matéria')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

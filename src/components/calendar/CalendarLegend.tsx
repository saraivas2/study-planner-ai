import { Brain, Coffee } from 'lucide-react';

const LEGEND_ITEMS = [
  { color: 'bg-primary', label: 'Aulas' },
  { color: 'bg-destructive', label: 'Ocupado' },
  { color: 'bg-success', label: 'Livre para Estudo' },
  { color: 'bg-warning', label: 'Prazo/Prova' }
];

export const CalendarLegend = () => {
  return (
    <div className="flex flex-wrap gap-4 p-4 bg-card rounded-lg border">
      {LEGEND_ITEMS.map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded ${item.color}`} />
          <span className="text-sm text-muted-foreground">{item.label}</span>
        </div>
      ))}
      
      {/* Study suggestion indicators */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded bg-accent/50 border border-dashed border-accent flex items-center justify-center">
          <Brain className="w-2 h-2 text-accent-foreground" />
        </div>
        <span className="text-sm text-muted-foreground">Sugestão de Estudo</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded bg-muted/40 border border-dashed border-muted-foreground/30 flex items-center justify-center">
          <Coffee className="w-2 h-2 text-muted-foreground" />
        </div>
        <span className="text-sm text-muted-foreground">Pausa</span>
      </div>
    </div>
  );
};

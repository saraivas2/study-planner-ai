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
    </div>
  );
};

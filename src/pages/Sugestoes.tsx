import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubjects } from '@/hooks/useSubjects';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import MainLayout from '@/components/layout/MainLayout';
import { StudySuggestionsPanel } from '@/components/study/StudySuggestionsPanel';
import { Loader2 } from 'lucide-react';

const Sugestoes = () => {
  const { user, loading: authLoading } = useAuth();
  const { subjects, loading: subjectsLoading } = useSubjects();
  const { events, loading: eventsLoading, getFreeStudySlots, getDeadlines } = useCalendarEvents();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || subjectsLoading || eventsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const freeSlots = getFreeStudySlots();
  const deadlines = getDeadlines();

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sugestões de Estudo</h1>
          <p className="text-muted-foreground mt-1">
            Plano de estudos inteligente baseado em dificuldade, dedicação e urgência
          </p>
        </div>

        <StudySuggestionsPanel
          subjects={subjects}
          freeSlots={freeSlots}
          deadlines={deadlines}
          onNavigateToCalendar={() => navigate('/calendario')}
        />
      </div>
    </MainLayout>
  );
};

export default Sugestoes;

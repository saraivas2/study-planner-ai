/**
 * Componente de Toast para Lembrete de Estudo (Task 5.2)
 * 
 * Inclui botões de ação:
 * - "Começar Agora": Inicia contagem regressiva de 50 minutos
 * - "Adiar 10min": Adia o lembrete
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Clock, X, Coffee } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { notifyReminderDelayed, notifyStudySessionStarted, notifyStudySessionCompleted, notifyBreakTime } from '@/lib/notifications';

interface StudyReminderToastProps {
  subjectName: string;
  subjectId: string;
  startTime: Date;
  endTime: Date;
  onStartSession: (subjectId: string) => void;
  onDelay: (subjectId: string, minutes: number) => void;
  onDismiss: () => void;
  isVisible: boolean;
}

export const StudyReminderToast: React.FC<StudyReminderToastProps> = ({
  subjectName,
  subjectId,
  startTime,
  endTime,
  onStartSession,
  onDelay,
  onDismiss,
  isVisible,
}) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(50 * 60); // 50 minutos em segundos
  const [isPaused, setIsPaused] = useState(false);

  const timeRange = `${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}`;

  const handleStartNow = useCallback(() => {
    setIsSessionActive(true);
    setTimeRemaining(50 * 60);
    setIsPaused(false);
    onStartSession(subjectId);
    notifyStudySessionStarted(subjectName, 50);
  }, [subjectId, subjectName, onStartSession]);

  const handleDelay10Min = useCallback(() => {
    onDelay(subjectId, 10);
    notifyReminderDelayed(10);
    onDismiss();
  }, [subjectId, onDelay, onDismiss]);

  const handleSessionComplete = useCallback(() => {
    setIsSessionActive(false);
    notifyStudySessionCompleted(subjectName);
    notifyBreakTime();
    onDismiss();
  }, [subjectName, onDismiss]);

  const handlePauseResume = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!isSessionActive || isPaused) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSessionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSessionActive, isPaused, handleSessionComplete]);

  // Formatar tempo restante
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isVisible) return null;

  return (
    <Card className={cn(
      "fixed bottom-4 right-4 z-50 w-80 shadow-lg animate-in slide-in-from-right-5",
      "border-accent bg-card"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-accent/20 rounded-full">
              {isSessionActive ? (
                <Clock className="w-4 h-4 text-accent" />
              ) : (
                <Coffee className="w-4 h-4 text-accent" />
              )}
            </div>
            <div>
              <h4 className="font-semibold text-sm">
                {isSessionActive ? 'Sessão em andamento' : 'Hora de Estudar!'}
              </h4>
              <p className="text-xs text-muted-foreground">{subjectName}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {isSessionActive ? (
          // Modo sessão ativa com countdown
          <div className="space-y-3">
            <div className="text-center py-4">
              <span className="text-3xl font-mono font-bold text-accent">
                {formatTime(timeRemaining)}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {isPaused ? 'Pausado' : 'Tempo restante'}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePauseResume}
                className="flex-1"
              >
                {isPaused ? 'Continuar' : 'Pausar'}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSessionComplete}
                className="flex-1"
              >
                Concluir
              </Button>
            </div>
          </div>
        ) : (
          // Modo lembrete com botões de ação
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Horário programado: {timeRange}
            </p>
            
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleStartNow}
                className="flex-1 gap-1"
              >
                <Play className="w-3 h-3" />
                Começar Agora
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelay10Min}
                className="flex-1"
              >
                Adiar 10min
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudyReminderToast;

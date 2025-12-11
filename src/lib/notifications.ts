/**
 * Sistema de Notificações Ricas
 * 
 * Funções helper para criar notificações de prazo e estudo
 * com conteúdo obrigatório e botões de ação.
 */

import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DeadlineNotificationParams {
  subjectName: string;
  taskTitle: string;
  deadline: Date;
  variant?: "default" | "destructive";
}

export interface StudyReminderParams {
  subjectName: string;
  startTime: Date;
  endTime: Date;
  onStartNow?: () => void;
  onDelay?: () => void;
}

/**
 * Notificação de Prazo (Task 5.1)
 * Conteúdo obrigatório: Nome da Matéria, Título da Tarefa, Data/Hora Exata
 */
export function notifyDeadline({
  subjectName,
  taskTitle,
  deadline,
  variant = "default",
}: DeadlineNotificationParams) {
  const formattedDate = format(deadline, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  
  return toast({
    title: `⏰ Prazo: ${taskTitle}`,
    description: `${subjectName} - ${formattedDate}`,
    variant,
    duration: 10000, // 10 segundos para prazos
  });
}

/**
 * Notificação de Prazo em 7 dias
 */
export function notifyDeadline7Days(params: DeadlineNotificationParams) {
  const formattedDate = format(params.deadline, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  
  return toast({
    title: `📅 Prazo em 7 dias: ${params.taskTitle}`,
    description: `${params.subjectName} - ${formattedDate}`,
    variant: "default",
    duration: 8000,
  });
}

/**
 * Notificação de Prazo em 24 horas (urgente)
 */
export function notifyDeadline24Hours(params: DeadlineNotificationParams) {
  const formattedDate = format(params.deadline, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  
  return toast({
    title: `🚨 URGENTE - Prazo em 24h: ${params.taskTitle}`,
    description: `${params.subjectName} - ${formattedDate}`,
    variant: "destructive",
    duration: 15000, // Mais tempo para urgentes
  });
}

/**
 * Lembrete de Estudo com Botões de Ação (Task 5.2)
 * Inclui botões "Começar Agora" e "Adiar 10min"
 * 
 * Nota: Os botões são renderizados pelo componente StudyReminderToast
 */
export function notifyStudyReminder({
  subjectName,
  startTime,
  endTime,
}: StudyReminderParams) {
  const timeRange = `${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}`;
  
  return toast({
    title: `📚 Hora de Estudar!`,
    description: `${subjectName} - ${timeRange}`,
    duration: 30000, // 30 segundos para dar tempo de interagir
  });
}

/**
 * Notificação de sessão de estudo iniciada
 */
export function notifyStudySessionStarted(subjectName: string, durationMinutes: number = 50) {
  return toast({
    title: `▶️ Sessão Iniciada`,
    description: `Estudando ${subjectName} por ${durationMinutes} minutos`,
    duration: 5000,
  });
}

/**
 * Notificação de sessão de estudo concluída
 */
export function notifyStudySessionCompleted(subjectName: string) {
  return toast({
    title: `✅ Sessão Concluída!`,
    description: `Parabéns! Você completou o estudo de ${subjectName}`,
    duration: 8000,
  });
}

/**
 * Notificação de pausa sugerida
 */
export function notifyBreakTime() {
  return toast({
    title: `☕ Hora da Pausa`,
    description: `Descanse por 10 minutos antes de continuar`,
    duration: 10000,
  });
}

/**
 * Notificação de lembrete adiado
 */
export function notifyReminderDelayed(minutes: number = 10) {
  return toast({
    title: `⏳ Lembrete Adiado`,
    description: `Você será lembrado novamente em ${minutes} minutos`,
    duration: 3000,
  });
}

/**
 * Notificação genérica de sucesso
 */
export function notifySuccess(title: string, description?: string) {
  return toast({
    title: `✓ ${title}`,
    description,
    duration: 4000,
  });
}

/**
 * Notificação genérica de erro
 */
export function notifyError(title: string, description?: string) {
  return toast({
    title: `✗ ${title}`,
    description,
    variant: "destructive",
    duration: 6000,
  });
}

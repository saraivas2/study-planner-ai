/**
 * Parser Determinístico de Horários SIGAA
 * 
 * Este módulo converte códigos de horário SIGAA (ex: "3N34") em horários concretos.
 * A IA NÃO deve calcular horários - apenas extrair o código bruto.
 * Este parser faz a conversão matemática exata.
 */

export interface ParsedSchedule {
  day_of_week: number; // 0=Domingo, 1=Segunda, ..., 6=Sábado
  start_time: string;  // "HH:MM"
  end_time: string;    // "HH:MM"
}

// Mapeamento SIGAA: dígito -> dia da semana (0-indexed para JavaScript Date)
const DAY_MAP: Record<string, number> = {
  '2': 1, // Segunda-feira
  '3': 2, // Terça-feira
  '4': 3, // Quarta-feira
  '5': 4, // Quinta-feira
  '6': 5, // Sexta-feira
  '7': 6, // Sábado
};

// Tabela de horários HARDCODED - NÃO MODIFICAR
// Cada bloco tem [início, fim] no formato "HH:MM"
const SHIFT_BLOCKS: Record<string, Record<string, [string, string]>> = {
  'M': { // Manhã
    '1': ['07:00', '08:00'],
    '2': ['08:00', '09:00'],
    '3': ['09:00', '10:00'],
    '4': ['10:00', '11:00'],
    '5': ['11:00', '12:00'],
    '6': ['12:00', '13:00'],
  },
  'T': { // Tarde
    '1': ['13:00', '14:00'],
    '2': ['14:00', '15:00'],
    '3': ['15:00', '16:00'],
    '4': ['16:00', '17:00'],
    '5': ['17:00', '18:00'],
    '6': ['18:00', '19:00'],
  },
  'N': { // Noite - horários quebrados
    '1': ['18:30', '19:20'],
    '2': ['19:20', '20:10'],
    '3': ['20:10', '21:00'],
    '4': ['21:00', '21:50'],
  },
};

/**
 * Extrai componentes de um código SIGAA
 * Exemplo: "3N34" -> { dayDigit: "3", shift: "N", blocks: ["3", "4"] }
 */
function extractComponents(code: string): { dayDigit: string; shift: string; blocks: string[] } | null {
  // Regex: 1 dígito (dia) + 1 letra (turno) + 1-6 dígitos (blocos)
  const match = code.match(/^(\d)([MTN])(\d+)$/i);
  
  if (!match) {
    console.warn(`[sigaaParser] Código inválido: "${code}"`);
    return null;
  }
  
  const [, dayDigit, shift, blocksStr] = match;
  const blocks = blocksStr.split('');
  
  return {
    dayDigit,
    shift: shift.toUpperCase(),
    blocks,
  };
}

/**
 * Converte um código SIGAA em horário estruturado
 * 
 * @param code - Código SIGAA (ex: "3N34", "2T23", "5M12")
 * @returns ParsedSchedule ou null se inválido
 * 
 * Exemplos:
 * - "3N34" -> { day_of_week: 2, start_time: "20:10", end_time: "21:50" }
 * - "2T23" -> { day_of_week: 1, start_time: "14:00", end_time: "16:00" }
 * - "5M12" -> { day_of_week: 4, start_time: "07:00", end_time: "09:00" }
 */
export function parseSigaaSchedule(code: string): ParsedSchedule | null {
  if (!code || typeof code !== 'string') {
    return null;
  }

  const cleaned = code.trim().toUpperCase();
  const components = extractComponents(cleaned);
  
  if (!components) {
    return null;
  }

  const { dayDigit, shift, blocks } = components;

  // Validar dia
  const dayOfWeek = DAY_MAP[dayDigit];
  if (dayOfWeek === undefined) {
    console.warn(`[sigaaParser] Dia inválido: "${dayDigit}" no código "${code}"`);
    return null;
  }

  // Validar turno
  const shiftBlocks = SHIFT_BLOCKS[shift];
  if (!shiftBlocks) {
    console.warn(`[sigaaParser] Turno inválido: "${shift}" no código "${code}"`);
    return null;
  }

  // Validar e ordenar blocos
  const validBlocks = blocks.filter(b => shiftBlocks[b]);
  if (validBlocks.length === 0) {
    console.warn(`[sigaaParser] Nenhum bloco válido no código "${code}"`);
    return null;
  }

  // Ordenar blocos numericamente
  validBlocks.sort((a, b) => parseInt(a) - parseInt(b));

  // Primeiro bloco = horário de início
  // Último bloco = horário de fim
  const firstBlock = validBlocks[0];
  const lastBlock = validBlocks[validBlocks.length - 1];

  const startTime = shiftBlocks[firstBlock][0];
  const endTime = shiftBlocks[lastBlock][1];

  console.log(`[sigaaParser] "${code}" -> dia=${dayOfWeek}, ${startTime}-${endTime}`);

  return {
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
  };
}

/**
 * Processa múltiplos códigos SIGAA separados por espaço ou vírgula
 * Exemplo: "3N34 5N34" -> [{ day: 2, ... }, { day: 4, ... }]
 */
export function parseMultipleSigaaSchedules(codes: string): ParsedSchedule[] {
  if (!codes || typeof codes !== 'string') {
    return [];
  }

  // Separa por espaço, vírgula ou ponto-e-vírgula
  const codeList = codes.split(/[\s,;]+/).filter(Boolean);
  
  const results: ParsedSchedule[] = [];
  
  for (const code of codeList) {
    const parsed = parseSigaaSchedule(code);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

/**
 * Valida se um código SIGAA é sintaticamente válido
 */
export function isValidSigaaCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }
  
  return /^\d[MTN]\d+$/i.test(code.trim());
}

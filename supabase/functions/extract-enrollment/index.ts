import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// PARSER DETERMINÍSTICO DE HORÁRIOS SIGAA
// A IA NÃO calcula horários - apenas extrai o código
// Este parser faz a conversão matemática exata
// ============================================

interface ParsedSchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string | null;
}

// Mapeamento SIGAA: dígito -> dia da semana
const DAY_MAP: Record<string, number> = {
  '2': 1, // Segunda-feira
  '3': 2, // Terça-feira
  '4': 3, // Quarta-feira
  '5': 4, // Quinta-feira
  '6': 5, // Sexta-feira
  '7': 6, // Sábado
};

// Tabela de horários HARDCODED - NÃO MODIFICAR
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

function parseSigaaSchedule(code: string): ParsedSchedule | null {
  if (!code || typeof code !== 'string') return null;

  const cleaned = code.trim().toUpperCase();
  const match = cleaned.match(/^(\d)([MTN])(\d+)$/i);
  
  if (!match) {
    console.warn(`[sigaaParser] Código inválido: "${code}"`);
    return null;
  }

  const [, dayDigit, shift, blocksStr] = match;
  const blocks = blocksStr.split('');

  const dayOfWeek = DAY_MAP[dayDigit];
  if (dayOfWeek === undefined) {
    console.warn(`[sigaaParser] Dia inválido: "${dayDigit}"`);
    return null;
  }

  const shiftBlocks = SHIFT_BLOCKS[shift.toUpperCase()];
  if (!shiftBlocks) {
    console.warn(`[sigaaParser] Turno inválido: "${shift}"`);
    return null;
  }

  const validBlocks = blocks.filter(b => shiftBlocks[b]);
  if (validBlocks.length === 0) {
    console.warn(`[sigaaParser] Nenhum bloco válido em "${code}"`);
    return null;
  }

  validBlocks.sort((a, b) => parseInt(a) - parseInt(b));

  const firstBlock = validBlocks[0];
  const lastBlock = validBlocks[validBlocks.length - 1];

  console.log(`[sigaaParser] "${code}" -> dia=${dayOfWeek}, ${shiftBlocks[firstBlock][0]}-${shiftBlocks[lastBlock][1]}`);

  return {
    day_of_week: dayOfWeek,
    start_time: shiftBlocks[firstBlock][0],
    end_time: shiftBlocks[lastBlock][1],
    location: null,
  };
}

function parseMultipleSigaaCodes(codes: string): ParsedSchedule[] {
  if (!codes || typeof codes !== 'string') return [];
  
  const codeList = codes.split(/[\s,;]+/).filter(Boolean);
  const results: ParsedSchedule[] = [];
  
  for (const code of codeList) {
    const parsed = parseSigaaSchedule(code);
    if (parsed) results.push(parsed);
  }
  
  return results;
}

// Status válidos para matrícula
const VALID_STATUS = ['MATRICULADO'];
const INVALID_STATUS = ['INDEFERIDO', 'CANCELADO', 'TRANCADO', 'DISPENSADO', 'EXCLUIDO', 'REJEITADO'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, mimeType } = await req.json();
    
    if (!fileBase64) {
      console.error('No file provided in request');
      return new Response(
        JSON.stringify({ error: 'Nenhum arquivo fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mimeType) {
      console.error('No mimeType provided in request');
      return new Response(
        JSON.stringify({ error: 'Tipo de arquivo não especificado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validMimeTypes.includes(mimeType)) {
      console.error('Invalid mimeType:', mimeType);
      return new Response(
        JSON.stringify({ error: 'Tipo de arquivo não suportado. Use JPEG, PNG, WEBP ou PDF.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured in environment');
      return new Response(
        JSON.stringify({ error: 'Serviço de IA não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prompt simplificado - IA só extrai texto, NÃO calcula horários
    const systemPrompt = `Você é um assistente especializado em extrair dados de Atestados de Matrícula universitários brasileiros (SIGAA).

**IMPORTANTE**: NÃO calcule horários. Apenas extraia o código SIGAA bruto (ex: "3N34", "2T23").

Formato JSON obrigatório:
{
  "profile": {
    "full_name": "Nome completo",
    "institution": "Instituição",
    "enrollment_number": "Matrícula",
    "course": "Curso",
    "semester": número,
    "period_start": "YYYY-MM-DD",
    "period_end": "YYYY-MM-DD"
  },
  "subjects": [
    {
      "code": "Código da disciplina",
      "name": "Nome",
      "professor": "Professor",
      "type": "Tipo",
      "class_group": "Turma",
      "status": "Status exato como aparece",
      "sigaa_schedule": "Código SIGAA bruto (ex: 3N34 ou 2T23 5T23)",
      "location": "Local/Sala"
    }
  ]
}

**REGRAS:**
1. Extraia o status EXATAMENTE como aparece no documento
2. Para sigaa_schedule, copie o código bruto (ex: "3N34", "2M12 4M12")
3. NÃO tente converter horários - apenas extraia o código
4. Retorne APENAS JSON válido, sem markdown`;

    console.log('Sending request to AI gateway...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extraia os dados deste atestado de matrícula. Lembre-se: apenas extraia o código SIGAA bruto, não calcule horários.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${fileBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
      }),
    });

    console.log('AI gateway response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Aguarde alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA insuficientes.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Erro ao processar documento com IA', details: errorText.substring(0, 200) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response:', JSON.stringify(aiResponse));
      return new Response(
        JSON.stringify({ error: 'IA não retornou dados válidos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Raw AI response content:', content.substring(0, 500));

    let extractedData;
    try {
      let cleanContent = content.trim();
      
      const jsonBlockMatch = cleanContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        cleanContent = jsonBlockMatch[1].trim();
      }
      
      const jsonObjectMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        cleanContent = jsonObjectMatch[0];
      }
      
      extractedData = JSON.parse(cleanContent);
      
      if (!extractedData.profile || !extractedData.subjects) {
        throw new Error('Estrutura JSON inválida: faltam campos obrigatórios');
      }

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Content that failed to parse:', content);
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao interpretar resposta da IA',
          details: parseError instanceof Error ? parseError.message : 'Erro desconhecido',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // PÓS-PROCESSAMENTO DETERMINÍSTICO
    // ============================================

    console.log('=== INICIANDO PÓS-PROCESSAMENTO ===');
    console.log(`Total de disciplinas da IA: ${extractedData.subjects?.length || 0}`);

    if (Array.isArray(extractedData.subjects)) {
      const originalCount = extractedData.subjects.length;
      
      // 1. FILTRO ABSOLUTO DE STATUS
      extractedData.subjects = extractedData.subjects.filter((subject: any) => {
        const status = (subject.status || '').toUpperCase().trim();
        
        // Rejeitar se status está na lista de inválidos
        if (INVALID_STATUS.some(inv => status.includes(inv))) {
          console.log(`[REMOVIDO] "${subject.name}" - status: ${subject.status}`);
          return false;
        }
        
        // Aceitar se contém MATRICULADO
        if (status.includes('MATRICULADO')) {
          console.log(`[MANTIDO] "${subject.name}" - status: ${subject.status}`);
          return true;
        }
        
        // Caso ambíguo - rejeitar por segurança
        console.log(`[REMOVIDO] "${subject.name}" - status ambíguo: ${subject.status}`);
        return false;
      });
      
      console.log(`Filtro de status: ${originalCount} -> ${extractedData.subjects.length} disciplinas`);

      // 2. RECALCULAR HORÁRIOS USANDO PARSER DETERMINÍSTICO
      for (const subject of extractedData.subjects) {
        const sigaaCode = subject.sigaa_schedule;
        
        if (sigaaCode && typeof sigaaCode === 'string') {
          console.log(`[PARSE] "${subject.name}" - código SIGAA: "${sigaaCode}"`);
          
          // Usar parser determinístico - IGNORA horários que a IA inventou
          const parsedSchedules = parseMultipleSigaaCodes(sigaaCode);
          
          if (parsedSchedules.length > 0) {
            // Adicionar location se disponível
            const location = subject.location || null;
            subject.schedules = parsedSchedules.map(s => ({ ...s, location }));
            
            console.log(`[SUCESSO] "${subject.name}" -> ${parsedSchedules.length} horário(s) calculados`);
          } else {
            console.warn(`[FALHA] "${subject.name}" - não foi possível parsear "${sigaaCode}"`);
            subject.schedules = [];
          }
        } else {
          console.warn(`[SEM CÓDIGO] "${subject.name}" - sigaa_schedule vazio ou inválido`);
          subject.schedules = subject.schedules || [];
        }
        
        // Normalizar status
        subject.status = 'MATRICULADO';
      }
    }

    console.log('=== PÓS-PROCESSAMENTO CONCLUÍDO ===');
    console.log('Profile:', JSON.stringify(extractedData.profile));
    console.log('Subjects count:', extractedData.subjects?.length || 0);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unhandled error in extract-enrollment function:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, mimeType } = await req.json();
    
    if (!fileBase64) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um assistente especializado em extrair dados de Atestados de Matrícula universitários brasileiros (SIGAA).
Analise a imagem/documento e extraia TODOS os dados possíveis no seguinte formato JSON:

{
  "profile": {
    "full_name": "Nome completo do estudante",
    "institution": "Nome da instituição de ensino",
    "enrollment_number": "Número da matrícula",
    "course": "Nome do curso",
    "semester": número do semestre atual (integer),
    "period_start": "YYYY-MM-DD" (data de início do período letivo),
    "period_end": "YYYY-MM-DD" (data de fim do período letivo)
  },
  "subjects": [
    {
      "code": "Código da matéria",
      "name": "Nome da matéria",
      "professor": "Nome do professor/docente",
      "type": "MÓDULO ou tipo da disciplina",
      "class_group": "Turma",
      "status": "Status da matrícula (MATRICULADO, INDEFERIDO, CANCELADO, etc.)",
      "sigaa_schedule": "Código de horário SIGAA original (ex: 3N34 5N12)",
      "schedules": [
        {
          "day_of_week": 0-6 (0=Domingo, 1=Segunda, ..., 6=Sábado),
          "start_time": "HH:MM",
          "end_time": "HH:MM",
          "location": "Sala/Local"
        }
      ]
    }
  ]
}

CODIFICAÇÃO DE HORÁRIOS SIGAA:
Use esta tabela para decodificar os horários no formato SIGAA (ex: "3N34", "5M12"):

1ª PARTE - Dia da Semana:
2 = Segunda-feira (day_of_week: 1)
3 = Terça-feira (day_of_week: 2)
4 = Quarta-feira (day_of_week: 3)
5 = Quinta-feira (day_of_week: 4)
6 = Sexta-feira (day_of_week: 5)
7 = Sábado (day_of_week: 6)

2ª PARTE - Turno:
M = Manhã
T = Tarde
N = Noite

3ª PARTE - Blocos de Horário:
MANHÃ (M):
1 = 07:00-08:00, 2 = 08:00-09:00, 3 = 09:00-10:00, 4 = 10:00-11:00, 5 = 11:00-12:00, 6 = 12:00-13:00

TARDE (T):
1 = 13:00-14:00, 2 = 14:00-15:00, 3 = 15:00-16:00, 4 = 16:00-17:00, 5 = 17:00-18:00, 6 = 18:00-19:00

NOITE (N):
1 = 18:30-19:20, 2 = 19:20-20:10, 3 = 20:10-21:00, 4 = 21:00-21:50

EXEMPLO: "3N34" significa Terça-feira (3), Noite (N), blocos 3 e 4 (20:10-21:50)
Isso gera 2 schedules: {day_of_week: 2, start_time: "20:10", end_time: "21:00"} e {day_of_week: 2, start_time: "21:00", end_time: "21:50"}
Ou pode unir em um bloco contínuo: {day_of_week: 2, start_time: "20:10", end_time: "21:50"}

IMPORTANTE:
- FILTRO DE STATUS: Extraia APENAS matérias com status "MATRICULADO". DESCARTE matérias com status "INDEFERIDO", "CANCELADO" ou qualquer outro status diferente de "MATRICULADO".
- Decodifique o código SIGAA para gerar os schedules com horários reais
- Se um campo não estiver visível, use null
- Para horários, converta para o formato 24h (HH:MM)
- Para datas, use formato ISO (YYYY-MM-DD)
- Retorne APENAS o JSON válido, sem texto adicional`;

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
                text: 'Extraia todos os dados deste atestado de matrícula e retorne no formato JSON especificado.'
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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA insuficientes.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar documento com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response:', aiResponse);
      return new Response(
        JSON.stringify({ error: 'IA não retornou dados' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON from the response
    let extractedData;
    try {
      // Try to extract JSON from the response (it might have markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      extractedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content, parseError);
      return new Response(
        JSON.stringify({ error: 'Falha ao interpretar dados extraídos', rawContent: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully extracted data:', JSON.stringify(extractedData));

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-enrollment function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

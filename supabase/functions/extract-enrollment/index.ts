import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, mimeType } = await req.json();
    
    // Validação de entrada mais robusta
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

    // Validar mimeType
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

    const systemPrompt = `Você é um assistente especializado em extrair dados de Atestados de Matrícula universitários brasileiros (SIGAA).
Analise a imagem/documento e extraia TODOS os dados possíveis no seguinte formato JSON.

**CRÍTICO**: Extraia APENAS disciplinas com status "MATRICULADO". Ignore completamente disciplinas com status "INDEFERIDO", "CANCELADO", "TRANCADO" ou qualquer outro status.

Formato JSON obrigatório:
{
  "profile": {
    "full_name": "Nome completo do estudante",
    "institution": "Nome da instituição",
    "enrollment_number": "Matrícula",
    "course": "Nome do curso",
    "semester": número_inteiro,
    "period_start": "YYYY-MM-DD",
    "period_end": "YYYY-MM-DD"
  },
  "subjects": [
    {
      "code": "Código",
      "name": "Nome da disciplina",
      "professor": "Nome do professor",
      "type": "Tipo/Módulo",
      "class_group": "Turma",
      "status": "MATRICULADO",
      "sigaa_schedule": "Código SIGAA (ex: 3N34)",
      "schedules": [
        {
          "day_of_week": 1,
          "start_time": "HH:MM",
          "end_time": "HH:MM",
          "location": "Local"
        }
      ]
    }
  ]
}

**DECODIFICAÇÃO DE HORÁRIOS SIGAA:**

Dia da Semana (primeiro dígito):
2=Segunda(1), 3=Terça(2), 4=Quarta(3), 5=Quinta(4), 6=Sexta(5), 7=Sábado(6)

Turno (letra):
M=Manhã, T=Tarde, N=Noite

Horários por bloco (IMPORTANTE: cada número representa um bloco de 1 hora):
MANHÃ (M):
  Bloco 1 = 07:00-08:00
  Bloco 2 = 08:00-09:00
  Bloco 3 = 09:00-10:00
  Bloco 4 = 10:00-11:00
  Bloco 5 = 11:00-12:00
  Bloco 6 = 12:00-13:00

TARDE (T):
  Bloco 1 = 13:00-14:00
  Bloco 2 = 14:00-15:00
  Bloco 3 = 15:00-16:00
  Bloco 4 = 16:00-17:00
  Bloco 5 = 17:00-18:00
  Bloco 6 = 18:00-19:00

NOITE (N):
  Bloco 1 = 18:30-19:20
  Bloco 2 = 19:20-20:10
  Bloco 3 = 20:10-21:00
  Bloco 4 = 21:00-21:50

EXEMPLOS DE DECODIFICAÇÃO:
- "2T23" = Segunda-feira, Tarde, blocos 2 e 3 = {day_of_week:1, start_time:"14:00", end_time:"16:00"}
- "3N34" = Terça-feira, Noite, blocos 3 e 4 = {day_of_week:2, start_time:"20:10", end_time:"21:50"}
- "5M12" = Quinta-feira, Manhã, blocos 1 e 2 = {day_of_week:4, start_time:"07:00", end_time:"09:00"}
- "4T45" = Quarta-feira, Tarde, blocos 4 e 5 = {day_of_week:3, start_time:"16:00", end_time:"18:00"}

REGRA: Pegue o horário de INÍCIO do primeiro bloco e o horário de FIM do último bloco.

**IMPORTANTE:**
- Retorne APENAS JSON válido, sem markdown, sem texto extra
- Use null para campos não encontrados
- Filtre rigorosamente pelo status "MATRICULADO"`;

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
                text: 'Extraia todos os dados deste atestado de matrícula seguindo rigorosamente o formato JSON especificado. Lembre-se: APENAS disciplinas com status MATRICULADO.'
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
        JSON.stringify({ 
          error: 'Erro ao processar documento com IA',
          details: errorText.substring(0, 200)
        }),
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

    // Parse JSON mais robusto
    let extractedData;
    try {
      // Remove markdown code blocks se existirem
      let cleanContent = content.trim();
      
      // Tenta extrair JSON de blocos markdown
      const jsonBlockMatch = cleanContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        cleanContent = jsonBlockMatch[1].trim();
      }
      
      // Remove possível texto antes/depois do JSON
      const jsonObjectMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        cleanContent = jsonObjectMatch[0];
      }
      
      extractedData = JSON.parse(cleanContent);
      
      // Validação básica da estrutura
      if (!extractedData.profile || !extractedData.subjects) {
        throw new Error('Estrutura JSON inválida: faltam campos obrigatórios');
      }

      // Filtrar novamente por status no backend (garantia adicional)
      if (Array.isArray(extractedData.subjects)) {
        extractedData.subjects = extractedData.subjects.filter(
          (subject: any) => subject.status === 'MATRICULADO'
        );
        console.log(`Filtered subjects: ${extractedData.subjects.length} with MATRICULADO status`);
      }

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Content that failed to parse:', content);
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao interpretar resposta da IA',
          details: parseError instanceof Error ? parseError.message : 'Erro desconhecido',
          rawContent: content.substring(0, 500)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully extracted and validated data');
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

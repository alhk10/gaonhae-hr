import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RequestBody {
  branch_id: string;
  content_type: 'achievement' | 'training' | 'educational' | 'promotion';
  custom_notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const auth = req.headers.get('Authorization') || '';

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });

    const body: RequestBody = await req.json();
    if (!body.branch_id || !body.content_type) {
      return new Response(JSON.stringify({ error: 'branch_id and content_type are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load branch + brand settings (fall back to global)
    const [{ data: branch }, { data: branchBrand }, { data: globalBrand }] = await Promise.all([
      supabase.from('branches').select('id, name, country').eq('id', body.branch_id).maybeSingle(),
      supabase.from('brand_settings').select('*').eq('branch_id', body.branch_id).maybeSingle(),
      supabase.from('brand_settings').select('*').is('branch_id', null).maybeSingle(),
    ]);

    const brand = branchBrand || globalBrand || {
      tone: 'energetic, friendly, family-oriented',
      keywords: ['taekwondo', 'martial arts', 'discipline'],
      default_hashtags: ['#taekwondo', '#martialarts'],
      caption_style: 'short, punchy, with emojis',
      language: 'en',
    };

    const branchName = branch?.name || body.branch_id;
    const contentTypeDescriptions: Record<string, string> = {
      achievement: 'celebrating a student or team achievement (grading pass, competition win, milestone)',
      training: 'showcasing a training session, technique, or class moment',
      educational: 'teaching about taekwondo, fitness, discipline, or martial arts values',
      promotion: 'promoting a class, event, trial offer, or branch program',
    };

    const systemPrompt = `You are an expert social media manager for a Taekwondo school. Write in the brand's voice and language. Output is for Instagram.`;
    const userPrompt = `Brand tone: ${brand.tone}
Brand keywords: ${(brand.keywords || []).join(', ')}
Default hashtags to consider: ${(brand.default_hashtags || []).join(' ')}
Caption style: ${brand.caption_style}
Language: ${brand.language}
Branch: ${branchName}
Content type: ${body.content_type} — ${contentTypeDescriptions[body.content_type]}
${body.custom_notes ? `Additional notes from creator: ${body.custom_notes}` : ''}

Generate:
1. An Instagram caption (2-4 sentences, on-brand, with relevant emojis)
2. A clear CTA (one short sentence, e.g. "Book a free trial today!")
3. Exactly 10 hashtags (mix of brand, branch, sport, and trending)

Return strictly via the provided tool call.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'submit_post',
              description: 'Submit the generated Instagram post fields',
              parameters: {
                type: 'object',
                properties: {
                  caption: { type: 'string' },
                  cta: { type: 'string' },
                  hashtags: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 10,
                    maxItems: 10,
                  },
                },
                required: ['caption', 'cta', 'hashtags'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'submit_post' } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded. Please try again shortly.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits in Settings → Workspace → Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const errText = await aiResponse.text();
      console.error('AI gateway error', aiResponse.status, errText);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    const parsed = typeof args === 'string' ? JSON.parse(args) : args;

    if (!parsed?.caption || !parsed?.hashtags) {
      console.error('Unexpected AI response shape', JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: 'AI returned unexpected response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        caption: parsed.caption,
        cta: parsed.cta || '',
        hashtags: parsed.hashtags,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('social-generate-caption error', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

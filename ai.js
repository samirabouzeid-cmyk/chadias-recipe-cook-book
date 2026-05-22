export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json().catch(() => ({}));
    const prompt = String(body.prompt || '').trim();
    const image = body.image || null;
    const model = body.model || 'gpt-4o-mini';

    if (!prompt) return json({ error: 'Missing prompt' }, 400);
    if (!env.OPENAI_API_KEY) {
      return json({ error: 'Missing OPENAI_API_KEY in Cloudflare Pages environment variables.' }, 500);
    }

    const userContent = image
      ? [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: image } }
        ]
      : prompt;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 1800,
        messages: [
          {
            role: 'system',
            content: 'You are Chadia Recipe Book AI. Give practical cooking help in plain English. For recipe generation, return valid JSON only when the user asks for structured recipe JSON.'
          },
          { role: 'user', content: userContent }
        ]
      })
    });

    const data = await openaiRes.json().catch(() => ({}));
    if (!openaiRes.ok) {
      return json({ error: data?.error?.message || `OpenAI request failed: ${openaiRes.status}` }, openaiRes.status);
    }

    return json({ text: data?.choices?.[0]?.message?.content || '' });
  } catch (err) {
    return json({ error: err?.message || 'AI function crashed' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

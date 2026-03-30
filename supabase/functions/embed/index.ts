const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!

    // Read up to 10 jobs from the queue
    const queueRes = await fetch(`${supabaseUrl}/rest/v1/rpc/pgmq_read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Accept-Profile': 'pgmq',
        'Content-Profile': 'pgmq',
      },
      body: JSON.stringify({ queue_name: 'embed_jobs', sleep_seconds: 0, n: 10 }),
    })

    const rawJobs = await queueRes.json()
    console.log('pgmq read raw response:', JSON.stringify(rawJobs))
    const jobs = Array.isArray(rawJobs) ? rawJobs : (rawJobs ? [rawJobs] : [])
    console.log('jobs array length:', jobs.length)
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let processed = 0

    for (const job of jobs) {
      const { id: rowId } = job.message

      // Fetch the content
      const rowRes = await fetch(`${supabaseUrl}/rest/v1/open_brain?id=eq.${rowId}&select=content`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      })
      const rows = await rowRes.json()
      if (!rows || rows.length === 0) continue

      const content = rows[0].content

      // Generate embedding via OpenAI
      const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: content,
        }),
      })

      const embeddingData = await embeddingRes.json()
      const embedding = embeddingData.data?.[0]?.embedding
      if (!embedding) continue

      // Write embedding back to row
      await fetch(`${supabaseUrl}/rest/v1/open_brain?id=eq.${rowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ embedding: `[${embedding.join(',')}]` }),
      })

      // Delete job from queue
      await fetch(`${supabaseUrl}/rest/v1/rpc/pgmq_delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Accept-Profile': 'pgmq',
          'Content-Profile': 'pgmq',
        },
        body: JSON.stringify({ queue_name: 'embed_jobs', msg_id: job.msg_id }),
      })

      processed++
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

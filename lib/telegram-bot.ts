import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_BOT_TOKEN!
const openaiApiKey = process.env.OPENAI_API_KEY!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let bot: TelegramBot | null = null

export function getBot(): TelegramBot {
  if (!bot) {
    bot = new TelegramBot(token, { polling: false })
  }
  return bot
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    })
    const data = await res.json()
    const embedding = data.data?.[0]?.embedding ?? null
    if (!embedding || !Array.isArray(embedding) || embedding.length !== 1536) {
      console.error('Invalid embedding response:', JSON.stringify(data).slice(0, 200))
      return null
    }
    console.log('Embedding generated successfully, length:', embedding.length)
    return embedding
  } catch (err) {
    console.error('Embedding generation failed:', err)
    return null
  }
}

export async function handleTelegramUpdate(body: any) {
  const message = body?.message
  if (!message || !message.text) return

  const content = message.text
  const source = 'telegram'
  const metadata = {
    from_id: message.from?.id,
    from_username: message.from?.username,
    chat_id: message.chat?.id,
    message_id: message.message_id,
    date: message.date,
  }

  const embedding = await generateEmbedding(content)
  const embeddingString = embedding ? `[${embedding.join(',')}]` : null

  const insertBody = {
    content,
    source,
    metadata,
    embedding: embeddingString,
  }

  console.log('Inserting via direct REST call')
  console.log('Embedding preview:', embeddingString ? embeddingString.slice(0, 60) + '...' : 'NULL')

  const res = await fetch(`${supabaseUrl}/rest/v1/open_brain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(insertBody),
  })

  const responseText = await res.text()
  console.log('REST insert status:', res.status)
  console.log('REST insert response:', responseText.slice(0, 200))

  if (!res.ok) {
    console.error('Open Brain insert error:', responseText)
  }
}

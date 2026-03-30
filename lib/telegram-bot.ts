import TelegramBot from 'node-telegram-bot-api'
import { supabase } from './supabase'

const token = process.env.TELEGRAM_BOT_TOKEN!
const openaiApiKey = process.env.OPENAI_API_KEY!

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

    // Validate that we got a proper 1536-dimension array back
    if (!embedding || !Array.isArray(embedding) || embedding.length !== 1536) {
      console.error('Invalid embedding response:', JSON.stringify(data).slice(0, 200))
      return null
    }

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

  // Convert number[] to Postgres vector literal string
  // halfvec(1536) expects "[0.012,-0.034,...]" not a JSON array
  const embeddingString = embedding ? `[${embedding.join(',')}]` : null

  const { error } = await supabase
    .from('open_brain')
    .insert({
      content,
      source,
      metadata,
      embedding: embeddingString,
    })

  if (error) {
    console.error('Open Brain insert error:', error)
  }
}

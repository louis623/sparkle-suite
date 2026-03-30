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
    return data.data?.[0]?.embedding ?? null
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

  const { error } = await supabase
    .from('open_brain')
    .insert({
      content,
      source,
      metadata,
      embedding: embedding ? embedding : null,
    })

  if (error) {
    console.error('Open Brain insert error:', error)
  }
}

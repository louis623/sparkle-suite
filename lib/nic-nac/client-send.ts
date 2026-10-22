import type { UIMessage } from 'ai'
import type { Chat } from '@ai-sdk/react'
import { prepareNicNacSendMessages } from './piece-task'

/** New-message identity is `id`; `messageId` means replace an existing SDK row. */
export async function sendNicNacParts(args: {
  sendMessage: Chat<UIMessage>['sendMessage']
  parts: UIMessage['parts']
  id: string
  replace?: boolean
  onFailure: (message: UIMessage) => void
}) {
  const message: UIMessage = { id: args.id, role: 'user', parts: args.parts }
  try {
    await args.sendMessage({
      ...message,
      ...(args.replace ? { messageId: args.id } : {}),
    })
  } catch {
    // SDK validation can reject before it sets useChat.error. Keep a visible,
    // retryable copy of the exact submission even in that case.
    args.onFailure(message)
  }
}

export function prepareNicNacRequest(args: {
  messages: UIMessage[]
  trigger: string
  messageId?: string
  conversationId: string
  mode: 'workspace' | 'required_setup'
}) {
  const last = args.messages.at(-1)
  const submitted = args.trigger === 'submit-message' && last?.role === 'user' &&
    (!args.messageId || args.messageId === last.id) ? last : null
  return {
    conversationId: args.conversationId,
    messages: prepareNicNacSendMessages(args.messages),
    mode: args.mode,
    ...(submitted ? { submittedMessageId: submitted.id } : {}),
  }
}

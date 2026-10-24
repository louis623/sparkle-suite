import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from 'ai'

export function createNicNacStaticTextStreamResponse({
  message,
  messageId,
  headers,
  preview,
}: {
  message: string
  messageId: string
  headers?: HeadersInit
  preview?: {
    message: string
    previewPhotoId?: string
    previewImageUrl?: string
  }
}): Response {
  const stream = createUIMessageStream<UIMessage>({
    generateId: () => messageId,
    execute: ({ writer }) => {
      writer.write({ type: 'start', messageId })
      if (preview?.previewPhotoId || preview?.previewImageUrl) {
        const toolCallId = 'bound-main-photo'
        writer.write({
          type: 'tool-input-start',
          toolCallId,
          toolName: 'add_listing',
        })
        writer.write({
          type: 'tool-input-available',
          toolCallId,
          toolName: 'add_listing',
          input: {},
        })
        writer.write({
          type: 'tool-output-available',
          toolCallId,
          output: {
            needsAction: 'confirm_main_photo',
            code: 'MAIN_PHOTO_CONFIRMATION_REQUIRED',
            message: preview.message,
            ...(preview.previewPhotoId ? { previewPhotoId: preview.previewPhotoId } : {}),
            ...(preview.previewImageUrl ? { previewImageUrl: preview.previewImageUrl } : {}),
          },
        })
      }
      writer.write({ type: 'text-start', id: 'text-1' })
      writer.write({ type: 'text-delta', id: 'text-1', delta: message })
      writer.write({ type: 'text-end', id: 'text-1' })
    },
  })

  return createUIMessageStreamResponse({
    stream,
    headers,
  })
}

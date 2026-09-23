import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'

vi.mock('server-only', () => ({}))

import { assertOwnerDirectSendInput, cleanupExpiredOwnerDirectUploads, createOwnerDirectAttachmentSignedRead, createOwnerDirectUploadTicket, prepareOwnerDirectImage, sendOwnerDirectMessage } from '@/lib/services/workspace-owner-direct'

const repId = '80a58986-e521-41eb-835d-dfb5793ffddb'
const base = { repId, body: 'Hello, rep.', clientRequestId: 'send-1', uploadIds: [] as string[] }

describe('owner direct image and send input', () => {
  it('stops owner sends and upload tickets when composing is disabled', async () => {
    vi.stubEnv('SPARKLE_WORKSPACE_OWNER_DIRECT_MESSAGING_ENABLED', 'false')
    try {
      const admin = { from: vi.fn() }
      await expect(sendOwnerDirectMessage(admin as never, {
        ...base, operatorRepId: repId,
      })).rejects.toMatchObject({ code: 'CONVERSATION_COMPOSING_DISABLED', statusCode: 503 })
      await expect(createOwnerDirectUploadTicket(admin as never, {
        repId, operatorRepId: repId, clientRequestId: 'send-1',
        contentType: 'image/png', byteSize: 1234,
      })).rejects.toMatchObject({ code: 'CONVERSATION_COMPOSING_DISABLED', statusCode: 503 })
      expect(admin.from).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('rejects an empty message, multiple recipients, more than three images, and duplicate tickets', () => {
    expect(() => assertOwnerDirectSendInput({ ...base, body: ' ' })).toThrowError(expect.objectContaining({ code: 'OWNER_DIRECT_BODY_INVALID' }))
    expect(() => assertOwnerDirectSendInput({ ...base, repId: `${repId},${repId}` })).toThrowError(expect.objectContaining({ code: 'OWNER_DIRECT_RECIPIENT_INVALID' }))
    expect(() => assertOwnerDirectSendInput({ ...base, uploadIds: [repId, repId, repId, repId] })).toThrowError(expect.objectContaining({ code: 'OWNER_DIRECT_IMAGE_LIMIT' }))
    expect(() => assertOwnerDirectSendInput({ ...base, uploadIds: [repId, repId] })).toThrowError(expect.objectContaining({ code: 'OWNER_DIRECT_UPLOAD_INVALID' }))
  })

  it('decodes and resizes a still image, stripping metadata from the output', async () => {
    const source = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: '#ff4499' } })
      .jpeg({ quality: 90 }).withMetadata({ orientation: 1 }).toBuffer()
    const prepared = await prepareOwnerDirectImage(new File([new Uint8Array(source)], 'photo.jpg', { type: 'image/jpeg' }))
    expect(prepared.contentType).toBe('image/jpeg')
    expect(prepared.extension).toBe('jpg')
    expect(prepared.width).toBe(2400)
    expect(prepared.height).toBe(800)
    const metadata = await sharp(prepared.data).metadata()
    expect(metadata.exif).toBeUndefined()
  })

  it('rejects content disguised as an image', async () => {
    const file = new File(['<svg><script>alert(1)</script></svg>'], 'fake.png', { type: 'image/png' })
    await expect(prepareOwnerDirectImage(file)).rejects.toMatchObject({ code: 'OWNER_DIRECT_IMAGE_INVALID' })
  })

  it('issues an upload token only for an active rep and records the private staging path', async () => {
    const ticketInsert = vi.fn().mockResolvedValue({ error: null })
    const signed = vi.fn().mockResolvedValue({ data: { token: 'signed-upload-token' }, error: null })
    const admin = {
      from: (table: string) => table === 'reps'
        ? { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: repId }, error: null }) }) }) }) }
        : { insert: ticketInsert },
      storage: { from: () => ({ createSignedUploadUrl: signed }) },
    }
    const ticket = await createOwnerDirectUploadTicket(admin as never, {
      repId, operatorRepId: repId, clientRequestId: 'send-1', contentType: 'image/png', byteSize: 1234,
    })
    expect(ticket).toMatchObject({ bucket: 'workspace-owner-direct', token: 'signed-upload-token' })
    expect(ticket.path).toMatch(/^staging\/80a58986-e521-41eb-835d-dfb5793ffddb\/[0-9a-f-]+[.]png$/)
    expect(ticketInsert).toHaveBeenCalledWith(expect.objectContaining({ rep_id: repId, object_path: ticket.path, byte_size: 1234 }))
  })

  it('removes expired staging objects before deleting their ticket records', async () => {
    const events: string[] = []
    const oldId = 'd3f0a66a-3f1f-4a31-a1b4-82fe878fa39a'
    const path = `staging/${repId}/${oldId}.png`
    const finalPath = `${repId}/${oldId}.png`
    let queried = false
    const admin = {
      from: (table: string) => table === 'workspace_owner_direct_attachments'
        ? { select: () => ({ in: async () => ({ data: [], error: null }) }) }
        : ({
        select: () => ({ lt: () => ({ order: () => ({ limit: async () => {
          const data = queried ? [] : [{ id: oldId, object_path: path }]
          queried = true
          return { data, error: null }
        } }) }) }),
        delete: () => ({ in: () => ({ lt: async () => { events.push('ticket'); return { error: null } } }) }),
      }),
      storage: { from: () => ({ remove: async (paths: string[]) => {
        expect(paths).toEqual([path, finalPath])
        events.push('object')
        return { error: null }
      } }) },
    }
    await expect(cleanupExpiredOwnerDirectUploads(admin as never, new Date('2026-09-23T12:00:00Z'))).resolves.toEqual({ removed: 1 })
    expect(events).toEqual(['object', 'ticket'])
  })

  it('returns the original message after a lost response without uploading or sending twice', async () => {
    const conversationId = 'a1975f57-909c-43e0-a156-720391368517'
    const messageId = '0433a2da-9a82-4cf1-95bf-32bca6f328b1'
    const rpc = vi.fn()
    const storage = vi.fn()
    const admin = {
      rpc,
      storage: { from: storage },
      from: (table: string) => {
        if (table === 'reps') return {
          select: (fields: string) => fields === 'id'
            ? { eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: repId }, error: null }) }) }) }
            : { eq: () => ({ maybeSingle: async () => ({ data: { id: repId, display_name: 'Taylor', business_name: 'Taylor Gems' }, error: null }) }) },
        }
        if (table === 'workspace_conversations') return {
          select: () => ({ eq: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: conversationId }, error: null }) }) }),
            maybeSingle: async () => ({ data: { id: conversationId, conversation_type: 'owner_direct', state: 'open',
              subject: 'Message from Sparkle Suite', context_id: repId, last_message_at: '2026-09-23T12:00:00Z',
              latest_message_preview: 'Hello, rep.', updated_at: '2026-09-23T12:00:00Z' }, error: null }),
          }) }),
        }
        if (table === 'workspace_conversation_messages') return {
          select: () => ({ eq: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: messageId, body: 'Hello, rep.' }, error: null }) }) }),
            order: () => ({ order: async () => ({ data: [{ id: messageId, conversation_id: conversationId,
              sender_principal_type: 'owner_queue', sender_display_name: 'Sparkle Suite',
              body: 'Hello, rep.', created_at: '2026-09-23T12:00:00Z' }], error: null }) }),
          }) }),
        }
        if (table === 'workspace_owner_direct_attachments') return {
          select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
        }
        if (table === 'workspace_conversation_participants') return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'owner-queue', unread_count: 0 }, error: null }) }) }) }),
        }
        throw new Error(`Unexpected table ${table}`)
      },
    }
    const result = await sendOwnerDirectMessage(admin as never, {
      repId, operatorRepId: repId, body: 'Hello, rep.', clientRequestId: 'send-1', uploadIds: [],
    })
    expect(result).toMatchObject({ created: false, message: { id: messageId } })
    expect(rpc).not.toHaveBeenCalled()
    expect(storage).not.toHaveBeenCalled()
  })

  it('reconciles a committed text send when the RPC response is lost', async () => {
    const conversationId = 'a1975f57-909c-43e0-a156-720391368517'
    const messageId = '0433a2da-9a82-4cf1-95bf-32bca6f328b1'
    let threadLookups = 0
    const admin = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('response lost') }),
      from: (table: string) => {
        if (table === 'reps') return {
          select: (fields: string) => fields === 'id'
            ? { eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: repId }, error: null }) }) }) }
            : { eq: () => ({ maybeSingle: async () => ({ data: { id: repId, display_name: 'Taylor', business_name: null }, error: null }) }) },
        }
        if (table === 'workspace_conversations') return {
          select: () => ({ eq: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: async () => ({
              data: ++threadLookups === 1 ? null : { id: conversationId }, error: null,
            }) }) }),
            maybeSingle: async () => ({ data: { id: conversationId, conversation_type: 'owner_direct', state: 'open',
              subject: 'Message from Sparkle Suite', context_id: repId, last_message_at: '2026-09-23T12:00:00Z',
              latest_message_preview: 'Hello, rep.', updated_at: '2026-09-23T12:00:00Z' }, error: null }),
          }) }),
        }
        if (table === 'workspace_conversation_messages') return {
          select: () => ({ eq: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: messageId, body: 'Hello, rep.' }, error: null }) }) }),
            order: () => ({ order: async () => ({ data: [{ id: messageId, conversation_id: conversationId,
              sender_principal_type: 'owner_queue', sender_display_name: 'Sparkle Suite',
              body: 'Hello, rep.', created_at: '2026-09-23T12:00:00Z' }], error: null }) }),
          }) }),
        }
        if (table === 'workspace_owner_direct_attachments') return {
          select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
        }
        if (table === 'workspace_conversation_participants') return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'owner-queue', unread_count: 0 }, error: null }) }) }) }),
        }
        throw new Error(`Unexpected table ${table}`)
      },
    }
    const result = await sendOwnerDirectMessage(admin as never, {
      repId, operatorRepId: repId, body: 'Hello, rep.', clientRequestId: 'send-1', uploadIds: [],
    })
    expect(admin.rpc).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ created: false, message: { id: messageId } })
  })

  it('never signs an image for a rep who is not a participant', async () => {
    const signed = vi.fn()
    const admin = {
      from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
      }) }) }) }) }),
      storage: { from: () => ({ createSignedUrl: signed }) },
    }
    await expect(createOwnerDirectAttachmentSignedRead(admin as never, {
      conversationId: 'a1975f57-909c-43e0-a156-720391368517',
      attachmentId: '0433a2da-9a82-4cf1-95bf-32bca6f328b1', repId,
    })).rejects.toMatchObject({ code: 'CONVERSATION_FORBIDDEN' })
    expect(signed).not.toHaveBeenCalled()
  })
})

import 'server-only'
import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'

import { ServiceError } from '@/lib/services/errors'
import { assertWorkspaceConversationComposingEnabled } from '@/lib/services/workspace-conversation-feature-flags'
import { assertRepConversationAction, requireRepConversationMembership } from '@/lib/services/workspace-conversation-permissions'

const BUCKET = 'workspace-owner-direct'
const MAX_BYTES = 8 * 1024 * 1024
const MAX_DIMENSION = 2400
const READ_SECONDS = 120
const MESSAGE_SELECT = 'id, conversation_id, sender_principal_type, sender_display_name, body, created_at'
const ATTACHMENT_SELECT = 'id, conversation_id, message_id, content_type, byte_size, width, height, attachment_slot, object_path'

type AttachmentRow = {
  id: string; conversation_id: string; message_id: string; content_type: string
  byte_size: number; width: number; height: number; attachment_slot: number; object_path: string
}
type MessageRow = {
  id: string; conversation_id: string; sender_principal_type: string
  sender_display_name: string; body: string; created_at: string
}
type ConversationRow = {
  id: string; conversation_type: string; state: string; subject: string
  context_id: string; last_message_at: string; latest_message_preview: string
  updated_at: string
}

function failure(code: string, message: string, statusCode = 500, cause?: unknown) {
  return new ServiceError({ code, message, userMessage: message, statusCode, cause })
}

export function assertOwnerDirectSendInput(input: {
  repId: string; body: string; clientRequestId: string; uploadIds: string[]
}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.repId)) {
    throw failure('OWNER_DIRECT_RECIPIENT_INVALID', 'Choose one recipient.', 400)
  }
  if (!input.body.trim() || input.body.trim().length > 10_000) {
    throw failure('OWNER_DIRECT_BODY_INVALID', 'Write a message of at most 10,000 characters.', 400)
  }
  if (!input.clientRequestId.trim() || input.clientRequestId.trim().length > 180) {
    throw failure('OWNER_DIRECT_REQUEST_INVALID', 'This message request is not valid.', 400)
  }
  if (input.uploadIds.length > 3) throw failure('OWNER_DIRECT_IMAGE_LIMIT', 'Choose up to three images.', 400)
  if (new Set(input.uploadIds).size !== input.uploadIds.length || input.uploadIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) {
    throw failure('OWNER_DIRECT_UPLOAD_INVALID', 'One of the image uploads is invalid.', 400)
  }
}

type UploadTicket = {
  id: string; rep_id: string; operator_rep_id: string; client_request_id: string
  object_path: string; content_type: string; byte_size: number
  created_at: string; consumed_at: string | null
}

export async function createOwnerDirectUploadTicket(admin: SupabaseClient, input: {
  repId: string; operatorRepId: string; clientRequestId: string
  contentType: string; byteSize: number
}) {
  if (!/^[0-9a-f-]{36}$/i.test(input.repId) || !input.clientRequestId.trim()
    || input.clientRequestId.trim().length > 180
    || !['image/jpeg', 'image/png', 'image/webp'].includes(input.contentType)
    || !Number.isInteger(input.byteSize) || input.byteSize < 1 || input.byteSize > MAX_BYTES) {
    throw failure('OWNER_DIRECT_UPLOAD_INVALID', 'Choose a JPEG, PNG, or WebP image smaller than 8 MB.', 400)
  }
  assertWorkspaceConversationComposingEnabled('owner_direct')
  const rep = await admin.from('reps').select('id').eq('id', input.repId).eq('status', 'active').maybeSingle()
  if (rep.error || !rep.data) throw failure('OWNER_DIRECT_RECIPIENT_UNAVAILABLE', 'That rep is not available for direct messages.', 404, rep.error)
  const id = randomUUID()
  const extension = input.contentType === 'image/jpeg' ? 'jpg' : input.contentType.split('/')[1]
  const path = `staging/${input.repId}/${id}.${extension}`
  const ticket = await admin.from('workspace_owner_direct_upload_tickets').insert({
    id, rep_id: input.repId, operator_rep_id: input.operatorRepId,
    client_request_id: input.clientRequestId.trim(), object_path: path,
    content_type: input.contentType, byte_size: input.byteSize,
  })
  if (ticket.error) throw failure('OWNER_DIRECT_UPLOAD_TICKET_FAILED', 'The image upload could not be prepared.', 500, ticket.error)
  const signed = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (signed.error || !signed.data?.token) {
    await admin.from('workspace_owner_direct_upload_tickets').delete().eq('id', id)
    throw failure('OWNER_DIRECT_UPLOAD_TICKET_FAILED', 'The image upload could not be prepared.', 500, signed.error)
  }
  return { uploadId: id, bucket: BUCKET, path, token: signed.data.token }
}

export async function cleanupExpiredOwnerDirectUploads(admin: SupabaseClient, now = new Date()) {
  const cutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
  let removed = 0
  // A bounded batch per scheduled run; the oldest rows are revisited on a later run.
  for (let batch = 0; batch < 20; batch += 1) {
    const expired = await admin.from('workspace_owner_direct_upload_tickets')
      .select('id, object_path').lt('created_at', cutoff).order('created_at').limit(100)
    if (expired.error) throw failure('OWNER_DIRECT_CLEANUP_FAILED', 'Expired uploads could not be checked.', 500, expired.error)
    const rows = expired.data ?? []
    if (!rows.length) break
    const finalPaths = rows.map((row) => {
      const match = /^staging\/([0-9a-f-]{36})\/([0-9a-f-]{36})[.](jpg|png|webp)$/.exec(row.object_path)
      return match ? `${match[1]}/${match[2]}.${match[3]}` : null
    }).filter((path): path is string => Boolean(path))
    const linked = finalPaths.length
      ? await admin.from('workspace_owner_direct_attachments').select('object_path').in('object_path', finalPaths)
      : { data: [], error: null }
    if (linked.error) throw failure('OWNER_DIRECT_CLEANUP_FAILED', 'Private image references could not be checked.', 500, linked.error)
    const linkedPaths = new Set((linked.data ?? []).map((row) => row.object_path))
    const paths = [...rows.map((row) => row.object_path), ...finalPaths.filter((path) => !linkedPaths.has(path))]
    const deletedObjects = await admin.storage.from(BUCKET).remove(paths)
    if (deletedObjects.error) throw failure('OWNER_DIRECT_CLEANUP_FAILED', 'Expired private images could not be removed.', 500, deletedObjects.error)
    const deletedRows = await admin.from('workspace_owner_direct_upload_tickets').delete()
      .in('id', rows.map((row) => row.id)).lt('created_at', cutoff)
    if (deletedRows.error) throw failure('OWNER_DIRECT_CLEANUP_FAILED', 'Expired upload records could not be removed.', 500, deletedRows.error)
    removed += rows.length
    if (rows.length < 100) break
  }
  return { removed }
}

export async function prepareOwnerDirectImage(file: File) {
  const input = Buffer.from(await file.arrayBuffer())
  let metadata: sharp.Metadata
  try {
    metadata = await sharp(input, { limitInputPixels: 40_000_000, animated: false }).metadata()
  } catch (cause) {
    throw failure('OWNER_DIRECT_IMAGE_INVALID', 'That image could not be read. Choose a JPEG, PNG, or WebP image.', 415, cause)
  }
  if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) {
    throw failure('OWNER_DIRECT_IMAGE_TYPE', 'Choose a still JPEG, PNG, or WebP image.', 415)
  }
  let pipeline = sharp(input, { limitInputPixels: 40_000_000, animated: false })
    .rotate().resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
  if (metadata.format === 'jpeg') pipeline = pipeline.jpeg({ quality: 86, mozjpeg: true })
  else if (metadata.format === 'png') pipeline = pipeline.png({ compressionLevel: 9 })
  else pipeline = pipeline.webp({ quality: 84 })
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })
  if (data.byteLength > MAX_BYTES) throw failure('OWNER_DIRECT_IMAGE_SIZE', 'Choose a smaller image.', 413)
  const extension = metadata.format === 'jpeg' ? 'jpg' : metadata.format
  const contentType = `image/${metadata.format}` as 'image/jpeg' | 'image/png' | 'image/webp'
  return { data, width: info.width, height: info.height, contentType, extension }
}

function attachmentDto(row: AttachmentRow, owner: boolean) {
  return {
    id: row.id, messageId: row.message_id, contentType: row.content_type,
    byteSize: row.byte_size, width: row.width, height: row.height, slot: row.attachment_slot,
    readHref: owner
      ? `/api/control-center/direct-messages/${row.conversation_id}/attachments/${row.id}`
      : `/api/nic-nac/owner-direct/${row.conversation_id}/attachments/${row.id}`,
  }
}

export async function listOwnerDirectMessages(admin: SupabaseClient, options: {
  recipientQuery?: string; threadQuery?: string; recipientOffset?: number; threadOffset?: number
} = {}) {
  const pageSize = 50
  const recipientOffset = Math.max(0, options.recipientOffset ?? 0)
  const threadOffset = Math.max(0, options.threadOffset ?? 0)
  // PostgREST .or() is a filter expression; strip its structural punctuation.
  const recipientQuery = (options.recipientQuery ?? '').trim().replace(/[^\p{L}\p{N} -]/gu, ' ').slice(0, 80)
  let recipientBuilder = admin.from('reps')
    .select('id, display_name, business_name', { count: 'exact' }).eq('status', 'active')
  if (recipientQuery) {
    recipientBuilder = recipientBuilder.or(`display_name.ilike.%${recipientQuery}%,business_name.ilike.%${recipientQuery}%`)
  }
  const [recipients, threads] = await Promise.all([
    recipientBuilder.order('display_name').order('id').range(recipientOffset, recipientOffset + pageSize - 1),
    admin.rpc('list_workspace_owner_direct_page', {
      p_query: (options.threadQuery ?? '').trim().slice(0, 80) || null,
      p_limit: pageSize, p_offset: threadOffset,
    }),
  ])
  if (recipients.error || threads.error) throw failure('OWNER_DIRECT_LIST_FAILED', 'Direct messages could not be loaded.', 500, recipients.error ?? threads.error)
  const recipientRows = recipients.data ?? []
  const threadRows = (threads.data ?? []) as Array<{
    id: string; rep_id: string; rep_name: string; business_name: string | null
    subject: string; state: string; latest_message_preview: string
    last_message_at: string; unread_count: number; total_count: number | string
  }>
  const recipientsDto = recipientRows.map((row) => ({
    id: row.id, name: row.display_name || row.business_name || 'Sparkle Suite rep',
    businessName: row.business_name || null,
  }))
  return {
    recipients: recipientsDto,
    recipientHasMore: recipientOffset + recipientRows.length < (recipients.count ?? 0),
    recipientNextOffset: recipientOffset + recipientRows.length,
    conversations: threadRows.map((row) => {
      return {
        id: row.id, repId: row.rep_id,
        repName: row.rep_name,
        businessName: row.business_name,
        subject: row.subject, state: row.state,
        latestMessagePreview: row.latest_message_preview, lastMessageAt: row.last_message_at,
        unreadCount: row.unread_count,
      }
    }),
    threadHasMore: threadOffset + threadRows.length < Number(threadRows[0]?.total_count ?? 0),
    threadNextOffset: threadOffset + threadRows.length,
  }
}

async function requireOwnerDirectConversation(admin: SupabaseClient, conversationId: string) {
  const result = await admin.from('workspace_conversations')
    .select('id, conversation_type, state, subject, context_id, last_message_at, latest_message_preview, updated_at')
    .eq('id', conversationId).maybeSingle()
  if (result.error || !result.data || result.data.conversation_type !== 'owner_direct') {
    throw failure('OWNER_DIRECT_NOT_FOUND', 'That direct message could not be found.', 404, result.error)
  }
  return result.data as ConversationRow
}

export async function getOwnerDirectConversation(admin: SupabaseClient, conversationId: string, markRead = true) {
  const row = await requireOwnerDirectConversation(admin, conversationId)
  const [rep, messages, attachments, ownerQueue] = await Promise.all([
    admin.from('reps').select('id, display_name, business_name').eq('id', row.context_id).maybeSingle(),
    admin.from('workspace_conversation_messages').select(MESSAGE_SELECT).eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }).order('id', { ascending: true }),
    admin.from('workspace_owner_direct_attachments').select(ATTACHMENT_SELECT).eq('conversation_id', conversationId)
      .order('attachment_slot', { ascending: true }),
    admin.from('workspace_conversation_participants').select('id, unread_count')
      .eq('conversation_id', conversationId).eq('principal_type', 'owner_queue').maybeSingle(),
  ])
  if (rep.error || messages.error || attachments.error || ownerQueue.error || !ownerQueue.data) {
    throw failure('OWNER_DIRECT_LOAD_FAILED', 'That direct message could not be loaded.', 500,
      rep.error ?? messages.error ?? attachments.error ?? ownerQueue.error)
  }
  if (markRead) {
    const marked = await admin.from('workspace_conversation_participants')
      .update({ unread_count: 0, last_read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', ownerQueue.data.id)
    if (marked.error) throw failure('OWNER_DIRECT_READ_FAILED', 'That message opened, but read status could not be saved.', 500, marked.error)
  }
  const attachmentRows = (attachments.data ?? []) as AttachmentRow[]
  const messageRows = (messages.data ?? []) as MessageRow[]
  return {
    conversation: {
      id: row.id, repId: row.context_id,
      repName: rep.data?.display_name || rep.data?.business_name || 'Sparkle Suite rep',
      businessName: rep.data?.business_name || null,
      subject: row.subject, state: row.state,
      latestMessagePreview: row.latest_message_preview, lastMessageAt: row.last_message_at,
      unreadCount: markRead ? 0 : ownerQueue.data.unread_count,
    },
    messages: messageRows.map((message) => ({
      id: message.id, senderType: message.sender_principal_type === 'owner_queue' ? 'owner' : 'rep',
      senderLabel: message.sender_display_name, body: message.body, createdAt: message.created_at,
      attachments: attachmentRows.filter((item) => item.message_id === message.id).map((item) => attachmentDto(item, true)),
    })),
  }
}

export async function sendOwnerDirectMessage(admin: SupabaseClient, input: {
  repId: string; operatorRepId: string; body: string; clientRequestId: string; uploadIds: string[]
}) {
  assertOwnerDirectSendInput(input)
  assertWorkspaceConversationComposingEnabled('owner_direct')
  const recipient = await admin.from('reps').select('id').eq('id', input.repId).eq('status', 'active').maybeSingle()
  if (recipient.error || !recipient.data) throw failure('OWNER_DIRECT_RECIPIENT_UNAVAILABLE', 'That rep is not available for direct messages.', 404, recipient.error)
  // A retry with the same key must not upload another set of images.
  const existingThread = await admin.from('workspace_conversations').select('id')
    .eq('conversation_type', 'owner_direct').eq('context_type', 'rep_profile').eq('context_id', input.repId).maybeSingle()
  if (existingThread.error) throw failure('OWNER_DIRECT_LOOKUP_FAILED', 'The message could not be sent.', 500, existingThread.error)
  if (existingThread.data) {
    const prior = await admin.from('workspace_conversation_messages').select('id, body')
      .eq('conversation_id', existingThread.data.id).eq('sender_identity_key', 'owner:sparkle_suite_owner')
      .eq('client_request_id', input.clientRequestId.trim()).maybeSingle()
    if (prior.error) throw failure('OWNER_DIRECT_LOOKUP_FAILED', 'The message could not be sent.', 500, prior.error)
    if (prior.data) {
      if (prior.data.body !== input.body.trim()) throw failure('OWNER_DIRECT_REQUEST_CONFLICT', 'That send request was already used for different content.', 409)
      const detail = await getOwnerDirectConversation(admin, existingThread.data.id, false)
      const priorMessageId = prior.data.id
      const message = detail.messages.find((item) => item.id === priorMessageId)
      if (!message) throw failure('OWNER_DIRECT_READBACK_FAILED', 'The message was sent, but could not be reopened yet.', 500)
      return { conversation: detail.conversation, message, created: false }
    }
  }
  const uploaded: string[] = []
  let committed = false
  let ticketRows: UploadTicket[] = []
  try {
    const descriptors = []
    const ticketsResult = input.uploadIds.length
      ? await admin.from('workspace_owner_direct_upload_tickets').select('*').in('id', input.uploadIds)
      : { data: [], error: null }
    if (ticketsResult.error) throw failure('OWNER_DIRECT_UPLOAD_LOOKUP_FAILED', 'The image uploads could not be checked.', 500, ticketsResult.error)
    const tickets = (ticketsResult.data ?? []) as UploadTicket[]
    ticketRows = tickets
    const ticketsById = new Map(tickets.map((ticket) => [ticket.id, ticket]))
    if (tickets.length !== input.uploadIds.length) throw failure('OWNER_DIRECT_UPLOAD_INVALID', 'One of the image uploads is missing. Add it again.', 400)
    for (const uploadId of input.uploadIds) {
      const ticket = ticketsById.get(uploadId)
      if (!ticket || ticket.rep_id !== input.repId || ticket.operator_rep_id !== input.operatorRepId
        || ticket.client_request_id !== input.clientRequestId.trim() || ticket.consumed_at
        || Date.now() - new Date(ticket.created_at).getTime() > 2 * 60 * 60 * 1000) {
        throw failure('OWNER_DIRECT_UPLOAD_INVALID', 'An image upload expired or does not match this message. Add it again.', 400)
      }
      const staged = await admin.storage.from(BUCKET).download(ticket.object_path)
      if (staged.error || !staged.data) throw failure('OWNER_DIRECT_UPLOAD_MISSING', 'An image did not finish uploading. Try again.', 409, staged.error)
      if (staged.data.size !== ticket.byte_size || staged.data.size > MAX_BYTES) {
        throw failure('OWNER_DIRECT_UPLOAD_INVALID', 'An uploaded image changed or is too large. Add it again.', 400)
      }
      const file = new File([staged.data], 'staged-image', { type: ticket.content_type })
      const prepared = await prepareOwnerDirectImage(file)
      if (prepared.contentType !== ticket.content_type) {
        throw failure('OWNER_DIRECT_UPLOAD_INVALID', 'An uploaded image type changed. Add it again.', 415)
      }
      const id = ticket.id
      const objectPath = `${input.repId}/${id}.${prepared.extension}`
      const upload = await admin.storage.from(BUCKET).upload(objectPath, prepared.data, {
        contentType: prepared.contentType, upsert: false, cacheControl: 'private, max-age=0',
      })
      if (upload.error) throw failure('OWNER_DIRECT_UPLOAD_FAILED', 'An image could not be uploaded.', 500, upload.error)
      uploaded.push(objectPath)
      descriptors.push({ id, objectPath, contentType: prepared.contentType,
        byteSize: prepared.data.byteLength, width: prepared.width, height: prepared.height })
    }
    const sent = await admin.rpc('send_workspace_owner_direct_message', {
      p_rep_id: input.repId, p_operator_rep_id: input.operatorRepId,
      p_body: input.body.trim(), p_client_request_id: input.clientRequestId.trim(),
      p_attachments: descriptors,
    })
    const result = Array.isArray(sent.data) ? sent.data[0] : sent.data
    if (sent.error || !result) throw failure('OWNER_DIRECT_SEND_FAILED', 'The direct message could not be sent.', 500, sent.error)
    committed = true
    if (!result.out_created && uploaded.length) {
      await admin.storage.from(BUCKET).remove(uploaded)
      uploaded.length = 0
    }
    if (ticketRows.length) {
      const consumed = await admin.from('workspace_owner_direct_upload_tickets')
        .update({ consumed_at: new Date().toISOString() }).in('id', ticketRows.map((ticket) => ticket.id))
      if (consumed.error) console.error('[owner-direct] sent message upload tickets could not be marked consumed', consumed.error)
      const cleared = await admin.storage.from(BUCKET).remove(ticketRows.map((ticket) => ticket.object_path))
      if (cleared.error) console.error('[owner-direct] sent message staging images await scheduled cleanup', cleared.error)
    }
    const detail = await getOwnerDirectConversation(admin, result.out_conversation_id as string, false)
    const message = detail.messages.find((item) => item.id === result.out_message_id)
    if (!message) throw failure('OWNER_DIRECT_READBACK_FAILED', 'The message was sent, but could not be reopened yet.', 500)
    return {
      conversation: detail.conversation,
      message,
      created: Boolean(result.out_created),
    }
  } catch (error) {
    if (!committed) {
      // The RPC can commit and still lose its HTTP response. Reconcile before
      // deleting final objects, or the committed message could lose its images.
      try {
        const thread = await admin.from('workspace_conversations').select('id')
          .eq('conversation_type', 'owner_direct').eq('context_type', 'rep_profile')
          .eq('context_id', input.repId).maybeSingle()
        if (thread.error) throw thread.error
        const prior = thread.data
          ? await admin.from('workspace_conversation_messages').select('id, body')
              .eq('conversation_id', thread.data.id).eq('sender_identity_key', 'owner:sparkle_suite_owner')
              .eq('client_request_id', input.clientRequestId.trim()).maybeSingle()
          : { data: null, error: null }
        if (prior.error) throw prior.error
        const linked = uploaded.length
          ? await admin.from('workspace_owner_direct_attachments').select('object_path')
              .in('object_path', uploaded)
          : { data: [], error: null }
        if (linked.error) throw linked.error
        const linkedPaths = new Set((linked.data ?? []).map((row) => row.object_path))
        const unlinked = uploaded.filter((path) => !linkedPaths.has(path))
        if (unlinked.length) await admin.storage.from(BUCKET).remove(unlinked)
        if (prior.data && thread.data) {
          const detail = await getOwnerDirectConversation(admin, thread.data.id, false)
          const message = detail.messages.find((item) => item.id === prior.data?.id)
          if (message) return { conversation: detail.conversation, message, created: false }
        }
      } catch (reconcileError) {
        // The scheduled cleanup keeps unlinked private objects from persisting.
        console.error('[owner-direct] send outcome needs reconciliation', reconcileError)
      }
    }
    throw error
  }
}

export async function createOwnerDirectAttachmentSignedRead(admin: SupabaseClient, input: {
  conversationId: string; attachmentId: string; repId?: string; ownerAuthorized?: boolean
}) {
  if (!input.ownerAuthorized) {
    if (!input.repId) throw failure('OWNER_DIRECT_FORBIDDEN', 'You do not have access to that image.', 403)
    const membership = await requireRepConversationMembership(admin, input.repId, input.conversationId)
    assertRepConversationAction(membership, 'read')
    if (membership.conversationType !== 'owner_direct') throw failure('OWNER_DIRECT_FORBIDDEN', 'You do not have access to that image.', 403)
  }
  await requireOwnerDirectConversation(admin, input.conversationId)
  const attachment = await admin.from('workspace_owner_direct_attachments').select('id, object_path')
    .eq('id', input.attachmentId).eq('conversation_id', input.conversationId).maybeSingle()
  if (attachment.error || !attachment.data) throw failure('OWNER_DIRECT_ATTACHMENT_NOT_FOUND', 'That image could not be found.', 404, attachment.error)
  const signed = await admin.storage.from(BUCKET).createSignedUrl(attachment.data.object_path, READ_SECONDS)
  if (signed.error || !signed.data?.signedUrl) throw failure('OWNER_DIRECT_IMAGE_READ_FAILED', 'That image could not be opened right now.', 500, signed.error)
  return { attachmentId: input.attachmentId, url: signed.data.signedUrl, expiresIn: READ_SECONDS }
}

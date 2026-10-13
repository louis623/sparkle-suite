import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  listOperatorWorkspaceResources,
  publishWorkspaceResource,
  WORKSPACE_RESOURCE_TYPES,
} from '@/lib/services/workspace-resources'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchWorkspaceMessageAutomationAfterResponse } from '@/lib/services/workspace-message-dispatch'
import {
  deliverSuiteListNotice,
  renderSuiteOfficialNoticeHtml,
  resourceNoticeContent,
} from '@/lib/services/suite-official-notice'
import {
  AuthError,
  getControlCenterAccess,
  OperatorAuthError,
} from '@/lib/supabase/operator-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const publishSchema = z.object({
  resourceKey: z.string().trim().max(120).optional().default(''),
  resourceType: z.enum(WORKSPACE_RESOURCE_TYPES).optional().default('blog'),
  title: z.string().trim().max(160).optional().default(''),
  summary: z.string().trim().max(500).optional().default(''),
  body: z.string().trim().max(30_000).default(''),
  category: z.string().trim().max(80).default('General'),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  thumbnailUrl: z.string().trim().max(2048).optional().nullable().default(null),
  videoProvider: z.enum(['youtube', 'vimeo', 'loom', 'other']).optional().nullable(),
  videoUrl: z.string().trim().max(2048).optional().nullable().default(null),
  actionUrl: z.string().trim().max(2048).optional().nullable().default(null),
  changeSummary: z.string().trim().max(500).optional().default(''),
  isFeatured: z.boolean().default(false),
  authorLabel: z.string().trim().min(2).max(80).default('Sparkle Suite'),
  announce: z.boolean().default(true),
  emailSuiteList: z.boolean().optional().default(false),
  operation: z.enum(['publish', 'email_preview']).optional().default('publish'),
})

function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (error instanceof OperatorAuthError) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return null
}

export async function GET() {
  try {
    await getControlCenterAccess()
    const resources = await listOperatorWorkspaceResources(createAdminClient())
    return NextResponse.json({ resources })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    console.error('[control-center/resources] list failed', error)
    return NextResponse.json(
      { error: 'Resources could not be loaded right now.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const { operator } = await getControlCenterAccess()
    const input = publishSchema.parse(await request.json())
    if (input.operation === 'email_preview') {
      const content = resourceNoticeContent(input)
      const rendered = renderSuiteOfficialNoticeHtml(content)
      return NextResponse.json({
        ok: true,
        html: rendered.html,
        subject: content.headline,
        variables: rendered.variables,
        thumbnailUrl: content.thumbnailUrl,
        ctaLabel: content.ctaLabel,
        ctaUrl: content.ctaUrl,
      })
    }
    const admin = createAdminClient()
    const result = await publishWorkspaceResource({
      supabase: admin,
      input: {
        ...input,
        actorKind: 'owner',
        actor: operator.email,
      },
    })
    dispatchWorkspaceMessageAutomationAfterResponse({
      supabase: admin,
      source: 'resource_publish',
    })
    const suiteListEmail = input.emailSuiteList
      ? await deliverSuiteListNotice({
          supabase: admin,
          idempotencyKey: `suite-list:resource:${result.resource.id}:v${result.resource.version}`,
          sourceKind: 'workspace_resource',
          sourceId: result.resource.id,
          content: resourceNoticeContent({
            ...input,
            title: result.resource.title,
            thumbnailUrl: result.resource.thumbnailUrl,
            videoUrl: result.resource.videoUrl,
            actionUrl: result.resource.actionUrl,
          }),
        })
      : null

    return NextResponse.json({ ok: true, ...result, suiteListEmail }, { status: 201 })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Check the resource details and try again.' },
        { status: 400 },
      )
    }
    console.error('[control-center/resources] publish failed', error)
    return NextResponse.json(
      { error: 'The resource could not be published right now.' },
      { status: 500 },
    )
  }
}

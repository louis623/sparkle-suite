import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { safeRelativeRedirectPath } from '@/lib/auth/safe-redirect'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ensureSelfServeWorkspaceForAuthUser,
  getSelfServeDisplayNameFromAuthUser,
  selfServeSignupEnabled,
} from '@/lib/self-serve/signup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function redirectTo(requestUrl: URL, path: string | null) {
  return NextResponse.redirect(
    new URL(safeRelativeRedirectPath(path), requestUrl.origin),
  )
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=missing_oauth_code', requestUrl.origin),
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(
      new URL('/login?error=oauth_exchange_failed', requestUrl.origin),
    )
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user?.id || !user.email) {
    return NextResponse.redirect(
      new URL('/login?error=oauth_exchange_failed', requestUrl.origin),
    )
  }

  const selfServeSignupCallback =
    requestUrl.searchParams.get('signup') === 'self-serve'
  const selfServeOpen = selfServeSignupEnabled()
  const admin = createAdminClient()
  const workspace = await ensureSelfServeWorkspaceForAuthUser(
    {
      authUserId: user.id,
      email: user.email,
      displayName: getSelfServeDisplayNameFromAuthUser(user),
      referralCode: requestUrl.searchParams.get('ref'),
      finderDirectoryVisible: true,
    },
    admin,
    { allowCreate: selfServeSignupCallback && selfServeOpen },
  )
  if (!workspace.repId) {
    await supabase.auth.signOut({ scope: 'local' })
    const errorCode = selfServeSignupCallback
      ? 'self_serve_not_open'
      : 'account_not_found'
    return NextResponse.redirect(
      new URL(`/login?error=${errorCode}`, requestUrl.origin),
    )
  }

  const nextPath = safeRelativeRedirectPath(
    requestUrl.searchParams.get('next'),
  )
  if (
    !nextPath.startsWith('/reset-password') &&
    !workspace.created &&
    workspace.repStatus !== 'active'
  ) {
    await supabase.auth.signOut({ scope: 'local' })
    return NextResponse.redirect(
      new URL('/login?error=account_not_found', requestUrl.origin),
    )
  }

  return redirectTo(requestUrl, requestUrl.searchParams.get('next'))
}

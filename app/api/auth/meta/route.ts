import { NextRequest, NextResponse } from 'next/server'
import { loadMetaTokens } from '@/lib/meta'

export const dynamic = 'force-dynamic'

const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
].join(',')

// GET /api/auth/meta?action=status — returns which channels have Meta tokens configured
// GET /api/auth/meta — redirects to Facebook OAuth consent screen
export async function GET(req: NextRequest) {
  const action = new URL(req.url).searchParams.get('action')

  if (action === 'status') {
    const tokens = await loadMetaTokens()
    const status: Record<string, { instagram: boolean; facebook: boolean }> = {}
    for (const [ch, cfg] of Object.entries(tokens)) {
      status[ch] = {
        instagram: !!(cfg.instagramAccountId),
        facebook: !!(cfg.facebookPageId),
      }
    }
    return NextResponse.json(status)
  }

  const appId      = process.env.META_APP_ID
  const baseUrl    = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'
  const redirectUri = `${baseUrl}/api/auth/meta/callback`

  if (!appId) {
    return NextResponse.json({ error: 'META_APP_ID is not configured' }, { status: 503 })
  }

  const authUrl =
    `https://www.facebook.com/v25.0/dialog/oauth` +
    `?client_id=${encodeURIComponent(appId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&response_type=code`

  return NextResponse.redirect(authUrl)
}

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
].join(',')

// GET /api/auth/meta
// Redirects the browser to Facebook's OAuth consent screen.
// On approval the user lands at /api/auth/meta/callback.
export async function GET() {
  const appId      = process.env.META_APP_ID
  // META_REDIRECT_BASE lets us use a domain already whitelisted in the Meta app
  // (e.g. the legacy hostname) while keeping NEXT_PUBLIC_APP_URL for all other links.
  const redirectBase = process.env.META_REDIRECT_BASE || process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'
  const redirectUri = `${redirectBase}/api/auth/meta/callback`

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

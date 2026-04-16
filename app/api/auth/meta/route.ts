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

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getOAuth2Client, loadTokens, saveTokens } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // channel name
  const error = searchParams.get('error')

  if (error) {
    console.error('[youtube-callback] OAuth error:', error)
    return NextResponse.redirect(new URL('/accounts?error=' + encodeURIComponent(error), req.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/accounts?error=missing_code', req.url))
  }

  try {
    const oauth2 = getOAuth2Client()

    // Exchange code for tokens
    const { tokens } = await oauth2.getToken(code)
    oauth2.setCredentials(tokens)

    // Fetch YouTube channel info
    const youtube = google.youtube({ version: 'v3', auth: oauth2 })
    const channelRes = await youtube.channels.list({
      part: ['snippet'],
      mine: true,
    })

    const channelInfo = channelRes.data.items?.[0]
    const ytChannelName = channelInfo?.snippet?.title || state
    const ytChannelId = channelInfo?.id || ''

    // Store tokens keyed by app channel name
    const allTokens = await loadTokens()
    allTokens[state] = {
      access_token: tokens.access_token || '',
      refresh_token: tokens.refresh_token || '',
      expiry_date: tokens.expiry_date || 0,
      youtube_channel_name: ytChannelName,
      youtube_channel_id: ytChannelId,
    }
    await saveTokens(allTokens)

    console.log(`[youtube-callback] Connected "${state}" → YouTube channel "${ytChannelName}" (${ytChannelId})`)

    return NextResponse.redirect(
      new URL(`/accounts?connected=${encodeURIComponent(state)}`, req.url)
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[youtube-callback] Error:', message)
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(message)}`, req.url)
    )
  }
}

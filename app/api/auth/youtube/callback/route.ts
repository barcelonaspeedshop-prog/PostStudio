import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getOAuth2Client, loadTokens, saveTokens } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

// Hardcoded channel IDs as a fallback in case channels.list returns nothing
// (Brand Accounts sometimes don't appear via mine=true on first call).
const CHANNEL_IDS: Record<string, string> = {
  'Gentlemen of Fuel': 'UCRul9-FAiGqwz7yKa7WRCwQ',
  'Omnira F1':         'UCpJHo_MnHVZ2cCydZVAND2Q',
  'Road & Trax':       'UCL2hKeQUBiEG36rfTs9bhbw',
  'Omnira Football':   'UClMPeEgy_Q21K0v5GrOh4kw',
  'Omnira Cricket':    'UCiXqVtRt-KYsRlS0LYl_iBw',
  'Omnira Golf':       'UCyUvDlet6Py9D30aCdv46SA',
  'Omnira NFL':        'UCR6DnL1k6Uq1lgHT27cKnHA',
  'Omnira Food':       'UC970CeC0HKQIlLuiqbvgkkA',
  'Omnira Travel':     'UCkehLjuwibcMWVeP5xzWlJA',
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state') // PostStudio channel name that started the flow
  const error = searchParams.get('error')

  if (error) {
    console.error('[youtube-callback] OAuth error:', error)
    return NextResponse.redirect(`${appUrl}/accounts?error=${encodeURIComponent(error)}`)
  }
  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/accounts?error=missing_code_or_channel`)
  }

  try {
    const oauth2 = getOAuth2Client()

    // Exchange the authorisation code for tokens
    const { tokens } = await oauth2.getToken(code)
    oauth2.setCredentials(tokens)

    if (!tokens.refresh_token) {
      // This usually means the user clicked through without granting offline access.
      // Revoking existing app access and reconnecting will fix it.
      console.warn(`[youtube-callback] No refresh_token returned for "${state}" — user may need to revoke and reconnect`)
    }

    // Find out which YouTube channel this token actually belongs to.
    // When the user selected a specific Brand Account on the consent screen,
    // mine=true will return that Brand Account's channel.
    const youtube    = google.youtube({ version: 'v3', auth: oauth2 })
    const channelRes = await youtube.channels.list({ part: ['id', 'snippet'], mine: true })
    const ytChannel  = channelRes.data.items?.[0]

    const youtubeChannelId   = ytChannel?.id                    || CHANNEL_IDS[state] || ''
    const youtubeChannelName = ytChannel?.snippet?.title        || state
    const youtubeHandle      = ytChannel?.snippet?.customUrl    || ''

    console.log(
      `[youtube-callback] "${state}" → YouTube channel: "${youtubeChannelName}"` +
      ` (id: ${youtubeChannelId}, handle: ${youtubeHandle})`
    )

    if (!youtubeChannelId) {
      console.warn(`[youtube-callback] No channel ID resolved for "${state}" — token saved without channel ID`)
    }

    // Save the token ONLY for the channel that initiated this OAuth flow.
    // Each channel must be connected individually so its token is scoped to
    // the Brand Account selected on the Google consent screen.
    const allTokens = await loadTokens()
    allTokens[state] = {
      access_token:         tokens.access_token  || '',
      refresh_token:        tokens.refresh_token || allTokens[state]?.refresh_token || '',
      expiry_date:          tokens.expiry_date   || 0,
      youtube_channel_name: youtubeChannelName,
      youtube_channel_id:   youtubeChannelId,
      youtube_handle:       youtubeHandle,
    }
    await saveTokens(allTokens)

    console.log(`[youtube-callback] Token saved for "${state}"`)

    return NextResponse.redirect(
      `${appUrl}/accounts?connected=${encodeURIComponent(state)}`
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[youtube-callback] Error:', message)
    return NextResponse.redirect(
      `${appUrl}/accounts?error=${encodeURIComponent(message)}`
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getOAuth2Client, loadTokens, saveTokens } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

// Map PostStudio channel names to their YouTube handles
const CHANNEL_HANDLES: Record<string, string> = {
  'Gentlemen of Fuel': '@gentlemenoffuel',
  'Omnira F1': '@omniraf1',
  'Road & Trax': '@roadandtrax',
  'Omnira Football': '@omnirafc',
}

// Hardcoded fallback channel IDs for when handle matching fails
const CHANNEL_IDS: Record<string, string> = {
  'Gentlemen of Fuel': 'UCRul9-FAiGqwz7yKa7WRCwQ',
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // PostStudio channel name that initiated the flow
  const error = searchParams.get('error')

  if (error) {
    console.error('[youtube-callback] OAuth error:', error)
    return NextResponse.redirect(`${appUrl}/accounts?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/accounts?error=missing_code`)
  }

  try {
    const oauth2 = getOAuth2Client()

    // Exchange code for tokens
    const { tokens } = await oauth2.getToken(code)
    oauth2.setCredentials(tokens)

    const youtube = google.youtube({ version: 'v3', auth: oauth2 })

    // Fetch channels: mine=true returns the primary channel
    const channelRes = await youtube.channels.list({
      part: ['snippet'],
      mine: true,
      maxResults: 50,
    })

    const ytChannels = [...(channelRes.data.items || [])]

    // Log each channel with full detail
    for (const ch of ytChannels) {
      console.log(`[youtube-callback] Channel: id=${ch.id}, title="${ch.snippet?.title}", customUrl="${ch.snippet?.customUrl}"`)
    }

    // Also try fetching known channel IDs directly (Brand Accounts may not appear in mine=true)
    const knownIds = Object.values(CHANNEL_IDS)
    const missingIds = knownIds.filter(id => !ytChannels.some(ch => ch.id === id))
    if (missingIds.length > 0) {
      try {
        const byIdRes = await youtube.channels.list({
          part: ['snippet'],
          id: missingIds,
          maxResults: 50,
        })
        const extra = byIdRes.data.items || []
        for (const ch of extra) {
          console.log(`[youtube-callback] Found by ID lookup: id=${ch.id}, title="${ch.snippet?.title}", customUrl="${ch.snippet?.customUrl}"`)
          ytChannels.push(ch)
        }
      } catch (e) {
        console.warn(`[youtube-callback] Channel ID lookup failed:`, e instanceof Error ? e.message : e)
      }
    }

    console.log(`[youtube-callback] Total channels available: ${ytChannels.length}`)

    if (ytChannels.length === 0) {
      return NextResponse.redirect(
        `${appUrl}/accounts?error=${encodeURIComponent('No YouTube channels found on this account')}`
      )
    }

    // Match ALL PostStudio channels to YouTube channels and store tokens for each
    const allTokens = await loadTokens()
    const connected: string[] = []

    for (const [psChannel, handle] of Object.entries(CHANNEL_HANDLES)) {
      // Try matching by handle first
      let matched = ytChannels.find(ch =>
        (ch.snippet?.customUrl || '').toLowerCase() === handle.toLowerCase()
      )

      // Fallback: match by hardcoded channel ID
      if (!matched && CHANNEL_IDS[psChannel]) {
        matched = ytChannels.find(ch => ch.id === CHANNEL_IDS[psChannel])
        if (matched) {
          console.log(`[youtube-callback] Handle miss for "${psChannel}", matched by channel ID ${CHANNEL_IDS[psChannel]}`)
        }
      }

      if (matched) {
        allTokens[psChannel] = {
          access_token: tokens.access_token || '',
          refresh_token: tokens.refresh_token || '',
          expiry_date: tokens.expiry_date || 0,
          youtube_channel_name: matched.snippet?.title || psChannel,
          youtube_channel_id: matched.id || '',
          youtube_handle: matched.snippet?.customUrl || '',
        }
        connected.push(psChannel)
        console.log(`[youtube-callback] Matched "${psChannel}" → "${matched.snippet?.title}" (${matched.snippet?.customUrl}, ID: ${matched.id})`)
      }
    }

    await saveTokens(allTokens)

    console.log(`[youtube-callback] Connected ${connected.length} channel(s): ${connected.join(', ')}`)

    return NextResponse.redirect(
      `${appUrl}/accounts?connected=${encodeURIComponent(connected.join(', '))}`
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[youtube-callback] Error:', message)
    return NextResponse.redirect(
      `${appUrl}/accounts?error=${encodeURIComponent(message)}`
    )
  }
}

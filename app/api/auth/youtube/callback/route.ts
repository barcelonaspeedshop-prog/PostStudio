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

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // PostStudio channel name
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

    // Fetch all channels the authenticated user manages
    const channelRes = await youtube.channels.list({
      part: ['snippet'],
      mine: true,
      maxResults: 50,
    })

    const channels = channelRes.data.items || []
    const expectedHandle = CHANNEL_HANDLES[state]

    // DEBUG: Log all channels found on this account
    const debugChannels = channels.map(ch => ({
      id: ch.id,
      title: ch.snippet?.title,
      customUrl: ch.snippet?.customUrl,
      description: (ch.snippet?.description || '').slice(0, 80),
    }))
    console.log(`[youtube-callback] Looking for "${state}" (expected handle: ${expectedHandle})`)
    console.log(`[youtube-callback] Found ${channels.length} channel(s):`, JSON.stringify(debugChannels, null, 2))

    // Find the matching YouTube channel by handle (case-insensitive)
    let matched = channels.find(ch => {
      const handle = ch.snippet?.customUrl || ''
      return handle.toLowerCase() === expectedHandle?.toLowerCase()
    })

    // Fallback: if no handle match, try matching by channel title
    if (!matched && expectedHandle) {
      matched = channels.find(ch => {
        const title = ch.snippet?.title || ''
        return title.toLowerCase().includes(state.toLowerCase()) ||
               state.toLowerCase().includes(title.toLowerCase())
      })
    }

    // If still no match, use the first channel and warn
    if (!matched && channels.length > 0) {
      matched = channels[0]
      console.warn(`[youtube-callback] No handle match for "${state}" (expected ${expectedHandle}). Using first channel: "${matched?.snippet?.title}"`)
    }

    if (!matched) {
      return NextResponse.redirect(
        `${appUrl}/accounts?error=${encodeURIComponent('No YouTube channels found on this account')}`
      )
    }

    const ytChannelName = matched.snippet?.title || state
    const ytChannelId = matched.id || ''
    const ytHandle = matched.snippet?.customUrl || ''

    // Store tokens keyed by PostStudio channel name
    const allTokens = await loadTokens()
    allTokens[state] = {
      access_token: tokens.access_token || '',
      refresh_token: tokens.refresh_token || '',
      expiry_date: tokens.expiry_date || 0,
      youtube_channel_name: ytChannelName,
      youtube_channel_id: ytChannelId,
      youtube_handle: ytHandle,
    }
    await saveTokens(allTokens)

    console.log(`[youtube-callback] Connected "${state}" → "${ytChannelName}" (${ytHandle}, ${ytChannelId})`)

    // DEBUG: Include channel list in redirect so it's visible in the UI
    const debugParam = encodeURIComponent(JSON.stringify(debugChannels))

    return NextResponse.redirect(
      `${appUrl}/accounts?connected=${encodeURIComponent(state)}&matched_handle=${encodeURIComponent(ytHandle)}&matched_name=${encodeURIComponent(ytChannelName)}&debug_channels=${debugParam}`
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[youtube-callback] Error:', message)
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(message)}`, req.url)
    )
  }
}

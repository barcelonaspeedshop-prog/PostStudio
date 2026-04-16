import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAuthenticatedClient, getTokenForChannel } from '@/lib/youtube'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// The single Google account whose OAuth token manages ALL Brand Account channels.
// All channels share this token for uploads; each channel's youtube_channel_id
// is still used to route the video to the correct Brand Account destination.
// Override with YOUTUBE_MASTER_CHANNEL env var if the managing account changes.
const MASTER_CHANNEL = process.env.YOUTUBE_MASTER_CHANNEL || 'Gentlemen of Fuel'

const CATEGORY_IDS: Record<string, string> = {
  'Gentlemen of Fuel': '2',  // Autos & Vehicles
  'Omnira F1':         '2',  // Autos & Vehicles
  'Road & Trax':       '2',  // Autos & Vehicles
  'Omnira Football':   '17', // Sports
  'Omnira NFL':        '17', // Sports
  'Omnira Golf':       '17', // Sports
  'Omnira Cricket':    '17', // Sports
  'Omnira Food':       '26', // Howto & Style
  'Omnira Travel':     '19', // Travel & Events
}

export async function POST(req: NextRequest) {
  try {
    const { videoBase64, title, description, tags, channelName } = await req.json()

    if (!videoBase64) {
      return NextResponse.json({ error: 'videoBase64 is required' }, { status: 400 })
    }
    if (!channelName) {
      return NextResponse.json({ error: 'channelName is required' }, { status: 400 })
    }

    // ── Step 1: get the target channel's stored ID ───────────────────────────
    // We still look up the per-channel token purely to read youtube_channel_id.
    // The OAuth client itself always comes from the master account token.
    const targetToken = await getTokenForChannel(channelName)
    const channelId   = targetToken?.youtube_channel_id
    if (!channelId) {
      return NextResponse.json(
        { error: `No YouTube channel ID stored for "${channelName}". Connect it on the Accounts page.` },
        { status: 400 }
      )
    }

    // ── Step 2: authenticate using the master account token ──────────────────
    // This is the single Google account (barcelonaspeedshop@gmail.com) that
    // manages all Brand Account channels.
    console.log(`[youtube-publish] Authenticating via master channel: "${MASTER_CHANNEL}"`)
    const oauth2   = await getAuthenticatedClient(MASTER_CHANNEL)
    const youtube  = google.youtube({ version: 'v3', auth: oauth2 })

    // ── Step 3: verify the target channel is managed by this account ─────────
    console.log(`[youtube-publish] Verifying channel ${channelId} is accessible...`)
    const channelsRes = await youtube.channels.list({
      part: ['id', 'snippet'],
      managedByMe: true,
      mine: true,
      maxResults: 50,
    })
    const managedChannels = channelsRes.data.items || []
    const managedIds      = managedChannels.map(c => c.id)
    const targetFound     = managedIds.includes(channelId)

    console.log(`[youtube-publish] Managed channels (${managedChannels.length}): ${managedIds.join(', ')}`)
    console.log(`[youtube-publish] Target channel ${channelId} found: ${targetFound}`)

    if (!targetFound) {
      return NextResponse.json(
        {
          error: `Channel ID ${channelId} (${channelName}) is not managed by the master account "${MASTER_CHANNEL}". ` +
                 `Managed channels: ${managedIds.join(', ') || 'none found'}`,
        },
        { status: 403 }
      )
    }

    // ── Step 4: upload ───────────────────────────────────────────────────────
    const base64Data = videoBase64.replace(/^data:video\/\w+;base64,/, '')
    const buffer     = Buffer.from(base64Data, 'base64')
    const stream     = new Readable()
    stream.push(buffer)
    stream.push(null)

    console.log(`[youtube-publish] Uploading ${(buffer.length / 1024 / 1024).toFixed(1)} MB → channel ${channelId} ("${channelName}")`)
    console.log(`[youtube-publish] Title: "${title}", Tags: [${(tags || []).join(', ')}]`)

    // onBehalfOfContentOwnerChannel tells the API which Brand Account channel
    // to publish to when the OAuth token belongs to the managing Google account.
    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      onBehalfOfContentOwnerChannel: channelId,
      requestBody: {
        snippet: {
          title:       (title       || 'Carousel Video').slice(0, 100),
          description: (description || '').slice(0, 5000),
          tags:        tags || [],
          categoryId:  CATEGORY_IDS[channelName] || '22',
        },
        status: {
          privacyStatus:            'public',
          selfDeclaredMadeForKids:  false,
        },
      },
      media: {
        mimeType: 'video/mp4',
        body:     stream,
      },
    })

    const videoId  = res.data.id
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

    console.log(`[youtube-publish] Success: ${videoUrl}`)

    return NextResponse.json({
      videoId,
      url:   videoUrl,
      title: res.data.snippet?.title,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[youtube-publish] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

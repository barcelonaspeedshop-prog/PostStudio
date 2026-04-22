import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAuthenticatedClient, getTokenForChannel } from '@/lib/youtube'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

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
    const { videoBase64, title, description, tags, channelName, thumbnailBase64 } = await req.json()

    if (!videoBase64) {
      return NextResponse.json({ error: 'videoBase64 is required' }, { status: 400 })
    }
    if (!channelName) {
      return NextResponse.json({ error: 'channelName is required' }, { status: 400 })
    }

    // Load the per-channel OAuth token. Each channel must be connected
    // individually via /api/auth/youtube?channel=<name> by signing in AS
    // that specific Brand Account on the Google consent screen.
    const oauth2 = await getAuthenticatedClient(channelName)
    const token  = await getTokenForChannel(channelName)
    const channelId = token?.youtube_channel_id

    console.log(`[youtube-publish] Channel: "${channelName}" → channel ID: ${channelId ?? 'unknown'}`)

    const youtube = google.youtube({ version: 'v3', auth: oauth2 })

    const base64Data = videoBase64.replace(/^data:video\/\w+;base64,/, '')
    const buffer     = Buffer.from(base64Data, 'base64')
    const stream     = new Readable()
    stream.push(buffer)
    stream.push(null)

    console.log(`[youtube-publish] Uploading ${(buffer.length / 1024 / 1024).toFixed(1)} MB for "${channelName}"`)
    console.log(`[youtube-publish] Title: "${title}", Tags: [${(tags || []).join(', ')}]`)

    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title:       (title       || 'Carousel Video').slice(0, 100),
          description: (description || '').slice(0, 5000),
          tags:        tags || [],
          categoryId:  CATEGORY_IDS[channelName] || '22',
        },
        status: {
          privacyStatus:           'public',
          selfDeclaredMadeForKids: false,
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

    // Set thumbnail if provided
    if (thumbnailBase64 && videoId) {
      try {
        const b64 = thumbnailBase64.replace(/^data:image\/\w+;base64,/, '')
        const buf = Buffer.from(b64, 'base64')
        const { Readable: NodeReadable } = await import('stream')
        const thumbStream = new NodeReadable()
        thumbStream.push(buf)
        thumbStream.push(null)
        await youtube.thumbnails.set({
          videoId,
          media: { mimeType: 'image/jpeg', body: thumbStream },
        })
        console.log(`[youtube-publish] Thumbnail set for ${videoId}`)
      } catch (thumbErr) {
        console.warn(`[youtube-publish] Thumbnail upload failed (non-fatal):`, thumbErr instanceof Error ? thumbErr.message : thumbErr)
      }
    }

    return NextResponse.json({
      videoId,
      id: videoId,
      url:   videoUrl,
      title: res.data.snippet?.title,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[youtube-publish] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

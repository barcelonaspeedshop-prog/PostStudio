import { NextRequest, NextResponse } from 'next/server'

const POSTPROXY_BASE = 'https://api.postproxy.dev'

const VALID_PLATFORMS = ['instagram', 'tiktok', 'twitter', 'facebook', 'youtube'] as const
type Platform = (typeof VALID_PLATFORMS)[number]

const PROFILE_GROUPS: Record<string, string> = {
  'Gentlemen of Fuel': 'z4MFLl',
  'Omnira F1': 'qGZFm7',
  'Omnira Golf': 'zBmFDV',
  'Omnira Football': 'qlmF06',
  'Omnira NFL': 'qQLFZj',
  'Omnira Food': 'zgYFNP',
  'Omnira Travel': 'z8NFp1',
  'Road & Trax': 'z4MFLl', // temporary - uses GoF until Road & Trax profile is created
}

function truncateForTwitter(text: string, max = 280): string {
  if (text.length <= max) return text
  const ellipsis = '...'
  const trimmed = text.slice(0, max - ellipsis.length)
  const lastSpace = trimmed.lastIndexOf(' ')
  return (lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed) + ellipsis
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w]+/g)
  return matches ? matches.map(t => t.replace(/^#/, '')) : []
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.POSTPROXY_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'POSTPROXY_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const { content, mediaUrl, platforms, scheduleAt, firstSlideHeadline, channel } = await req.json()

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: `platforms is required. Must be an array of: ${VALID_PLATFORMS.join(', ')}` },
        { status: 400 }
      )
    }

    const invalidPlatforms = platforms.filter(
      (p: string) => !VALID_PLATFORMS.includes(p as Platform)
    )
    if (invalidPlatforms.length > 0) {
      return NextResponse.json(
        { error: `Invalid platforms: ${invalidPlatforms.join(', ')}` },
        { status: 400 }
      )
    }

    // --- Build multipart/form-data request ---
    const formData = new FormData()

    // Post body text
    formData.append('post[body]', content || '')

    // Profile group — map channel name to Postproxy profile group ID
    const profileGroupId = channel ? PROFILE_GROUPS[channel] : undefined
    if (profileGroupId) {
      formData.append('post[profile_group]', profileGroupId)
    }

    // Title
    const videoTitle = firstSlideHeadline || 'Carousel Video'
    formData.append('post[title]', videoTitle.slice(0, 100))

    // Hashtags — extract from content
    const hashtags = extractHashtags(content || '')
    for (const tag of hashtags) {
      formData.append('post[hashtags][]', tag)
    }

    // Schedule if provided
    if (scheduleAt) {
      formData.append('post[scheduled_at]', scheduleAt)
    }

    // Profiles — one entry per platform
    for (const p of platforms as string[]) {
      formData.append('profiles[]', p)
    }

    // Media — convert base64 data URL to binary Buffer and attach as file
    if (mediaUrl && typeof mediaUrl === 'string') {
      if (mediaUrl.startsWith('data:')) {
        const commaIndex = mediaUrl.indexOf(',')
        const header = mediaUrl.substring(0, commaIndex)
        const b64 = mediaUrl.substring(commaIndex + 1)
        const mimeMatch = header.match(/data:([^;]+)/)
        const mimeType = mimeMatch ? mimeMatch[1] : 'video/mp4'
        const ext = mimeType === 'video/mp4' ? 'mp4' : 'webm'

        const buffer = Buffer.from(b64, 'base64')
        const blob = new Blob([buffer], { type: mimeType })

        formData.append('media[]', blob, `carousel.${ext}`)
      } else {
        formData.append('media[]', mediaUrl)
      }
    }

    // Platform-specific parameters
    for (const p of platforms as string[]) {
      switch (p) {
        case 'instagram':
          formData.append('platforms[instagram][format]', 'reel')
          break
        case 'youtube':
          formData.append('platforms[youtube][title]', videoTitle.slice(0, 100))
          formData.append('platforms[youtube][privacy_status]', 'public')
          formData.append('platforms[youtube][made_for_kids]', 'false')
          break
        case 'tiktok':
          formData.append('platforms[tiktok][title]', videoTitle.slice(0, 100))
          formData.append('platforms[tiktok][privacy_status]', 'PUBLIC_TO_EVERYONE')
          break
        case 'twitter':
          formData.append('platforms[twitter][body]', truncateForTwitter(content || ''))
          break
        case 'facebook':
          formData.append('platforms[facebook][format]', 'reel')
          formData.append('platforms[facebook][title]', videoTitle.slice(0, 100))
          formData.append('platforms[facebook][description]', (content || '').slice(0, 500))
          break
      }
    }

    // Log outbound request details for debugging
    const formEntries: Record<string, string> = {}
    formData.forEach((value, key) => {
      formEntries[key] = value instanceof Blob ? `[Blob ${value.size} bytes ${value.type}]` : String(value)
    })
    console.log('[publish] Sending to Postproxy:', JSON.stringify(formEntries, null, 2))

    // --- Send to Postproxy ---
    const res = await fetch(`${POSTPROXY_BASE}/api/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })

    // Parse response
    let data: Record<string, unknown>
    const responseText = await res.text()
    try {
      data = JSON.parse(responseText)
    } catch {
      console.error('[publish] Postproxy non-JSON response:', res.status, responseText)
      return NextResponse.json(
        { error: `Postproxy returned ${res.status}`, details: responseText },
        { status: res.status }
      )
    }

    if (!res.ok) {
      console.error('[publish] Postproxy error:', res.status, JSON.stringify(data, null, 2))
      return NextResponse.json(
        {
          error: data.message || data.error || `Postproxy returned ${res.status}`,
          details: data,
        },
        { status: res.status }
      )
    }

    return NextResponse.json({
      id: data.id,
      status: data.status,
      platforms: data.platforms,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[publish] Unexpected error:', message, stack)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

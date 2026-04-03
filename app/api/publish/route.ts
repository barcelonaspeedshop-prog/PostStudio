import { NextRequest, NextResponse } from 'next/server'

const POSTPROXY_BASE = 'https://api.postproxy.dev'

const VALID_PLATFORMS = ['instagram', 'tiktok', 'twitter', 'facebook', 'youtube'] as const
type Platform = (typeof VALID_PLATFORMS)[number]

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.POSTPROXY_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'POSTPROXY_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const { content, mediaUrl, platforms, scheduleAt } = await req.json()

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: `platforms is required. Must be an array of: ${VALID_PLATFORMS.join(', ')}` },
        { status: 400 }
      )
    }

    const invalidPlatforms = platforms.filter((p: string) => !VALID_PLATFORMS.includes(p as Platform))
    if (invalidPlatforms.length > 0) {
      return NextResponse.json(
        { error: `Invalid platforms: ${invalidPlatforms.join(', ')}. Valid options: ${VALID_PLATFORMS.join(', ')}` },
        { status: 400 }
      )
    }

    // Build platform-specific parameters for video publishing
    const platformParams: Record<string, Record<string, string>> = {}
    for (const p of platforms as string[]) {
      if (p === 'instagram') {
        platformParams.instagram = { format: 'reel' }
      } else if (p === 'youtube') {
        platformParams.youtube = {
          title: content ? content.split('\n')[0].slice(0, 100) : 'Carousel Video',
          privacy_status: 'public',
        }
      }
    }

    // Determine if media is a base64 data URL or an external URL
    const isDataUrl = mediaUrl && typeof mediaUrl === 'string' && mediaUrl.startsWith('data:')

    if (isDataUrl) {
      // Use multipart/form-data for base64 data URL uploads
      // Convert data URL to a Blob/File for the upload
      const [header, b64data] = mediaUrl.split(',')
      const mimeMatch = header.match(/data:([^;]+)/)
      const mimeType = mimeMatch ? mimeMatch[1] : 'video/mp4'
      const binaryStr = atob(b64data)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: mimeType })

      const formData = new FormData()
      formData.append('post[body]', content || '')
      if (scheduleAt) {
        formData.append('post[scheduled_at]', scheduleAt)
      }
      for (const p of platforms as string[]) {
        formData.append('profiles[]', p)
      }
      formData.append('media[]', blob, 'carousel.mp4')

      // Add platform-specific params as form fields
      for (const [platform, params] of Object.entries(platformParams)) {
        for (const [key, value] of Object.entries(params)) {
          formData.append(`platforms[${platform}][${key}]`, value)
        }
      }

      const res = await fetch(`${POSTPROXY_BASE}/api/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          // Do NOT set Content-Type — fetch sets it with the boundary for multipart
        },
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        console.error('[publish] Postproxy error:', res.status, JSON.stringify(data))
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
    } else {
      // Use JSON body for external URL media
      const body: Record<string, unknown> = {
        post: {
          body: content || '',
          ...(scheduleAt ? { scheduled_at: scheduleAt } : {}),
        },
        profiles: platforms,
        ...(mediaUrl ? { media: [mediaUrl] } : {}),
        ...(Object.keys(platformParams).length > 0 ? { platforms: platformParams } : {}),
      }

      const res = await fetch(`${POSTPROXY_BASE}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error('[publish] Postproxy error:', res.status, JSON.stringify(data))
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
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[publish] Unexpected error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

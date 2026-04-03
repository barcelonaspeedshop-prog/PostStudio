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

    // Build the Postproxy request body
    const body: Record<string, unknown> = {
      post: {
        body: content || '',
        ...(scheduleAt ? { scheduled_at: scheduleAt } : {}),
      },
      profiles: platforms,
      ...(mediaUrl ? { media: [mediaUrl] } : {}),
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
      return NextResponse.json(
        { error: data.message || data.error || `Postproxy returned ${res.status}` },
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
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

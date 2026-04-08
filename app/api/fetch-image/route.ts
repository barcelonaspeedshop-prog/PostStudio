import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Proxy endpoint that downloads an image URL and returns it as a base64 data URI.
 * Used to avoid CORS issues when fetching external images client-side.
 */
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url string is required' }, { status: 400 })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch image: ${res.status}` }, { status: 502 })
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await res.arrayBuffer())
    const base64 = `data:${contentType};base64,${buffer.toString('base64')}`

    return NextResponse.json({ base64 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[fetch-image] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

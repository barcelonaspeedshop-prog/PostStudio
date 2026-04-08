import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

/**
 * Proxy endpoint that downloads an image URL, converts it to JPEG via sharp,
 * and returns it as a base64 data URI. Handles any input format (WebP, PNG,
 * AVIF, etc.) by normalising to JPEG.
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

    const rawBuffer = Buffer.from(await res.arrayBuffer())

    // Convert to JPEG regardless of input format to avoid sharp/compositor issues
    const jpegBuffer = await sharp(rawBuffer).jpeg({ quality: 85 }).toBuffer()
    const base64 = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`

    return NextResponse.json({ base64 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[fetch-image] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

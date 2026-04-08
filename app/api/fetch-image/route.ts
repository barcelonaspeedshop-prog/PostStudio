import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
]

const VALID_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

const MIN_IMAGE_SIZE = 5 * 1024 // 5KB — anything smaller is likely an error page

async function downloadAndValidate(url: string, userAgent: string): Promise<{ buffer: Buffer; reason?: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': new URL(url).origin + '/',
      },
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    // Check Content-Type header
    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    if (contentType && !VALID_IMAGE_TYPES.includes(contentType)) {
      throw new Error(`Invalid content type: ${contentType}`)
    }

    const buffer = Buffer.from(await res.arrayBuffer())

    // Check buffer size
    if (buffer.length < MIN_IMAGE_SIZE) {
      throw new Error(`Image too small (${buffer.length} bytes) — likely an error page`)
    }

    return { buffer }
  } catch (e) {
    clearTimeout(timeout)
    throw e
  }
}

/**
 * Proxy endpoint that downloads an image URL, validates it, converts to JPEG
 * via sharp, and returns as base64 data URI. Tries multiple User-Agents.
 * Returns 404 with a reason if all attempts fail so callers skip to the next URL.
 */
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url string is required' }, { status: 400 })
    }

    let lastReason = ''

    // Try each User-Agent until one works
    for (let attempt = 0; attempt < USER_AGENTS.length; attempt++) {
      try {
        const { buffer } = await downloadAndValidate(url, USER_AGENTS[attempt])
        const jpegBuffer = await sharp(buffer).jpeg({ quality: 85 }).toBuffer()
        const base64 = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`
        return NextResponse.json({ base64 })
      } catch (e) {
        lastReason = e instanceof Error ? e.message : 'Unknown error'
        console.warn(`[fetch-image] Attempt ${attempt + 1} failed for ${url}: ${lastReason}`)
      }
    }

    // All attempts failed — return 404 with reason so caller tries next image
    console.error(`[fetch-image] All attempts failed for ${url}: ${lastReason}`)
    return NextResponse.json(
      { error: 'All download attempts failed', reason: lastReason, skip: true },
      { status: 404 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[fetch-image] Error:', message)
    return NextResponse.json(
      { error: message, reason: message, skip: true },
      { status: 404 }
    )
  }
}

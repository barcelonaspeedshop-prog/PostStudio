import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
]

async function downloadBuffer(url: string, userAgent: string): Promise<Buffer> {
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
    return Buffer.from(await res.arrayBuffer())
  } catch (e) {
    clearTimeout(timeout)
    throw e
  }
}

async function convertToJpeg(buffer: Buffer): Promise<Buffer> {
  // Minimum size check — too-small buffers are likely error pages, not images
  if (buffer.length < 200) throw new Error('Buffer too small to be a valid image')
  return sharp(buffer).jpeg({ quality: 85 }).toBuffer()
}

/**
 * Proxy endpoint that downloads an image URL, converts it to JPEG via sharp,
 * and returns it as a base64 data URI. Tries multiple User-Agents if the first
 * attempt fails. Returns 404 if all attempts fail so callers can try the next URL.
 */
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url string is required' }, { status: 400 })
    }

    // Try each User-Agent until one works
    for (let attempt = 0; attempt < USER_AGENTS.length; attempt++) {
      try {
        const rawBuffer = await downloadBuffer(url, USER_AGENTS[attempt])
        const jpegBuffer = await convertToJpeg(rawBuffer)
        const base64 = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`
        return NextResponse.json({ base64 })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        console.warn(`[fetch-image] Attempt ${attempt + 1} failed for ${url}: ${msg}`)
        // Continue to next User-Agent
      }
    }

    // All attempts failed
    console.error(`[fetch-image] All attempts failed for ${url}`)
    return NextResponse.json({ error: 'All download attempts failed' }, { status: 404 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[fetch-image] Error:', message)
    return NextResponse.json({ error: message }, { status: 404 })
  }
}

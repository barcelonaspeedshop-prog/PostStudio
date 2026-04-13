import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type ImageResult = {
  url: string
  title: string
  source: string
  thumbnail?: string
}

const BLOCKED_DOMAINS = [
  'instagram.com',
  'lookaside.instagram.com',
  'lookaside.fbsbx.com',
  'lookaside.facebook.com',
  'fbcdn.net',
  'facebook.com',
  'twitter.com',
  'twimg.com',
  'pbs.twimg.com',
  'ton.twimg.com',
  'tiktok.com',
  'tiktokcdn.com',
  'pinterest.com',
  'pinimg.com',
  'reddit.com',
  'redd.it',
  'whatsapp.com',
]

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

function isBlockedImageUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    // Exact or suffix match against blocked domains
    if (BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) {
      return true
    }
    // Block any hostname starting with "scontent." (Facebook/Instagram CDN)
    if (hostname.startsWith('scontent.') || hostname.startsWith('scontent-')) {
      return true
    }
    return false
  } catch {
    return true // invalid URLs are blocked
  }
}

function isAllowedImageUrl(url: string): boolean {
  if (isBlockedImageUrl(url)) return false
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (!ALLOWED_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
      return false
    }
    return true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const { query, count = 5 } = await req.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query string is required' }, { status: 400 })
    }

    const apiKey = process.env.SERPER_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'SERPER_API_KEY env var is required' },
        { status: 500 }
      )
    }

    const num = Math.min(Math.max(1, Number(count)), 10)

    const res = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num }),
    })
    const data = await res.json()

    if (!res.ok) {
      console.error('[search-images] Serper API error:', JSON.stringify(data))
      return NextResponse.json(
        { error: data.message || 'Serper image search failed' },
        { status: 502 }
      )
    }

    const images: ImageResult[] = (data.images || [])
      .map((item: {
        imageUrl: string
        title: string
        source: string
        thumbnailUrl?: string
      }) => ({
        url: item.imageUrl,
        title: item.title,
        source: item.source,
        thumbnail: item.thumbnailUrl,
      }))
      .filter((img: ImageResult) => isAllowedImageUrl(img.url))

    return NextResponse.json({ query, images })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[search-images] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

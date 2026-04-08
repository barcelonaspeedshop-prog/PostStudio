import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type ImageResult = {
  url: string
  title: string
  source: string
  thumbnail?: string
}

export async function POST(req: NextRequest) {
  try {
    const { query, count = 5 } = await req.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query string is required' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY
    const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID

    if (!apiKey || !engineId) {
      return NextResponse.json(
        { error: 'GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID env vars are required' },
        { status: 500 }
      )
    }

    const num = Math.min(Math.max(1, Number(count)), 10)
    const params = new URLSearchParams({
      key: apiKey,
      cx: engineId,
      q: query,
      searchType: 'image',
      num: String(num),
      safe: 'active',
      imgSize: 'large',
      imgType: 'photo',
    })

    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`)
    const data = await res.json()

    if (!res.ok) {
      console.error('[search-images] Google API error:', JSON.stringify(data.error || data))
      return NextResponse.json(
        { error: data.error?.message || 'Google Search API failed' },
        { status: 502 }
      )
    }

    const images: ImageResult[] = (data.items || []).map((item: {
      link: string
      title: string
      displayLink: string
      image?: { thumbnailLink?: string }
    }) => ({
      url: item.link,
      title: item.title,
      source: item.displayLink,
      thumbnail: item.image?.thumbnailLink,
    }))

    return NextResponse.json({ query, images })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[search-images] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

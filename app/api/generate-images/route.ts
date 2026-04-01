import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PEXELS_API_KEY = process.env.PEXELS_API_KEY

async function searchPexels(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=portrait`,
      { headers: { Authorization: PEXELS_API_KEY || '' } }
    )
    const data = await res.json()
    if (data.photos && data.photos.length > 0) {
      const idx = Math.floor(Math.random() * Math.min(5, data.photos.length))
      return data.photos[idx].src.large2x || data.photos[idx].src.large
    }
    return null
  } catch {
    return null
  }
}

function buildSearchQuery(slide: { headline: string; tag: string; body: string }, channel: string): string {
  const headline = slide.headline.toLowerCase()
  const channelTerms: Record<string, string> = {
    'Gentlemen of Fuel': 'classic car vintage automobile',
    'Omnira F1': 'formula one racing car track',
    'Omnira Football': 'football soccer stadium',
    'Omnira Cricket': 'cricket stadium match',
    'Omnira Golf': 'golf course green',
    'Omnira NFL': 'american football stadium',
    'Omnira Food': 'gourmet food restaurant',
    'Omnira Travel': 'travel destination landscape',
  }
  const base = channelTerms[channel] || ''
  const keywords = headline
    .replace(/the|a|an|of|in|on|at|to|for|with|and|or|but/gi, '')
    .trim().split(' ').slice(0, 3).join(' ')
  return `${keywords} ${base}`.trim()
}

export async function POST(req: NextRequest) {
  try {
    if (!PEXELS_API_KEY) {
      return NextResponse.json({ error: 'PEXELS_API_KEY not set' }, { status: 500 })
    }
    const { slides, channel = 'General' } = await req.json()
    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json({ error: 'slides array is required' }, { status: 400 })
    }
    const imagePromises = slides.map(async (slide: { headline: string; tag: string; body: string }, i: number) => {
      const query = buildSearchQuery(slide, channel)
      const url = await searchPexels(query)
      const finalUrl = url || await searchPexels(channel) || null
      return { index: i, url: finalUrl, query, error: finalUrl ? null : 'No image found' }
    })
    const results = await Promise.all(imagePromises)
    return NextResponse.json({ images: results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

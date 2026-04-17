import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST /api/story-pexels
 * Body: { prompt: string, title: string, channel: string, chapterId: number }
 * Returns: { imageDataUrl: string, chapterId: number, photographer?: string, query?: string }
 *
 * Searches Pexels for a landscape image matching the chapter prompt.
 * Falls back to a broader channel-sport query if the specific query returns no results.
 * Returns 404 if both queries fail (caller should fall back to DALL-E).
 */

// ─── Channel → sport/topic keyword ───
const CHANNEL_SPORT: Record<string, string> = {
  'Gentlemen of Fuel': 'luxury car automobile',
  'Omnira F1':         'Formula 1 racing',
  'Road & Trax':       'racing motorsport car',
  'Omnira Football':   'football soccer',
  'Omnira Cricket':    'cricket sport',
  'Omnira Golf':       'golf sport',
  'Omnira NFL':        'american football',
  'Omnira Food':       'food cooking cuisine',
  'Omnira Travel':     'travel landscape destination',
}

// Words to strip from prompts before extracting search terms
const RENDER_RE = /\b(photorealistic|cinematic|dramatic|editorial|illustration|film\s*grain|bokeh|vivid|magazine\s*quality|golden\s*hour|motion\s*blur|shallow\s*depth|warm\s*tones|cool\s*tones|natural\s*light|studio\s*light|render\s*cue|dramatic\s*shadows|high\s*production)\b/gi

// Articles, prepositions and other words that aren't useful for searches
const SKIP_WORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'at', 'of', 'by', 'for', 'from', 'with', 'and', 'or',
  'but', 'his', 'her', 'their', 'this', 'that', 'was', 'were', 'has', 'had', 'been',
  'into', 'onto', 'over', 'under', 'around', 'between', 'toward', 'while', 'during',
  'near', 'after', 'before', 'behind', 'beside', 'through', 'across', 'against',
  'about', 'along', 'amid', 'upon', 'within', 'without',
])

/**
 * Build a Pexels-friendly search query from a detailed DALL-E style prompt.
 *
 * Strategy:
 *   1. Take the first sentence of the prompt (most content-dense)
 *   2. Strip rendering/style terms
 *   3. Extract capitalized proper noun phrases (people, places, events)
 *   4. Combine up to 2 proper noun phrases + channel sport keyword
 *   5. Fall back to chapter title words + channel sport if no proper nouns found
 */
function buildPexelsQuery(prompt: string, title: string, channel: string): string {
  const sport = CHANNEL_SPORT[channel] || ''

  // Take just the first sentence and clean it
  const firstSentence = prompt.split(/[.!?]/)[0]
  const cleaned = firstSentence
    .replace(RENDER_RE, ' ')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Extract capitalized multi-word phrases (proper nouns — people, places)
  const words = cleaned.split(' ')
  const properPhrases: string[] = []
  let i = 0

  while (i < words.length) {
    const w = words[i]
    if (w.length >= 2 && /^[A-Z]/.test(w) && !SKIP_WORDS.has(w.toLowerCase())) {
      // Try to extend into a multi-word proper noun
      let phrase = w
      let j = i + 1
      while (j < words.length) {
        const next = words[j]
        if (next.length >= 2 && /^[A-Z]/.test(next) && !SKIP_WORDS.has(next.toLowerCase())) {
          phrase += ' ' + next
          j++
        } else {
          break
        }
      }
      properPhrases.push(phrase)
      i = j
    } else {
      i++
    }
  }

  // Best case: we have named entities — combine them with the sport term
  if (properPhrases.length >= 2) {
    return `${properPhrases.slice(0, 2).join(' ')} ${sport}`.trim().slice(0, 120)
  }
  if (properPhrases.length === 1) {
    return `${properPhrases[0]} ${sport}`.trim().slice(0, 120)
  }

  // Fallback: use meaningful words from the chapter title + sport
  const titleWords = title
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z]/g, ''))
    .filter(w => w.length > 3 && !SKIP_WORDS.has(w.toLowerCase()))
    .slice(0, 3)

  if (titleWords.length > 0) {
    return `${titleWords.join(' ')} ${sport}`.trim().slice(0, 120)
  }

  return sport || 'sport'
}

interface PexelsPhoto {
  id: number
  width: number
  height: number
  photographer: string
  photographer_url: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
  }
}

/** Query Pexels and return the widest landscape photo, or null on failure/no results. */
async function searchPexels(query: string, apiKey: string): Promise<PexelsPhoto | null> {
  try {
    const url =
      `https://api.pexels.com/v1/search` +
      `?query=${encodeURIComponent(query)}` +
      `&per_page=15&orientation=landscape&size=large`

    const res = await fetch(url, { headers: { Authorization: apiKey } })

    if (!res.ok) {
      console.error(`[story-pexels] API error ${res.status} for query "${query}"`)
      return null
    }

    const data = await res.json()
    if (!Array.isArray(data.photos) || data.photos.length === 0) return null

    // Pick the photo with the greatest width (highest resolution)
    return [...data.photos].sort(
      (a: PexelsPhoto, b: PexelsPhoto) => b.width - a.width
    )[0]
  } catch (e) {
    console.error(`[story-pexels] Search failed for "${query}":`, e)
    return null
  }
}

/** Download a Pexels photo and return it as a base64 data URL. */
async function photoToDataUrl(photo: PexelsPhoto): Promise<string> {
  // large2x is typically 1880px wide — good quality for 16:9 video
  const imageUrl = photo.src.large2x || photo.src.large || photo.src.original
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const buf = await res.arrayBuffer()
  const b64 = Buffer.from(buf).toString('base64')
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  return `data:${contentType};base64,${b64}`
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'PEXELS_API_KEY not configured' }, { status: 503 })
  }

  try {
    const { prompt, title, channel, chapterId } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const primaryQuery   = buildPexelsQuery(prompt, title ?? '', channel ?? '')
    const fallbackQuery  = CHANNEL_SPORT[channel as string] ?? 'sport'

    console.log(`[story-pexels] ch${chapterId}: primary="${primaryQuery}"`)

    // ── Try 1: specific query from prompt ──
    let photo = await searchPexels(primaryQuery, apiKey)

    // ── Try 2: broad channel sport keyword ──
    if (!photo && fallbackQuery && fallbackQuery !== primaryQuery) {
      console.log(`[story-pexels] ch${chapterId}: no results, trying fallback "${fallbackQuery}"`)
      photo = await searchPexels(fallbackQuery, apiKey)
    }

    if (!photo) {
      console.warn(`[story-pexels] ch${chapterId}: no results for any query — caller should use DALL-E`)
      return NextResponse.json(
        { error: `No Pexels results for chapter ${chapterId}` },
        { status: 404 }
      )
    }

    const imageDataUrl = await photoToDataUrl(photo)

    console.log(
      `[story-pexels] ch${chapterId}: OK ` +
      `(${photo.width}×${photo.height}, ${Math.round(imageDataUrl.length / 1024)}KB b64)`
    )

    return NextResponse.json({
      imageDataUrl,
      chapterId,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      query: primaryQuery,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-pexels] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export type ResearchResult = {
  name: string
  city: string
  country: string
  cuisine: string
  priceRange: string
  credibilityScore: number
  hiddenGemScore: number
  whyItKills: string
  mustTry: string
  localBuzz: string
  sources: string[]
  mapsQuery: string
  bookingUrl: string
  series: 'no-frills' | 'top5'
}

export async function POST(req: NextRequest) {
  try {
    const { city, searchType } = await req.json() as { city: string; searchType: 'no-frills' | 'top5' }
    if (!city || !searchType) {
      return NextResponse.json({ error: 'city and searchType are required' }, { status: 400 })
    }

    const isNoFrills = searchType === 'no-frills'

    const systemPrompt = isNoFrills
      ? `You are a hidden gems food researcher for Omnira Food. Your job is to find restaurants that locals love but tourists haven't discovered yet. Search Reddit food subreddits, local food blogs, Google Maps local guides, and neighborhood forums. Prioritise places with high local traffic, authentic atmosphere, and low tourist footprint. Avoid tourist traps and Michelin-starred restaurants. Always respond with valid JSON only — no markdown, no backticks, no preamble.`
      : `You are a food journalist for Omnira Food. Your job is to identify the top 5 must-visit restaurants or dining experiences in a city — a mix of iconic institutions and celebrated local favourites. Include variety across cuisine types and price points. Always respond with valid JSON only — no markdown, no backticks, no preamble.`

    const userPrompt = isNoFrills
      ? `Search for 4-5 hidden gem restaurants in ${city} that locals love but tourists haven't found yet.

Look on Reddit (r/food, r/${city.replace(/\s+/g, '').toLowerCase()}, local subreddits), local food blogs, Google Maps reviews from local guides, and neighbourhood forums.

For each restaurant find:
- Exact restaurant name and full address
- Cuisine type and price range per person
- What makes it a hidden gem (not a tourist trap)
- The must-try dish
- What locals are saying about it
- Credibility score 1-10 (based on how many authentic local sources mention it)
- Hidden gem score 1-10 (10 = completely off the tourist radar)
- Any booking info

Return ONLY this JSON (an array, no other text):
[
  {
    "name": "restaurant name",
    "city": "${city}",
    "country": "country name",
    "cuisine": "cuisine type",
    "priceRange": "e.g. £10-20pp",
    "credibilityScore": 8,
    "hiddenGemScore": 9,
    "whyItKills": "2-3 sentences on what makes this place special and why it deserves attention",
    "mustTry": "one specific dish or item",
    "localBuzz": "one sentence quoting or summarising what locals say",
    "sources": ["url1", "url2"],
    "mapsQuery": "${city} restaurant name",
    "bookingUrl": "booking url or empty string",
    "series": "no-frills"
  }
]`
      : `Find the top 5 must-visit restaurants in ${city} — iconic institutions and celebrated local favourites that define the city's food scene.

Search for critically acclaimed restaurants, iconic local institutions, and places that serious food lovers consider essential when visiting ${city}. Include variety across cuisine types and price points.

For each restaurant find:
- Exact restaurant name and address
- Cuisine type and price range
- Why it's considered essential — history, reputation, what sets it apart
- The signature dish
- What critics and locals say
- Credibility score 1-10 (based on critical acclaim and local reputation)
- Any awards, Michelin stars, or notable press
- Booking info

Return ONLY this JSON (an array, no other text):
[
  {
    "name": "restaurant name",
    "city": "${city}",
    "country": "country name",
    "cuisine": "cuisine type",
    "priceRange": "e.g. £40-80pp",
    "credibilityScore": 9,
    "hiddenGemScore": 3,
    "whyItKills": "2-3 sentences on what makes this a must-visit and its place in the city's food culture",
    "mustTry": "signature dish or experience",
    "localBuzz": "one sentence on its reputation — awards, press, or what food lovers say",
    "sources": ["url1", "url2"],
    "mapsQuery": "${city} restaurant name",
    "bookingUrl": "booking url or empty string",
    "series": "top5"
  }
]`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    let results: ResearchResult[]
    try {
      const cleaned = text.replace(/```json|```/g, '').trim()
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/)?.[0]
      if (!jsonMatch) throw new Error('No JSON array found in response')
      results = JSON.parse(jsonMatch)
      if (!Array.isArray(results)) throw new Error('Response is not an array')
    } catch {
      console.error('[food-research] Failed to parse:', text.substring(0, 400))
      return NextResponse.json({ error: 'Failed to parse research results' }, { status: 502 })
    }

    return NextResponse.json({ results, city, searchType })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[food-research]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

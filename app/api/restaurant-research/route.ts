import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export type RestaurantData = {
  name: string
  address: string
  city: string
  country: string
  hours: string
  priceRange: string
  cuisine: string
  mustOrder: { dish: string; description: string }[]
  mapsLink: string
  story: string
  awards?: string
  bookingUrl?: string
  slug: string
}

export async function POST(req: NextRequest) {
  try {
    const { restaurantName, city } = await req.json()
    if (!restaurantName || !city) {
      return NextResponse.json({ error: 'restaurantName and city are required' }, { status: 400 })
    }

    const slug = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    const searchMessage = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are a restaurant researcher. Use web search to find accurate, up-to-date information about restaurants.
Always respond with valid JSON only — no markdown, no backticks, no preamble.`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
      messages: [{
        role: 'user',
        content: `Research the restaurant "${restaurantName}" in ${city}. Find:
1. Full street address
2. Opening hours (by day)
3. Price range per person
4. Cuisine type
5. Their most famous / must-order dishes (at least 2-3)
6. What makes this restaurant special — the story, atmosphere, history
7. Any Michelin stars, awards, notable reviews, press mentions
8. Booking URL or reservation method (if any)
9. Google Maps search link (format: https://maps.google.com?q=${encodeURIComponent(restaurantName + ' ' + city)})

Return ONLY this JSON (no other text):
{
  "name": "exact restaurant name",
  "address": "full street address",
  "city": "${city}",
  "country": "country name",
  "hours": "opening hours as a clean string, e.g. Mon-Fri 12pm-10pm, Sat-Sun 11am-11pm",
  "priceRange": "price range e.g. £25-40pp or €15-25 per person",
  "cuisine": "cuisine type",
  "mustOrder": [
    { "dish": "dish name", "description": "one sentence about why it's special" },
    { "dish": "dish name", "description": "one sentence about why it's special" }
  ],
  "mapsLink": "https://maps.google.com?q=...",
  "story": "2-3 sentences about what makes this place special, its history, atmosphere, why it deserves attention",
  "awards": "any Michelin stars, awards, or notable recognition (or empty string if none)",
  "bookingUrl": "direct booking URL if found, or empty string"
}`
      }],
    })

    const text = searchMessage.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    let data: RestaurantData
    try {
      const cleaned = text.replace(/```json|```/g, '').trim()
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)?.[0]
      if (!jsonMatch) throw new Error('No JSON found in response')
      data = JSON.parse(jsonMatch)
      data.slug = slug
    } catch {
      console.error('[restaurant-research] Failed to parse:', text.substring(0, 400))
      return NextResponse.json({ error: 'Failed to parse restaurant data' }, { status: 502 })
    }

    return NextResponse.json({ restaurant: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[restaurant-research]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

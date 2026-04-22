import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type RestaurantInput = { name: string; city: string }

type SlideResult = {
  num: string
  tag: string
  headline: string
  body: string
  badge: string
  accent: string
}

async function researchAndBuildNoFrills(restaurant: RestaurantInput): Promise<{ slides: SlideResult[]; imageQueries: string[] }> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    system: `You are a food content creator for Omnira Food. You write compelling carousel posts about hidden gem restaurants.
Use web search to find accurate, real information about the restaurant before writing.
Always respond with valid JSON only — no markdown, no backticks, no preamble.`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
    messages: [{
      role: 'user',
      content: `Research "${restaurant.name}" in ${restaurant.city} using web search. Find:
- The restaurant's story and what makes it special
- Opening hours and price range per person
- 2-3 must-order dishes with descriptions
- The address
- What makes it a hidden gem (low tourist footprint, local favourite)

Then create a 6-slide "No Frills But Kills" carousel post. Format:
- Slide 1 (HOOK): Punchy hook about this hidden gem. Tag: a location/vibe label. Badge: "NO FRILLS BUT KILLS"
- Slide 2 (THE STORY): Background — history, vibe, why locals love it
- Slide 3 (MUST ORDER #1): First signature dish
- Slide 4 (MUST ORDER #2): Second signature dish
- Slide 5 (THE DETAILS): Practical info — hours, price, how to find it
- Slide 6 (CTA): "Would you eat here?" or a question for the audience

Return ONLY this JSON:
{
  "slides": [
    {
      "num": "01",
      "tag": "SHORT TAG IN CAPS",
      "headline": "Punchy headline max 7 words",
      "body": "2-3 sentence description max 35 words",
      "badge": "SHORT BADGE IN CAPS",
      "accent": "amber"
    }
  ],
  "imageQueries": [
    "serper search query for slide 1 image",
    "serper search query for slide 2 image"
  ]
}

For accent colours: use "amber" for food/warmth, "red" for bold/spicy, "teal" for fresh/seafood, "green" for vegetarian/fresh.
Make imageQueries specific: use the actual restaurant name + city + dish/vibe for best results.
Example imageQuery: "${restaurant.name} ${restaurant.city} restaurant food"`,
    }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  const cleaned = text.replace(/```json|```/g, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonMatch) throw new Error('No JSON found in response')
  return JSON.parse(jsonMatch)
}

async function researchRestaurantForSlide(restaurant: RestaurantInput, slideNum: number, total: number): Promise<{ slide: SlideResult; imageQuery: string }> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: `You are a food content creator for Omnira Food. Research restaurants and write compelling carousel slides.
Always respond with valid JSON only — no markdown, no backticks, no preamble.`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
    messages: [{
      role: 'user',
      content: `Research "${restaurant.name}" in ${restaurant.city} and create ONE carousel slide for a "Top ${total} Eats" guide.

Find: what makes this restaurant essential, signature dish, price range, any awards/fame.

Return ONLY this JSON:
{
  "slide": {
    "num": "${String(slideNum).padStart(2, '0')}",
    "tag": "CITY NAME OR CUISINE TYPE IN CAPS",
    "headline": "Why this place is unmissable — max 7 words",
    "body": "2-3 sentences: the must-try dish, the vibe, why it made the list. Max 35 words.",
    "badge": "SIGNATURE DISH OR AWARD IN CAPS",
    "accent": "amber"
  },
  "imageQuery": "specific search query for a great food photo of this restaurant"
}`,
    }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  const cleaned = text.replace(/```json|```/g, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonMatch) throw new Error('No JSON for restaurant ' + restaurant.name)
  return JSON.parse(jsonMatch)
}

export async function POST(req: NextRequest) {
  try {
    const { mode, restaurants, channel } = await req.json() as {
      mode: 'no-frills' | 'top5'
      restaurants: RestaurantInput[]
      channel: string
    }

    if (!mode || !restaurants?.length) {
      return NextResponse.json({ error: 'mode and restaurants are required' }, { status: 400 })
    }

    console.log(`[food-carousel-generate] mode=${mode}, restaurants=${restaurants.length}, channel=${channel}`)

    if (mode === 'no-frills') {
      const restaurant = restaurants[0]
      if (!restaurant.name || !restaurant.city) {
        return NextResponse.json({ error: 'Restaurant name and city are required' }, { status: 400 })
      }

      const result = await researchAndBuildNoFrills(restaurant)
      return NextResponse.json({ slides: result.slides, imageQueries: result.imageQueries, mode })

    } else {
      // Top 5: research each restaurant in parallel
      const valid = restaurants.filter(r => r.name.trim() && r.city.trim()).slice(0, 5)
      if (!valid.length) {
        return NextResponse.json({ error: 'At least one restaurant name and city is required' }, { status: 400 })
      }

      const results = await Promise.all(
        valid.map((r, i) => researchRestaurantForSlide(r, i + 1, valid.length))
      )

      const slides = results.map(r => r.slide)
      const imageQueries = results.map(r => r.imageQuery)

      return NextResponse.json({ slides, imageQueries, mode })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[food-carousel-generate]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

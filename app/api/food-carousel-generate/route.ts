import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type RestaurantInput = { name: string; city: string }

export type RestaurantMeta = {
  slug: string
  name: string
  city: string
  country: string
  cuisine: string
  priceRange: string
  series: 'no-frills' | 'top5'
  story: string
  mustOrder: { name: string; description: string }[]
  hoursNote: string
  address: string
  bookingNote: string
}

type FoodInfoItem = { icon: string; label: string; value: string }

type SlideResult = {
  num: string
  tag: string
  headline: string
  body: string
  badge: string
  accent: string
  tileType: 'food-image' | 'food-must-order' | 'food-info' | 'story-text' | 'story'
  foodMustOrder?: { name: string; description: string; priceRange?: string }
  foodInfoItems?: FoodInfoItem[]
  foodRestaurantName?: string
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

// Strip all HTML tags (including <cite index="N">) while preserving text content
function stripHtml(text: string): string {
  return (text || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function cleanSlide(s: SlideResult): SlideResult {
  return {
    ...s,
    tag: stripHtml(s.tag),
    headline: stripHtml(s.headline),
    body: stripHtml(s.body),
    badge: stripHtml(s.badge),
  }
}

async function researchAndBuildNoFrills(
  restaurant: RestaurantInput
): Promise<{ slides: SlideResult[]; imageQueries: string[]; restaurantMeta: RestaurantMeta }> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: `You are a food content creator for Omnira Food. You write compelling carousel posts about hidden gem restaurants.
Use web search to find accurate, real information about the restaurant before writing.
Always respond with valid JSON only — no markdown, no backticks, no preamble. Never include HTML tags like <cite> in your response.`,
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

Create a 6-slide "No Frills But Kills" carousel:
- Slide 1 (HOOK): Punchy hook. Tag: location/vibe label. Badge: "NO FRILLS BUT KILLS"
- Slide 2 (THE STORY): Background — history, vibe, why locals love it
- Slide 3 (MUST ORDER #1): First signature dish — name it, describe why it's special
- Slide 4 (MUST ORDER #2): Second signature dish — name it, describe why it's special
- Slide 5 (THE DETAILS): Practical info — hours, price per person, how to find it
- Slide 6 (CTA): "Would you eat here?" or similar audience question

Also provide a restaurantMeta object with structured data for the website.

Return ONLY this JSON (plain text only — no HTML tags):
{
  "slides": [
    {
      "num": "01",
      "tag": "SHORT TAG IN CAPS",
      "headline": "Punchy headline max 7 words",
      "body": "2-3 sentence description max 35 words. Plain text only.",
      "badge": "SHORT BADGE IN CAPS",
      "accent": "amber"
    }
  ],
  "imageQueries": [
    "restaurant name city food photography",
    "restaurant interior atmosphere"
  ],
  "restaurantMeta": {
    "name": "exact restaurant name",
    "city": "${restaurant.city}",
    "country": "country name",
    "cuisine": "cuisine type",
    "priceRange": "e.g. £15-25pp or ¥800-1200",
    "story": "2-3 sentences about what makes this place special. Plain text.",
    "mustOrder": [
      { "name": "dish name", "description": "one sentence why it is unmissable" },
      { "name": "dish name", "description": "one sentence why it is unmissable" }
    ],
    "hoursNote": "opening hours as plain text e.g. Mon-Sat 11am-3pm",
    "address": "street address or neighbourhood",
    "bookingNote": "booking info or walk-in only"
  }
}

Accent colours: "amber" for warmth, "red" for bold/spicy, "teal" for seafood, "green" for vegetarian.
imageQueries: use actual restaurant name + city + dish/vibe for best photo results.`,
    }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  const cleaned = text.replace(/```json|```/g, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonMatch) throw new Error('No JSON found in response')
  const parsed = JSON.parse(jsonMatch)

  // Assign food-specific tile types and structured fields from restaurantMeta
  const meta = parsed.restaurantMeta || {}
  const mustOrderList: { name: string; description: string }[] = (meta.mustOrder || []).map(
    (d: { name: string; description: string }) => ({
      name: stripHtml(d.name || ''),
      description: stripHtml(d.description || ''),
    })
  )
  const priceRange = stripHtml(meta.priceRange || '')
  const address = stripHtml(meta.address || meta.city || '')
  const hoursNote = stripHtml(meta.hoursNote || '')
  const restName = stripHtml(meta.name || restaurant.name)

  const rawSlides: SlideResult[] = (parsed.slides || []).map((s: SlideResult, i: number) => {
    if (i === 0 || i === 1) {
      // Hook + story: full-bleed image tile with headline only
      return { ...s, tileType: 'food-image' }
    }
    if (i === 2 && mustOrderList[0]) {
      // Must Order #1
      return {
        ...s,
        tileType: 'food-must-order',
        foodMustOrder: { name: mustOrderList[0].name, description: mustOrderList[0].description, priceRange },
      }
    }
    if (i === 3 && (mustOrderList[1] || mustOrderList[0])) {
      // Must Order #2
      const dish = mustOrderList[1] || mustOrderList[0]
      return {
        ...s,
        tileType: 'food-must-order',
        foodMustOrder: { name: dish.name, description: dish.description, priceRange },
      }
    }
    if (i === 4) {
      // Practical info slide
      const infoItems: FoodInfoItem[] = []
      if (address) infoItems.push({ icon: 'A', label: 'ADDRESS', value: address })
      if (hoursNote) infoItems.push({ icon: 'H', label: 'HOURS', value: hoursNote })
      if (priceRange) infoItems.push({ icon: 'P', label: 'PRICE RANGE', value: priceRange })
      infoItems.push({ icon: 'M', label: 'FIND ON MAPS', value: `Search "${restName}"` })
      return {
        ...s,
        tileType: 'food-info',
        foodRestaurantName: restName,
        foodInfoItems: infoItems,
      }
    }
    // Slide 5 (CTA): solid text tile with call-to-action question
    return { ...s, tileType: 'story-text' }
  })

  const slides = rawSlides.map(cleanSlide)
  const imageQueries: string[] = (parsed.imageQueries || []).map((q: string) => stripHtml(q))

  const restaurantMeta: RestaurantMeta = {
    slug: slugify(meta.name || restaurant.name),
    name: stripHtml(meta.name || restaurant.name),
    city: stripHtml(meta.city || restaurant.city),
    country: stripHtml(meta.country || ''),
    cuisine: stripHtml(meta.cuisine || ''),
    priceRange: stripHtml(meta.priceRange || ''),
    series: 'no-frills',
    story: stripHtml(meta.story || ''),
    mustOrder: (meta.mustOrder || []).map((d: { name: string; description: string }) => ({
      name: stripHtml(d.name || ''),
      description: stripHtml(d.description || ''),
    })),
    hoursNote: stripHtml(meta.hoursNote || ''),
    address: stripHtml(meta.address || ''),
    bookingNote: stripHtml(meta.bookingNote || ''),
  }

  return { slides, imageQueries, restaurantMeta }
}

async function researchRestaurantForSlide(
  restaurant: RestaurantInput, slideNum: number, total: number
): Promise<{ slide: SlideResult; imageQuery: string; restaurantMeta: RestaurantMeta }> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: `You are a food content creator for Omnira Food. Research restaurants and write compelling carousel slides.
Always respond with valid JSON only — no markdown, no backticks, no preamble. Never include HTML tags like <cite>.`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
    messages: [{
      role: 'user',
      content: `Research "${restaurant.name}" in ${restaurant.city} and create ONE carousel slide for a "Top ${total} Eats" guide.
Find: what makes this restaurant essential, signature dish, price range, any awards/fame.

Return ONLY this JSON (plain text, no HTML):
{
  "slide": {
    "num": "${String(slideNum).padStart(2, '0')}",
    "tag": "CITY NAME OR CUISINE IN CAPS",
    "headline": "Why this place is unmissable — max 7 words",
    "body": "2-3 sentences: must-try dish, vibe, why it made the list. Max 35 words. Plain text.",
    "badge": "SIGNATURE DISH OR AWARD IN CAPS",
    "accent": "amber"
  },
  "imageQuery": "restaurant name city food dish photography",
  "restaurantMeta": {
    "name": "exact restaurant name",
    "city": "${restaurant.city}",
    "country": "country",
    "cuisine": "cuisine type",
    "priceRange": "e.g. £25-40pp",
    "story": "2-3 sentences about what makes this place special",
    "mustOrder": [{ "name": "dish", "description": "why it is unmissable" }],
    "hoursNote": "opening hours plain text",
    "address": "address or neighbourhood",
    "bookingNote": "booking info"
  }
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
  const parsed = JSON.parse(jsonMatch)

  const rawSlide: SlideResult = { ...parsed.slide, tileType: 'story' }
  const slide = cleanSlide(rawSlide)
  const imageQuery = stripHtml(parsed.imageQuery || `${restaurant.name} ${restaurant.city} food`)

  const meta = parsed.restaurantMeta || {}
  const restaurantMeta: RestaurantMeta = {
    slug: slugify(meta.name || restaurant.name),
    name: stripHtml(meta.name || restaurant.name),
    city: stripHtml(meta.city || restaurant.city),
    country: stripHtml(meta.country || ''),
    cuisine: stripHtml(meta.cuisine || ''),
    priceRange: stripHtml(meta.priceRange || ''),
    series: 'top5',
    story: stripHtml(meta.story || ''),
    mustOrder: (meta.mustOrder || []).map((d: { name: string; description: string }) => ({
      name: stripHtml(d.name || ''),
      description: stripHtml(d.description || ''),
    })),
    hoursNote: stripHtml(meta.hoursNote || ''),
    address: stripHtml(meta.address || ''),
    bookingNote: stripHtml(meta.bookingNote || ''),
  }

  return { slide, imageQuery, restaurantMeta }
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
      return NextResponse.json({
        slides: result.slides,
        imageQueries: result.imageQueries,
        restaurantMeta: result.restaurantMeta,
        mode,
      })

    } else {
      const valid = restaurants.filter(r => r.name.trim() && r.city.trim()).slice(0, 5)
      if (!valid.length) {
        return NextResponse.json({ error: 'At least one restaurant name and city is required' }, { status: 400 })
      }

      const results = await Promise.all(
        valid.map((r, i) => researchRestaurantForSlide(r, i + 1, valid.length))
      )

      return NextResponse.json({
        slides: results.map(r => r.slide),
        imageQueries: results.map(r => r.imageQuery),
        restaurantMetas: results.map(r => r.restaurantMeta),
        mode,
      })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[food-carousel-generate]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

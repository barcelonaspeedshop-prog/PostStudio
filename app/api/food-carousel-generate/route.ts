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
  priceContext: string      // e.g. "about €5-8 per dish"
  series: 'no-frills' | 'top5'
  story: string
  mustOrder: { name: string; description: string; price: string }[]
  hoursNote: string
  address: string
  neighbourhood: string
  mapsUrl: string           // Google Maps URL
  phone: string
  website: string
  payment: string           // e.g. "Cash only" / "Cards accepted"
  proTips: string[]         // 3-4 insider tips
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
  tileType: 'food-image' | 'food-must-order' | 'food-info' | 'food-pro-tips' | 'story-text' | 'story'
  foodDishes?: { name: string; description: string; price?: string }[]
  foodInfoItems?: FoodInfoItem[]
  foodRestaurantName?: string
  foodProTips?: string[]
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
      content: `Research "${restaurant.name}" in ${restaurant.city} thoroughly using web search. Find ALL of:
- Restaurant story, history, what makes it special to locals
- Complete address including street, neighbourhood
- Full opening hours (each day if possible, or clear range)
- Price range with currency context (e.g. "¥800-1200 — about €5-8 per dish")
- 2-3 must-order dishes with descriptions AND individual prices
- Google Maps search URL: https://maps.google.com/search?q=RESTAURANT+NAME+CITY
- Phone number if available
- Website URL if available
- Payment: cash only / cards accepted / both
- 3-4 genuine insider pro tips a traveler actually needs (best time to visit, what to order, etiquette, secrets)

Create a 6-slide "No Frills But Kills" carousel with these slides:
- Slide 1: Punchy hook headline (3-5 words). Tag will be set to "NO FRILLS BUT KILLS"
- Slide 2: The story — background, history, why locals love it. Tag will be set to "THE STORY"
- Slide 3: Will be auto-generated from must-order dishes data
- Slide 4: Will be auto-generated from practical info data
- Slide 5: Will be auto-generated from pro tips data
- Slide 6 (CTA): "Would you eat here?" or similar audience question

Return ONLY this JSON (plain text only — no HTML tags):
{
  "slides": [
    { "num": "01", "tag": "SHORT TAG IN CAPS", "headline": "Punchy 3-5 word hook", "body": "2-3 sentence description max 30 words.", "badge": "NO FRILLS BUT KILLS", "accent": "amber" },
    { "num": "02", "tag": "THE STORY", "headline": "Background headline 4-6 words", "body": "2-3 sentences on history and local love. Max 30 words.", "badge": "NO FRILLS BUT KILLS", "accent": "amber" },
    { "num": "03", "tag": "MUST ORDER", "headline": "Must Order", "body": "See must-order dishes below.", "badge": "SIGNATURE DISHES", "accent": "amber" },
    { "num": "04", "tag": "FIND US", "headline": "The Details", "body": "Practical info.", "badge": "PRACTICAL INFO", "accent": "amber" },
    { "num": "05", "tag": "PRO TIPS", "headline": "Pro Tips", "body": "Insider knowledge.", "badge": "INSIDER", "accent": "amber" },
    { "num": "06", "tag": "WOULD YOU?", "headline": "Would you eat here?", "body": "Tag a friend who needs to know about this place. Follow for more hidden gems.", "badge": "NO FRILLS BUT KILLS", "accent": "amber" }
  ],
  "imageQueries": [
    "RESTAURANT_NAME CITY food dish photography",
    "RESTAURANT_NAME CITY interior atmosphere"
  ],
  "restaurantMeta": {
    "name": "exact restaurant name",
    "city": "${restaurant.city}",
    "country": "country name",
    "cuisine": "cuisine type",
    "priceRange": "e.g. ¥800-1200",
    "priceContext": "about €5-8 per dish",
    "story": "2-3 sentences about what makes this place special. Plain text.",
    "mustOrder": [
      { "name": "dish name", "description": "one sentence why it is unmissable", "price": "¥800" },
      { "name": "dish name", "description": "one sentence why it is unmissable", "price": "¥1000" }
    ],
    "hoursNote": "e.g. Mon-Sat 11:30am-3pm, 6pm-10pm. Closed Sun.",
    "address": "street address",
    "neighbourhood": "neighbourhood or district",
    "mapsUrl": "https://maps.google.com/search?q=restaurant+name+city",
    "phone": "+XX X-XXXX-XXXX or empty string",
    "website": "https://example.com or empty string",
    "payment": "Cash only / Cards accepted / Cash or card",
    "proTips": [
      "Arrive before opening to avoid the queue — it fills up fast",
      "Order the [dish] on your first visit — it's what they're known for",
      "Cash only — bring enough before you go",
      "The daily special is not on the menu — ask the staff"
    ],
    "bookingNote": "Walk-ins only / Book via website"
  }
}

Accent colours: "amber" for warmth/general, "red" for bold/spicy, "teal" for seafood, "green" for vegetarian.
imageQueries: use actual restaurant name + city + dish/atmosphere for best Serper results.`,
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

  // Build structured data from restaurantMeta fields
  const meta = parsed.restaurantMeta || {}
  const mustOrderList: { name: string; description: string; price: string }[] = (meta.mustOrder || []).map(
    (d: { name: string; description: string; price?: string }) => ({
      name: stripHtml(d.name || ''),
      description: stripHtml(d.description || ''),
      price: stripHtml(d.price || ''),
    })
  )
  const priceRange = stripHtml(meta.priceRange || '')
  const priceContext = stripHtml(meta.priceContext || '')
  const address = stripHtml(meta.address || '')
  const neighbourhood = stripHtml(meta.neighbourhood || '')
  const hoursNote = stripHtml(meta.hoursNote || '')
  const mapsUrl = stripHtml(meta.mapsUrl || '')
  const phone = stripHtml(meta.phone || '')
  const website = stripHtml(meta.website || '')
  const payment = stripHtml(meta.payment || '')
  const proTips: string[] = (meta.proTips || []).map((t: string) => stripHtml(t))
  const restName = stripHtml(meta.name || restaurant.name)

  // Build body text for the text-only slides from structured research data
  const mustOrderBody = mustOrderList.length > 0
    ? mustOrderList.map(d => [d.name, d.price, d.description].filter(Boolean).join(' — ')).join('. ')
    : ''

  const fullAddress = [address, neighbourhood].filter(Boolean).join(', ')
  const priceDisplay = [priceRange, priceContext].filter(Boolean).join(' — ')
  const mapsDisplay = mapsUrl || `maps.google.com/?q=${encodeURIComponent(restName + '+' + restaurant.city)}`
  const infoBody = [fullAddress, hoursNote, priceDisplay, payment, mapsDisplay]
    .filter(Boolean).join(' · ')

  const tipsBody = proTips.length > 0
    ? proTips.slice(0, 3).join('. ')
    : ''

  const rawSlides: SlideResult[] = (parsed.slides || []).map((s: SlideResult, i: number) => {
    if (i === 0) return { ...s, tileType: 'hook' }
    if (i === 1) return { ...s, tileType: 'story', tag: 'THE STORY' }
    if (i === 2) return {
      ...s,
      tileType: 'story-text',
      tag: 'MUST ORDER',
      headline: mustOrderList[0]?.name || s.headline,
      body: mustOrderBody || s.body,
    }
    if (i === 3) return {
      ...s,
      tileType: 'story-text',
      tag: 'FIND US',
      headline: restName,
      body: infoBody || s.body,
    }
    if (i === 4) return {
      ...s,
      tileType: 'story-text',
      tag: 'PRO TIPS',
      headline: 'Insider Tips',
      body: tipsBody || s.body,
    }
    // Slide 5: CTA
    return { ...s, tileType: 'cta' }
  })

  const slides = rawSlides.map(cleanSlide)
  const imageQueries: string[] = (parsed.imageQueries || []).map((q: string) => stripHtml(q))

  const restaurantMeta: RestaurantMeta = {
    slug: slugify(meta.name || restaurant.name),
    name: restName,
    city: stripHtml(meta.city || restaurant.city),
    country: stripHtml(meta.country || ''),
    cuisine: stripHtml(meta.cuisine || ''),
    priceRange,
    priceContext,
    series: 'no-frills',
    story: stripHtml(meta.story || ''),
    mustOrder: mustOrderList,
    hoursNote,
    address,
    neighbourhood,
    mapsUrl,
    phone,
    website,
    payment,
    proTips,
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
    priceContext: stripHtml(meta.priceContext || ''),
    series: 'top5',
    story: stripHtml(meta.story || ''),
    mustOrder: (meta.mustOrder || []).map((d: { name: string; description: string; price?: string }) => ({
      name: stripHtml(d.name || ''),
      description: stripHtml(d.description || ''),
      price: stripHtml(d.price || ''),
    })),
    hoursNote: stripHtml(meta.hoursNote || ''),
    address: stripHtml(meta.address || ''),
    neighbourhood: stripHtml(meta.neighbourhood || ''),
    mapsUrl: stripHtml(meta.mapsUrl || ''),
    phone: stripHtml(meta.phone || ''),
    website: stripHtml(meta.website || ''),
    payment: stripHtml(meta.payment || ''),
    proTips: (meta.proTips || []).map((t: string) => stripHtml(t)),
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

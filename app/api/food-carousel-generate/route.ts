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
  menuUrl: string           // direct URL to menu page if available, else empty string
  payment: string           // e.g. "Cash only" / "Cards accepted"
  proTips: string[]         // 3 insider tips
  bookingNote: string
}

type SlideResult = {
  num: string
  tag: string
  headline: string
  body: string
  badge: string
  accent: string
  image?: string
  tileType: 'hook' | 'story' | 'story-text' | 'cta' | 'thumbnail' | 'find-us-map' | 'food-image' | 'food-magazine'
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

function stripHtml(text: string): string {
  return (text || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

async function researchAndBuildNoFrills(
  restaurant: RestaurantInput
): Promise<{ slides: SlideResult[]; imageQueries: string[]; restaurantMeta: RestaurantMeta }> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    system: `You are a food content creator for Omnira Food. Research restaurants thoroughly using web search.
Always respond with valid JSON only — no markdown, no backticks, no preamble. Never include HTML tags like <cite>.`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
    messages: [{
      role: 'user',
      content: `Research "${restaurant.name}" in ${restaurant.city} thoroughly using web search. Find ALL of:
- What makes it special and why locals love it (for 3 punchy 4-6 word image captions)
- Complete street address including neighbourhood
- Full opening hours (each day or a clear range)
- Price range with context (e.g. "¥800-1200 — about €5-8 per dish")
- 2-3 must-order dishes with name, price, one-line description each
- Google Maps search URL: https://maps.google.com/search?q=RESTAURANT+NAME+CITY
- Phone number if available
- Website URL if available
- Direct menu URL if available on the website
- Payment: cash only / cards accepted / both
- 3 insider pro tips specific to this restaurant
- Booking note (walk-ins only, reservations etc.)

Return ONLY this JSON (plain text, no HTML tags):
{
  "hookHeadlines": {
    "h2": "4-6 word punchy hook about this restaurant",
    "h4": "4-6 word headline about the signature dish or food",
    "h6": "4-6 word headline about the vibe or experience"
  },
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
    "address": "full street address",
    "neighbourhood": "neighbourhood or district",
    "mapsUrl": "https://maps.google.com/search?q=restaurant+name+city",
    "phone": "+XX X-XXXX-XXXX or empty string",
    "website": "https://example.com or empty string",
    "menuUrl": "direct URL to the restaurant official menu page, or empty string if not found",
    "payment": "Cash only / Cards accepted / Cash or card",
    "proTips": [
      "specific insider tip 1 for this restaurant",
      "specific insider tip 2 for this restaurant",
      "specific insider tip 3 for this restaurant"
    ],
    "bookingNote": "Walk-ins only / Book via website / Reservations recommended"
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
  if (!jsonMatch) throw new Error('No JSON found in response')
  const parsed = JSON.parse(jsonMatch)

  const meta = parsed.restaurantMeta || {}
  const hookHeadlines = parsed.hookHeadlines || {}

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
  const menuUrl = stripHtml(meta.menuUrl || '')
  const payment = stripHtml(meta.payment || '')
  const proTips: string[] = (meta.proTips || []).map((t: string) => stripHtml(t))
  const restName = stripHtml(meta.name || restaurant.name)

  // Tile 3: must-order body — "Name — Price — Desc. Name2 — Price2 — Desc2."
  // ── Tile 2: story split — hook sentence as headline, rest as body ─────────────
  const storyText = stripHtml(meta.story || '')
  const firstPeriodIdx = storyText.indexOf('. ')
  const storyHookLine = firstPeriodIdx > 0
    ? storyText.slice(0, firstPeriodIdx + 1)
    : storyText.slice(0, 120).trim()
  const storyBodyText = firstPeriodIdx > 0
    ? storyText.slice(firstPeriodIdx + 2, firstPeriodIdx + 320).trim()
    : ''

  // ── Tile 3: signature dish image tile ────────────────────────────────────────
  const dish1 = mustOrderList[0]

  // ── Tile 4: all must-order dishes on dark bg ──────────────────────────────────
  const allDishesHeadline = mustOrderList.slice(0, 3).map(d => d.name).join(' · ')
  const allDishesBody = mustOrderList
    .map(d => [d.name, d.price, d.description].filter(Boolean).join(' — '))
    .join('. ')

  // ── Tile 5: vibe/ambiance image tile ─────────────────────────────────────────
  const vibeHeadline = stripHtml(hookHeadlines.h6 || hookHeadlines.h4 || restName)
  const vibeTag = [neighbourhood, cuisine].filter(Boolean).join(' · ') || city
  const vibeBody = [cuisine, city].filter(Boolean).join(' · ')

  // ── Tile 6: logistics on dark bg ─────────────────────────────────────────────
  const fullAddress = [address, neighbourhood].filter(Boolean).join(', ')
  const priceDisplay = [priceRange, priceContext].filter(Boolean).join(' · ')
  const detailsBody = [fullAddress, hoursNote, priceDisplay, payment].filter(Boolean).join('. ')

  // ── Tile 7: pro tips on dark bg ──────────────────────────────────────────────
  const tipsBody = proTips.slice(0, 3).join('. ')

  const accent = 'amber'

  // Fixed 8-slide structure
  const slides: SlideResult[] = [
    // 1: HOOK — full-bleed photo with cuisine/name/city overlay
    {
      num: '01', tag: cuisine, headline: restName,
      body: `${city} · ${priceDisplay || priceRange}`,
      badge: '', accent, tileType: 'hook',
    },

    // 2: THE STORY — dark bg, hook sentence + supporting copy (buildStoryTextSvg)
    {
      num: '02', tag: 'THE STORY', headline: storyHookLine,
      body: storyBodyText,
      badge: '', accent, tileType: 'story-text',
    },

    // 3: SIGNATURE DISH — full-bleed photo, "MUST ORDER" overlay
    {
      num: '03', tag: 'MUST ORDER',
      headline: dish1?.name || restName,
      body: dish1?.description || '',
      badge: '', accent, tileType: 'story',
    },

    // 4: ALL MUST-ORDER — dark bg, all dishes listed (buildStoryTextSvg)
    {
      num: '04', tag: 'MUST ORDER', headline: allDishesHeadline,
      body: allDishesBody,
      badge: '', accent, tileType: 'story-text',
    },

    // 5: AMBIANCE — full-bleed photo, neighbourhood/vibe overlay
    {
      num: '05', tag: vibeTag, headline: vibeHeadline,
      body: vibeBody,
      badge: '', accent, tileType: 'story',
    },

    // 6: THE DETAILS — dark bg, logistics (buildStoryTextSvg)
    {
      num: '06', tag: 'THE DETAILS', headline: restName,
      body: detailsBody,
      badge: '', accent, tileType: 'story-text',
    },

    // 7: PRO TIPS — dark bg (buildStoryTextSvg)
    {
      num: '07', tag: 'PRO TIPS', headline: 'Before You Go',
      body: tipsBody,
      badge: '', accent, tileType: 'story-text',
    },

    // 8: CTA
    {
      num: '08', tag: 'FOLLOW FOR MORE', headline: 'Follow for more hidden gems',
      body: '', badge: '', accent, tileType: 'cta',
    },
  ]

  const restaurantMeta: RestaurantMeta = {
    slug: slugify(restName),
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
    menuUrl,
    payment,
    proTips,
    bookingNote: stripHtml(meta.bookingNote || ''),
  }

  // No Serper auto-fetch — image tiles use manual upload
  return { slides, imageQueries: [], restaurantMeta }
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
    menuUrl: stripHtml(meta.menuUrl || ''),
    payment: stripHtml(meta.payment || ''),
    proTips: (meta.proTips || []).map((t: string) => stripHtml(t)),
    bookingNote: stripHtml(meta.bookingNote || ''),
  }

  return { slide: rawSlide, imageQuery, restaurantMeta }
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

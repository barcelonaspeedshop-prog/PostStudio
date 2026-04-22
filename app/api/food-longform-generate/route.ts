import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const { city, restaurants, channel } = await req.json() as {
      city: string
      restaurants: string[]
      channel: string
    }

    if (!city?.trim()) {
      return NextResponse.json({ error: 'city is required' }, { status: 400 })
    }

    const filledRestaurants = (restaurants || []).filter((r: string) => r.trim())
    const hasRestaurants = filledRestaurants.length > 0

    const restaurantList = hasRestaurants
      ? filledRestaurants.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')
      : '(auto-research the top 5 hidden gem restaurants in this city)'

    console.log(`[food-longform-generate] city=${city}, restaurants=${filledRestaurants.length}, channel=${channel}`)

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      system: `You are a food travel video scriptwriter for Omnira Food. You write compelling, cinematic narration scripts for long-form food guide videos. Your style: warm, authoritative, vivid. You make viewers feel hungry and eager to travel.
Use web search to research the restaurants before writing.
Always respond with valid JSON only — no markdown, no backticks, no preamble.`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
      messages: [{
        role: 'user',
        content: `Create a complete "Top 5 Food Guide" video script for ${city}.

${hasRestaurants ? `Restaurants to feature:\n${restaurantList}\n\nSearch for real information about each one.` : `Search for the 5 best hidden gem or must-visit restaurants in ${city}. Find local favourites with great food and authentic atmosphere.`}

For EACH restaurant, find:
- What makes it special / its story
- The must-order dish(es)
- Opening hours and price range
- Address or neighbourhood

Write a complete video script with these chapters:
1. INTRO — "The Best Food in ${city}" — hook the viewer, tease all 5 restaurants, make them want to watch. Cinematic, specific, exciting. (~80 words)
2-6. One chapter per restaurant — 80-120 words of narration per restaurant. Include: the restaurant's story/vibe, the dish you MUST order, why it made this list. Name the dish. Use flavour words.
7. OUTRO — "Which would you visit first?" — warm CTA, encourage comments, mention Omnira Food. (~50 words)

Also provide one specific Serper image search query per chapter (for finding real photos).

Return ONLY this JSON:
{
  "title": "The Best Food in ${city} — Top 5",
  "summary": "one sentence summary",
  "chapters": [
    {
      "id": 1,
      "title": "The Best Food in ${city}",
      "type": "intro",
      "narration": "full narration text for this chapter",
      "visual": "20-word description of suggested visuals",
      "imageQuery": "specific serper search query for a great image"
    },
    {
      "id": 2,
      "title": "Restaurant Name",
      "type": "chapter",
      "narration": "...",
      "visual": "...",
      "imageQuery": "Restaurant Name ${city} food dish"
    }
  ]
}

The chapters array must have exactly 7 items (1 intro + 5 restaurants + 1 outro).`,
      }],
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    const cleaned = text.replace(/```json|```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)?.[0]
    if (!jsonMatch) {
      console.error('[food-longform-generate] No JSON found, raw:', text.slice(0, 500))
      return NextResponse.json({ error: 'Failed to parse script from AI' }, { status: 502 })
    }

    let result
    try {
      result = JSON.parse(jsonMatch)
    } catch {
      return NextResponse.json({ error: 'Failed to parse script JSON' }, { status: 502 })
    }

    // Extract imageQueries as a separate map
    const imageQueries: Record<number, string> = {}
    if (Array.isArray(result.chapters)) {
      for (const ch of result.chapters) {
        if (ch.id && ch.imageQuery) {
          imageQueries[ch.id] = ch.imageQuery
        }
        // Remove imageQuery from chapter to keep it clean
        delete ch.imageQuery
      }
    }

    return NextResponse.json({ script: result, imageQueries, city })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[food-longform-generate]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

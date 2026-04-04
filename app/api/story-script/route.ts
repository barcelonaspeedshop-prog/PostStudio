import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CHANNEL_TOPICS: Record<string, string> = {
  'Gentlemen of Fuel': 'classic cars, luxury cars, supercars, automotive culture',
  'Omnira F1': 'Formula 1, F1 racing, Grand Prix, drivers, teams',
  'Road & Trax': 'motorsport, racing, rally, endurance, NASCAR, IndyCar',
  'Omnira Football': 'football, soccer, Premier League, Champions League, La Liga',
}

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const { topic, channel } = await req.json()
    if (!topic) return NextResponse.json({ error: 'topic is required' }, { status: 400 })

    const channelContext = channel && CHANNEL_TOPICS[channel] ? CHANNEL_TOPICS[channel] : 'general interest'

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `You are a professional long-form storytelling scriptwriter for social media video content.
You write compelling narrated scripts that are 3-5 minutes when read aloud (~450-750 words total).
Always respond with valid JSON only — no markdown, no backticks, no preamble.`,
      messages: [{ role: 'user', content: `Write a narrated long-form story script about: "${topic}"
Channel context: ${channel || 'General'} (${channelContext})

Return a JSON object with:
- "title": the story title (max 10 words)
- "summary": one-sentence summary
- "chapters": an array of 6 chapter objects, each with:
  - "id": chapter number (1-6)
  - "title": chapter title (max 6 words)
  - "type": one of "intro", "chapter", "outro"
  - "narration": the narration text (60-150 words)
  - "visual": suggested visuals description (20-30 words)

Structure: Chapter 1 = intro, Chapters 2-5 = chapter, Chapter 6 = outro.
Return only the JSON object.` }],
    })

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    let script
    try {
      script = JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
      return NextResponse.json({ error: 'Failed to parse script from AI' }, { status: 502 })
    }

    return NextResponse.json({ script })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-script] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

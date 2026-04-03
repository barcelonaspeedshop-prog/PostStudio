import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CHANNEL_TOPICS: Record<string, string> = {
  'Gentlemen of Fuel': 'classic cars, luxury cars, supercars, automotive culture',
  'Omnira F1': 'Formula 1, F1 racing, Grand Prix, drivers, teams',
  'Road & Trax': 'motorsport, racing, rally, endurance, NASCAR, IndyCar',
  'Omnira Football': 'football, soccer, Premier League, Champions League, La Liga',
}

const VALID_CHANNELS = Object.keys(CHANNEL_TOPICS)

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const { topic, channel } = await req.json()

    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 })
    }
    if (channel && !VALID_CHANNELS.includes(channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` },
        { status: 400 }
      )
    }

    const channelContext = channel ? CHANNEL_TOPICS[channel] : 'general interest'

    const system = `You are a professional long-form storytelling scriptwriter for social media video content.
You write compelling narrated scripts that are 3-5 minutes when read aloud (~450-750 words total).
Always respond with valid JSON only — no markdown, no backticks, no preamble.`

    const prompt = `Write a narrated long-form story script about: "${topic}"
Channel context: ${channel || 'General'} (${channelContext})

The script should be engaging, dramatic, and suitable for a narrated video with visuals.
Write it as if a narrator is telling a captivating story.

Return a JSON object with:
- "title": the story title (max 10 words)
- "summary": one-sentence summary of the story
- "totalWordCount": approximate total word count of all narration combined
- "estimatedDuration": estimated duration in format "X:XX" (minutes:seconds, assuming ~150 words/min)
- "chapters": an array of 5-6 chapter objects, each with:
  - "id": chapter number (1, 2, 3...)
  - "title": chapter title (max 6 words, e.g. "The Beginning", "A Shocking Turn")
  - "type": one of "intro", "chapter", "outro"
  - "narration": the full narration text for this chapter (60-150 words per chapter)
  - "visual": a short description of the suggested visuals for this section (20-30 words)

Structure:
- Chapter 1: "intro" — hook the audience, set the scene
- Chapters 2-4 (or 2-5): "chapter" — tell the story with drama, detail, emotion
- Final chapter: "outro" — conclusion, verdict, call to action

Write in a confident, cinematic narration style. Make it feel like a documentary.
Return only the JSON object.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const script = JSON.parse(text.replace(/```json|```/g, '').trim())

    return NextResponse.json({ script })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-script] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

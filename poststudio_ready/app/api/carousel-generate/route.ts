import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { topic, channel, slideCount = 10 } = await req.json()

    if (!topic) return NextResponse.json({ error: 'topic is required' }, { status: 400 })

    const system = `You are a social media content expert specialising in carousel posts. 
Always respond with valid JSON only — no markdown, no backticks, no preamble.`

    const prompt = `Create a ${slideCount}-slide carousel post about: "${topic}"
Channel: ${channel || 'General'}

Return a JSON array of exactly ${slideCount} slide objects. Each object must have:
- "num": slide number as two-digit string e.g. "01"
- "tag": short category label in CAPS (e.g. "THE ORIGIN STORY")
- "headline": punchy headline (max 8 words)
- "body": 2-3 sentence description (max 40 words)
- "badge": short badge label in CAPS (max 5 words)
- "accent": one of these color names: "red", "amber", "blue", "green", "purple", "teal"

Make slide 1 a hook/intro, slides 2-9 tell the story, slide 10 is a CTA/verdict.
Return only the JSON array, nothing else.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const slides = JSON.parse(text.replace(/```json|```/g, '').trim())

    return NextResponse.json({ slides })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

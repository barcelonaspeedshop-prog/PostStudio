import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CHANNEL_TOPICS: Record<string, string> = {
  'Gentlemen of Fuel': 'classic cars, luxury cars, supercars, automotive',
  'Omnira F1': 'Formula 1, F1 racing, Grand Prix',
  'Road & Trax': 'motorsport, racing, rally, endurance racing, NASCAR, IndyCar',
  'Omnira Football': 'football, soccer, Premier League, Champions League, La Liga',
}

const VALID_CHANNELS = Object.keys(CHANNEL_TOPICS)

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { channel } = await req.json()

    if (!channel || !VALID_CHANNELS.includes(channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` },
        { status: 400 }
      )
    }

    const topicKeywords = CHANNEL_TOPICS[channel]

    // Step 1: Ask Claude to identify today's top trending story
    const trendMessage = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: `You are a news researcher. Today's date is ${new Date().toISOString().split('T')[0]}. Respond with ONLY a JSON object, no markdown, no backticks.`,
      messages: [{
        role: 'user',
        content: `What is the single most trending or newsworthy story RIGHT NOW in the world of ${topicKeywords}? Consider recent race results, transfers, launches, controversies, or breaking news.

Return a JSON object with:
- "topic": a concise but descriptive topic string (15-25 words) that captures the story with enough detail to generate engaging carousel content
- "headline": a short 5-8 word headline summary

Return only the JSON object.`,
      }],
    })

    const trendText = trendMessage.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const trend = JSON.parse(trendText.replace(/```json|```/g, '').trim())

    // Step 2: Generate the carousel slides using the same logic as carousel-generate
    const slideCount = 5
    const system = `You are a social media content expert specialising in carousel posts.
Always respond with valid JSON only — no markdown, no backticks, no preamble.`

    const prompt = `Create a ${slideCount}-slide carousel post about: "${trend.topic}"
Channel: ${channel}

Return a JSON array of exactly ${slideCount} slide objects. Each object must have:
- "num": slide number as two-digit string e.g. "01"
- "tag": short category label in CAPS (e.g. "THE ORIGIN STORY")
- "headline": punchy headline (max 8 words)
- "body": 2-3 sentence description (max 40 words)
- "badge": short badge label in CAPS (max 5 words)
- "accent": one of these color names: "red", "amber", "blue", "green", "purple", "teal"

Make slide 1 a hook/intro, slides 2-4 tell the story, slide 5 is a CTA/verdict.
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

    return NextResponse.json({
      channel,
      story: trend.headline,
      topic: trend.topic,
      slides,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

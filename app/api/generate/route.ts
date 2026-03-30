import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { system, prompt, max_tokens = 1000 } = body

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not set in .env.local' },
        { status: 500 }
      )
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens,
      ...(system ? { system } : {}),
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    return NextResponse.json({ text })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/claude]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

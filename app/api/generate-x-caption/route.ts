import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const client = new Anthropic()
const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const USED_CAPTIONS_PATH = path.join(DATA_DIR, 'used-x-captions.json')
const APPROVALS_PATH = path.join(DATA_DIR, 'approvals.json')

type UsedCaptions = Record<string, string[]>

async function loadUsedCaptions(): Promise<UsedCaptions> {
  try {
    if (!existsSync(USED_CAPTIONS_PATH)) return {}
    const raw = await readFile(USED_CAPTIONS_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function saveUsedCaption(channel: string, caption: string): Promise<void> {
  const used = await loadUsedCaptions()
  if (!used[channel]) used[channel] = []
  used[channel].push(caption)
  if (used[channel].length > 5) used[channel] = used[channel].slice(-5)
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(USED_CAPTIONS_PATH, JSON.stringify(used, null, 2))
}

async function callClaude(
  topic: string,
  channel: string,
  slides: Array<{ headline: string; body: string }>,
  recentCaptions: string[]
): Promise<string> {
  const slideContent = slides.slice(0, 3).map((s, i) => `${i + 1}. ${s.headline}: ${s.body}`).join('\n')
  const avoidSection = recentCaptions.length > 0
    ? `\n\nAvoid repeating these recent captions:\n${recentCaptions.map(c => `- "${c}"`).join('\n')}`
    : ''

  const prompt = `You are a social media expert writing for X (Twitter). Write a single tweet about this topic.

Channel: ${channel}
Topic: ${topic}
Content:
${slideContent}${avoidSection}

Requirements:
- HARD LIMIT: 280 characters maximum (count every character including spaces)
- Single punchy sentence
- No hashtags
- No em-dashes (use commas or periods instead)
- No links
- No "Thread:" or numbering
- State something interesting, provocative, or surprising about the topic

Return ONLY the tweet text, nothing else.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }],
  })

  return (message.content[0] as { type: string; text: string }).text.trim()
}

export async function POST(req: NextRequest) {
  try {
    const { id, topic, channel, slides } = await req.json() as {
      id?: string
      topic: string
      channel: string
      slides: Array<{ headline: string; body: string }>
    }

    if (!topic || !channel || !slides?.length) {
      return NextResponse.json({ error: 'topic, channel, and slides are required' }, { status: 400 })
    }

    const used = await loadUsedCaptions()
    const recentCaptions = (used[channel] || []).slice(-5)

    let caption = await callClaude(topic, channel, slides, recentCaptions)

    // Retry up to 2x if over the 280-char limit
    let attempts = 1
    while (caption.length > 280 && attempts < 3) {
      console.warn(`[generate-x-caption] Attempt ${attempts}: caption is ${caption.length} chars — retrying`)
      caption = await callClaude(topic, channel, slides, recentCaptions)
      attempts++
    }

    // Final hard truncation as safety net
    if (caption.length > 280) {
      console.warn(`[generate-x-caption] Still over 280 after ${attempts} attempts — hard truncating`)
      caption = caption.slice(0, 277) + '...'
    }

    await saveUsedCaption(channel, caption)

    // Persist to approval item if id provided
    if (id && existsSync(APPROVALS_PATH)) {
      try {
        const raw = await readFile(APPROVALS_PATH, 'utf-8')
        const items = JSON.parse(raw)
        const item = items.find((i: { id: string }) => i.id === id)
        if (item) {
          item.xCaption = caption
          await writeFile(APPROVALS_PATH, JSON.stringify(items, null, 2))
        }
      } catch (e) {
        console.warn('[generate-x-caption] Failed to persist to approval:', e instanceof Error ? e.message : e)
      }
    }

    return NextResponse.json({ caption, length: caption.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[generate-x-caption] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

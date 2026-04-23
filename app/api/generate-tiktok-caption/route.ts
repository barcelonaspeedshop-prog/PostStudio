import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const client = new Anthropic()
const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const USED_CAPTIONS_PATH = path.join(DATA_DIR, 'used-tiktok-captions.json')
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

    const slideContent = slides.slice(0, 6).map((s, i) => `${i + 1}. ${s.headline}: ${s.body}`).join('\n')
    const avoidSection = recentCaptions.length > 0
      ? `\n\nAvoid repeating these recent captions for this channel:\n${recentCaptions.map(c => `- "${c}"`).join('\n')}`
      : ''

    const prompt = `You are a TikTok content strategist. Write a TikTok caption for this post.

Channel: ${channel}
Topic: ${topic}
Content:
${slideContent}${avoidSection}

Requirements:
- Hook-first opening: the first 8 words must grab attention immediately
- Ideal length: 100-150 characters total
- Hard limit: 2200 characters max
- End with 3-5 relevant hashtags (with # prefix, space-separated)
- No clickbait ALL CAPS words
- No em-dashes
- Conversational, direct tone
- Hashtags should be specific to the topic and channel niche

Return ONLY the caption text, nothing else.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    let caption = (message.content[0] as { type: string; text: string }).text.trim()
    if (caption.length > 2200) caption = caption.slice(0, 2197) + '...'

    await saveUsedCaption(channel, caption)

    // Persist to approval item if id provided
    if (id && existsSync(APPROVALS_PATH)) {
      try {
        const raw = await readFile(APPROVALS_PATH, 'utf-8')
        const items = JSON.parse(raw)
        const item = items.find((i: { id: string }) => i.id === id)
        if (item) {
          item.tiktokCaption = caption
          await writeFile(APPROVALS_PATH, JSON.stringify(items, null, 2))
        }
      } catch (e) {
        console.warn('[generate-tiktok-caption] Failed to persist to approval:', e instanceof Error ? e.message : e)
      }
    }

    return NextResponse.json({ caption })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[generate-tiktok-caption] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

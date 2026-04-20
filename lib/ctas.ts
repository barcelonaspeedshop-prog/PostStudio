import Anthropic from '@anthropic-ai/sdk'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getChannel } from './channels'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const USED_CTAS_PATH = path.join(DATA_DIR, 'used-ctas.json')

type UsedCTAs = Record<string, string[]>

export async function loadRecentCTAs(channel: string): Promise<string[]> {
  try {
    if (!existsSync(USED_CTAS_PATH)) return []
    const raw = await readFile(USED_CTAS_PATH, 'utf-8')
    const data: UsedCTAs = JSON.parse(raw)
    return data[channel] || []
  } catch {
    return []
  }
}

export async function saveRecentCTA(channel: string, cta: string): Promise<void> {
  let data: UsedCTAs = {}
  try {
    if (existsSync(USED_CTAS_PATH)) {
      const raw = await readFile(USED_CTAS_PATH, 'utf-8')
      data = JSON.parse(raw)
    }
  } catch {}
  if (!data[channel]) data[channel] = []
  data[channel].push(cta)
  if (data[channel].length > 20) data[channel] = data[channel].slice(-20)
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(USED_CTAS_PATH, JSON.stringify(data, null, 2))
}

export async function generateCTA(
  caption: string,
  topic: string,
  channel: string,
  recentCTAs: string[] = []
): Promise<string> {
  const channelConfig = getChannel(channel)
  const ctaStyle = channelConfig.ctaStyle || 'invite genuine, specific engagement'

  const recentBlock = recentCTAs.length > 0
    ? `\n\nDo NOT repeat or closely echo any of these recently-used CTAs:\n${recentCTAs.slice(-10).map(c => `- "${c}"`).join('\n')}`
    : ''

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 80,
    system: 'You write social media engagement CTAs. Respond with a single sentence only — no quotes, no preamble, no explanation.',
    messages: [{
      role: 'user',
      content: `Write one engagement CTA for this post.

Channel: ${channel}
CTA style: ${ctaStyle}
Topic: ${topic}
Caption snippet: ${caption.slice(0, 300)}${recentBlock}

Rules:
- One sentence, max 15 words
- Never use: "Comment below", "What do you think?", "Let us know", "Drop a comment", "Share your thoughts", "Tell us in the comments"
- Must be specific to this exact topic — not generic
- No emojis
- No hashtags
- Do not open with "Comment" or "Tell us"`,
    }],
  })

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()
    .replace(/^["']|["']$/g, '')

  return text
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const client = new Anthropic()
const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const USED_SLUGS_PATH = path.join(DATA_DIR, 'used-article-slugs.json')

type UsedSlugs = Record<string, string[]>

async function loadUsedSlugs(): Promise<UsedSlugs> {
  try {
    if (!existsSync(USED_SLUGS_PATH)) return {}
    const raw = await readFile(USED_SLUGS_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function saveUsedSlugs(data: UsedSlugs): Promise<void> {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(USED_SLUGS_PATH, JSON.stringify(data, null, 2))
}

function makeSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 80)
}

function uniqueSlug(base: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(base)) return base
  let n = 2
  while (existingSlugs.includes(`${base}-${n}`)) n++
  return `${base}-${n}`
}

const CHANNEL_VOICE: Record<string, string> = {
  'Gentlemen of Fuel': `You write for Gentlemen of Fuel — a publication for car enthusiasts who appreciate craft, engineering heritage, and driving culture. The voice is knowledgeable, unhurried, and appreciative. You write about cars the way a serious collector talks about them: with specificity, reverence for the mechanical, and an eye for what makes a machine exceptional. Avoid tabloid energy. No hype.`,
  'Omnira F1': `You write for Omnira F1 — a Formula 1 publication for fans who understand the sport deeply. The voice is analytical, precise, and race-weekend fluent. You reference technical context (tyre strategies, power unit modes, aero concepts) where relevant. You have opinions and state them with confidence. You write as someone who stays up to watch qualifying.`,
  'Omnira Football': `You write for Omnira Football — a football publication for fans who follow the game closely. The voice is match-fluent, tactically aware, and transfer-market sharp. You understand the rhythm of a season, what pressure on a manager looks like, what a January window can and can't fix. Concrete and specific — never vague.`,
  'Omnira Food': `You write for Omnira Food — a publication about the best places to eat and drink. The voice is warm, appetite-first, and specific about sensation: texture, flavour, smell, presentation. You write as someone who has actually eaten the food and wants the reader to feel the table. No clichés about "journeys" or "experiences". Write about food.`,
}

export async function POST(req: NextRequest) {
  try {
    const { slides, channel, ytTitle, id } = await req.json() as {
      slides: Array<{ headline: string; body: string }>
      channel: string
      ytTitle?: string
      id?: string
    }

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return NextResponse.json({ error: 'slides are required' }, { status: 400 })
    }
    if (!channel) {
      return NextResponse.json({ error: 'channel is required' }, { status: 400 })
    }

    const usedSlugs = await loadUsedSlugs()
    const channelSlugs = usedSlugs[channel] || []
    const recentSlugs = channelSlugs.slice(-5)

    const sourceContent = slides
      .map(s => `${s.headline}\n${s.body}`)
      .join('\n\n')

    const titleHint = ytTitle ? `The headline for this piece is: "${ytTitle}"` : ''
    const recentSlugNote = recentSlugs.length > 0
      ? `\nRecent article slugs for this channel (avoid similar topics): ${recentSlugs.join(', ')}`
      : ''

    const channelVoice = CHANNEL_VOICE[channel] || `You write for ${channel}.`

    const systemPrompt = `${channelVoice}

You are writing a standalone editorial article for publication on the website. This is NOT a social media caption, NOT a video script summary, NOT a listicle.

Structure:
- Lede paragraph: 2-3 sentences. Hook the reader with the news or angle — don't bury it.
- 2-3 body paragraphs: expand on the story with context, stakes, and perspective. Use specifics.
- Closing paragraph: end with an observation, a question worth sitting with, or a clear point of view. Not a summary.

Format rules:
- Markdown paragraphs separated by blank lines
- Optional ## subheadings for longer pieces only
- NO H1 (the title is stored separately)
- NO hashtags, NO emojis
- NO "click to read more", "in this article", "in conclusion", "furthermore", "moreover", "it's worth noting"
- NO "In the world of X", "X has always been Y", "As a [channel] fan", "Whether you're a..."
- NO passive-voice throat-clearing. Start with action and information.
- 350–450 words. Hard max 500.

After the article body, on a new line, write:
EXCERPT: [1-2 sentence summary, max 200 characters, suitable for article cards]
SLUG: [URL-safe slug derived from the headline or main topic, lowercase, hyphens, max 80 chars]
${recentSlugNote}`

    const userPrompt = `${titleHint}

Source material (carousel slide content):
${sourceContent}

Write the article. Use the source material as a starting point — restate, expand, and add editorial perspective. Do not just rephrase each slide in order.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()

    // Parse out EXCERPT and SLUG from the end
    const excerptMatch = raw.match(/\nEXCERPT:\s*(.+)/i)
    const slugMatch = raw.match(/\nSLUG:\s*([^\n]+)/i)

    // Strip EXCERPT and SLUG lines from body (use indexOf for ts compat)
    let articleBody = raw
    const excerptIdx = articleBody.search(/\nEXCERPT:/i)
    if (excerptIdx !== -1) articleBody = articleBody.slice(0, excerptIdx)
    const slugIdx = articleBody.search(/\nSLUG:/i)
    if (slugIdx !== -1) articleBody = articleBody.slice(0, slugIdx)
    articleBody = articleBody.trim()

    // Hard word count guard — truncate at ~500 words if Claude overshot
    const words = articleBody.split(/\s+/)
    if (words.length > 520) {
      articleBody = words.slice(0, 500).join(' ') + '…'
    }

    let articleExcerpt = excerptMatch ? excerptMatch[1].trim().slice(0, 200) : ''
    if (!articleExcerpt) {
      // Fallback: first sentence of article body
      const firstSentence = articleBody.replace(/^#+[^\n]*\n+/, '').split(/[.!?]/)[0]
      articleExcerpt = (firstSentence + '.').trim().slice(0, 200)
    }

    const rawSlug = slugMatch ? makeSlug(slugMatch[1].trim()) : makeSlug(ytTitle || slides[0]?.headline || 'article')
    const articleSlug = uniqueSlug(rawSlug, channelSlugs)

    // Persist slug
    if (!usedSlugs[channel]) usedSlugs[channel] = []
    usedSlugs[channel].push(articleSlug)
    if (usedSlugs[channel].length > 50) usedSlugs[channel] = usedSlugs[channel].slice(-50)
    await saveUsedSlugs(usedSlugs)

    // Optionally persist back to the approval item
    if (id) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'
      fetch(`${baseUrl}/api/approvals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, articleBody, articleExcerpt, articleSlug }),
      }).catch(e => console.warn('[generate-article] Failed to persist to approval item:', e instanceof Error ? e.message : e))
    }

    return NextResponse.json({ articleBody, articleExcerpt, articleSlug })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[generate-article] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

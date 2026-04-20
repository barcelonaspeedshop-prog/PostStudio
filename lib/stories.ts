import Anthropic from '@anthropic-ai/sdk'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getChannel } from './channels'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const USED_STORIES_PATH = path.join(DATA_DIR, 'used-stories.json')

export type StoryCategory = 'Rivalry' | 'Legend' | 'Moment' | 'Controversy' | 'Era' | 'Dynasty'

export type StoryIdea = {
  title: string
  hook: string
  category: StoryCategory
  factCheckRequired?: boolean
}

type UsedStoryEntry = {
  title: string
  usedAt: string
}

export type UsedStories = Record<string, UsedStoryEntry[]>

export async function loadUsedStories(): Promise<UsedStories> {
  try {
    if (!existsSync(USED_STORIES_PATH)) return {}
    const raw = await readFile(USED_STORIES_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export async function markStoryUsed(channel: string, title: string): Promise<void> {
  const data = await loadUsedStories()
  if (!data[channel]) data[channel] = []
  // Prevent duplicate entries for the same title
  if (!data[channel].some(e => e.title === title)) {
    data[channel].push({ title, usedAt: new Date().toISOString() })
  }
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(USED_STORIES_PATH, JSON.stringify(data, null, 2))
}

export async function generateStoryBank(channel: string): Promise<StoryIdea[]> {
  const cfg = getChannel(channel)
  const usedData = await loadUsedStories()
  const usedTitles = (usedData[channel] || []).map(e => e.title)

  const avoidBlock = usedTitles.length > 0
    ? `\n\nDo NOT generate any of these already-used stories (titles only — listed for avoidance):\n${usedTitles.map(t => `- ${t}`).join('\n')}`
    : ''

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: 'You are a creative content strategist specialising in evergreen long-form video storytelling. Respond with valid JSON only — no markdown, no backticks, no preamble.',
    messages: [{
      role: 'user',
      content: `Generate 18 evergreen long-form story ideas for the social media channel "${channel}".

Channel tagline: ${cfg.tagline}
Story themes and rich territory for this channel:
${cfg.storyThemes}

Categories — spread them across these 6 (aim for 3 per category):
- Rivalry: legendary head-to-head contests where the tension was personal
- Legend: iconic figures and the defining chapters of their story
- Moment: a single event, match, race, or decision that changed everything
- Controversy: scandals, disputed decisions, what-ifs, and uncomfortable truths
- Era: a golden period that defined the sport, cuisine, or destination
- Dynasty: sustained dominance — by a team, chef, hotel, or individual

Rules:
- Stories must be EVERGREEN — timeless deep-dives, not tied to breaking news
- Each story should sustain 6-12 minutes of compelling documentary-style narration
- The hook must create genuine intrigue in 1-2 sentences — make the reader feel they must know the full story
- Titles must be specific and punchy, not generic (avoid "The Story of..." or "How X Changed Y")
- Stories should have broad appeal within the niche — avoid deep obscurity
- Vary the era/period — don't cluster stories in the same decade${avoidBlock}

IMPORTANT: All stories must be factually real and verifiable. Do not invent characters, dates, locations, or events. Every story should be one that a knowledgeable fan of the topic could independently research and confirm. If generating in a genre where fictional storytelling is the norm (e.g. mythology or folklore), clearly use "Legend" as the category so the user knows the content may not be historically documented.

For each story, assess your own confidence in the factual accuracy of the specific details (names, dates, outcomes, quotes). If you are less than fully confident that every detail is accurate and verifiable, set "factCheckRequired" to true. Reserve factCheckRequired: false only for stories you are certain are well-documented historical facts.

Return a JSON array of exactly 18 objects. Each:
- "title": string (specific, punchy, max 10 words — this becomes the video title)
- "hook": string (1-2 sentences of pure intrigue, makes the reader stop scrolling)
- "category": exactly one of "Rivalry" | "Legend" | "Moment" | "Controversy" | "Era" | "Dynasty"
- "factCheckRequired": boolean (true if any detail may need verification; false only if you are fully confident in the facts)`,
    }],
  })

  const text = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()

  const clean = text.replace(/```json|```/g, '').trim()
  const match = clean.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('No JSON array found in response')

  const parsed: unknown[] = JSON.parse(match[0])
  const stories = parsed
    .filter(
      (s): s is StoryIdea =>
        typeof s === 'object' && s !== null &&
        typeof (s as StoryIdea).title === 'string' &&
        typeof (s as StoryIdea).hook === 'string' &&
        ['Rivalry', 'Legend', 'Moment', 'Controversy', 'Era', 'Dynasty'].includes((s as StoryIdea).category)
    )
    .map(s => ({
      ...s,
      // Normalise: treat any non-false value as true; default missing field to true (conservative)
      factCheckRequired: (s as StoryIdea).factCheckRequired !== false,
    }))

  if (stories.length === 0) throw new Error('No valid stories in response')
  return stories
}

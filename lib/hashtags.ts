import Anthropic from '@anthropic-ai/sdk'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getChannel } from './channels'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const USED_HASHTAGS_PATH = path.join(DATA_DIR, 'used-hashtags.json')

// Per-channel list of the last 10 published hashtag sets
type UsedHashtags = Record<string, string[][]>

async function loadUsedHashtags(): Promise<UsedHashtags> {
  try {
    if (!existsSync(USED_HASHTAGS_PATH)) return {}
    const raw = await readFile(USED_HASHTAGS_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function saveUsedHashtags(data: UsedHashtags): Promise<void> {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(USED_HASHTAGS_PATH, JSON.stringify(data, null, 2))
}

/** Call after a post is published to track its tag set for rotation. */
export async function trackHashtags(channel: string, tags: string[]): Promise<void> {
  const data = await loadUsedHashtags()
  if (!data[channel]) data[channel] = []
  data[channel].push(tags)
  if (data[channel].length > 10) data[channel] = data[channel].slice(-10)
  await saveUsedHashtags(data)
}

/** Fraction of tags that appear in both sets (Jaccard-style). */
function overlapRatio(a: string[], b: string[]): number {
  const setA = new Set(a.map(t => t.toLowerCase()))
  const shared = b.filter(t => setA.has(t.toLowerCase())).length
  return shared / Math.max(a.length, b.length, 1)
}

/**
 * Use Haiku to pick the most topic-relevant tags from the rotating pool.
 * Returns up to `want` tags, sorted by relevance.
 */
async function rankRotatingTags(
  topic: string,
  channel: string,
  rotating: string[],
  want: number
): Promise<string[]> {
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      system: 'You select relevant hashtags. Respond with a JSON array of strings only — no markdown, no explanation.',
      messages: [{
        role: 'user',
        content: `Pick the ${want} most relevant hashtags from the list below for a post about: "${topic}"
Channel: ${channel}

Available hashtags:
${rotating.join('  ')}

Return a JSON array of exactly ${want} hashtag strings (keep the # prefix). Most relevant first.`,
      }],
    })

    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    const match = text.replace(/```json|```/g, '').trim().match(/\[[\s\S]*\]/)
    if (!match) throw new Error('no JSON array')
    const parsed: unknown[] = JSON.parse(match[0])
    return parsed
      .filter((t): t is string => typeof t === 'string' && t.startsWith('#'))
      .slice(0, want)
  } catch {
    // Fallback: simple shuffle and slice
    return [...rotating].sort(() => Math.random() - 0.5).slice(0, want)
  }
}

/**
 * Generate a fresh hashtag set for a post.
 *
 * Composition:
 *   • All core tags (5-7)
 *   • 2-3 engagement tags (randomly sampled, rotated each call)
 *   • 12-15 rotating tags ranked by topic relevance via Haiku
 *
 * Anti-shadow-ban: if the candidate set overlaps too heavily with any of
 * the last 10 published sets for this channel, swap in unused rotating tags
 * until the difference is ≥ 30%.
 */
export async function generateHashtags(topic: string, channel: string): Promise<string[]> {
  const cfg = getChannel(channel)
  const { core, rotating, engagement } = cfg.hashtagSets

  // Engagement: shuffle + take 2-3 different ones each time
  const engCount = 2 + Math.floor(Math.random() * 2) // 2 or 3
  const shuffledEng = [...engagement].sort(() => Math.random() - 0.5)
  const chosenEng = shuffledEng.slice(0, engCount)

  // Rotating: ask Haiku for the 15 most relevant
  const rankedRotating = await rankRotatingTags(topic, channel, rotating, 15)

  // Candidate = core + engagement + rotating
  let candidate = dedup([...core, ...chosenEng, ...rankedRotating])

  // Anti-shadow-ban enforcement
  const usedData = await loadUsedHashtags()
  const recentSets = usedData[channel] || []
  const MIN_DIFF = 0.30 // require ≥ 30% of tags to be new

  for (const recent of recentSets) {
    const overlap = overlapRatio(candidate, recent)
    if (overlap > 1 - MIN_DIFF) {
      // Find rotating tags NOT in recent set and swap some in
      const recentLower = new Set(recent.map(t => t.toLowerCase()))
      const freshPool = rotating
        .filter(t => !recentLower.has(t.toLowerCase()))
        .sort(() => Math.random() - 0.5)

      // Replace up to 5 of the ranked rotating entries with fresh ones
      const nonRotating = candidate.filter(t => !rotating.includes(t))
      const keptRotating = candidate
        .filter(t => rotating.includes(t))
        .slice(0, Math.max(0, candidate.filter(t => rotating.includes(t)).length - 5))
      candidate = dedup([...nonRotating, ...keptRotating, ...freshPool.slice(0, 7)])
    }
  }

  // Final cap at 25
  return candidate.slice(0, 25)
}

function dedup(tags: string[]): string[] {
  const seen = new Set<string>()
  return tags.filter(t => {
    const k = t.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

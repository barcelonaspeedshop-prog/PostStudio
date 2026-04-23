import Anthropic from '@anthropic-ai/sdk'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { CHANNELS } from './channels'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
export const ASSETS_BASE = path.join(DATA_DIR, 'assets')
export const ASSETS_DIR = path.join(ASSETS_BASE, 'images')
export const ASSETS_JSON = path.join(ASSETS_BASE, 'assets.json')

const CHANNEL_NAMES = Object.keys(CHANNELS).filter(k => CHANNELS[k].active)

const IMAGE_TYPES = [
  'driver', 'car', 'person', 'place', 'dish', 'event',
  'action', 'portrait', 'landscape', 'product', 'crowd', 'stadium',
] as const

export type ImageType = typeof IMAGE_TYPES[number] | string

export type AssetEntry = {
  originalName: string
  filename: string
  uploadedAt: string
  channel: string[]
  type: ImageType
  subjects: string[]
  tags: string[]
  mood: string
  usageCount: number
  lastUsed: string | null
  dimensions: { width: number; height: number }
  fileSize: number
}

export type AssetsIndex = Record<string, AssetEntry>

export type ImageAnalysis = Pick<AssetEntry, 'channel' | 'type' | 'subjects' | 'tags' | 'mood'>

// ── Persistence helpers ───────────────────────────────────────────────────────

export async function loadAssets(): Promise<AssetsIndex> {
  try {
    if (!existsSync(ASSETS_JSON)) return {}
    const raw = await readFile(ASSETS_JSON, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export async function saveAssets(assets: AssetsIndex): Promise<void> {
  if (!existsSync(ASSETS_BASE)) await mkdir(ASSETS_BASE, { recursive: true })
  await writeFile(ASSETS_JSON, JSON.stringify(assets, null, 2))
}

// ── AI tagging ────────────────────────────────────────────────────────────────

/**
 * Analyse an image with Claude Sonnet vision and return structured metadata.
 * Always returns a valid (possibly sparse) object — never throws.
 */
export async function analyzeImage(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<ImageAnalysis> {
  // Normalise mime type to values the Anthropic API accepts
  const mediaType = (
    mimeType === 'image/png' ? 'image/png'
    : mimeType === 'image/webp' ? 'image/webp'
    : 'image/jpeg'
  ) as 'image/jpeg' | 'image/png' | 'image/webp'

  const fallback: ImageAnalysis = {
    channel: [],
    type: 'unknown',
    subjects: [],
    tags: [],
    mood: 'neutral',
  }

  try {
    const base64 = imageBuffer.toString('base64')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: 'You analyse images for a social media content management tool. Respond with valid JSON only — no markdown, no backticks, no explanation.',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `Analyse this image and return a JSON object with exactly these fields:

"channel": array of 1-3 channel names that this image best suits, chosen strictly from this list:
${CHANNEL_NAMES.map(c => `  - ${c}`).join('\n')}

"type": the single best descriptor of the main subject, chosen from:
  driver, car, person, place, dish, event, action, portrait, landscape, product, crowd, stadium

"subjects": array of specific named subjects visible — named people (full name if identifiable), exact car models, named places, dish names. Empty array if none are clearly identifiable.

"tags": array of 5-10 lowercase descriptive tags covering: colours, setting, sport context, action, emotion, year/era if visible, weather, composition style.

"mood": single lowercase word capturing the atmosphere (e.g. triumphant, gritty, serene, tense, nostalgic, joyful, dramatic).

Return only the JSON object. Be accurate and specific.`,
          },
        ],
      }],
    })

    const raw = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return {
      channel: Array.isArray(parsed.channel)
        ? parsed.channel.filter((c: unknown) => typeof c === 'string' && CHANNEL_NAMES.includes(c))
        : [],
      type: typeof parsed.type === 'string' ? parsed.type : 'unknown',
      subjects: Array.isArray(parsed.subjects)
        ? parsed.subjects.filter((s: unknown) => typeof s === 'string')
        : [],
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((t: unknown) => typeof t === 'string').slice(0, 10)
        : [],
      mood: typeof parsed.mood === 'string' ? parsed.mood.toLowerCase() : 'neutral',
    }
  } catch (e) {
    console.warn('[assets] analyzeImage failed — returning empty tags:', e instanceof Error ? e.message : e)
    return fallback
  }
}

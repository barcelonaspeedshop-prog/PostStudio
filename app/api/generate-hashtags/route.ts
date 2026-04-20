import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { generateHashtags } from '@/lib/hashtags'
import { CHANNELS } from '@/lib/channels'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const APPROVALS_PATH = path.join(DATA_DIR, 'approvals.json')

export async function POST(req: NextRequest) {
  try {
    const { id, topic, channel } = await req.json()

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 })
    }
    if (!channel || !CHANNELS[channel]) {
      return NextResponse.json({ error: `channel must be one of: ${Object.keys(CHANNELS).join(', ')}` }, { status: 400 })
    }

    const hashtags = await generateHashtags(topic.trim(), channel)

    // If an approval item id is provided, persist the hashtags to that item
    if (id && existsSync(APPROVALS_PATH)) {
      try {
        const raw = await readFile(APPROVALS_PATH, 'utf-8')
        const items = JSON.parse(raw)
        const item = items.find((i: { id: string }) => i.id === id)
        if (item) {
          item.hashtags = hashtags
          await writeFile(APPROVALS_PATH, JSON.stringify(items, null, 2))
        }
      } catch (e) {
        console.warn('[generate-hashtags] Failed to persist hashtags to approval:', e instanceof Error ? e.message : e)
      }
    }

    return NextResponse.json({ hashtags })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[generate-hashtags] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

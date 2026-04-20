import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { generateCTA, loadRecentCTAs, saveRecentCTA } from '@/lib/ctas'
import { CHANNELS } from '@/lib/channels'

export const dynamic = 'force-dynamic'

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const APPROVALS_PATH = path.join(DATA_DIR, 'approvals.json')

export async function POST(req: NextRequest) {
  try {
    const { id, caption, topic, channel } = await req.json()

    if (!channel || !CHANNELS[channel]) {
      return NextResponse.json({ error: `channel must be one of: ${Object.keys(CHANNELS).join(', ')}` }, { status: 400 })
    }

    const recentCTAs = await loadRecentCTAs(channel)
    const cta = await generateCTA(caption || '', topic || '', channel, recentCTAs)
    await saveRecentCTA(channel, cta)

    // If an approval item id is provided, persist the CTA to that item
    if (id && existsSync(APPROVALS_PATH)) {
      try {
        const raw = await readFile(APPROVALS_PATH, 'utf-8')
        const items = JSON.parse(raw)
        const item = items.find((i: { id: string }) => i.id === id)
        if (item) {
          item.cta = cta
          await writeFile(APPROVALS_PATH, JSON.stringify(items, null, 2))
        }
      } catch (e) {
        console.warn('[generate-cta] Failed to persist CTA to approvals:', e instanceof Error ? e.message : e)
      }
    }

    return NextResponse.json({ cta })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[generate-cta] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

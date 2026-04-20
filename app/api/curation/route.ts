import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fetchCandidateStories, type CurationQueue, type CurationChannelQueue } from '@/lib/curation'

type ChannelSettings = { autoSkip: boolean }

async function loadSettings(): Promise<Record<string, ChannelSettings>> {
  const settingsPath = path.join(process.env.TOKEN_STORAGE_PATH || '/data', 'curation-settings.json')
  try {
    if (!existsSync(settingsPath)) return {}
    return JSON.parse(await readFile(settingsPath, 'utf-8'))
  } catch {
    return {}
  }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const QUEUE_PATH = path.join(DATA_DIR, 'curation-queue.json')

const ALL_CHANNELS = [
  'Gentlemen of Fuel', 'Omnira F1', 'Road & Trax', 'Omnira Football',
  'Omnira Cricket', 'Omnira Golf', 'Omnira NFL', 'Omnira Food', 'Omnira Travel',
]

async function loadQueue(): Promise<CurationQueue | null> {
  try {
    if (!existsSync(QUEUE_PATH)) return null
    const raw = await readFile(QUEUE_PATH, 'utf-8')
    const queue: CurationQueue = JSON.parse(raw)
    const today = new Date().toISOString().split('T')[0]
    if (queue.date !== today) return null
    return queue
  } catch {
    return null
  }
}

async function saveQueue(queue: CurationQueue): Promise<void> {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(QUEUE_PATH, JSON.stringify(queue, null, 2))
}

export async function GET() {
  const queue = await loadQueue()
  if (!queue) {
    return NextResponse.json({
      date: new Date().toISOString().split('T')[0],
      populated_at: null,
      channels: {},
    })
  }
  return NextResponse.json(queue)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { action } = body

  if (action === 'populate') {
    const today = new Date().toISOString().split('T')[0]
    const channelsToProcess: string[] = body.channels || ALL_CHANNELS

    const existing = await loadQueue()
    const queue: CurationQueue = existing && existing.date === today
      ? existing
      : { date: today, populated_at: new Date().toISOString(), channels: {} }

    const settings = await loadSettings()

    // Process channels in batches of 3 with a 20s gap to avoid rate-limiting.
    // Within each batch channels run concurrently; between batches we wait.
    // Fixture data from the existing queue is reused (cached per day) to skip
    // the Haiku+web_search fixture call on same-day re-populates.
    const BATCH_SIZE = 3
    const BATCH_DELAY_MS = 20_000
    const results: PromiseSettledResult<CurationChannelQueue>[] = []

    for (let i = 0; i < channelsToProcess.length; i += BATCH_SIZE) {
      if (i > 0) {
        console.log(`[curation] Batch ${Math.floor(i / BATCH_SIZE) + 1} — waiting ${BATCH_DELAY_MS / 1000}s…`)
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
      }
      const batch = channelsToProcess.slice(i, i + BATCH_SIZE)
      console.log(`[curation] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.join(', ')}`)
      const batchResults = await Promise.allSettled(
        batch.map(channel => {
          const cachedFixtures = queue.channels[channel]?.fixtures
          return fetchCandidateStories(channel, today, cachedFixtures)
        })
      )
      results.push(...batchResults)
    }

    channelsToProcess.forEach((channel, i) => {
      const result = results[i]
      if (result.status === 'fulfilled') {
        const channelData = result.value
        // Auto-skip if enabled and it's a low news day
        if (settings[channel]?.autoSkip && channelData.lowNewsDay) {
          console.log(`[curation] Auto-skipping ${channel} (low news day + auto-skip enabled)`)
          channelData.status = 'skipped'
        }
        queue.channels[channel] = channelData
      } else {
        console.error(`[curation] Failed for ${channel}:`, result.reason)
        queue.channels[channel] = {
          status: 'pending',
          populated_at: new Date().toISOString(),
          suggested_id: null,
          stories: [],
          error: String(result.reason),
        } as CurationChannelQueue
      }
    })

    queue.populated_at = new Date().toISOString()
    await saveQueue(queue)
    return NextResponse.json(queue)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { channel, status } = body

  if (!channel) return NextResponse.json({ error: 'channel required' }, { status: 400 })

  const queue = await loadQueue()
  if (!queue) return NextResponse.json({ error: 'No queue for today' }, { status: 404 })

  if (queue.channels[channel]) {
    queue.channels[channel].status = status || 'skipped'
    await saveQueue(queue)
  }

  return NextResponse.json({ ok: true })
}

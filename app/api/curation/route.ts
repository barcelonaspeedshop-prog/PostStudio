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

    // Process channels in parallel — each fetches stories + fixtures concurrently
    const [results, settings] = await Promise.all([
      Promise.allSettled(channelsToProcess.map(channel => fetchCandidateStories(channel, today))),
      loadSettings(),
    ])

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

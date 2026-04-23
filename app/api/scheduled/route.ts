import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const SCHEDULED_PATH = path.join(DATA_DIR, 'scheduled.json')

export type ScheduledItem = {
  id: string
  channel: string
  headline: string
  format: 'carousel' | 'short' | 'tiktok' | 'story'
  platform: 'instagram' | 'youtube' | 'tiktok'
  scheduledTime: string
  status: 'pending' | 'published' | 'failed'
  error?: string
  approvalId?: string
  clipFile?: string
  createdAt: string
}

async function loadScheduled(): Promise<ScheduledItem[]> {
  try {
    if (!existsSync(SCHEDULED_PATH)) return []
    const raw = await readFile(SCHEDULED_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function saveScheduled(items: ScheduledItem[]): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true })
  }
  await writeFile(SCHEDULED_PATH, JSON.stringify(items, null, 2))
}

// GET — return all scheduled items sorted by scheduledTime
export async function GET() {
  const items = await loadScheduled()
  items.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
  return NextResponse.json(items)
}

// POST — add a new scheduled item
export async function POST(req: NextRequest) {
  try {
    const { channel, headline, format, platform, scheduledTime, approvalId, clipFile } = await req.json()

    if (!channel || !headline || !format || !platform || !scheduledTime) {
      return NextResponse.json(
        { error: 'channel, headline, format, platform, and scheduledTime are required' },
        { status: 400 },
      )
    }

    const item: ScheduledItem = {
      id: crypto.randomUUID(),
      channel,
      headline,
      format,
      platform,
      scheduledTime,
      status: 'pending',
      approvalId: approvalId || undefined,
      clipFile: clipFile || undefined,
      createdAt: new Date().toISOString(),
    }

    const items = await loadScheduled()
    items.push(item)
    await saveScheduled(items)

    return NextResponse.json({ id: item.id, status: 'pending' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[scheduled] POST error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT — update scheduledTime or status by id
export async function PUT(req: NextRequest) {
  try {
    const { id, scheduledTime, status, error } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const items = await loadScheduled()
    const item = items.find(i => i.id === id)
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    if (scheduledTime) item.scheduledTime = scheduledTime
    if (status) item.status = status
    if (error !== undefined) item.error = error

    await saveScheduled(items)
    return NextResponse.json({ id: item.id, status: item.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[scheduled] PUT error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE — remove by id
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    let items = await loadScheduled()
    const before = items.length
    items = items.filter(i => i.id !== id)

    if (items.length === before) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    await saveScheduled(items)
    return NextResponse.json({ deleted: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[scheduled] DELETE error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

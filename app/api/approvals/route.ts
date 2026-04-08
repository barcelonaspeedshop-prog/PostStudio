import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const APPROVALS_PATH = path.join(DATA_DIR, 'approvals.json')

export type ApprovalItem = {
  id: string
  channel: string
  headline: string
  topic: string
  slides: Array<{ num: string; tag: string; headline: string; body: string; badge: string; accent: string; image?: string }>
  videoBase64?: string
  platforms: string[]
  createdAt: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedAt?: string
}

async function loadApprovals(): Promise<ApprovalItem[]> {
  try {
    if (!existsSync(APPROVALS_PATH)) return []
    const raw = await readFile(APPROVALS_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function saveApprovals(items: ApprovalItem[]): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true })
  }
  await writeFile(APPROVALS_PATH, JSON.stringify(items, null, 2))
}

// GET — return all approval items
export async function GET() {
  const items = await loadApprovals()
  return NextResponse.json(items)
}

// POST — add new item to queue
export async function POST(req: NextRequest) {
  try {
    const { channel, headline, topic, slides, videoBase64, platforms } = await req.json()

    if (!channel || !slides || !Array.isArray(slides)) {
      return NextResponse.json({ error: 'channel and slides are required' }, { status: 400 })
    }

    const item: ApprovalItem = {
      id: crypto.randomUUID(),
      channel,
      headline: headline || slides[0]?.headline || 'Untitled',
      topic: topic || '',
      slides,
      videoBase64,
      platforms: platforms || [],
      createdAt: new Date().toISOString(),
      status: 'pending',
    }

    const items = await loadApprovals()
    items.unshift(item)
    await saveApprovals(items)

    return NextResponse.json({ id: item.id, status: 'pending' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[approvals] POST error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH — approve or reject an item
export async function PATCH(req: NextRequest) {
  try {
    const { id, action } = await req.json()

    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'id and action (approve/reject) are required' }, { status: 400 })
    }

    const items = await loadApprovals()
    const item = items.find(i => i.id === id)
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    item.status = action === 'approve' ? 'approved' : 'rejected'
    item.reviewedAt = new Date().toISOString()
    await saveApprovals(items)

    // If approved, trigger publishing
    if (action === 'approve' && item.platforms.length > 0 && item.videoBase64) {
      try {
        const caption = item.slides.map(s => `${s.headline} — ${s.body}`).join('\n\n')
        const publishRes = await fetch(new URL('/api/publish', req.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: caption,
            mediaUrl: item.videoBase64,
            platforms: item.platforms,
            firstSlideHeadline: item.headline,
            channel: item.channel,
          }),
        })
        const publishData = await publishRes.json()
        if (!publishRes.ok) {
          console.error('[approvals] Publish failed after approval:', publishData)
          return NextResponse.json({
            id: item.id,
            status: item.status,
            publishError: publishData.error || 'Publish failed',
          })
        }
        console.log(`[approvals] Approved and published: ${item.headline}`)
        return NextResponse.json({ id: item.id, status: item.status, published: true })
      } catch (pubErr: unknown) {
        const msg = pubErr instanceof Error ? pubErr.message : 'Publish error'
        console.error('[approvals] Publish error after approval:', msg)
        return NextResponse.json({ id: item.id, status: item.status, publishError: msg })
      }
    }

    return NextResponse.json({ id: item.id, status: item.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[approvals] PATCH error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

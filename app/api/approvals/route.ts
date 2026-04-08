import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

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

// PUT — update an item (e.g. attach video after generation)
export async function PUT(req: NextRequest) {
  try {
    const { id, videoBase64 } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const items = await loadApprovals()
    const item = items.find(i => i.id === id)
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    if (videoBase64) item.videoBase64 = videoBase64
    await saveApprovals(items)

    return NextResponse.json({ id: item.id, hasVideo: !!item.videoBase64 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[approvals] PUT error:', message)
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

    if (action === 'approve' && !item.videoBase64) {
      return NextResponse.json({ error: 'Cannot approve without a video. Generate the video first.' }, { status: 400 })
    }

    item.status = action === 'approve' ? 'approved' : 'rejected'
    item.reviewedAt = new Date().toISOString()
    await saveApprovals(items)

    if (action === 'reject') {
      return NextResponse.json({ id: item.id, status: 'rejected' })
    }

    // Approved — publish to platforms
    const results: { platform: string; success: boolean; error?: string; url?: string }[] = []
    const caption = item.slides.map(s => `${s.headline} — ${s.body}`).join('\n\n')

    // Publish to Postproxy for non-YouTube platforms
    const postproxyPlatforms = item.platforms.filter(p => p !== 'youtube')
    if (postproxyPlatforms.length > 0) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'
        const res = await fetch(`${baseUrl}/api/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: caption,
            mediaUrl: item.videoBase64,
            platforms: postproxyPlatforms,
            firstSlideHeadline: item.headline,
            channel: item.channel,
          }),
        })
        const data = await res.json()
        if (res.ok) {
          postproxyPlatforms.forEach(p => results.push({ platform: p, success: true }))
        } else {
          postproxyPlatforms.forEach(p => results.push({ platform: p, success: false, error: data.error }))
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Publish error'
        postproxyPlatforms.forEach(p => results.push({ platform: p, success: false, error: msg }))
      }
    }

    // Publish to YouTube directly
    if (item.platforms.includes('youtube')) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'
        const tags = caption.match(/#[\w]+/g)?.map(t => t.replace('#', '')) || []
        const res = await fetch(`${baseUrl}/api/publish/youtube`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoBase64: item.videoBase64,
            title: item.headline,
            description: caption,
            tags,
            channelName: item.channel,
          }),
        })
        const data = await res.json()
        if (res.ok) {
          results.push({ platform: 'youtube', success: true, url: data.url })
        } else {
          results.push({ platform: 'youtube', success: false, error: data.error })
        }
      } catch (e: unknown) {
        results.push({ platform: 'youtube', success: false, error: e instanceof Error ? e.message : 'YouTube error' })
      }
    }

    const allSuccess = results.every(r => r.success)
    const failures = results.filter(r => !r.success)

    console.log(`[approvals] Published "${item.headline}":`, JSON.stringify(results))

    return NextResponse.json({
      id: item.id,
      status: item.status,
      published: true,
      results,
      publishError: failures.length > 0 ? failures.map(f => `${f.platform}: ${f.error}`).join('; ') : undefined,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[approvals] PATCH error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

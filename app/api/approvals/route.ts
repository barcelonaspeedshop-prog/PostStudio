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
  slides: Array<{ num: string; tag: string; headline: string; body: string; badge: string; accent: string; image?: string; imageOptions?: string[] }>
  videoBase64?: string
  platforms: string[]
  ytTitle?: string
  ytDescription?: string
  ytTags?: string[]
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
    const { channel, headline, topic, slides, videoBase64, platforms, ytTitle, ytDescription, ytTags } = await req.json()

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
      ytTitle: ytTitle || '',
      ytDescription: ytDescription || '',
      ytTags: ytTags || [],
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

// PUT — update an item (e.g. attach video after generation, or regenerate with fresh content)
export async function PUT(req: NextRequest) {
  try {
    const { id, videoBase64, slides, headline, topic, ytTitle, ytDescription, ytTags } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const items = await loadApprovals()
    const item = items.find(i => i.id === id)
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    if (videoBase64) item.videoBase64 = videoBase64
    if (slides && Array.isArray(slides)) item.slides = slides
    if (headline) item.headline = headline
    if (topic !== undefined) item.topic = topic
    if (ytTitle) item.ytTitle = ytTitle
    if (ytDescription) item.ytDescription = ytDescription
    if (ytTags && Array.isArray(ytTags)) item.ytTags = ytTags
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

    // Approved — publish to all platforms in parallel
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'
    const caption = item.slides.map(s => `${s.headline} — ${s.body}`).join('\n\n')

    type PlatformResult = { platform: string; success: boolean; error?: string; url?: string }

    const publishJobs = item.platforms.map((platform): Promise<PlatformResult> => {
      switch (platform) {
        case 'instagram':
          return fetch(`${baseUrl}/api/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: caption,
              mediaUrl: item.videoBase64,
              platforms: ['instagram'],
              firstSlideHeadline: item.headline,
              channel: item.channel,
              slides: item.slides,
            }),
          })
            .then(async r => {
              const d = await r.json()
              const inner = (d.results as PlatformResult[] | undefined)?.find(x => x.platform === 'instagram')
              if (inner) return inner
              return { platform: 'instagram', success: r.ok, error: d.error }
            })
            .catch(e => ({ platform: 'instagram', success: false, error: e instanceof Error ? e.message : String(e) }))

        case 'facebook':
          return fetch(`${baseUrl}/api/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: caption,
              mediaUrl: item.videoBase64,
              platforms: ['facebook'],
              firstSlideHeadline: item.headline,
              channel: item.channel,
            }),
          })
            .then(async r => {
              const d = await r.json()
              const inner = (d.results as PlatformResult[] | undefined)?.find(x => x.platform === 'facebook')
              if (inner) return inner
              return { platform: 'facebook', success: r.ok, error: d.error }
            })
            .catch(e => ({ platform: 'facebook', success: false, error: e instanceof Error ? e.message : String(e) }))

        case 'tiktok':
          return fetch(`${baseUrl}/api/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: caption,
              mediaUrl: item.videoBase64,
              platforms: ['tiktok'],
              firstSlideHeadline: item.headline,
              channel: item.channel,
            }),
          })
            .then(async r => {
              const d = await r.json()
              const inner = (d.results as PlatformResult[] | undefined)?.find(x => x.platform === 'tiktok')
              if (inner) return inner
              return { platform: 'tiktok', success: r.ok, error: d.error }
            })
            .catch(e => ({ platform: 'tiktok', success: false, error: e instanceof Error ? e.message : String(e) }))

        case 'youtube':
          // YouTube publishing temporarily disabled — channel routing fix in progress.
          // Re-enable once each Brand Account channel has been reconnected individually
          // via /api/auth/youtube?channel=<name> with its own OAuth token.
          return Promise.resolve({
            platform: 'youtube',
            success: false,
            skipped: true,
            reason: 'YouTube publishing temporarily disabled — channel routing fix in progress',
          })

        default:
          return Promise.resolve({ platform, success: false, error: `No publish handler for platform: ${platform}` })
      }
    })

    const settled = await Promise.allSettled(publishJobs)
    const results: PlatformResult[] = settled.map((s, i) =>
      s.status === 'fulfilled'
        ? s.value
        : { platform: item.platforms[i], success: false, error: s.reason instanceof Error ? s.reason.message : String(s.reason) }
    )

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

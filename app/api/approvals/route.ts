import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { trackHashtags } from '@/lib/hashtags'
import type { ContentType } from '@/lib/content-mix'

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
  cta?: string
  includeCta?: boolean
  hashtags?: string[]
  contentType?: ContentType
  pollQuestion?: string
  pollOptions?: string[]
  createdAt: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedAt?: string
}

async function loadApprovals(): Promise<ApprovalItem[]> {
  try {
    if (!existsSync(APPROVALS_PATH)) return []
    const raw = await readFile(APPROVALS_PATH, 'utf-8')
    const fileSizeMB = Buffer.byteLength(raw, 'utf-8') / (1024 * 1024)
    if (fileSizeMB > 50) {
      console.warn(`[approvals] WARNING: approvals.json is ${fileSizeMB.toFixed(1)}MB — binary payloads may not be getting stripped on status transitions`)
    }
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
    const { channel, headline, topic, slides, videoBase64, platforms, ytTitle, ytDescription, ytTags, cta, hashtags, contentType, pollQuestion, pollOptions } = await req.json()

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
      cta: cta || undefined,
      hashtags: Array.isArray(hashtags) ? hashtags : undefined,
      contentType: contentType || 'news',
      pollQuestion: pollQuestion || undefined,
      pollOptions: Array.isArray(pollOptions) ? pollOptions : undefined,
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
    const { id, videoBase64, slides, headline, topic, ytTitle, ytDescription, ytTags, cta, includeCta, hashtags, musicEnabled, contentType, pollQuestion, pollOptions } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const items = await loadApprovals()
    const item = items.find(i => i.id === id)
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    // videoBase64: null means explicit clear (toggling music requires re-generation)
    if (videoBase64 === null) item.videoBase64 = undefined
    else if (videoBase64) item.videoBase64 = videoBase64
    if (slides && Array.isArray(slides)) item.slides = slides
    if (headline) item.headline = headline
    if (topic !== undefined) item.topic = topic
    if (ytTitle) item.ytTitle = ytTitle
    if (ytDescription) item.ytDescription = ytDescription
    if (ytTags && Array.isArray(ytTags)) item.ytTags = ytTags
    if (cta !== undefined) item.cta = cta
    if (includeCta !== undefined) item.includeCta = includeCta
    if (hashtags !== undefined) item.hashtags = Array.isArray(hashtags) ? hashtags : item.hashtags
    if (musicEnabled !== undefined) (item as Record<string, unknown>).musicEnabled = musicEnabled
    if (contentType) item.contentType = contentType as ContentType
    if (pollQuestion !== undefined) item.pollQuestion = pollQuestion || undefined
    if (pollOptions !== undefined) item.pollOptions = Array.isArray(pollOptions) ? pollOptions : undefined
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

    item.status = action === 'approve' ? 'approved' : 'rejected'
    item.reviewedAt = new Date().toISOString()

    if (action === 'reject') {
      // Strip binary payload immediately — rejected items never need media again
      item.videoBase64 = undefined
      item.slides = item.slides.map(({ image: _img, imageOptions: _opts, ...rest }) => rest as typeof item.slides[0])
      await saveApprovals(items)
      return NextResponse.json({ id: item.id, status: 'rejected' })
    }

    await saveApprovals(items)

    // Approved — publish to Instagram and Facebook only
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'
    const rawCaption = item.slides.map(s => `${s.headline} — ${s.body}`).join('\n\n')
    // Keep body short enough to leave room for CTA (~150 chars) + hashtags (~400 chars)
    const truncated = rawCaption.length > 1500 ? rawCaption.slice(0, 1497) + '...' : rawCaption
    let caption = truncated
    if (item.includeCta !== false && item.cta) caption = `${caption}\n\n${item.cta}`
    if (item.hashtags && item.hashtags.length > 0) caption = `${caption}\n\n${item.hashtags.join(' ')}`

    type PlatformResult = { platform: string; success: boolean; error?: string; url?: string }

    // Publish to instagram and facebook; YouTube enabled for Gentlemen of Fuel only
    const activePlatforms = item.platforms.filter(p =>
      p === 'instagram' || p === 'facebook' ||
      (p === 'youtube' && item.channel === 'Gentlemen of Fuel')
    )

    const publishJobs = activePlatforms.map((platform): Promise<PlatformResult> => {
      switch (platform) {
        case 'instagram':
          return fetch(`${baseUrl}/api/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: caption,
              // Do NOT send videoBase64 here — it's 5-10MB and unused by the carousel path.
              // The carousel publisher uses slide.image fields directly.
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
              platforms: ['facebook'],
              firstSlideHeadline: item.headline,
              channel: item.channel,
              slides: item.slides,
              videoBase64: item.videoBase64,
            }),
          })
            .then(async r => {
              const d = await r.json()
              const inner = (d.results as PlatformResult[] | undefined)?.find(x => x.platform === 'facebook')
              if (inner) return inner
              return { platform: 'facebook', success: r.ok, error: d.error }
            })
            .catch(e => ({ platform: 'facebook', success: false, error: e instanceof Error ? e.message : String(e) }))

        case 'youtube':
          return fetch(`${baseUrl}/api/publish/youtube`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoBase64: item.videoBase64,
              title: item.ytTitle || item.headline,
              description: item.ytDescription || caption,
              tags: item.ytTags || [],
              channelName: item.channel,
            }),
          })
            .then(async r => {
              const d = await r.json()
              if (r.ok) return { platform: 'youtube', success: true, url: d.url }
              return { platform: 'youtube', success: false, error: d.error }
            })
            .catch(e => ({ platform: 'youtube', success: false, error: e instanceof Error ? e.message : String(e) }))

        default:
          return Promise.resolve({ platform, success: false, error: `No publish handler for platform: ${platform}` })
      }
    })

    const settled = await Promise.allSettled(publishJobs)
    const results: PlatformResult[] = settled.map((s, i) =>
      s.status === 'fulfilled'
        ? s.value
        : { platform: activePlatforms[i], success: false, error: s.reason instanceof Error ? s.reason.message : String(s.reason) }
    )

    const failures = results.filter(r => !r.success)

    // Track hashtags for rotation — fire-and-forget
    if (item.hashtags && item.hashtags.length > 0) {
      trackHashtags(item.channel, item.hashtags).catch(e =>
        console.warn('[approvals] trackHashtags failed:', e instanceof Error ? e.message : e)
      )
    }

    // Strip binary payload now that publishing is done — keeps approvals.json lean
    item.videoBase64 = undefined
    item.slides = item.slides.map(({ image: _img, imageOptions: _opts, ...rest }) => rest as typeof item.slides[0])
    await saveApprovals(items)

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

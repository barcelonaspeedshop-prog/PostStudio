import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, rename } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { extractYouTubeId } from '@/lib/youtube-url'

export const dynamic = 'force-dynamic'

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const PUBLISHED_DIR = path.join(DATA_DIR, 'published')

const VALID_CHANNELS = new Set(['food', 'f1', 'football', 'fuel'])
const COVER_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'])

function isCoverImageUsable(url: string | undefined | null): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    const r2Public = process.env.R2_PUBLIC_URL?.replace(/\/$/, '')
    if (r2Public && url.startsWith(r2Public)) return true
    const ext = parsed.pathname.split('.').pop()?.toLowerCase() ?? ''
    return COVER_EXTENSIONS.has(ext)
  } catch {
    return false
  }
}

async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tmp = `${filePath}.tmp-${crypto.randomUUID()}`
  await writeFile(tmp, content)
  await rename(tmp, filePath)
}

// GET — return current media fields for an article
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')
    const channel = searchParams.get('channel')

    if (!slug || !channel) {
      return NextResponse.json({ error: 'slug and channel are required' }, { status: 400 })
    }
    if (!VALID_CHANNELS.has(channel)) {
      return NextResponse.json({ error: `Invalid channel: ${channel}` }, { status: 400 })
    }

    const articlePath = path.join(PUBLISHED_DIR, channel, `${slug}.json`)
    if (!existsSync(articlePath)) {
      return NextResponse.json({ error: `Article not found: ${channel}/${slug}` }, { status: 404 })
    }

    const article = JSON.parse(await readFile(articlePath, 'utf-8'))
    return NextResponse.json({
      coverImage: article.coverImage ?? null,
      ytVideoId: article.ytVideoId ?? null,
      title: article.title,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST — update cover image and/or YouTube video ID
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { articleSlug, channel, coverImage, youtubeUrl } = body as {
      articleSlug?: string
      channel?: string
      coverImage?: string | null
      youtubeUrl?: string | null
    }

    if (!articleSlug || !channel) {
      return NextResponse.json({ error: 'articleSlug and channel are required' }, { status: 400 })
    }
    if (!VALID_CHANNELS.has(channel)) {
      return NextResponse.json({ error: `Invalid channel: ${channel}` }, { status: 400 })
    }

    // Validate cover image if being set (null = explicit clear, which is allowed)
    if (coverImage !== undefined && coverImage !== null) {
      if (!isCoverImageUsable(coverImage)) {
        return NextResponse.json(
          { error: 'Cover image must be a direct image URL (.jpg, .png, .webp, etc.) or an R2 CDN URL' },
          { status: 400 }
        )
      }
    }

    // Extract YouTube video ID if URL provided
    let ytVideoId: string | null | undefined
    if (youtubeUrl !== undefined) {
      if (!youtubeUrl) {
        ytVideoId = null
      } else {
        ytVideoId = extractYouTubeId(youtubeUrl)
        if (!ytVideoId) {
          return NextResponse.json(
            { error: 'Could not extract a YouTube video ID from that URL' },
            { status: 400 }
          )
        }
      }
    }

    const articlePath = path.join(PUBLISHED_DIR, channel, `${articleSlug}.json`)
    if (!existsSync(articlePath)) {
      return NextResponse.json({ error: `Article not found: ${channel}/${articleSlug}` }, { status: 404 })
    }

    const article = JSON.parse(await readFile(articlePath, 'utf-8'))
    const updated: Record<string, string | null> = {}

    if (coverImage !== undefined) {
      article.coverImage = coverImage
      updated.coverImage = coverImage
    }
    if (ytVideoId !== undefined) {
      article.ytVideoId = ytVideoId
      updated.ytVideoId = ytVideoId
    }

    // Write article JSON atomically
    await atomicWrite(articlePath, JSON.stringify(article, null, 2))
    console.log(`[update-media] ${channel}/${articleSlug}:`, updated)

    // Sync index.json — update coverImage only (ytVideoId is not in the index)
    if (coverImage !== undefined) {
      const indexPath = path.join(PUBLISHED_DIR, 'index.json')
      if (existsSync(indexPath)) {
        try {
          const index = JSON.parse(await readFile(indexPath, 'utf-8'))
          const entry = index.find((e: { slug: string; id: string }) =>
            e.slug === articleSlug || e.id === article.id
          )
          if (entry) {
            entry.coverImage = coverImage
            await atomicWrite(indexPath, JSON.stringify(index, null, 2))
            console.log(`[update-media] index.json synced for ${articleSlug}`)
          }
        } catch (e) {
          console.warn('[update-media] index.json sync failed:', e instanceof Error ? e.message : e)
        }
      }
    }

    return NextResponse.json({ success: true, updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[update-media] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

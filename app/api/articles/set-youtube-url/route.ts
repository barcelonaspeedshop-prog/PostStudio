import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { extractYouTubeId } from '@/lib/youtube-url'

export const dynamic = 'force-dynamic'

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const PUBLISHED_DIR = path.join(DATA_DIR, 'published')
const VALID_CHANNELS = ['fuel', 'f1', 'football', 'food']

export async function POST(req: NextRequest) {
  try {
    const { articleSlug, channel, youtubeUrl } = await req.json() as {
      articleSlug: string
      channel: string
      youtubeUrl: string
    }

    if (!articleSlug || !channel || !youtubeUrl) {
      return NextResponse.json(
        { error: 'articleSlug, channel, and youtubeUrl are required' },
        { status: 400 }
      )
    }

    if (!VALID_CHANNELS.includes(channel)) {
      return NextResponse.json({ error: `Invalid channel: ${channel}` }, { status: 400 })
    }

    const ytVideoId = extractYouTubeId(youtubeUrl)
    if (!ytVideoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL — could not extract video ID' },
        { status: 400 }
      )
    }

    const filePath = path.join(PUBLISHED_DIR, channel, `${articleSlug}.json`)
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    const article = JSON.parse(await readFile(filePath, 'utf-8'))
    article.ytVideoId = ytVideoId
    await writeFile(filePath, JSON.stringify(article, null, 2))

    console.log(`[set-youtube-url] ${channel}/${articleSlug} → ${ytVideoId}`)
    return NextResponse.json({ success: true, ytVideoId })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[set-youtube-url] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

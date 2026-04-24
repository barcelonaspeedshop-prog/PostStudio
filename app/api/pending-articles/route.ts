import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, unlink, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const PUBLISHED_DIR = path.join(DATA_DIR, 'published')
const INDEX_PATH = path.join(PUBLISHED_DIR, 'index.json')
const PREVIEW_BASE = 'https://premirafirst.com'
const CHANNEL_SLUGS = ['fuel', 'f1', 'football', 'food']

type StoredArticle = {
  id: string
  channel: string
  slug: string
  title: string
  excerpt: string
  body: string
  publishedAt: string
  coverImage: string | null
  goLiveAt?: string
  status?: string
}

export async function GET() {
  const previewToken = process.env.PREVIEW_TOKEN ?? ''
  const now = new Date()
  const pending: (StoredArticle & { previewUrl: string })[] = []

  for (const ch of CHANNEL_SLUGS) {
    const chDir = path.join(PUBLISHED_DIR, ch)
    if (!existsSync(chDir)) continue
    const files = await readdir(chDir)
    for (const f of files) {
      if (!f.endsWith('.json')) continue
      try {
        const raw = await readFile(path.join(chDir, f), 'utf-8')
        const article = JSON.parse(raw) as StoredArticle
        if (article.goLiveAt && new Date(article.goLiveAt) > now) {
          pending.push({
            ...article,
            previewUrl: `${PREVIEW_BASE}/preview/${ch}/${article.slug}?token=${previewToken}`,
          })
        }
      } catch { /* skip unreadable files */ }
    }
  }

  pending.sort((a, b) => new Date(a.goLiveAt!).getTime() - new Date(b.goLiveAt!).getTime())
  return NextResponse.json(pending)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const channel = searchParams.get('channel')
  const slug = searchParams.get('slug')

  if (!channel || !slug || !CHANNEL_SLUGS.includes(channel)) {
    return NextResponse.json({ error: 'channel and slug required' }, { status: 400 })
  }

  const filePath = path.join(PUBLISHED_DIR, channel, `${slug}.json`)
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'article not found' }, { status: 404 })
  }

  const raw = await readFile(filePath, 'utf-8')
  const article = JSON.parse(raw) as StoredArticle
  if (!article.goLiveAt || new Date(article.goLiveAt) <= new Date()) {
    return NextResponse.json({ error: 'article is already live — cannot kill' }, { status: 409 })
  }

  await unlink(filePath)

  try {
    if (existsSync(INDEX_PATH)) {
      const index = JSON.parse(await readFile(INDEX_PATH, 'utf-8')) as { channel: string; slug: string }[]
      const filtered = index.filter(a => !(a.channel === channel && a.slug === slug))
      await writeFile(INDEX_PATH, JSON.stringify(filtered, null, 2))
    }
  } catch (e) {
    console.warn('[pending-articles] index.json update failed:', e instanceof Error ? e.message : e)
  }

  return NextResponse.json({ success: true })
}

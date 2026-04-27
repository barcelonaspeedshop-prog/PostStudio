import { writeFile, readFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { extractYouTubeId } from './youtube-url'

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const PUBLISHED_DIR = path.join(DATA_DIR, 'published')
const INDEX_PATH = path.join(PUBLISHED_DIR, 'index.json')

const CHANNEL_MAP: Record<string, string> = {
  'Gentlemen of Fuel': 'fuel',
  'Omnira F1': 'f1',
  'Omnira Football': 'football',
  'Omnira Food': 'food',
}

const BLOCKED_DOMAINS = [
  'instagram.com', 'lookaside.fbsbx.com', 'lookaside.facebook.com', 'fbcdn.net', 'facebook.com',
  'twitter.com', 'twimg.com', 'pbs.twimg.com', 'tiktok.com', 'tiktokcdn.com',
  'pinterest.com', 'pinimg.com', 'reddit.com', 'redd.it', 'whatsapp.com',
]

function usableImageUrl(url: string | undefined | null): string | null {
  if (!url) return null
  if (url.startsWith('data:') || (url.length > 500 && !url.startsWith('http'))) return null
  try {
    const h = new URL(url).hostname.toLowerCase()
    if (BLOCKED_DOMAINS.some(d => h === d || h.endsWith('.' + d))) return null
    if (h.startsWith('scontent.') || h.startsWith('scontent-')) return null
    return url
  } catch {
    return null
  }
}

export type FurtherReadingItem = { title: string; url: string; source?: string }

export type ArticleMeta = {
  id: string
  channel: string
  slug: string
  title: string
  excerpt: string
  publishedAt: string
  coverImage: string | null
  series?: string
  goLiveAt?: string
}

export type Article = ArticleMeta & {
  body: string
  carouselImages: string[]
  ytVideoId: string | null
  hashtags: string[]
  status?: 'pending' | 'live'
  youtubeId?: string
  youtubeCredit?: string
  furtherReading?: FurtherReadingItem[]
}

type PublishableItem = {
  id: string
  channel: string
  headline: string
  ytTitle?: string
  articleBody?: string
  articleExcerpt?: string
  articleSlug?: string
  slides?: Array<{ imageOptions?: string[] }>
  coverImageDirect?: string
  youtubeUrl?: string
  hashtags?: string[]
  goLiveAt?: string
  series?: string
  youtubeId?: string
  youtubeCredit?: string
  furtherReading?: FurtherReadingItem[]
}

async function loadIndex(): Promise<ArticleMeta[]> {
  try {
    if (!existsSync(INDEX_PATH)) return []
    return JSON.parse(await readFile(INDEX_PATH, 'utf-8'))
  } catch {
    return []
  }
}

export async function publishToWebsite(item: PublishableItem): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    if (!item.articleBody || !item.articleExcerpt || !item.articleSlug || !item.channel) {
      return { success: false, error: 'missing article fields' }
    }

    const channelSlug = CHANNEL_MAP[item.channel]
    if (!channelSlug) {
      return { success: false, error: `unknown channel: ${item.channel}` }
    }

    const coverImage = usableImageUrl(item.coverImageDirect ?? item.slides?.[0]?.imageOptions?.[0])
    const carouselImages = (item.slides || [])
      .map(s => usableImageUrl(s.imageOptions?.[0]))
      .filter((u): u is string => u !== null)

    const ytVideoId = extractYouTubeId(item.youtubeUrl ?? '')

    const goLiveAt = item.goLiveAt
    const now = new Date().toISOString()

    const article: Article = {
      id: item.id,
      channel: channelSlug,
      slug: item.articleSlug,
      title: item.ytTitle || item.headline,
      excerpt: item.articleExcerpt,
      body: item.articleBody,
      publishedAt: now,
      coverImage,
      carouselImages,
      ytVideoId,
      hashtags: item.hashtags || [],
      series: item.series || 'news',
      ...(item.youtubeId ? { youtubeId: item.youtubeId } : {}),
      ...(item.youtubeCredit ? { youtubeCredit: item.youtubeCredit } : {}),
      ...(item.furtherReading?.length ? { furtherReading: item.furtherReading } : {}),
      ...(goLiveAt ? { goLiveAt, status: 'pending' as const } : {}),
    }

    const channelDir = path.join(PUBLISHED_DIR, channelSlug)
    if (!existsSync(channelDir)) await mkdir(channelDir, { recursive: true })

    const filePath = path.join(channelDir, `${item.articleSlug}.json`)
    await writeFile(filePath, JSON.stringify(article, null, 2))

    const meta: ArticleMeta = {
      id: item.id,
      channel: channelSlug,
      slug: item.articleSlug,
      title: article.title,
      excerpt: article.excerpt,
      publishedAt: article.publishedAt,
      coverImage,
      series: article.series,
      ...(goLiveAt ? { goLiveAt } : {}),
    }

    const index = await loadIndex()
    const filtered = index.filter(a => !(a.channel === channelSlug && a.slug === item.articleSlug))
    filtered.unshift(meta)
    if (!existsSync(PUBLISHED_DIR)) await mkdir(PUBLISHED_DIR, { recursive: true })
    await writeFile(INDEX_PATH, JSON.stringify(filtered, null, 2))

    return { success: true, path: filePath }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

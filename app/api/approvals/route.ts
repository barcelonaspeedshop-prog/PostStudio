import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, rename, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { trackHashtags } from '@/lib/hashtags'
import { publishToWebsite } from '@/lib/website-publisher'
import type { RestaurantMeta } from '@/app/api/food-carousel-generate/route'
import { restaurants as staticRestaurants } from '@/lib/restaurants'
import type { Restaurant } from '@/lib/restaurants'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const APPROVALS_PATH = path.join(DATA_DIR, 'approvals.json')

export type FurtherReadingItem = { title: string; url: string; source?: string }

export type ApprovalItem = {
  id: string
  channel: string
  headline: string
  topic: string
  slides: Array<{ num: string; tag: string; headline: string; body: string; badge: string; accent: string; image?: string; imageOptions?: string[]; tileType?: string; foodDishes?: Array<{ name: string; description: string; price?: string }>; foodMustOrder?: { name: string; description: string; priceRange?: string }; foodInfoItems?: Array<{ icon: string; label: string; value: string }>; foodRestaurantName?: string; foodProTips?: string[] }>
  videoBase64?: string
  platforms: string[]
  ytTitle?: string
  ytDescription?: string
  ytTags?: string[]
  tiktokCaption?: string
  xCaption?: string
  manualUploaded?: { youtube?: string; tiktok?: string; x?: string }
  articleBody?: string
  articleExcerpt?: string
  articleSlug?: string
  websitePublished?: boolean
  cta?: string
  includeCta?: boolean
  hashtags?: string[]
  restaurantMeta?: RestaurantMeta
  restaurantMetas?: RestaurantMeta[]
  format?: 'reel' | 'carousel'
  createdAt: string
  status: 'pending' | 'approved' | 'rejected' | 'published'
  reviewedAt?: string
  series?: string
  coverImageDirect?: string
  youtubeId?: string
  youtubeCredit?: string
  furtherReading?: FurtherReadingItem[]
  publishToWebsite?: boolean
}

const AI_RESTAURANTS_FILE = path.join(DATA_DIR, 'restaurants-ai.json')

async function loadAiRestaurants(): Promise<Restaurant[]> {
  try {
    if (!existsSync(AI_RESTAURANTS_FILE)) return []
    const raw = await readFile(AI_RESTAURANTS_FILE, 'utf-8')
    return JSON.parse(raw) as Restaurant[]
  } catch {
    return []
  }
}

async function saveAiRestaurants(data: Restaurant[]): Promise<void> {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(AI_RESTAURANTS_FILE, JSON.stringify(data, null, 2))
}

function metaToRestaurant(meta: RestaurantMeta): Restaurant {
  const base = `https%3A%2F%2Fpremirafirst.com%2Ffood%2Frestaurant%2F${meta.slug}`
  return {
    slug: meta.slug,
    name: meta.name,
    series: meta.series === 'top5' ? 'featured' : 'no-frills',
    badge: meta.series === 'top5' ? 'Featured' : '★ No Frills But Kills',
    badgeClass: meta.series === 'top5' ? 'badge--featured' : 'badge--kills',
    country: meta.country,
    city: meta.city,
    location: meta.address ? `${meta.address}, ${meta.city}` : meta.city,
    cuisine: meta.cuisine,
    priceRange: meta.priceRange,
    gradClass: 'grad-tokyo',
    metaDescription: `${meta.name}, ${meta.city}. ${meta.story.slice(0, 120)}`,
    ogDescription: meta.story.slice(0, 160),
    excerpt: meta.story,
    story: [meta.story],
    mustOrder: meta.mustOrder.length ? meta.mustOrder.map(({ name, description }) => ({ name, description })) : [{ name: 'Ask the staff', description: 'The daily special is always worth ordering.' }],
    hours: meta.hoursNote ? [{ label: 'Hours', value: meta.hoursNote }] : [],
    hoursNote: undefined,
    bookingNote: meta.bookingNote || 'Walk-ins welcome.',
    bookingUrl: undefined,
    directionsQuery: `${meta.name.replace(/\s+/g, '+')}+${meta.city.replace(/\s+/g, '+')}`,
    mapsEmbed: `${meta.name.replace(/\s+/g, '+')}+${meta.city.replace(/\s+/g, '+')}`,
    mapsLabel: `◉ ${meta.city}`,
    shareUrlEncoded: base,
    related: [],
  }
}

async function upsertRestaurantsToWebsite(metas: RestaurantMeta[]): Promise<void> {
  const existing = await loadAiRestaurants()
  const staticSlugs = new Set(staticRestaurants.map(r => r.slug))

  for (const meta of metas) {
    if (!meta.slug || !meta.name) continue
    const restaurant = metaToRestaurant(meta)

    // If it exists in the static file, the server will override with the AI entry via restaurants-server.ts
    // Just note it in the log
    if (staticSlugs.has(meta.slug)) {
      console.log(`[approvals] Restaurant "${meta.name}" (${meta.slug}) exists in static data — storing AI version as override`)
    }

    const idx = existing.findIndex(r => r.slug === meta.slug)
    if (idx >= 0) {
      existing[idx] = restaurant
      console.log(`[approvals] Updated restaurant "${meta.name}" in restaurants-ai.json`)
    } else {
      existing.push(restaurant)
      console.log(`[approvals] Added new restaurant "${meta.name}" to restaurants-ai.json`)
    }
  }

  await saveAiRestaurants(existing)
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
  // Strip binary payloads from every item before writing — defense-in-depth so
  // approvals.json never grows large regardless of which code path saved the item.
  const stripped = items.map(item => {
    const { videoBase64: _v, ...rest } = item
    return {
      ...rest,
      slides: rest.slides.map(({ image: _img, imageOptions: _opts, ...slide }) => slide),
    }
  })
  const tmp = `${APPROVALS_PATH}.tmp-${crypto.randomUUID()}`
  await writeFile(tmp, JSON.stringify(stripped, null, 2))
  await rename(tmp, APPROVALS_PATH)
}

// GET — return all approval items
export async function GET() {
  const items = await loadApprovals()
  return NextResponse.json(items)
}

// POST — add new item to queue
export async function POST(req: NextRequest) {
  try {
    const { channel, headline, topic, slides, videoBase64, platforms, ytTitle, ytDescription, ytTags, tiktokCaption, xCaption, articleBody, articleExcerpt, articleSlug, cta, hashtags, restaurantMeta, restaurantMetas, format, series, coverImageDirect, youtubeId, youtubeCredit, furtherReading } = await req.json()

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
      tiktokCaption: tiktokCaption || undefined,
      xCaption: xCaption || undefined,
      articleBody: articleBody || undefined,
      articleExcerpt: articleExcerpt || undefined,
      articleSlug: articleSlug || undefined,
      cta: cta || undefined,
      hashtags: Array.isArray(hashtags) ? hashtags : undefined,
      restaurantMeta: restaurantMeta || undefined,
      restaurantMetas: Array.isArray(restaurantMetas) ? restaurantMetas : undefined,
      format: format === 'reel' || format === 'carousel' ? format : undefined,
      createdAt: new Date().toISOString(),
      status: 'pending',
      series: series || undefined,
      coverImageDirect: coverImageDirect || undefined,
      youtubeId: youtubeId || undefined,
      youtubeCredit: youtubeCredit || undefined,
      furtherReading: Array.isArray(furtherReading) && furtherReading.length ? furtherReading : undefined,
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
    const { id, videoBase64, slides, headline, topic, ytTitle, ytDescription, ytTags, tiktokCaption, xCaption, articleBody, articleExcerpt, articleSlug, manualUploaded, cta, includeCta, hashtags, musicEnabled, series, coverImageDirect, youtubeId, youtubeCredit, furtherReading, publishToWebsite } = await req.json()
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
    if (tiktokCaption !== undefined) item.tiktokCaption = tiktokCaption || undefined
    if (xCaption !== undefined) item.xCaption = xCaption || undefined
    if (articleBody !== undefined) item.articleBody = articleBody || undefined
    if (articleExcerpt !== undefined) item.articleExcerpt = articleExcerpt || undefined
    if (articleSlug !== undefined) item.articleSlug = articleSlug || undefined
    if (manualUploaded !== undefined) {
      item.manualUploaded = manualUploaded
      const { youtube, tiktok, x } = item.manualUploaded || {}
      if (youtube && tiktok && x) {
        item.status = 'published'
        if (!item.reviewedAt) item.reviewedAt = new Date().toISOString()
      }
    }
    if (cta !== undefined) item.cta = cta
    if (includeCta !== undefined) item.includeCta = includeCta
    if (hashtags !== undefined) item.hashtags = Array.isArray(hashtags) ? hashtags : item.hashtags
    if (musicEnabled !== undefined) (item as Record<string, unknown>).musicEnabled = musicEnabled
    if (series !== undefined) item.series = series || undefined
    if (coverImageDirect !== undefined) item.coverImageDirect = coverImageDirect || undefined
    if (youtubeId !== undefined) item.youtubeId = youtubeId || undefined
    if (youtubeCredit !== undefined) item.youtubeCredit = youtubeCredit || undefined
    if (furtherReading !== undefined) item.furtherReading = Array.isArray(furtherReading) && furtherReading.length ? furtherReading : undefined
    if (publishToWebsite !== undefined) item.publishToWebsite = typeof publishToWebsite === 'boolean' ? publishToWebsite : undefined
    await saveApprovals(items)

    return NextResponse.json({ id: item.id, hasVideo: !!item.videoBase64, status: item.status })
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

    // Server-side validation for article publishing (skipped if publishToWebsite === false)
    // series is intentionally not required here — publisher falls back to 'news'
    if (item.articleBody && item.publishToWebsite !== false) {
      if (!item.coverImageDirect) {
        return NextResponse.json({ error: 'Cover image is required to publish an article' }, { status: 400 })
      }
    }

    await saveApprovals(items)

    // ── Auto-publish restaurant(s) to food website ──
    if (item.channel === 'Omnira Food') {
      const metas = item.restaurantMetas || (item.restaurantMeta ? [item.restaurantMeta] : [])
      if (metas.length > 0) {
        try {
          await upsertRestaurantsToWebsite(metas)
        } catch (e) {
          console.warn('[approvals] upsertRestaurantsToWebsite failed:', e instanceof Error ? e.message : e)
        }
      }
    }

    // Approved — publish to Instagram and Facebook only
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'
    const rawCaption = item.slides.map(s => `${s.headline} — ${s.body}`).join('\n\n')
    // Keep body short enough to leave room for CTA (~150 chars) + hashtags (~400 chars)
    const truncated = rawCaption.length > 1500 ? rawCaption.slice(0, 1497) + '...' : rawCaption
    let caption = truncated
    if (item.includeCta !== false && item.cta) caption = `${caption}\n\n${item.cta}`
    if (item.hashtags && item.hashtags.length > 0) caption = `${caption}\n\n${item.hashtags.join(' ')}`

    type PlatformResult = { platform: string; success: boolean; error?: string; url?: string }

    // Composite slides into branded frames before publishing — ensures Instagram/Facebook
    // receive the rendered tile designs (overlays, text, solid bg tiles) not raw Serper images.
    try {
      const compositeRes = await fetch(`${baseUrl}/api/composite-slides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: item.slides, channel: item.channel }),
      })
      if (compositeRes.ok) {
        const compositeData = await compositeRes.json() as { frames?: string[] }
        if (Array.isArray(compositeData.frames)) {
          item.slides = item.slides.map((s, i) => ({
            ...s,
            image: compositeData.frames![i] || s.image,
          }))
        }
      } else {
        console.warn(`[approvals] composite-slides failed (${compositeRes.status}) — publishing with raw images`)
      }
    } catch (e) {
      console.warn('[approvals] composite-slides error:', e instanceof Error ? e.message : e)
    }

    // Ensure food carousels always include facebook in active platforms
    if (item.channel === 'Omnira Food' && !item.platforms.includes('facebook')) {
      item.platforms = [...item.platforms, 'facebook']
    }
    if (item.channel === 'Omnira Food' && !item.platforms.includes('instagram')) {
      item.platforms = [...item.platforms, 'instagram']
    }

    // Publish to instagram and facebook only — YouTube is manual-only via the Publish Panel
    const activePlatforms = item.platforms.filter(p =>
      p === 'instagram' || p === 'facebook'
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
              // videoBase64 intentionally omitted — Facebook carousel uses slide images via publishAlbumToFacebook
            }),
          })
            .then(async r => {
              const d = await r.json()
              const inner = (d.results as PlatformResult[] | undefined)?.find(x => x.platform === 'facebook')
              if (inner) return inner
              return { platform: 'facebook', success: r.ok, error: d.error }
            })
            .catch(e => ({ platform: 'facebook', success: false, error: e instanceof Error ? e.message : String(e) }))

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

    // Publish article to website (skipped if publishToWebsite === false)
    if (item.publishToWebsite !== false) {
      const websiteResult = await publishToWebsite(item)
      if (websiteResult.success) {
        item.websitePublished = true
        console.log(`[approvals] Website published "${item.headline}" → ${websiteResult.path}`)
      } else {
        item.websitePublished = false
        console.warn(`[approvals] Website publish failed for "${item.headline}": ${websiteResult.error}`)
      }
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

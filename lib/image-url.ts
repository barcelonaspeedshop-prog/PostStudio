/**
 * Shared image URL validator used by website-publisher, approvals API, and update-media API.
 *
 * Layered logic:
 *  1. Hard rejects — social domains, data: URIs, non-HTTP schemes
 *  2. Hard accepts — R2 CDN, recognised image file extension
 *  3. CDN path patterns — wp-content/uploads, Cloudflare, Cloudinary (no extension needed)
 *  4. Article-page path patterns — reject URLs that are clearly HTML pages
 *  5. HEAD fallback (async only) — fetch Content-Type, cache 24 h
 */

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg', 'bmp', 'tiff', 'ico'])

const BLOCKED_DOMAINS = [
  'instagram.com', 'lookaside.fbsbx.com', 'lookaside.facebook.com', 'fbcdn.net', 'facebook.com',
  'twitter.com', 'twimg.com', 'pbs.twimg.com', 'tiktok.com', 'tiktokcdn.com',
  'pinterest.com', 'pinimg.com', 'reddit.com', 'redd.it', 'whatsapp.com',
]

// Reliable signals that a path points to an image asset, not an article page
const IMAGE_CDN_PATTERNS = [
  '/wp-content/uploads/',   // WordPress (universal CMS pattern)
  '/cdn-cgi/image/',        // Cloudflare Image Resizing
  '/image/upload/',         // Cloudinary
  '/images/upload/',        // Cloudinary variant
]

// Strong signals that a URL is an article page, not an image
const ARTICLE_PAGE_PATTERNS = [
  '/en/latest/article/',
  '/en/news/',
  '/article/',
  '/articles/',
  '/story/',
  '/stories/',
  '/news/',
  '/post/',
  '/posts/',
  '/blog/',
]

const ARTICLE_PAGE_EXTENSIONS = new Set(['html', 'htm', 'php', 'asp', 'aspx'])

// HEAD request cache: url → { ok, expiresAt }
const headCache = new Map<string, { ok: boolean; expiresAt: number }>()
const HEAD_CACHE_TTL_MS = 24 * 60 * 60 * 1000

function getPathExtension(pathname: string): string {
  const lastSegment = pathname.split('/').pop() ?? ''
  const dot = lastSegment.lastIndexOf('.')
  if (dot === -1) return ''
  return lastSegment.slice(dot + 1).toLowerCase()
}

function isR2Url(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase()
    if (h.startsWith('pub-') && h.endsWith('.r2.dev')) return true
  } catch { /* ignore */ }
  const r2Public = process.env.R2_PUBLIC_URL?.replace(/\/$/, '')
  return !!(r2Public && url.startsWith(r2Public))
}

function runSyncChecks(url: string): 'accept' | 'reject' | 'unknown' {
  if (!url) return 'reject'
  if (url.startsWith('data:')) return 'reject'
  if (!url.startsWith('http://') && !url.startsWith('https://')) return 'reject'
  if (url.length > 2000) return 'reject'

  let parsed: URL
  try { parsed = new URL(url) } catch { return 'reject' }

  const hostname = parsed.hostname.toLowerCase()
  const pathname = parsed.pathname.toLowerCase()

  // Hard rejects
  if (BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) {
    console.log(`[image-url] REJECT blocked domain: ${url}`)
    return 'reject'
  }
  if (hostname.startsWith('scontent.') || hostname.startsWith('scontent-')) {
    console.log(`[image-url] REJECT Facebook scontent: ${url}`)
    return 'reject'
  }

  // Hard accepts
  if (isR2Url(url)) return 'accept'
  const ext = getPathExtension(pathname)
  if (IMAGE_EXTENSIONS.has(ext)) return 'accept'

  // CDN path patterns — trusted even without extension
  if (IMAGE_CDN_PATTERNS.some(p => pathname.includes(p))) return 'accept'

  // Article-page patterns — reject before falling through to HEAD
  if (ARTICLE_PAGE_PATTERNS.some(p => pathname.includes(p))) {
    console.log(`[image-url] REJECT article-page pattern: ${url}`)
    return 'reject'
  }
  if (ARTICLE_PAGE_EXTENSIONS.has(ext)) {
    console.log(`[image-url] REJECT article-page extension .${ext}: ${url}`)
    return 'reject'
  }

  return 'unknown'
}

/**
 * Synchronous validator — no network requests.
 * Returns false for anything that needs a HEAD check (treat as unusable).
 * Use for carousel images and client-side UI hints.
 */
export function isUsableImageUrlSync(url: string | undefined | null): boolean {
  if (!url) return false
  return runSyncChecks(url) === 'accept'
}

/**
 * Async validator — sync checks first, then HEAD fallback for ambiguous URLs.
 * Results are cached in memory for 24 h.
 * Use for cover images and server-side publish gating.
 */
export async function isUsableImageUrl(url: string | undefined | null): Promise<boolean> {
  if (!url) return false

  const syncResult = runSyncChecks(url)
  if (syncResult === 'accept') return true
  if (syncResult === 'reject') return false

  // Unknown — check cache then try HEAD
  const cached = headCache.get(url)
  if (cached && cached.expiresAt > Date.now()) {
    if (!cached.ok) console.log(`[image-url] REJECT (cached HEAD miss): ${url}`)
    return cached.ok
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store',
    })
    clearTimeout(timer)
    const ct = res.headers.get('content-type') ?? ''
    const ok = ct.startsWith('image/')
    headCache.set(url, { ok, expiresAt: Date.now() + HEAD_CACHE_TTL_MS })
    if (!ok) console.log(`[image-url] REJECT HEAD content-type="${ct}": ${url}`)
    return ok
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.log(`[image-url] REJECT HEAD fetch failed (${msg}): ${url}`)
    headCache.set(url, { ok: false, expiresAt: Date.now() + HEAD_CACHE_TTL_MS })
    return false
  }
}

import { readFile, writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const META_TOKENS_PATH = path.join(DATA_DIR, 'meta-tokens.json')
const TEMP_IMAGE_DIR = path.join(DATA_DIR, 'temp-images')
const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

export type MetaChannelConfig = {
  pageAccessToken: string
  instagramAccountId: string
  facebookPageId: string
  /** 'permanent' = long-lived page token (never expires); 'short' = original token as-is */
  tokenType?: 'permanent' | 'short'
  /** The original user access token — kept for token refresh flows */
  userAccessToken?: string
  /** Unix ms timestamp when the token was last saved / refreshed */
  tokenSavedAt?: number
}

export type MetaTokenStore = Record<string, MetaChannelConfig>

// ── Token storage ────────────────────────────────────────────────────────────

export async function loadMetaTokens(): Promise<MetaTokenStore> {
  try {
    if (!existsSync(META_TOKENS_PATH)) return {}
    const raw = await readFile(META_TOKENS_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export async function saveMetaTokens(store: MetaTokenStore): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true })
  }
  await writeFile(META_TOKENS_PATH, JSON.stringify(store, null, 2))
}

export async function getChannelConfig(channelName: string): Promise<MetaChannelConfig | null> {
  const store = await loadMetaTokens()
  return store[channelName] || null
}

// ── Graph API helpers ────────────────────────────────────────────────────────

async function graphPost(
  path: string,
  params: Record<string, string>,
  token: string,
): Promise<Record<string, unknown>> {
  const url = `${GRAPH_BASE}${path}`
  const body = new URLSearchParams({ ...params, access_token: token })
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const data = await res.json() as Record<string, unknown>
  if (!res.ok || data.error) {
    const err = data.error as Record<string, unknown> | undefined
    throw new Error(
      err ? `Meta API error ${err.code}: ${err.message}` : `Meta API returned ${res.status}`
    )
  }
  return data
}

async function graphGet(
  path: string,
  params: Record<string, string>,
  token: string,
): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams({ ...params, access_token: token }).toString()
  const url = `${GRAPH_BASE}${path}?${qs}`
  const res = await fetch(url)
  const data = await res.json() as Record<string, unknown>
  if (!res.ok || data.error) {
    const err = data.error as Record<string, unknown> | undefined
    throw new Error(
      err ? `Meta API error ${err.code}: ${err.message}` : `Meta API returned ${res.status}`
    )
  }
  return data
}

// ── Poll for media readiness ─────────────────────────────────────────────────

async function waitForContainer(
  containerId: string,
  token: string,
  maxAttempts = 20,
  intervalMs = 5000,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const data = await graphGet(
      `/${containerId}`,
      { fields: 'status_code,status' },
      token,
    )
    const status = data.status_code as string
    if (status === 'FINISHED') return
    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new Error(`Media container ${containerId} failed with status: ${status}`)
    }
    await new Promise(r => setTimeout(r, intervalMs))
  }
  throw new Error(`Media container ${containerId} timed out after ${maxAttempts} attempts`)
}

// ── Temp image hosting ───────────────────────────────────────────────────────

/**
 * Write a base64 data URI (or raw base64 JPEG string) to a temp file under
 * /data/temp-images/ and return its public URL.
 * Returns null if the input is already a public HTTPS URL (no-op).
 */
async function saveBase64ToTempFile(image: string): Promise<{ publicUrl: string; filePath: string } | null> {
  // Already a public URL — nothing to do
  if (image.startsWith('http://') || image.startsWith('https://')) return null

  // Strip data URI header if present
  const b64 = image.startsWith('data:')
    ? image.replace(/^data:image\/\w+;base64,/, '')
    : image

  const buffer = Buffer.from(b64, 'base64')
  const filename = `${randomUUID()}.jpg`
  const filePath = path.join(TEMP_IMAGE_DIR, filename)

  if (!existsSync(TEMP_IMAGE_DIR)) {
    await mkdir(TEMP_IMAGE_DIR, { recursive: true })
  }
  await writeFile(filePath, buffer)

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com').replace(/\/$/, '')
  const publicUrl = `${appUrl}/api/temp-image/${filename}`

  return { publicUrl, filePath }
}

async function deleteTempFile(filePath: string): Promise<void> {
  try { await unlink(filePath) } catch { /* already gone — ignore */ }
}

// ── Instagram carousel ───────────────────────────────────────────────────────

/**
 * Publish a carousel post to Instagram.
 * Each entry in `images` may be:
 *   - A public HTTPS URL  (used as-is)
 *   - A base64 data URI   (written to a temp file and served via /api/temp-image)
 * Temp files are deleted after publishing, whether it succeeds or fails.
 */
export async function publishCarouselToInstagram(
  channelName: string,
  images: string[],
  caption: string,
): Promise<{ id: string }> {
  const cfg = await getChannelConfig(channelName)
  if (!cfg) throw new Error(`No Meta credentials configured for channel: ${channelName}`)
  if (images.length < 2) throw new Error('Instagram carousel requires at least 2 images')
  if (images.length > 10) throw new Error('Instagram carousel supports a maximum of 10 images')

  const { instagramAccountId: igId, pageAccessToken: token } = cfg
  if (!igId) throw new Error(`Instagram Account ID not configured for channel: ${channelName}`)

  // Resolve each image to a public URL, writing temp files where needed
  const tempFiles: string[] = []
  const publicUrls: string[] = []

  for (const image of images) {
    const result = await saveBase64ToTempFile(image)
    if (result) {
      tempFiles.push(result.filePath)
      publicUrls.push(result.publicUrl)
    } else {
      publicUrls.push(image) // already a public URL
    }
  }

  try {
    // Step 1: Upload each image as a carousel item container
    const childIds: string[] = []
    for (const url of publicUrls) {
      const data = await graphPost(
        `/${igId}/media`,
        { image_url: url, is_carousel_item: 'true' },
        token,
      )
      childIds.push(data.id as string)
    }

    // Step 2: Create the carousel container
    const carousel = await graphPost(
      `/${igId}/media`,
      {
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption,
      },
      token,
    )
    const carouselId = carousel.id as string

    // Step 3: Poll until ready
    await waitForContainer(carouselId, token)

    // Step 4: Publish
    const published = await graphPost(
      `/${igId}/media_publish`,
      { creation_id: carouselId },
      token,
    )

    return { id: published.id as string }
  } finally {
    // Clean up temp files regardless of success or failure
    await Promise.all(tempFiles.map(deleteTempFile))
  }
}

// ── Instagram Reel (video) ───────────────────────────────────────────────────

/**
 * Publish a Reel to Instagram.
 * videoUrl must be a publicly accessible HTTPS URL.
 */
export async function publishVideoToInstagram(
  channelName: string,
  videoUrl: string,
  caption: string,
): Promise<{ id: string }> {
  const cfg = await getChannelConfig(channelName)
  if (!cfg) throw new Error(`No Meta credentials configured for channel: ${channelName}`)

  const { instagramAccountId: igId, pageAccessToken: token } = cfg

  // Step 1: Create media container
  const container = await graphPost(
    `/${igId}/media`,
    { media_type: 'REELS', video_url: videoUrl, caption },
    token,
  )
  const containerId = container.id as string

  // Step 2: Poll until video processing is complete
  await waitForContainer(containerId, token, 30, 10000)

  // Step 3: Publish
  const published = await graphPost(
    `/${igId}/media_publish`,
    { creation_id: containerId },
    token,
  )

  return { id: published.id as string }
}

// ── Facebook page post ───────────────────────────────────────────────────────

/**
 * Publish a post to a Facebook Page.
 * If mediaUrl is provided it must be a publicly accessible HTTPS URL.
 */
export async function publishToFacebook(
  channelName: string,
  message: string,
  mediaUrl?: string,
): Promise<{ id: string }> {
  const cfg = await getChannelConfig(channelName)
  if (!cfg) throw new Error(`No Meta credentials configured for channel: ${channelName}`)

  const { facebookPageId: pageId, pageAccessToken: token } = cfg

  if (mediaUrl) {
    // Determine media type by extension / MIME hint
    const isVideo = /\.(mp4|mov|avi|webm)(\?|$)/i.test(mediaUrl)
    if (isVideo) {
      const data = await graphPost(
        `/${pageId}/videos`,
        { file_url: mediaUrl, description: message },
        token,
      )
      return { id: data.id as string }
    } else {
      const data = await graphPost(
        `/${pageId}/photos`,
        { url: mediaUrl, caption: message },
        token,
      )
      return { id: data.id as string }
    }
  }

  // Text-only post
  const data = await graphPost(
    `/${pageId}/feed`,
    { message },
    token,
  )
  return { id: data.id as string }
}

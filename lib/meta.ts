import { readFile, writeFile, unlink, mkdir, copyFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { isR2Configured, uploadToR2 } from '@/lib/r2'

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
 * Write an image to a temp file under /data/temp-images/ and return its public URL.
 * Accepts:
 *   - base64 data URI  (data:image/...;base64,...)
 *   - raw base64 JPEG string
 *   - http(s) URL — fetched and saved locally so Meta's servers can access it
 * Returns null if a URL fetch fails (caller should skip that slide).
 */
export async function saveBase64ToTempFile(image: string): Promise<{ publicUrl: string; filePath: string } | null> {
  // Resolve the raw buffer first (shared by both R2 and temp-file paths)
  let buffer: Buffer

  if (image.startsWith('http://') || image.startsWith('https://')) {
    // Fetch the remote image — Meta cannot access 403/referer-restricted URLs
    try {
      const res = await fetch(image, { headers: { 'User-Agent': 'PostStudio/1.0' } })
      if (!res.ok) {
        console.warn(`[meta] Cannot fetch image URL (HTTP ${res.status}): ${image.slice(0, 100)}`)
        return null
      }
      buffer = Buffer.from(await res.arrayBuffer())
    } catch (e) {
      console.warn(`[meta] Failed to fetch image URL: ${image.slice(0, 100)} —`, e instanceof Error ? e.message : e)
      return null
    }
  } else {
    // Strip data URI header if present, then decode base64
    const b64 = image.startsWith('data:')
      ? image.replace(/^data:image\/\w+;base64,/, '')
      : image
    buffer = Buffer.from(b64, 'base64')
  }

  // Upload to R2 when configured — gives Instagram's fetchers a CDN URL they can reach
  if (isR2Configured()) {
    try {
      const publicUrl = await uploadToR2(buffer, 'image/jpeg')
      console.log(`[meta] Uploaded to R2: ${publicUrl}`)
      return { publicUrl, filePath: '' } // empty filePath = no local cleanup needed
    } catch (e) {
      console.warn('[meta] R2 upload failed, falling back to temp file:', e instanceof Error ? e.message : e)
    }
  }

  // Fallback: write to local temp-images and serve via /api/temp-image
  if (!existsSync(TEMP_IMAGE_DIR)) {
    await mkdir(TEMP_IMAGE_DIR, { recursive: true })
  }
  const filename = `${randomUUID()}.jpg`
  const filePath = path.join(TEMP_IMAGE_DIR, filename)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com').replace(/\/$/, '')
  const publicUrl = `${appUrl}/api/temp-image/${filename}`
  await writeFile(filePath, buffer)
  return { publicUrl, filePath }
}

export async function deleteTempFile(filePath: string): Promise<void> {
  if (!filePath) return // R2 path — no local file to delete
  try { await unlink(filePath) } catch { /* already gone — ignore */ }
}

/**
 * Write a base64 video data URI to a temp .mp4 file and return its public URL.
 * Returns null on failure (caller should fall through to image/text-only).
 */
/**
 * Copy a local server-side video file to temp-images so Meta's servers can fetch it.
 * Use this when you have a local path from the video assembly pipeline.
 */
export async function saveVideoPathToTempFile(localPath: string): Promise<{ publicUrl: string; filePath: string } | null> {
  try {
    if (!existsSync(TEMP_IMAGE_DIR)) {
      await mkdir(TEMP_IMAGE_DIR, { recursive: true })
    }
    const filename = `${randomUUID()}.mp4`
    const destPath = path.join(TEMP_IMAGE_DIR, filename)
    await copyFile(localPath, destPath)
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com').replace(/\/$/, '')
    return { publicUrl: `${appUrl}/api/temp-image/${filename}`, filePath: destPath }
  } catch (e) {
    console.warn('[meta] Failed to copy video path to temp:', e instanceof Error ? e.message : e)
    return null
  }
}

export async function saveVideoToTempFile(videoBase64: string): Promise<{ publicUrl: string; filePath: string } | null> {
  if (!existsSync(TEMP_IMAGE_DIR)) {
    await mkdir(TEMP_IMAGE_DIR, { recursive: true })
  }

  try {
    const b64 = videoBase64.replace(/^data:video\/\w+;base64,/, '')
    const buffer = Buffer.from(b64, 'base64')
    const filename = `${randomUUID()}.mp4`
    const filePath = path.join(TEMP_IMAGE_DIR, filename)
    await writeFile(filePath, buffer)

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com').replace(/\/$/, '')
    return { publicUrl: `${appUrl}/api/temp-image/${filename}`, filePath }
  } catch (e) {
    console.warn('[meta] Failed to save video to temp file:', e instanceof Error ? e.message : e)
    return null
  }
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
      console.warn(`[meta] Skipping inaccessible image for ${channelName}: ${image.slice(0, 80)}`)
    }
  }

  if (publicUrls.length < 2) {
    throw new Error(`Instagram carousel requires at least 2 accessible images; only ${publicUrls.length} could be resolved for ${channelName}`)
  }

  try {
    // Step 1: Upload each image as a carousel item container and wait for each to finish
    const childIds: string[] = []
    for (let i = 0; i < publicUrls.length; i++) {
      const url = publicUrls[i]
      console.log(`[meta] Creating child container ${i + 1}/${publicUrls.length} for ${channelName}`)
      const data = await graphPost(
        `/${igId}/media`,
        { image_url: url, is_carousel_item: 'true', media_type: 'IMAGE' },
        token,
      )
      const childId = data.id as string
      // Each child must reach FINISHED before the carousel container can be created
      console.log(`[meta] Polling child container ${childId}`)
      await waitForContainer(childId, token, 12, 5000)
      childIds.push(childId)
    }

    // Step 2: Create the carousel container
    console.log(`[meta] Creating carousel container for ${channelName} with ${childIds.length} children`)
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

    // Step 3: Poll carousel container until ready
    console.log(`[meta] Polling carousel container ${carouselId}`)
    await waitForContainer(carouselId, token, 20, 5000)

    // Step 4: Publish
    console.log(`[meta] Publishing carousel ${carouselId} for ${channelName}`)
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

// ── Instagram single photo ───────────────────────────────────────────────────

/**
 * Publish a single photo post to Instagram.
 * imageUrl must be a publicly accessible HTTPS URL.
 */
export async function publishPhotoToInstagram(
  channelName: string,
  imageUrl: string,
  caption: string,
): Promise<{ id: string }> {
  const cfg = await getChannelConfig(channelName)
  if (!cfg) throw new Error(`No Meta credentials configured for channel: ${channelName}`)
  const { instagramAccountId: igId, pageAccessToken: token } = cfg
  if (!igId) throw new Error(`Instagram Account ID not configured for channel: ${channelName}`)

  const container = await graphPost(`/${igId}/media`, { image_url: imageUrl, caption }, token)
  const containerId = container.id as string
  await waitForContainer(containerId, token, 12, 5000)
  const published = await graphPost(`/${igId}/media_publish`, { creation_id: containerId }, token)
  return { id: published.id as string }
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
      // Extract first line as title, rest as description
      const [firstLine, ...rest] = message.split('\n')
      const videoTitle = firstLine?.trim().slice(0, 255) || 'Video'
      const videoDesc = rest.join('\n').trim().slice(0, 60000) || message.slice(0, 60000)
      console.log(`[meta] Facebook video upload for ${channelName}: pageId=${pageId}, url=${mediaUrl.slice(0, 80)}`)
      const data = await graphPost(
        `/${pageId}/videos`,
        { file_url: mediaUrl, title: videoTitle, description: videoDesc, published: 'true' },
        token,
      )
      console.log(`[meta] Facebook video upload response for ${channelName}:`, JSON.stringify(data))
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

// ── Facebook photo album ─────────────────────────────────────────────────────

/**
 * Publish a multi-photo album to a Facebook Page.
 * Each imageUrl must be a publicly accessible HTTPS URL.
 * Uses the two-step approach: upload each photo unpublished, then attach to a feed post.
 */
export async function publishAlbumToFacebook(
  channelName: string,
  imageUrls: string[],
  message: string,
): Promise<{ id: string }> {
  const cfg = await getChannelConfig(channelName)
  if (!cfg) throw new Error(`No Meta credentials configured for channel: ${channelName}`)

  const { facebookPageId: pageId, pageAccessToken: token } = cfg

  console.log(`[meta] Uploading ${imageUrls.length} photos for Facebook album (${channelName})`)

  // Step 1: Upload each image as an unpublished photo, collect their IDs
  const photoIds: string[] = []
  for (let i = 0; i < imageUrls.length; i++) {
    console.log(`[meta] Uploading album photo ${i + 1}/${imageUrls.length} for ${channelName}`)
    const data = await graphPost(
      `/${pageId}/photos`,
      { url: imageUrls[i], published: 'false' },
      token,
    )
    photoIds.push(data.id as string)
  }

  // Step 2: Publish a feed post with all photos attached
  const attachedMedia = JSON.stringify(photoIds.map(id => ({ media_fbid: id })))
  console.log(`[meta] Publishing Facebook album post for ${channelName} with ${photoIds.length} photos`)
  const data = await graphPost(
    `/${pageId}/feed`,
    { message, attached_media: attachedMedia },
    token,
  )

  return { id: data.id as string }
}

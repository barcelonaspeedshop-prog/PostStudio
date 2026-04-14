import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const META_TOKENS_PATH = path.join(DATA_DIR, 'meta-tokens.json')
const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

export type MetaChannelConfig = {
  pageAccessToken: string
  instagramAccountId: string
  facebookPageId: string
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

// ── Instagram carousel ───────────────────────────────────────────────────────

/**
 * Publish a carousel post to Instagram.
 * imageUrls must be publicly accessible HTTPS URLs — base64 data URIs are not supported by Meta.
 */
export async function publishCarouselToInstagram(
  channelName: string,
  imageUrls: string[],
  caption: string,
): Promise<{ id: string }> {
  const cfg = await getChannelConfig(channelName)
  if (!cfg) throw new Error(`No Meta credentials configured for channel: ${channelName}`)
  if (imageUrls.length < 2) throw new Error('Instagram carousel requires at least 2 images')
  if (imageUrls.length > 10) throw new Error('Instagram carousel supports a maximum of 10 images')

  const { instagramAccountId: igId, pageAccessToken: token } = cfg

  // Step 1: Upload each image as a carousel item container
  const childIds: string[] = []
  for (const url of imageUrls) {
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

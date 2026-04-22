import { NextRequest, NextResponse } from 'next/server'
import {
  publishCarouselToInstagram,
  publishPhotoToInstagram,
  publishVideoToInstagram,
  publishToFacebook,
  publishAlbumToFacebook,
  getChannelConfig,
  saveBase64ToTempFile,
  saveVideoToTempFile,
  deleteTempFile,
} from '@/lib/meta'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const VALID_PLATFORMS = ['instagram', 'tiktok', 'twitter', 'facebook', 'youtube'] as const
type Platform = (typeof VALID_PLATFORMS)[number]

/**
 * Check whether a string is a real public HTTPS URL (not a base64 data URI).
 * Meta's Graph API only accepts public URLs for media uploads.
 */
function isPublicUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://')
}

export async function POST(req: NextRequest) {
  try {
    const {
      content,
      mediaUrl,
      videoBase64,  // optional base64 MP4 — triggers Facebook video post if present
      imageUrls,    // optional array of explicit image URLs (public or base64)
      slides,       // optional array of slide objects — base64 images extracted from slide.image
      platforms,
      channel,
      firstSlideHeadline,
    } = await req.json()

    // Build the image list for carousel publishing.
    // Priority: explicit imageUrls → slide.image fields → empty
    const slideImages: string[] = Array.isArray(slides)
      ? (slides as Array<{ image?: string }>)
          .map(s => s.image)
          .filter((img): img is string => typeof img === 'string' && img.length > 0)
      : []

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: `platforms is required. Must be an array of: ${VALID_PLATFORMS.join(', ')}` },
        { status: 400 },
      )
    }

    const invalidPlatforms = platforms.filter(
      (p: string) => !VALID_PLATFORMS.includes(p as Platform),
    )
    if (invalidPlatforms.length > 0) {
      return NextResponse.json(
        { error: `Invalid platforms: ${invalidPlatforms.join(', ')}` },
        { status: 400 },
      )
    }

    if (!channel) {
      return NextResponse.json({ error: 'channel is required' }, { status: 400 })
    }

    const caption = content || firstSlideHeadline || ''

    const results: Array<{
      platform: string
      success: boolean
      id?: string
      error?: string
      skipped?: boolean
      reason?: string
    }> = []

    for (const platform of platforms as string[]) {
      switch (platform) {
        // ── Instagram ────────────────────────────────────────────────────────
        case 'instagram': {
          try {
            const cfg = await getChannelConfig(channel)
            if (!cfg) {
              results.push({
                platform,
                success: false,
                skipped: true,
                reason: `No Meta credentials configured for channel "${channel}". Connect via Settings → Accounts.`,
              })
              break
            }

            const tempFiles: string[] = []
            try {
              // Carousel: prefer explicit imageUrls (≥2), fall back to slide images
              const carouselImages: string[] =
                Array.isArray(imageUrls) && imageUrls.length >= 2
                  ? (imageUrls as string[])
                  : slideImages

              if (carouselImages.length >= 2) {
                const r = await publishCarouselToInstagram(channel, carouselImages, caption)
                results.push({ platform, success: true, id: r.id })
              } else if (videoBase64 && typeof videoBase64 === 'string' && videoBase64.length > 100) {
                // Base64 video from New Post → save to temp, publish as Reel
                const saved = await saveVideoToTempFile(videoBase64)
                if (saved) {
                  tempFiles.push(saved.filePath)
                  const r = await publishVideoToInstagram(channel, saved.publicUrl, caption)
                  results.push({ platform, success: true, id: r.id })
                } else {
                  results.push({ platform, success: false, error: 'Failed to prepare video for Instagram' })
                }
              } else if (mediaUrl && isPublicUrl(mediaUrl)) {
                // Public URL video → Reel
                const r = await publishVideoToInstagram(channel, mediaUrl, caption)
                results.push({ platform, success: true, id: r.id })
              } else {
                // Single image: use imageUrls[0] or slideImages[0]
                const singleImage = (Array.isArray(imageUrls) && imageUrls[0]) || slideImages[0]
                if (singleImage) {
                  const saved = await saveBase64ToTempFile(singleImage)
                  if (saved) {
                    tempFiles.push(saved.filePath)
                    const r = await publishPhotoToInstagram(channel, saved.publicUrl, caption)
                    results.push({ platform, success: true, id: r.id })
                  } else {
                    results.push({ platform, success: false, error: 'Failed to prepare image for Instagram' })
                  }
                } else {
                  // Text-only — Instagram requires media, publish as text fallback via caption only
                  results.push({
                    platform,
                    success: false,
                    skipped: true,
                    reason: 'Instagram requires at least one image or video. Add media to publish.',
                  })
                }
              }
            } finally {
              await Promise.all(tempFiles.map(deleteTempFile))
            }
          } catch (e: unknown) {
            results.push({ platform, success: false, error: e instanceof Error ? e.message : String(e) })
          }
          break
        }

        // ── Facebook ─────────────────────────────────────────────────────────
        // Priority: video → album (≥2 slides) → single image → text-only
        case 'facebook': {
          try {
            const cfg = await getChannelConfig(channel)
            if (!cfg) {
              results.push({
                platform,
                success: false,
                skipped: true,
                reason: `No Meta credentials configured for channel "${channel}". Connect via Settings → Accounts.`,
              })
              break
            }

            const tempFiles: string[] = []

            try {
              let published = false

              // 1. Video — publish as a Facebook video post
              if (!published && videoBase64 && typeof videoBase64 === 'string' && videoBase64.length > 100) {
                const saved = await saveVideoToTempFile(videoBase64)
                if (saved) {
                  tempFiles.push(saved.filePath)
                  const r = await publishToFacebook(channel, caption, saved.publicUrl)
                  console.log(`[publish] Facebook: video for "${channel}" — ${r.id}`)
                  results.push({ platform, success: true, id: r.id })
                  published = true
                } else {
                  console.warn(`[publish] Facebook: video save failed for "${channel}", falling through to album`)
                }
              }

              if (!published) {
                // Resolve all slide images to accessible public URLs
                const resolvedUrls: string[] = []
                for (const img of slideImages) {
                  const saved = await saveBase64ToTempFile(img)
                  if (saved) {
                    tempFiles.push(saved.filePath)
                    resolvedUrls.push(saved.publicUrl)
                  } else {
                    console.warn(`[publish] Facebook: skipping inaccessible image for "${channel}"`)
                  }
                }

                if (resolvedUrls.length >= 2) {
                  // 2. Album — multiple slides → photo album
                  const r = await publishAlbumToFacebook(channel, resolvedUrls, caption)
                  console.log(`[publish] Facebook: album (${resolvedUrls.length} photos) for "${channel}" — ${r.id}`)
                  results.push({ platform, success: true, id: r.id })
                } else if (resolvedUrls.length === 1) {
                  // 3. Single image
                  const r = await publishToFacebook(channel, caption, resolvedUrls[0])
                  console.log(`[publish] Facebook: single image for "${channel}" — ${r.id}`)
                  results.push({ platform, success: true, id: r.id })
                } else {
                  // 4. Text-only fallback
                  const r = await publishToFacebook(channel, caption)
                  console.log(`[publish] Facebook: text-only for "${channel}" (no images resolved) — ${r.id}`)
                  results.push({ platform, success: true, id: r.id })
                }
              }
            } finally {
              await Promise.all(tempFiles.map(deleteTempFile))
            }
          } catch (e: unknown) {
            results.push({ platform, success: false, error: e instanceof Error ? e.message : String(e) })
          }
          break
        }

        // ── TikTok / YouTube / Twitter ────────────────────────────────────────
        // These platforms are not yet handled via direct API.
        // Return a clear skipped status so callers can surface the message.
        case 'tiktok':
        case 'youtube':
        case 'twitter':
        default: {
          results.push({
            platform,
            success: false,
            skipped: true,
            reason: `Direct API publishing for ${platform} is not yet configured.`,
          })
          break
        }
      }
    }

    const anySuccess = results.some(r => r.success)
    const anyError = results.some(r => !r.success && !r.skipped)

    console.log('[publish] Results:', JSON.stringify(results, null, 2))

    return NextResponse.json({
      results,
      publishError: anyError
        ? results.filter(r => !r.success && !r.skipped).map(r => `${r.platform}: ${r.error}`).join('; ')
        : undefined,
      ok: anySuccess,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[publish] Unexpected error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

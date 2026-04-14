import { NextRequest, NextResponse } from 'next/server'
import {
  publishCarouselToInstagram,
  publishVideoToInstagram,
  publishToFacebook,
  getChannelConfig,
} from '@/lib/meta'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

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
      imageUrls,   // optional array of explicit image URLs (public or base64)
      slides,      // optional array of slide objects — base64 images extracted from slide.image
      platforms,
      channel,
      firstSlideHeadline,
      // scheduleAt retained in signature for forward-compatibility but not yet
      // implemented in the direct API path
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

            // Carousel: prefer explicit imageUrls, fall back to slide.image base64 fields.
            // publishCarouselToInstagram handles both public URLs and base64 internally.
            const carouselImages: string[] =
              Array.isArray(imageUrls) && imageUrls.length >= 2
                ? (imageUrls as string[])
                : slideImages

            if (carouselImages.length >= 2) {
              const r = await publishCarouselToInstagram(channel, carouselImages, caption)
              results.push({ platform, success: true, id: r.id })
            } else if (mediaUrl && isPublicUrl(mediaUrl)) {
              // Single video → publish as Reel
              const r = await publishVideoToInstagram(channel, mediaUrl, caption)
              results.push({ platform, success: true, id: r.id })
            } else {
              results.push({
                platform,
                success: false,
                skipped: true,
                reason:
                  'Instagram carousel requires at least 2 slide images. No valid images found in the request.',
              })
            }
          } catch (e: unknown) {
            results.push({ platform, success: false, error: e instanceof Error ? e.message : String(e) })
          }
          break
        }

        // ── Facebook ─────────────────────────────────────────────────────────
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

            const publicMedia = mediaUrl && isPublicUrl(mediaUrl) ? mediaUrl : undefined
            const r = await publishToFacebook(channel, caption, publicMedia)
            results.push({ platform, success: true, id: r.id })
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

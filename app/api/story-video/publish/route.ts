import { NextRequest, NextResponse } from 'next/server'
import { existsSync } from 'fs'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { spawn } from 'child_process'
import path from 'path'
import crypto from 'crypto'
import {
  getChannelConfig,
  publishVideoToInstagram,
  publishToFacebook,
  saveVideoPathToTempFile,
  deleteTempFile,
} from '@/lib/meta'
import { getJob, updateJob } from '../jobs'
import { expandScriptToArticle, slugify } from '@/lib/article-expander'
import { publishToWebsite } from '@/lib/website-publisher'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ─── Scheduled queue helpers (mirrors /api/scheduled logic) ─────────────────

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const SCHEDULED_PATH = path.join(DATA_DIR, 'scheduled.json')

async function appendScheduledItem(item: {
  id: string; channel: string; headline: string
  format: string; platform: string; scheduledTime: string
  status: string; createdAt: string
}) {
  try {
    let items: unknown[] = []
    try {
      const raw = await readFile(SCHEDULED_PATH, 'utf-8')
      items = JSON.parse(raw)
    } catch { /* empty / missing file */ }
    items.push(item)
    if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
    await writeFile(SCHEDULED_PATH, JSON.stringify(items, null, 2))
  } catch (e) {
    console.warn('[publish] Could not append scheduled item:', e instanceof Error ? e.message : e)
  }
}

// ─── FFmpeg helpers ──────────────────────────────────────────────────────────

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args)
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-500)}`))
    })
    proc.on('error', (err) => reject(new Error(`ffmpeg spawn error: ${err.message}`)))
  })
}

async function getVideoPathForFormat(jobId: string, format: string): Promise<string> {
  const job = getJob(jobId)
  if (!job) throw new Error('Job not found')
  if (job.status !== 'complete') throw new Error('Job not complete')
  if (!job.videoPath || !existsSync(job.videoPath)) throw new Error('Video file not found')

  if (format === 'youtube' || format === 'original') return job.videoPath

  const tmpDir = job.tmpDir || '/tmp'

  if (format === 'square') {
    const squarePath = job.squarePath && existsSync(job.squarePath)
      ? job.squarePath
      : path.join(tmpDir, 'format_square.mp4')
    if (!existsSync(squarePath)) {
      await runFfmpeg([
        '-i', job.videoPath,
        '-vf', 'crop=1080:1080:(iw-1080)/2:0,setsar=1',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', '23',
        '-c:a', 'copy', '-movflags', '+faststart', '-y', squarePath,
      ])
      updateJob(jobId, { squarePath })
    }
    return squarePath
  }

  throw new Error(`Unknown format: ${format}`)
}

// ─── POST handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const tempFiles: string[] = []

  try {
    const body = await req.json() as {
      jobId: string
      channelName: string
      title: string
      description: string
      tags: string[]
      format?: string
      thumbnailBase64?: string
      publishInstagram?: boolean
      publishFacebook?: boolean
      storyTopic?: string
      youtubeUrl?: string
    }

    const {
      jobId, channelName, title, description, tags,
      publishInstagram, publishFacebook, storyTopic, youtubeUrl,
    } = body
    const format = body.format || 'youtube'

    if (!jobId || !channelName || !title) {
      return NextResponse.json({ error: 'jobId, channelName, and title are required' }, { status: 400 })
    }

    console.log(`[publish] Request — channel: "${channelName}", jobId: ${jobId}, publishInstagram: ${publishInstagram}, publishFacebook: ${publishFacebook}, format: ${format}`)

    // ── Pre-flight: load Meta credentials ────────────────────────────────────
    const metaCfgPreflight = (publishInstagram || publishFacebook)
      ? await getChannelConfig(channelName)
      : null

    const preflight: string[] = []
    if (publishInstagram && !metaCfgPreflight?.instagramAccountId) {
      preflight.push(`Instagram: no account ID for "${channelName}"`)
    }
    if (publishFacebook && !metaCfgPreflight?.facebookPageId) {
      preflight.push(`Facebook: no page ID for "${channelName}"`)
    }
    if (publishFacebook && !metaCfgPreflight?.pageAccessToken) {
      preflight.push(`Facebook: no access token for "${channelName}"`)
    }
    if (preflight.length > 0) {
      console.warn(`[publish] Pre-flight credential failures for ${channelName}:`, preflight.join('; '))
    }

    const results: {
      instagram?: { id: string }
      facebook?: { id: string }
      scheduledCarousel?: { id: string }
      errors: Record<string, string>
    } = { errors: {} }

    // Set pre-flight errors immediately so they surface in the response
    if (publishInstagram && !metaCfgPreflight?.instagramAccountId) {
      results.errors.instagram = `No Instagram account ID configured for "${channelName}"`
    }
    if (publishFacebook && (!metaCfgPreflight?.facebookPageId || !metaCfgPreflight?.pageAccessToken)) {
      results.errors.facebook = `No Facebook credentials configured for "${channelName}"`
    }

    // ── Instagram Square (1:1) ───────────────────────────────────────────────

    if (publishInstagram && !results.errors.instagram) {
      console.log(`[publish] Instagram — channel: "${channelName}", igAccountId: ${metaCfgPreflight?.instagramAccountId}`)
      try {
        const igVideoPath = await getVideoPathForFormat(jobId, 'square')
        const saved = await saveVideoPathToTempFile(igVideoPath)
        if (!saved) throw new Error('Could not create public URL for Instagram video')
        tempFiles.push(saved.filePath)
        console.log(`[publish] Publishing Instagram Reel for ${channelName}: ${saved.publicUrl}`)
        const igResult = await publishVideoToInstagram(channelName, saved.publicUrl, `${title}\n\n${description}`.slice(0, 2200))
        results.instagram = { id: igResult.id }
        console.log(`[publish] Instagram Reel published: ${igResult.id}`)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[publish] Instagram error for ${channelName}:`, msg)
        results.errors.instagram = msg
      }
    }

    // ── Facebook (16:9) ──────────────────────────────────────────────────────

    if (publishFacebook && !results.errors.facebook) {
      console.log(`[publish] Facebook — channel: "${channelName}", pageId: ${metaCfgPreflight?.facebookPageId}`)
      try {
        const fbVideoPath = await getVideoPathForFormat(jobId, 'youtube')
        const saved = await saveVideoPathToTempFile(fbVideoPath)
        if (!saved) throw new Error('Could not create public URL for Facebook video')
        tempFiles.push(saved.filePath)
        console.log(`[publish] Publishing to Facebook for ${channelName}: ${saved.publicUrl}`)
        const fbResult = await publishToFacebook(channelName, `${title}\n\n${description}`.slice(0, 63206), saved.publicUrl)
        results.facebook = { id: fbResult.id }
        console.log(`[publish] Facebook post published: ${fbResult.id}`)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[publish] Facebook error for ${channelName}:`, msg)
        results.errors.facebook = msg
      }
    }

    // ── Scheduled carousel (4 hours after publish) ───────────────────────────

    const anySuccess = !!(results.instagram || results.facebook)
    if (anySuccess && (publishInstagram || publishFacebook)) {
      try {
        const scheduledTime = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
        const id = crypto.randomUUID()
        await appendScheduledItem({
          id,
          channel: channelName,
          headline: storyTopic || title,
          format: 'carousel',
          platform: 'instagram',
          scheduledTime,
          status: 'pending',
          createdAt: new Date().toISOString(),
        })
        results.scheduledCarousel = { id }
        console.log(`[publish] Carousel scheduled for ${channelName} at ${scheduledTime}`)
      } catch (e) {
        console.warn('[publish] Scheduled carousel failed (non-fatal):', e instanceof Error ? e.message : e)
      }
    }

    // Auto-publish article to website with 15-min hold window
    let articleResult: { success: boolean; error?: string } | null = null
    if (anySuccess) {
      try {
        const articleBody = await expandScriptToArticle({ title, description, tags, channelName })
        const excerpt = articleBody.replace(/^#+[^\n]*\n?/gm, '').replace(/\n+/g, ' ').trim().slice(0, 250)
        const slug = slugify(title)
        const goLiveAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
        articleResult = await publishToWebsite({
          id: crypto.randomUUID(),
          channel: channelName,
          headline: title,
          ytTitle: title,
          articleBody,
          articleExcerpt: excerpt,
          articleSlug: slug,
          hashtags: tags,
          goLiveAt,
          youtubeUrl,
        })
        if (articleResult.success) {
          console.log(`[publish] Article queued: ${slug} (live at ${goLiveAt})`)
        } else {
          console.error(`[publish] Article write failed: ${articleResult.error}`)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[publish] Article auto-publish failed:', msg)
        articleResult = { success: false, error: msg }
      }
    }

    return NextResponse.json({
      ...results,
      channelName,
      ok: anySuccess,
      article: articleResult,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[publish] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    // Clean up temp files created for Meta publishing
    await Promise.all(tempFiles.map(f => deleteTempFile(f).catch(() => {})))
  }
}

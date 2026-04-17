import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getJob } from '../jobs'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const CLIPS_DIR = path.join(DATA_DIR, 'clips')

// ─── Same spawn helper as story-video/start ───

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[story-video/clip] ffmpeg ${args.join(' ').substring(0, 300)}`)
    const proc = spawn('ffmpeg', args)
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-600)}`))
    })
    proc.on('error', (err) => reject(new Error(`ffmpeg spawn error: ${err.message}`)))
  })
}

/**
 * POST /api/story-video/clip
 * Body: { jobId, channel, title }
 *
 * Cuts each chapter from the master video at exact chapter boundaries,
 * converts each to 1080×1920 (9:16 vertical, letterboxed) for Instagram Reels,
 * and extracts a 1080×1080 thumbnail from the chapter midpoint.
 *
 * Outputs:
 *   /data/clips/{jobId}_ch{N}_reels.mp4
 *   /data/clips/{jobId}_ch{N}_thumb.jpg
 */
export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json()

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    const job = getJob(jobId)
    if (!job) {
      return NextResponse.json({ error: `Job ${jobId} not found — it may have expired` }, { status: 404 })
    }
    if (job.status !== 'complete' || !job.videoPath) {
      return NextResponse.json({ error: `Job ${jobId} is not complete or has no video` }, { status: 400 })
    }
    if (!existsSync(job.videoPath)) {
      return NextResponse.json({ error: `Video file not found: ${job.videoPath}` }, { status: 404 })
    }
    if (!job.chapterOrder || job.chapterOrder.length === 0 || !job.chapterDurations) {
      return NextResponse.json(
        { error: 'No chapter timing data — re-assemble the video to enable chapter clips' },
        { status: 400 },
      )
    }

    if (!existsSync(CLIPS_DIR)) {
      await mkdir(CLIPS_DIR, { recursive: true })
    }

    const videoPath = job.videoPath
    const chapterOrder = job.chapterOrder
    const chapterDurations = job.chapterDurations
    const chapterTitles = job.chapterTitles || {}

    type ClipResult = {
      chapterId: number
      title: string
      duration: number
      clipFile: string
      thumbFile: string
    }
    const results: ClipResult[] = []

    let offset = 0

    for (const chId of chapterOrder) {
      const dur = chapterDurations[chId] ?? 0

      if (dur < 1.5) {
        // Skip chapters shorter than 1.5s — too short for a meaningful clip
        offset += dur
        continue
      }

      const clipFilename = `${jobId}_ch${chId}_reels.mp4`
      const thumbFilename = `${jobId}_ch${chId}_thumb.jpg`
      const clipPath = path.join(CLIPS_DIR, clipFilename)
      const thumbPath = path.join(CLIPS_DIR, thumbFilename)

      console.log(
        `[story-video/clip] Chapter ${chId}: offset=${offset.toFixed(2)}s, ` +
        `duration=${dur.toFixed(2)}s → ${clipFilename}`,
      )

      // ── Step 1: Cut chapter segment (stream-copy, no re-encode) ──
      const rawPath = path.join(CLIPS_DIR, `${jobId}_ch${chId}_raw.mp4`)
      let segmentOk = false
      try {
        await runFfmpeg([
          '-ss', offset.toFixed(3),
          '-i', videoPath,
          '-t', dur.toFixed(3),
          '-c', 'copy',
          '-avoid_negative_ts', '1',
          '-y', rawPath,
        ])
        segmentOk = existsSync(rawPath)
      } catch (e) {
        console.warn(`[story-video/clip] Chapter ${chId} cut failed:`, e instanceof Error ? e.message : e)
      }

      if (!segmentOk) {
        offset += dur
        continue
      }

      // ── Step 2: Convert to 9:16 vertical 1080×1920 (letterbox) ──
      //    Source is 1920×1080 (16:9) → scale to 1080 wide (1080×608) then
      //    pad top/bottom with black to reach 1080×1920.
      try {
        await runFfmpeg([
          '-i', rawPath,
          '-vf', 'scale=1080:608:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1',
          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '23',
          '-c:a', 'aac', '-b:a', '192k',
          '-movflags', '+faststart',
          '-y', clipPath,
        ])
      } catch (e) {
        console.warn(`[story-video/clip] Chapter ${chId} 9:16 conversion failed:`, e instanceof Error ? e.message : e)
        offset += dur
        continue
      }

      // ── Step 3: Extract 1080×1080 thumbnail at chapter midpoint ──
      //    Center-crop the 1920×1080 frame to 1080×1080.
      const midOffset = offset + dur / 2
      try {
        await runFfmpeg([
          '-ss', midOffset.toFixed(3),
          '-i', videoPath,
          '-vframes', '1',
          '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,crop=1080:1080:(iw-1080)/2:0,setsar=1',
          '-q:v', '2',
          '-y', thumbPath,
        ])
      } catch (e) {
        console.warn(`[story-video/clip] Chapter ${chId} thumbnail failed:`, e instanceof Error ? e.message : e)
      }

      results.push({
        chapterId: chId,
        title: chapterTitles[chId] || `Chapter ${chId}`,
        duration: Math.round(dur),
        clipFile: clipFilename,
        thumbFile: existsSync(thumbPath) ? thumbFilename : '',
      })

      offset += dur
    }

    console.log(`[story-video/clip] Done — ${results.length} chapter clips generated`)
    return NextResponse.json({ clipCount: results.length, clips: results })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-video/clip] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

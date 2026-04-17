import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, existsSync, statSync } from 'fs'
import { Readable } from 'stream'
import { spawn } from 'child_process'
import path from 'path'
import { getJob } from '../../jobs'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ─── FFmpeg helper (same pattern as story-video/start) ───

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[story-video/download] ffmpeg ${args.join(' ').substring(0, 300)}`)
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

function serveFile(filePath: string, downloadName: string, contentType = 'video/mp4'): NextResponse {
  const stat = statSync(filePath)
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream
  return new NextResponse(stream, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(stat.size),
      'Content-Disposition': `attachment; filename="${downloadName}"`,
      'Cache-Control': 'no-store',
    },
  })
}

/**
 * GET /api/story-video/download/[jobId]?format=youtube|square|reels
 *
 * youtube (default) — serves the master 1920×1080 16:9 video as-is
 * square            — re-encodes to 1080×1080 (1:1) with center crop, caches in tmpDir
 * reels             — re-encodes to 1080×1920 (9:16) letterboxed, caches in tmpDir
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params
  const format = new URL(req.url).searchParams.get('format') || 'youtube'

  const job = getJob(jobId)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.status !== 'complete') return NextResponse.json({ error: 'Not complete' }, { status: 400 })
  if (!job.videoPath || !existsSync(job.videoPath)) {
    return NextResponse.json({ error: 'Video file not found' }, { status: 404 })
  }

  // ── YouTube / original 16:9 — serve as-is ──
  if (format === 'youtube' || format === 'original') {
    return serveFile(job.videoPath, `story_youtube_16x9.mp4`)
  }

  const tmpDir = job.tmpDir || '/tmp'

  // ── Square 1:1 (1080×1080) ──
  if (format === 'square') {
    const squarePath = job.squarePath && existsSync(job.squarePath)
      ? job.squarePath
      : path.join(tmpDir, 'format_square.mp4')

    if (!existsSync(squarePath)) {
      console.log(`[story-video/download] Generating square 1:1 for job ${jobId}`)
      // Source is 1920×1080 — center-crop 1080×1080, re-encode
      await runFfmpeg([
        '-i', job.videoPath,
        '-vf', 'crop=1080:1080:(iw-1080)/2:0,setsar=1',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', '23',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        '-y', squarePath,
      ])
      // Cache path on job so second download is instant
      Object.assign(job, { squarePath })
    }

    return serveFile(squarePath, `story_instagram_square_1x1.mp4`)
  }

  // ── Reels 9:16 (1080×1920) ──
  if (format === 'reels') {
    const reelsPath = job.reelsPath && existsSync(job.reelsPath)
      ? job.reelsPath
      : path.join(tmpDir, 'format_reels.mp4')

    if (!existsSync(reelsPath)) {
      console.log(`[story-video/download] Generating reels 9:16 for job ${jobId}`)
      // Scale 1920×1080 → 1080×608, then pad to 1080×1920 with black bars
      await runFfmpeg([
        '-i', job.videoPath,
        '-vf', 'scale=1080:608:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', '23',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        '-y', reelsPath,
      ])
      Object.assign(job, { reelsPath })
    }

    return serveFile(reelsPath, `story_instagram_reels_9x16.mp4`)
  }

  return NextResponse.json({ error: `Unknown format: ${format}` }, { status: 400 })
}

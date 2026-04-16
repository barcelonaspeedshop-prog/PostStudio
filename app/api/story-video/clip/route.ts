import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { mkdir, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getJob } from '../jobs'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const CLIPS_DIR = path.join(DATA_DIR, 'clips')

// ─── Same spawn pattern as story-video/start ───

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[story-video/clip] ffmpeg ${args.join(' ').substring(0, 200)}`)
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

function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', filePath,
    ])
    let out = ''
    proc.stdout.on('data', (d: Buffer) => { out += d.toString() })
    proc.on('close', () => {
      const dur = parseFloat(out.trim())
      resolve(isNaN(dur) ? 0 : dur)
    })
    proc.on('error', () => resolve(0))
  })
}

// POST /api/story-video/clip
// Body: { jobId, channel, title }
// Splits completed long-form video into ≤60s clips, saves to /data/clips/,
// and schedules each clip for Instagram Reel + TikTok.
export async function POST(req: NextRequest) {
  try {
    const { jobId, channel, title } = await req.json()

    if (!jobId || !channel || !title) {
      return NextResponse.json({ error: 'jobId, channel, and title are required' }, { status: 400 })
    }

    const job = getJob(jobId)
    if (!job) {
      return NextResponse.json({ error: `Job ${jobId} not found — it may have expired` }, { status: 404 })
    }
    if (job.status !== 'complete' || !job.videoPath) {
      return NextResponse.json({ error: `Job ${jobId} is not complete or has no video path` }, { status: 400 })
    }
    if (!existsSync(job.videoPath)) {
      return NextResponse.json({ error: `Video file not found: ${job.videoPath}` }, { status: 404 })
    }

    // Ensure clips directory exists
    if (!existsSync(CLIPS_DIR)) {
      await mkdir(CLIPS_DIR, { recursive: true })
    }

    // Output pattern: {jobId}_%03d.mp4 — safe, no path traversal
    const clipPattern = path.join(CLIPS_DIR, `${jobId}_%03d.mp4`)

    console.log(`[story-video/clip] Splitting ${job.videoPath} into ≤60s segments → ${clipPattern}`)
    await runFfmpeg([
      '-i', job.videoPath,
      '-c', 'copy',
      '-f', 'segment',
      '-segment_time', '60',
      '-reset_timestamps', '1',
      '-avoid_negative_ts', '1',
      '-y',
      clipPattern,
    ])

    // Discover the generated clip files for this job
    const allFiles = await readdir(CLIPS_DIR)
    const clipFiles = allFiles
      .filter(f => f.startsWith(`${jobId}_`) && f.endsWith('.mp4'))
      .sort()

    if (clipFiles.length === 0) {
      return NextResponse.json({ error: 'No clip files were generated' }, { status: 500 })
    }

    console.log(`[story-video/clip] Generated ${clipFiles.length} clips: ${clipFiles.join(', ')}`)

    // Schedule clips for Instagram Reels + TikTok
    // Start tomorrow 09:00, stagger by 2h per clip
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'
    const baseTime = new Date()
    baseTime.setDate(baseTime.getDate() + 1)
    baseTime.setHours(9, 0, 0, 0)

    const results: { filename: string; duration: number; igId?: string; ttId?: string }[] = []

    for (let i = 0; i < clipFiles.length; i++) {
      const filename = clipFiles[i]
      const clipPath = path.join(CLIPS_DIR, filename)
      const duration = await probeDuration(clipPath)
      const partLabel = clipFiles.length > 1 ? ` (Part ${i + 1}/${clipFiles.length})` : ''
      const headline = `${title}${partLabel}`

      // Each clip staggered 2h apart
      const igTime = new Date(baseTime.getTime() + i * 2 * 60 * 60 * 1000).toISOString()
      // TikTok 30 min after Instagram
      const ttTime = new Date(new Date(igTime).getTime() + 30 * 60 * 1000).toISOString()

      const [igRes, ttRes] = await Promise.all([
        fetch(`${baseUrl}/api/scheduled`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel, headline, format: 'reel', platform: 'instagram', scheduledTime: igTime, clipFile: filename }),
        }),
        fetch(`${baseUrl}/api/scheduled`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel, headline, format: 'tiktok', platform: 'tiktok', scheduledTime: ttTime, clipFile: filename }),
        }),
      ])

      const igData = await igRes.json()
      const ttData = await ttRes.json()

      results.push({ filename, duration: Math.round(duration), igId: igData.id, ttId: ttData.id })
      console.log(`[story-video/clip] Clip ${i + 1}: ${filename} (${Math.round(duration)}s) — IG: ${igData.id}, TT: ${ttData.id}`)
    }

    return NextResponse.json({ clipCount: clipFiles.length, clips: results })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-video/clip] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

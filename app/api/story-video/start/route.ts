import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { writeFile, mkdir } from 'fs/promises'
import { createWriteStream, existsSync, statSync } from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import path from 'path'
import { createJob, updateJob, cleanOldJobs } from '../jobs'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

// ─── spawn-based ffmpeg — no maxBuffer, no hangs ───

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[ffmpeg] ${['ffmpeg', ...args].join(' ').substring(0, 300)}`)
    const proc = spawn('ffmpeg', args)
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); process.stderr.write(d) })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-500)}`))
    })
    proc.on('error', (err) => reject(new Error(`ffmpeg spawn error: ${err.message}`)))
  })
}

// ─── Helpers ───

type MediaItem = { path: string; isVideo: boolean }

function extFromMime(mime: string): string {
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('quicktime') || mime.includes('mov')) return 'mov'
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  return 'jpg'
}

async function streamToDisk(file: File, dest: string): Promise<void> {
  const readable = Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0])
  await pipeline(readable, createWriteStream(dest))
  if (!existsSync(dest) || statSync(dest).size === 0) {
    throw new Error(`Failed to write file: ${dest}`)
  }
  console.log(`[story-video] Wrote ${dest} (${(statSync(dest).size / 1024).toFixed(1)} KB)`)
}

// ─── Background assembly ───

async function assembleInBackground(
  jobId: string,
  chapterIds: number[],
  mediaByChapter: Record<number, MediaItem[]>,
  tmpDir: string,
) {
  const W = 1920, H = 1080, IMAGE_DUR = 5

  try {
    updateJob(jobId, { status: 'processing', progress: 'Starting assembly...' })

    const chapterVideos: string[] = []

    for (let ci = 0; ci < chapterIds.length; ci++) {
      const chId = chapterIds[ci]
      updateJob(jobId, { progress: `Rendering chapter ${ci + 1}/${chapterIds.length}` })

      const media = mediaByChapter[chId] || []
      const chapterVideoPath = path.join(tmpDir, `chapter_${chId}.mp4`)

      if (media.length === 0) {
        // No media — 5s black frame
        await runFfmpeg([
          '-f', 'lavfi', '-i', `color=c=black:size=${W}x${H}:rate=24:d=${IMAGE_DUR}`,
          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', '28',
          '-an', '-movflags', '+faststart', '-y', chapterVideoPath,
        ])
      } else {
        // Build a clip per media item
        const clips: string[] = []

        for (let j = 0; j < media.length; j++) {
          const m = media[j]
          const clipPath = path.join(tmpDir, `clip_ch${chId}_${j}.mp4`)

          if (!existsSync(m.path)) {
            throw new Error(`Media file missing: ${m.path}`)
          }

          if (m.isVideo) {
            // Video: scale/pad to 1920x1080, use first 5 seconds
            await runFfmpeg([
              '-i', m.path,
              '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
              '-t', String(IMAGE_DUR), '-r', '24',
              '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', '28',
              '-an', '-movflags', '+faststart', '-y', clipPath,
            ])
          } else {
            // Image: static display for 5 seconds — exact command from spec
            await runFfmpeg([
              '-loop', '1', '-framerate', '1', '-i', m.path,
              '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black`,
              '-t', String(IMAGE_DUR), '-r', '24',
              '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', '28',
              '-y', clipPath,
            ])
          }
          clips.push(clipPath)
        }

        // Concat clips into chapter video
        const concatList = path.join(tmpDir, `concat_ch${chId}.txt`)
        await writeFile(concatList, clips.map(f => `file '${f}'`).join('\n'))
        await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', '-y', chapterVideoPath])
      }

      chapterVideos.push(chapterVideoPath)
    }

    // Concat all chapters into final video
    updateJob(jobId, { progress: 'Joining chapters...' })
    const masterConcat = path.join(tmpDir, 'master_concat.txt')
    await writeFile(masterConcat, chapterVideos.map(f => `file '${f}'`).join('\n'))
    const masterFinal = path.join(tmpDir, 'master_final.mp4')
    await runFfmpeg([
      '-f', 'concat', '-safe', '0', '-i', masterConcat,
      '-c', 'copy', '-movflags', '+faststart', '-y', masterFinal,
    ])

    updateJob(jobId, {
      status: 'complete',
      progress: 'Complete',
      videoPath: masterFinal,
      duration: chapterIds.length * IMAGE_DUR,
      tmpDir,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[story-video] Job ${jobId} error:`, msg)
    try {
      if (existsSync(tmpDir)) {
        const { readdirSync } = require('fs')
        console.error(`[story-video] tmpDir files:`, (readdirSync(tmpDir) as string[]).join(', '))
      }
    } catch { /* ignore */ }
    updateJob(jobId, { status: 'error', error: msg, progress: 'Failed', tmpDir })
  }
}

// ─── POST handler ───

export async function POST(req: NextRequest) {
  cleanOldJobs()
  const tmpDir = `/tmp/story_video_${Date.now()}`

  try {
    await mkdir(tmpDir, { recursive: true })

    const formData = await req.formData()
    const chaptersRaw = formData.get('chapters') as string
    if (!chaptersRaw) return NextResponse.json({ error: 'chapters is required' }, { status: 400 })

    const chapters: Array<{ id: number }> = JSON.parse(chaptersRaw)
    const chapterIds = chapters.map(c => c.id)

    // Stream media files to disk
    const mediaFiles = formData.getAll('media') as File[]
    const mediaChapterIds = formData.getAll('mediaChapterIds') as string[]
    const mediaByChapter: Record<number, MediaItem[]> = {}
    const counters: Record<number, number> = {}

    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i]
      const chId = parseInt(mediaChapterIds[i])
      if (!mediaByChapter[chId]) mediaByChapter[chId] = []
      if (counters[chId] === undefined) counters[chId] = 0
      const isVideo = file.type.startsWith('video/')
      const ext = extFromMime(file.type)
      const idx = String(counters[chId]++).padStart(4, '0')
      const mediaPath = path.join(tmpDir, `media_ch${chId}_${idx}.${ext}`)
      await streamToDisk(file, mediaPath)
      mediaByChapter[chId].push({ path: mediaPath, isVideo })
    }

    const job = createJob()
    assembleInBackground(job.id, chapterIds, mediaByChapter, tmpDir)
    return NextResponse.json({ jobId: job.id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-video/start] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { writeFile, mkdir, rm } from 'fs/promises'
import { createWriteStream, existsSync, statSync } from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import path from 'path'
import { createJob, updateJob, cleanOldJobs } from '../jobs'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

// ─── ffmpeg via spawn() — no maxBuffer, no hangs ───

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[ffmpeg] ${args.join(' ').substring(0, 200)}...`)
    const proc = spawn('ffmpeg', args)
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => {
      stderr += d.toString()
      // Stream to process stderr for Docker logs
      process.stderr.write(d)
    })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`))
    })
    proc.on('error', (err) => reject(new Error(`ffmpeg spawn error: ${err.message}`)))
  })
}

function runFfprobe(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', args)
    let stdout = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout.trim())
      else reject(new Error(`ffprobe exited with code ${code}`))
    })
    proc.on('error', (err) => reject(new Error(`ffprobe spawn error: ${err.message}`)))
  })
}

async function probeDuration(filePath: string): Promise<number> {
  const out = await runFfprobe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', filePath])
  return parseFloat(out) || 10
}

// ─── Helpers ───

type ChapterInput = { id: number; title: string; narration: string; visual: string; audioBase64: string }
type MediaItem = { path: string; isVideo: boolean }

function stripDataUrl(dataUrl: string): { buffer: Buffer; ext: string; isVideo: boolean } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('Invalid data URL')
  const mime = match[1]
  const isVideo = mime.startsWith('video/') || mime.includes('quicktime')
  let ext = 'jpg'
  if (mime.includes('mp4')) ext = 'mp4'
  else if (mime.includes('quicktime') || mime.includes('mov')) ext = 'mov'
  else if (mime.includes('webm')) ext = 'webm'
  else if (mime.includes('png')) ext = 'png'
  else if (mime.includes('webp')) ext = 'webp'
  else if (mime.includes('mp3') || mime.includes('mpeg')) ext = 'mp3'
  else if (mime.includes('wav')) ext = 'wav'
  return { buffer: Buffer.from(match[2], 'base64'), ext, isVideo }
}

function extFromMime(mime: string): string {
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('quicktime') || mime.includes('mov')) return 'mov'
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('mp3') || mime.includes('mpeg')) return 'mp3'
  return 'jpg'
}

async function streamFileToDisk(file: File, destPath: string): Promise<void> {
  const webStream = file.stream()
  const nodeReadable = Readable.fromWeb(webStream as Parameters<typeof Readable.fromWeb>[0])
  await pipeline(nodeReadable, createWriteStream(destPath))
  if (!existsSync(destPath) || statSync(destPath).size === 0) {
    throw new Error(`Failed to write file: ${destPath}`)
  }
  console.log(`[story-video] Wrote ${destPath} (${(statSync(destPath).size / 1024).toFixed(1)} KB)`)
}

// ─── Subtitle generation ───

function buildAssSubtitles(
  chapters: ChapterInput[],
  durations: Record<number, number>,
  timestamps: Array<{ chapterId: number; startTime: number; endTime: number }>,
  width: number,
  height: number,
): string {
  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    const cs = Math.round((s % 1) * 100)
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
  }

  const events: string[] = []
  for (const ts of timestamps) {
    const ch = chapters.find(c => c.id === ts.chapterId)
    if (!ch?.narration) continue
    const dur = durations[ch.id] || (ts.endTime - ts.startTime)
    const words = ch.narration.split(/\s+/).filter(w => w.length > 0)
    const chunks: string[] = []
    for (let i = 0; i < words.length; i += 8) chunks.push(words.slice(i, i + 8).join(' '))
    if (chunks.length === 0) continue
    const chunkDur = dur / chunks.length
    for (let i = 0; i < chunks.length; i++) {
      const start = ts.startTime + i * chunkDur
      const end = ts.startTime + (i + 1) * chunkDur
      events.push(`Dialogue: 0,${fmtTime(start)},${fmtTime(end)},Default,,0,0,0,,${chunks[i]}`)
    }
  }

  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,DejaVu Sans,32,&H00FFFFFF,&H000000FF,&H00000000,&H99000000,0,0,0,0,100,100,0,0,4,0,0,2,${Math.round(width * 0.1)},${Math.round(width * 0.1)},${Math.round(height * 0.04)}`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...events,
  ].join('\n')
}

// ─── Background video assembly ───

async function assembleVideo(
  jobId: string,
  chapters: ChapterInput[],
  mediaByChapter: Record<number, MediaItem[]>,
  bgMusicPath: string | null,
  musicVolume: number,
  tmpDir: string,
) {
  const W = 1920, H = 1080

  try {
    updateJob(jobId, { status: 'processing', progress: 'Preparing audio...' })

    // Write audio files and probe durations
    const chapterDurations: Record<number, number> = {}
    for (const ch of chapters) {
      if (ch.audioBase64) {
        const { buffer, ext } = stripDataUrl(ch.audioBase64)
        const audioPath = path.join(tmpDir, `audio_ch${ch.id}.${ext}`)
        await writeFile(audioPath, buffer)
        chapterDurations[ch.id] = await probeDuration(audioPath)
        console.log(`[story-video] ch${ch.id} audio: ${chapterDurations[ch.id].toFixed(1)}s`)
      } else {
        chapterDurations[ch.id] = 10
      }
    }

    const chapterTimestamps: Array<{ chapterId: number; startTime: number; endTime: number }> = []
    const chapterVideos: string[] = []
    let runningTime = 0

    for (let ci = 0; ci < chapters.length; ci++) {
      const ch = chapters[ci]
      updateJob(jobId, { progress: `Rendering chapter ${ci + 1}/${chapters.length}` })

      const duration = chapterDurations[ch.id]
      const media = mediaByChapter[ch.id] || []
      const audioPath = path.join(tmpDir, `audio_ch${ch.id}.mp3`)
      const audioExists = existsSync(audioPath) || existsSync(path.join(tmpDir, `audio_ch${ch.id}.wav`))
      const audioFile = existsSync(audioPath) ? audioPath : path.join(tmpDir, `audio_ch${ch.id}.wav`)
      const chapterVideoPath = path.join(tmpDir, `chapter_${ch.id}.mp4`)

      if (media.length === 0) {
        // No media — solid color with optional audio
        const args = ['-f', 'lavfi', '-i', `color=c=1a1a1a:size=${W}x${H}:rate=24:d=${duration}`]
        if (audioExists) args.push('-i', audioFile)
        args.push('-t', String(duration), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '23')
        if (audioExists) args.push('-c:a', 'aac', '-b:a', '128k')
        else args.push('-an')
        args.push('-movflags', '+faststart', '-y', chapterVideoPath)
        await runFfmpeg(args)
      } else {
        // Build clips for each media item
        const clips: string[] = []
        const baseItemDur = duration / media.length

        for (let j = 0; j < media.length; j++) {
          const m = media[j]
          const clipPath = path.join(tmpDir, `clip_ch${ch.id}_${j}.mp4`)
          const isLast = j === media.length - 1
          const clipDur = isLast ? (duration - j * baseItemDur) : baseItemDur

          if (m.isVideo) {
            await runFfmpeg([
              '-i', m.path,
              '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
              '-t', String(clipDur), '-r', '24',
              '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '23',
              '-an', '-movflags', '+faststart', '-y', clipPath,
            ])
          } else {
            // Image — Ken Burns at native 1920x1080 resolution
            const frames = Math.ceil(clipDur * 24)
            const zoom = j % 2 === 0
              ? `z='min(zoom+0.001,1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`
              : `z='if(eq(on,1),1.1,max(zoom-0.001,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`
            await runFfmpeg([
              '-stream_loop', '-1', '-i', m.path,
              '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=1a1a1a,zoompan=${zoom}:d=${frames}:s=${W}x${H}:fps=24`,
              '-t', String(clipDur),
              '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '23',
              '-y', clipPath,
            ])
          }
          clips.push(clipPath)
        }

        // Concat clips
        const concatList = path.join(tmpDir, `concat_ch${ch.id}.txt`)
        await writeFile(concatList, clips.map(f => `file '${f}'`).join('\n'))
        const videoOnly = path.join(tmpDir, `videoonly_ch${ch.id}.mp4`)
        await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', '-y', videoOnly])

        // Mux with audio
        if (audioExists) {
          await runFfmpeg([
            '-i', videoOnly, '-i', audioFile,
            '-t', String(duration), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
            '-movflags', '+faststart', '-y', chapterVideoPath,
          ])
        } else {
          await runFfmpeg(['-i', videoOnly, '-c', 'copy', '-y', chapterVideoPath])
        }
      }

      chapterVideos.push(chapterVideoPath)
      chapterTimestamps.push({ chapterId: ch.id, startTime: runningTime, endTime: runningTime + duration })
      runningTime += duration
    }

    // Concat all chapters
    updateJob(jobId, { progress: 'Joining chapters...' })
    const masterConcat = path.join(tmpDir, 'master_concat.txt')
    await writeFile(masterConcat, chapterVideos.map(f => `file '${f}'`).join('\n'))
    const masterRaw = path.join(tmpDir, 'master_raw.mp4')
    await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', masterConcat, '-c', 'copy', '-movflags', '+faststart', '-y', masterRaw])

    // Burn subtitles
    updateJob(jobId, { progress: 'Burning subtitles...' })
    const assPath = path.join(tmpDir, 'subtitles.ass')
    await writeFile(assPath, buildAssSubtitles(chapters, chapterDurations, chapterTimestamps, W, H))
    const masterSubs = path.join(tmpDir, 'master_subs.mp4')
    const escapedAss = assPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "'\\\\\\''")
    await runFfmpeg([
      '-i', masterRaw,
      '-vf', `ass='${escapedAss}'`,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '23',
      '-c:a', 'copy', '-movflags', '+faststart', '-y', masterSubs,
    ])

    // Mix background music
    const masterFinal = path.join(tmpDir, 'master_final.mp4')
    if (bgMusicPath && existsSync(bgMusicPath)) {
      updateJob(jobId, { progress: 'Mixing background music...' })
      const vol = Math.max(0, Math.min(1, musicVolume))
      await runFfmpeg([
        '-i', masterSubs, '-i', bgMusicPath,
        '-filter_complex', `[1:a]volume=${vol}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=3[aout]`,
        '-map', '0:v', '-map', '[aout]',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart', '-y', masterFinal,
      ])
    } else {
      await runFfmpeg(['-i', masterSubs, '-c', 'copy', '-y', masterFinal])
    }

    updateJob(jobId, {
      status: 'complete',
      progress: 'Complete',
      videoPath: masterFinal,
      duration: runningTime,
      chapterTimestamps,
      tmpDir,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[story-video] Job ${jobId} error:`, message)
    // List tmpDir contents for debugging
    try {
      if (existsSync(tmpDir)) {
        const { readdirSync } = require('fs')
        console.error(`[story-video] tmpDir files:`, (readdirSync(tmpDir) as string[]).join(', '))
      }
    } catch { /* ignore */ }
    updateJob(jobId, { status: 'error', error: message, progress: 'Failed', tmpDir })
  }
}

// ─── POST handler ───

export async function POST(req: NextRequest) {
  cleanOldJobs()
  const tmpDir = `/tmp/story_video_${Date.now()}`

  try {
    let chapters: ChapterInput[]
    let musicVolume = 0.15
    const mediaByChapter: Record<number, MediaItem[]> = {}
    let bgMusicPath: string | null = null

    await mkdir(tmpDir, { recursive: true })

    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      chapters = JSON.parse(formData.get('chapters') as string)
      musicVolume = parseFloat(formData.get('musicVolume') as string) || 0.15

      const mediaFiles = formData.getAll('media') as File[]
      const chapterIds = formData.getAll('mediaChapterIds') as string[]
      const counters: Record<number, number> = {}
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i]
        const chId = parseInt(chapterIds[i])
        if (!mediaByChapter[chId]) mediaByChapter[chId] = []
        if (counters[chId] === undefined) counters[chId] = 0
        const isVideo = file.type.startsWith('video/')
        const ext = extFromMime(file.type)
        const idx = String(counters[chId]++).padStart(4, '0')
        const mediaPath = path.join(tmpDir, `media_ch${chId}_${idx}.${ext}`)
        await streamFileToDisk(file, mediaPath)
        mediaByChapter[chId].push({ path: mediaPath, isVideo })
      }

      const bgFile = formData.get('bgMusic') as File | null
      if (bgFile) {
        bgMusicPath = path.join(tmpDir, 'bg_music.mp3')
        await streamFileToDisk(bgFile, bgMusicPath)
      }
    } else {
      const body = await req.json()
      chapters = body.chapters
      musicVolume = body.musicVolume ?? 0.15

      for (const img of (body.images || [])) {
        const chId = img.chapterId
        if (!mediaByChapter[chId]) mediaByChapter[chId] = []
        const { buffer, ext, isVideo } = stripDataUrl(img.imageBase64)
        const idx = String(mediaByChapter[chId].length).padStart(4, '0')
        const mediaPath = path.join(tmpDir, `media_ch${chId}_${idx}.${ext}`)
        await writeFile(mediaPath, buffer)
        mediaByChapter[chId].push({ path: mediaPath, isVideo })
      }

      if (body.backgroundMusicBase64) {
        const { buffer } = stripDataUrl(body.backgroundMusicBase64)
        bgMusicPath = path.join(tmpDir, 'bg_music.mp3')
        await writeFile(bgMusicPath, buffer)
      }
    }

    if (!chapters?.length) {
      return NextResponse.json({ error: 'chapters array is required' }, { status: 400 })
    }

    const job = createJob()
    assembleVideo(job.id, chapters, mediaByChapter, bgMusicPath, musicVolume, tmpDir)
    return NextResponse.json({ jobId: job.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-video/start] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

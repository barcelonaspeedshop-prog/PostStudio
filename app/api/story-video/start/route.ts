import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { exec } from 'child_process'
import { writeFile, mkdir, rm } from 'fs/promises'
import { createWriteStream, existsSync } from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import path from 'path'
import { createJob, updateJob, cleanOldJobs } from '../jobs'

const execAsync = promisify(exec)

export const maxDuration = 300
export const dynamic = 'force-dynamic'

type ChapterInput = {
  id: number
  title: string
  narration: string
  visual: string
  audioBase64: string
}

function stripDataUrl(dataUrl: string): { buffer: Buffer; ext: string; isVideo: boolean } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('Invalid data URL')
  const mime = match[1]
  const isVideo = mime.startsWith('video/') || mime.includes('quicktime')
  let ext: string
  if (mime.includes('mp4')) ext = 'mp4'
  else if (mime.includes('quicktime') || mime.includes('mov')) ext = 'mov'
  else if (mime.includes('webm')) ext = 'webm'
  else if (mime.includes('png')) ext = 'png'
  else if (mime.includes('webp')) ext = 'webp'
  else if (mime.includes('mp3') || mime.includes('mpeg')) ext = 'mp3'
  else ext = 'jpg'
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

async function probeDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`
  )
  return parseFloat(stdout.trim()) || 10
}

/** Stream a Web API File/Blob to disk without loading into memory */
async function streamFileToDisk(file: File, destPath: string): Promise<void> {
  const webStream = file.stream()
  const nodeReadable = Readable.fromWeb(webStream as Parameters<typeof Readable.fromWeb>[0])
  const writeStream = createWriteStream(destPath)
  await pipeline(nodeReadable, writeStream)
}

// --- Subtitle generation ---

type SubtitleChunk = {
  index: number
  startTime: number  // seconds from start of master video
  endTime: number
  text: string
}

/** Split narration into chunks of at most maxWords words */
function splitNarration(text: string, maxWords: number): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(' '))
  }
  return chunks
}

/** Format seconds to SRT timestamp: HH:MM:SS,mmm */
function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

/** Build subtitle chunks for all chapters with global timestamps */
function buildSubtitles(
  chapters: ChapterInput[],
  chapterDurations: Record<number, number>,
  chapterTimestamps: Array<{ chapterId: number; startTime: number; endTime: number }>,
): SubtitleChunk[] {
  const allChunks: SubtitleChunk[] = []
  let index = 1

  for (const ts of chapterTimestamps) {
    const chapter = chapters.find(c => c.id === ts.chapterId)
    if (!chapter || !chapter.narration) continue

    const duration = chapterDurations[chapter.id] || (ts.endTime - ts.startTime)
    const textChunks = splitNarration(chapter.narration, 8)
    if (textChunks.length === 0) continue

    const chunkDuration = duration / textChunks.length

    for (let i = 0; i < textChunks.length; i++) {
      allChunks.push({
        index: index++,
        startTime: ts.startTime + i * chunkDuration,
        endTime: ts.startTime + (i + 1) * chunkDuration,
        text: textChunks[i],
      })
    }
  }

  return allChunks
}

/** Generate SRT file content from subtitle chunks */
function generateSrt(chunks: SubtitleChunk[]): string {
  return chunks.map(c =>
    `${c.index}\n${formatSrtTime(c.startTime)} --> ${formatSrtTime(c.endTime)}\n${c.text}\n`
  ).join('\n')
}

// The actual video assembly — runs in the background
async function assembleVideoInBackground(
  jobId: string,
  chapters: ChapterInput[],
  mediaByChapter: Record<number, { path: string; isVideo: boolean }[]>,
  bgMusicPath: string | null,
  musicVolume: number,
  tmpDir: string,
) {
  try {
    updateJob(jobId, { status: 'processing', progress: 'Writing audio files...' })

    // Write audio files and probe durations
    const chapterDurations: Record<number, number> = {}
    for (const ch of chapters) {
      if (ch.audioBase64) {
        const { buffer } = stripDataUrl(ch.audioBase64)
        const audioPath = path.join(tmpDir, `audio_ch${ch.id}.mp3`)
        await writeFile(audioPath, buffer)
        chapterDurations[ch.id] = await probeDuration(audioPath)
      } else {
        chapterDurations[ch.id] = 10
      }
    }

    const formats = [
      { name: 'landscape', width: 1920, height: 1080 },
      { name: 'portrait', width: 1080, height: 1920 },
    ]
    const chapterTimestamps: Array<{ chapterId: number; startTime: number; endTime: number }> = []
    let totalDuration = 0
    // Store output file paths (not base64)
    const outputPaths: Record<string, string> = {}

    for (const fmt of formats) {
      updateJob(jobId, { progress: `Rendering ${fmt.name} video...` })
      const chapterVideos: string[] = []
      let runningTime = 0

      for (let ci = 0; ci < chapters.length; ci++) {
        const ch = chapters[ci]
        updateJob(jobId, { progress: `Rendering ${fmt.name} — chapter ${ci + 1}/${chapters.length}` })

        const duration = chapterDurations[ch.id]
        const chapterMedia = mediaByChapter[ch.id] || []
        const audioPath = path.join(tmpDir, `audio_ch${ch.id}.mp3`)
        const hasAudio = ch.audioBase64 && existsSync(audioPath)
        const chapterVideoPath = path.join(tmpDir, `chapter_${ch.id}_${fmt.name}.mp4`)

        if (chapterMedia.length === 0) {
          // No media — solid color placeholder, exact duration from audio
          if (hasAudio) {
            await execAsync(
              `ffmpeg -f lavfi -i color=c=1a1a1a:size=${fmt.width}x${fmt.height}:rate=30 ` +
              `-i "${audioPath}" -t ${duration} -c:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 23 ` +
              `-c:a aac -b:a 128k -movflags +faststart -y "${chapterVideoPath}"`
            )
          } else {
            await execAsync(
              `ffmpeg -f lavfi -i color=c=1a1a1a:size=${fmt.width}x${fmt.height}:rate=30 ` +
              `-t ${duration} -c:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 23 ` +
              `-an -movflags +faststart -y "${chapterVideoPath}"`
            )
          }
        } else {
          // Calculate per-image duration so total exactly equals chapter audio duration
          const mediaClips: string[] = []
          const baseItemDuration = duration / chapterMedia.length

          for (let j = 0; j < chapterMedia.length; j++) {
            const media = chapterMedia[j]
            const clipPath = path.join(tmpDir, `clip_ch${ch.id}_${j}_${fmt.name}.mp4`)
            // Last clip gets any remaining time to ensure exact total
            const isLast = j === chapterMedia.length - 1
            const clipStart = j * baseItemDuration
            const clipDuration = isLast ? (duration - clipStart) : baseItemDuration

            if (media.isVideo) {
              await execAsync(
                `ffmpeg -i "${media.path}" ` +
                `-vf "scale=${fmt.width}:${fmt.height}:force_original_aspect_ratio=decrease,pad=${fmt.width}:${fmt.height}:(ow-iw)/2:(oh-ih)/2,setsar=1" ` +
                `-t ${clipDuration} -r 30 -c:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 23 ` +
                `-an -movflags +faststart -y "${clipPath}"`
              )
            } else {
              // Image — scale to fit preserving aspect ratio, pad, then Ken Burns
              const frames = Math.ceil(clipDuration * 30)
              const zoomExpr = j % 2 === 0
                ? `z='min(zoom+0.0008,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`
                : `z='if(eq(on,1),1.2,max(zoom-0.0008,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`

              await execAsync(
                `ffmpeg -loop 1 -i "${media.path}" ` +
                `-vf "scale=${fmt.width * 2}:${fmt.height * 2}:force_original_aspect_ratio=decrease,pad=${fmt.width * 2}:${fmt.height * 2}:(ow-iw)/2:(oh-ih)/2:color=1a1a1a,zoompan=${zoomExpr}:d=${frames}:s=${fmt.width}x${fmt.height}:fps=30" ` +
                `-t ${clipDuration} -c:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 23 ` +
                `-y "${clipPath}"`
              )
            }
            mediaClips.push(clipPath)
          }

          // Concat media clips into one video track for this chapter
          const concatListPath = path.join(tmpDir, `concat_ch${ch.id}_${fmt.name}.txt`)
          const concatContent = mediaClips.map(f => `file '${f}'`).join('\n')
          await writeFile(concatListPath, concatContent)

          const videoOnlyPath = path.join(tmpDir, `videoonly_ch${ch.id}_${fmt.name}.mp4`)
          await execAsync(
            `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy -y "${videoOnlyPath}"`
          )

          // Mux with chapter audio — use -t to enforce exact duration, never -shortest
          if (hasAudio) {
            await execAsync(
              `ffmpeg -i "${videoOnlyPath}" -i "${audioPath}" ` +
              `-t ${duration} -c:v copy -c:a aac -b:a 128k -movflags +faststart -y "${chapterVideoPath}"`
            )
          } else {
            await execAsync(`cp "${videoOnlyPath}" "${chapterVideoPath}"`)
          }
        }

        chapterVideos.push(chapterVideoPath)

        if (fmt.name === 'landscape') {
          chapterTimestamps.push({
            chapterId: ch.id,
            startTime: runningTime,
            endTime: runningTime + duration,
          })
          runningTime += duration
        }
      }

      if (fmt.name === 'landscape') totalDuration = runningTime

      updateJob(jobId, { progress: `Finalizing ${fmt.name} video...` })

      const masterConcatPath = path.join(tmpDir, `master_concat_${fmt.name}.txt`)
      const masterConcatContent = chapterVideos.map(f => `file '${f}'`).join('\n')
      await writeFile(masterConcatPath, masterConcatContent)

      const masterConcatRaw = path.join(tmpDir, `master_concat_raw_${fmt.name}.mp4`)
      await execAsync(
        `ffmpeg -f concat -safe 0 -i "${masterConcatPath}" -c copy -movflags +faststart -y "${masterConcatRaw}"`
      )

      // Burn subtitles into landscape only — portrait (TikTok) skips subtitles
      const masterNoMixPath = path.join(tmpDir, `master_nomix_${fmt.name}.mp4`)
      if (fmt.name === 'landscape') {
        updateJob(jobId, { progress: `Burning subtitles into ${fmt.name} video...` })
        const subtitleChunks = buildSubtitles(chapters, chapterDurations, chapterTimestamps)
        const srtPath = path.join(tmpDir, `subtitles_${fmt.name}.srt`)
        await writeFile(srtPath, generateSrt(subtitleChunks))

        // Use an ASS subtitle file for reliable bottom positioning
        const assPath = path.join(tmpDir, `subtitles_${fmt.name}.ass`)
        const assContent = [
          '[Script Info]',
          'ScriptType: v4.00+',
          `PlayResX: ${fmt.width}`,
          `PlayResY: ${fmt.height}`,
          '',
          '[V4+ Styles]',
          'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
          `Style: Default,DejaVu Sans,32,&H00FFFFFF,&H000000FF,&H00000000,&H99000000,0,0,0,0,100,100,0,0,4,0,0,2,${Math.round(fmt.width * 0.1)},${Math.round(fmt.width * 0.1)},${Math.round(fmt.height * 0.04)}`,
          '',
          '[Events]',
          'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
          ...subtitleChunks.map(c => {
            const fmtAssTime = (s: number) => {
              const h = Math.floor(s / 3600)
              const m = Math.floor((s % 3600) / 60)
              const sec = Math.floor(s % 60)
              const cs = Math.round((s % 1) * 100)
              return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
            }
            return `Dialogue: 0,${fmtAssTime(c.startTime)},${fmtAssTime(c.endTime)},Default,,0,0,0,,${c.text}`
          }),
        ].join('\n')
        await writeFile(assPath, assContent)

        const escapedAssPath = assPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "'\\\\\\''")
        await execAsync(
          `ffmpeg -i "${masterConcatRaw}" ` +
          `-vf "ass='${escapedAssPath}'" ` +
          `-c:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 23 ` +
          `-c:a copy -movflags +faststart -y "${masterNoMixPath}"`
        )
      } else {
        // Portrait: no subtitles, just copy
        await execAsync(`cp "${masterConcatRaw}" "${masterNoMixPath}"`)
      }

      const masterFinalPath = path.join(tmpDir, `master_${fmt.name}.mp4`)
      if (bgMusicPath && existsSync(bgMusicPath)) {
        const vol = Math.max(0, Math.min(1, musicVolume))
        await execAsync(
          `ffmpeg -i "${masterNoMixPath}" -i "${bgMusicPath}" ` +
          `-filter_complex "[1:a]volume=${vol}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=3[aout]" ` +
          `-map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 128k -movflags +faststart -y "${masterFinalPath}"`
        )
      } else {
        await execAsync(`cp "${masterNoMixPath}" "${masterFinalPath}"`)
      }

      // Store the file path — do NOT read into memory or convert to base64
      outputPaths[fmt.name] = masterFinalPath
    }

    updateJob(jobId, {
      status: 'complete',
      progress: 'Complete',
      landscapePath: outputPaths.landscape,
      portraitPath: outputPaths.portrait,
      duration: totalDuration,
      chapterTimestamps,
      tmpDir, // keep tmpDir reference so we don't clean up yet
    })
    // Note: tmpDir cleanup happens after download or after 1 hour via cleanOldJobs
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[story-video] Job ${jobId} error:`, message)
    updateJob(jobId, { status: 'error', error: message, progress: 'Failed' })
    // Clean up on error
    try {
      if (existsSync(tmpDir)) await rm(tmpDir, { recursive: true, force: true })
    } catch { /* ignore */ }
  }
}

export async function POST(req: NextRequest) {
  cleanOldJobs()

  const tmpDir = `/tmp/story_video_${Date.now()}`
  try {
    const contentType = req.headers.get('content-type') || ''
    const isFormData = contentType.includes('multipart/form-data')

    let chapters: ChapterInput[]
    let musicVolume = 0.15
    type MediaItem = { path: string; isVideo: boolean }
    const mediaByChapter: Record<number, MediaItem[]> = {}
    let bgMusicPath: string | null = null

    await mkdir(tmpDir, { recursive: true })

    if (isFormData) {
      const formData = await req.formData()
      chapters = JSON.parse(formData.get('chapters') as string)
      musicVolume = parseFloat(formData.get('musicVolume') as string) || 0.15

      // Stream media files directly to disk — preserve FormData insertion order
      const mediaFiles = formData.getAll('media') as File[]
      const chapterIds = formData.getAll('mediaChapterIds') as string[]
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i]
        const chId = parseInt(chapterIds[i])
        if (!mediaByChapter[chId]) mediaByChapter[chId] = []
        const isVideo = file.type.startsWith('video/')
        const ext = extFromMime(file.type)
        // Zero-pad index to preserve order in any filesystem listing
        const idx = String(mediaByChapter[chId].length).padStart(4, '0')
        const prefix = isVideo ? 'vid' : 'img'
        const mediaPath = path.join(tmpDir, `${prefix}_ch${chId}_${idx}.${ext}`)
        await streamFileToDisk(file, mediaPath)
        mediaByChapter[chId].push({ path: mediaPath, isVideo })
      }

      // Stream background music to disk
      const bgMusicFile = formData.get('bgMusic') as File | null
      if (bgMusicFile) {
        bgMusicPath = path.join(tmpDir, 'bg_music.mp3')
        await streamFileToDisk(bgMusicFile, bgMusicPath)
      }
    } else {
      // Legacy JSON path for small files
      const body = await req.json() as {
        chapters: ChapterInput[]
        images: { chapterId: number; imageBase64: string }[]
        backgroundMusicBase64?: string
        musicVolume?: number
      }
      chapters = body.chapters
      musicVolume = body.musicVolume ?? 0.15

      for (const img of (body.images || [])) {
        const chId = img.chapterId
        if (!mediaByChapter[chId]) mediaByChapter[chId] = []
        const { buffer, ext, isVideo } = stripDataUrl(img.imageBase64)
        const idx = mediaByChapter[chId].length
        const prefix = isVideo ? 'vid' : 'img'
        const mediaPath = path.join(tmpDir, `${prefix}_ch${chId}_${idx}.${ext}`)
        await writeFile(mediaPath, buffer)
        mediaByChapter[chId].push({ path: mediaPath, isVideo })
      }

      if (body.backgroundMusicBase64) {
        const { buffer } = stripDataUrl(body.backgroundMusicBase64)
        bgMusicPath = path.join(tmpDir, 'bg_music.mp3')
        await writeFile(bgMusicPath, buffer)
      }
    }

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json({ error: 'chapters array is required' }, { status: 400 })
    }

    // Create job and start assembly in background (don't await)
    const job = createJob()
    assembleVideoInBackground(job.id, chapters, mediaByChapter, bgMusicPath, musicVolume, tmpDir)

    return NextResponse.json({ jobId: job.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-video/start] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

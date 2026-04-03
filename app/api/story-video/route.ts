import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'child_process'
import { exec } from 'child_process'
import { writeFile, mkdir, readFile, rm } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

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

type ImageInput = {
  chapterId: number
  imageBase64: string
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

async function probeDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`
  )
  return parseFloat(stdout.trim()) || 10
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

export async function POST(req: NextRequest) {
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
      // --- New FormData path: files sent as binary, no base64 ---
      const formData = await req.formData()
      chapters = JSON.parse(formData.get('chapters') as string)
      musicVolume = parseFloat(formData.get('musicVolume') as string) || 0.15

      // Process media files
      const mediaFiles = formData.getAll('media') as File[]
      const chapterIds = formData.getAll('mediaChapterIds') as string[]
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i]
        const chId = parseInt(chapterIds[i])
        if (!mediaByChapter[chId]) mediaByChapter[chId] = []
        const isVideo = file.type.startsWith('video/')
        const ext = extFromMime(file.type)
        const idx = mediaByChapter[chId].length
        const prefix = isVideo ? 'vid' : 'img'
        const mediaPath = path.join(tmpDir, `${prefix}_ch${chId}_${idx}.${ext}`)
        const arrayBuf = await file.arrayBuffer()
        await writeFile(mediaPath, Buffer.from(arrayBuf))
        mediaByChapter[chId].push({ path: mediaPath, isVideo })
      }

      // Background music (sent as file)
      const bgMusicFile = formData.get('bgMusic') as File | null
      if (bgMusicFile) {
        bgMusicPath = path.join(tmpDir, 'bg_music.mp3')
        const buf = await bgMusicFile.arrayBuffer()
        await writeFile(bgMusicPath, Buffer.from(buf))
      }
    } else {
      // --- Legacy JSON path (base64 data URLs) ---
      const body = await req.json() as {
        chapters: ChapterInput[]
        images: ImageInput[]
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

    // Write audio files and probe durations
    const chapterDurations: Record<number, number> = {}
    for (const ch of chapters) {
      if (ch.audioBase64) {
        const { buffer } = stripDataUrl(ch.audioBase64)
        const audioPath = path.join(tmpDir, `audio_ch${ch.id}.mp3`)
        await writeFile(audioPath, buffer)
        chapterDurations[ch.id] = await probeDuration(audioPath)
      } else {
        chapterDurations[ch.id] = 10 // fallback
      }
    }

    // Build videos for both orientations
    const results: Record<string, string> = {}
    const formats = [
      { name: 'landscape', width: 1920, height: 1080 },
      { name: 'portrait', width: 1080, height: 1920 },
    ]

    // Track chapter timestamps
    const chapterTimestamps: Array<{ chapterId: number; startTime: number; endTime: number }> = []
    let totalDuration = 0

    for (const fmt of formats) {
      const chapterVideos: string[] = []
      let runningTime = 0

      for (const ch of chapters) {
        const duration = chapterDurations[ch.id]
        const chapterMedia = mediaByChapter[ch.id] || []
        const audioPath = path.join(tmpDir, `audio_ch${ch.id}.mp3`)
        const hasAudio = ch.audioBase64 && existsSync(audioPath)
        const chapterVideoPath = path.join(tmpDir, `chapter_${ch.id}_${fmt.name}.mp4`)

        if (chapterMedia.length === 0) {
          // No media — solid color placeholder with audio
          if (hasAudio) {
            await execAsync(
              `ffmpeg -f lavfi -i color=c=1a1a1a:size=${fmt.width}x${fmt.height}:rate=30 ` +
              `-i "${audioPath}" -t ${duration} -c:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 23 ` +
              `-c:a aac -b:a 128k -shortest -movflags +faststart -y "${chapterVideoPath}"`
            )
          } else {
            await execAsync(
              `ffmpeg -f lavfi -i color=c=1a1a1a:size=${fmt.width}x${fmt.height}:rate=30 ` +
              `-t ${duration} -c:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 23 ` +
              `-an -movflags +faststart -y "${chapterVideoPath}"`
            )
          }
        } else {
          // Generate clips for each media item
          const itemDuration = duration / chapterMedia.length
          const mediaClips: string[] = []

          for (let j = 0; j < chapterMedia.length; j++) {
            const media = chapterMedia[j]
            const clipPath = path.join(tmpDir, `clip_ch${ch.id}_${j}_${fmt.name}.mp4`)

            if (media.isVideo) {
              // Video clip — scale/pad to target resolution, trim to allocated duration
              await execAsync(
                `ffmpeg -i "${media.path}" ` +
                `-vf "scale=${fmt.width}:${fmt.height}:force_original_aspect_ratio=decrease,pad=${fmt.width}:${fmt.height}:(ow-iw)/2:(oh-ih)/2,setsar=1" ` +
                `-t ${itemDuration} -r 30 -c:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 23 ` +
                `-an -movflags +faststart -y "${clipPath}"`
              )
            } else {
              // Image — Ken Burns effect (zoom in/out)
              const frames = Math.ceil(itemDuration * 30)
              const zoomExpr = j % 2 === 0
                ? `z='min(zoom+0.0008,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`
                : `z='if(eq(on,1),1.2,max(zoom-0.0008,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`

              await execAsync(
                `ffmpeg -loop 1 -i "${media.path}" ` +
                `-vf "scale=4000:-1,zoompan=${zoomExpr}:d=${frames}:s=${fmt.width}x${fmt.height}:fps=30" ` +
                `-t ${itemDuration} -c:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 23 ` +
                `-y "${clipPath}"`
              )
            }
            mediaClips.push(clipPath)
          }

          // Concat media clips for this chapter
          const concatListPath = path.join(tmpDir, `concat_ch${ch.id}_${fmt.name}.txt`)
          const concatContent = mediaClips.map(f => `file '${f}'`).join('\n')
          await writeFile(concatListPath, concatContent)

          const videoOnlyPath = path.join(tmpDir, `videoonly_ch${ch.id}_${fmt.name}.mp4`)
          await execAsync(
            `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy -y "${videoOnlyPath}"`
          )

          // Mux with chapter audio
          if (hasAudio) {
            await execAsync(
              `ffmpeg -i "${videoOnlyPath}" -i "${audioPath}" ` +
              `-c:v copy -c:a aac -b:a 128k -shortest -movflags +faststart -y "${chapterVideoPath}"`
            )
          } else {
            await execAsync(`cp "${videoOnlyPath}" "${chapterVideoPath}"`)
          }
        }

        chapterVideos.push(chapterVideoPath)

        // Track timestamps (only on first format pass)
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

      // Concat all chapters into master
      const masterConcatPath = path.join(tmpDir, `master_concat_${fmt.name}.txt`)
      const masterConcatContent = chapterVideos.map(f => `file '${f}'`).join('\n')
      await writeFile(masterConcatPath, masterConcatContent)

      const masterNoMixPath = path.join(tmpDir, `master_nomix_${fmt.name}.mp4`)
      await execAsync(
        `ffmpeg -f concat -safe 0 -i "${masterConcatPath}" -c copy -movflags +faststart -y "${masterNoMixPath}"`
      )

      // Mix background music if provided
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

      // Read and encode as base64
      const videoBuffer = await readFile(masterFinalPath)
      results[fmt.name] = `data:video/mp4;base64,${videoBuffer.toString('base64')}`
    }

    return NextResponse.json({
      landscape: results.landscape,
      portrait: results.portrait,
      duration: totalDuration,
      chapterTimestamps,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-video] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    // Cleanup
    try {
      if (existsSync(tmpDir)) await rm(tmpDir, { recursive: true, force: true })
    } catch { /* ignore cleanup errors */ }
  }
}

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

function stripDataUrl(dataUrl: string): { buffer: Buffer; ext: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('Invalid data URL')
  const mime = match[1]
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : mime.includes('mp3') || mime.includes('mpeg') ? 'mp3' : 'jpg'
  return { buffer: Buffer.from(match[2], 'base64'), ext }
}

async function probeDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`
  )
  return parseFloat(stdout.trim()) || 10
}

export async function POST(req: NextRequest) {
  const tmpDir = `/tmp/story_video_${Date.now()}`
  try {
    const { chapters, images, backgroundMusicBase64, musicVolume = 0.15 } = await req.json() as {
      chapters: ChapterInput[]
      images: ImageInput[]
      backgroundMusicBase64?: string
      musicVolume?: number
    }

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json({ error: 'chapters array is required' }, { status: 400 })
    }

    await mkdir(tmpDir, { recursive: true })

    // Group images by chapter
    const imagesByChapter: Record<number, string[]> = {}
    for (const img of (images || [])) {
      if (!imagesByChapter[img.chapterId]) imagesByChapter[img.chapterId] = []
      const { buffer, ext } = stripDataUrl(img.imageBase64)
      const imgPath = path.join(tmpDir, `img_ch${img.chapterId}_${imagesByChapter[img.chapterId].length}.${ext}`)
      await writeFile(imgPath, buffer)
      imagesByChapter[img.chapterId].push(imgPath)
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

    // Write background music if provided
    let bgMusicPath: string | null = null
    if (backgroundMusicBase64) {
      const { buffer } = stripDataUrl(backgroundMusicBase64)
      bgMusicPath = path.join(tmpDir, 'bg_music.mp3')
      await writeFile(bgMusicPath, buffer)
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
        const chapterImgs = imagesByChapter[ch.id] || []
        const audioPath = path.join(tmpDir, `audio_ch${ch.id}.mp3`)
        const hasAudio = ch.audioBase64 && existsSync(audioPath)
        const chapterVideoPath = path.join(tmpDir, `chapter_${ch.id}_${fmt.name}.mp4`)

        if (chapterImgs.length === 0) {
          // No images — solid color placeholder with audio
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
          // Generate Ken Burns clips for each image
          const imgDuration = duration / chapterImgs.length
          const imgClips: string[] = []

          for (let j = 0; j < chapterImgs.length; j++) {
            const imgPath = chapterImgs[j]
            const clipPath = path.join(tmpDir, `clip_ch${ch.id}_${j}_${fmt.name}.mp4`)
            const frames = Math.ceil(imgDuration * 30)

            // Alternate zoom in / zoom out for Ken Burns variety
            const zoomExpr = j % 2 === 0
              ? `z='min(zoom+0.0008,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`
              : `z='if(eq(on,1),1.2,max(zoom-0.0008,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`

            await execAsync(
              `ffmpeg -loop 1 -i "${imgPath}" ` +
              `-vf "scale=4000:-1,zoompan=${zoomExpr}:d=${frames}:s=${fmt.width}x${fmt.height}:fps=30" ` +
              `-t ${imgDuration} -c:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 23 ` +
              `-y "${clipPath}"`
            )
            imgClips.push(clipPath)
          }

          // Concat image clips for this chapter
          const concatListPath = path.join(tmpDir, `concat_ch${ch.id}_${fmt.name}.txt`)
          const concatContent = imgClips.map(f => `file '${f}'`).join('\n')
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

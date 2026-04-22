import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { writeFile, mkdir, rename, copyFile } from 'fs/promises'
import { createWriteStream, existsSync, statSync, readdirSync } from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import path from 'path'
import { createJob, updateJob, cleanOldJobs, VIDEOS_DIR } from '../jobs'
import { getRandomDriveMusicTrack, downloadDriveFileToPath } from '@/lib/drive-images'
import { getChannel } from '@/lib/channels'

// Local fallback music directories (mounted from /docker/poststudio/music)
const LOCAL_MUSIC: Record<'calm' | 'energy', string> = {
  calm:   '/music/Ambient',
  energy: '/music/Energetic',
}

function pickLocalMusicTrack(mood: 'calm' | 'energy'): string | null {
  try {
    const dir = LOCAL_MUSIC[mood]
    const files = readdirSync(dir).filter(f => /\.(mp3|m4a|wav|aac)$/i.test(f))
    if (files.length === 0) return null
    const picked = files[Math.floor(Math.random() * files.length)]
    return path.join(dir, picked)
  } catch {
    return null
  }
}

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

function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', filePath,
    ])
    let out = ''
    proc.stdout.on('data', (d: Buffer) => { out += d.toString() })
    proc.on('close', (code) => {
      const dur = parseFloat(out.trim())
      if (code === 0 && !isNaN(dur)) resolve(dur)
      else resolve(5) // fallback
    })
    proc.on('error', () => resolve(5))
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

// ─── Subtitle generation ───

type ChapterInfo = { id: number; narration?: string; title?: string }

function buildAss(chapters: ChapterInfo[], chapterDurations: Record<number, number>, W: number, H: number): string {
  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    const cs = Math.round((s % 1) * 100)
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
  }

  const events: string[] = []
  let offset = 0
  for (const ch of chapters) {
    const dur = chapterDurations[ch.id] || 5
    if (ch.narration) {
      const words = ch.narration.split(/\s+/).filter(w => w.length > 0)
      const chunks: string[] = []
      for (let i = 0; i < words.length; i += 10) chunks.push(words.slice(i, i + 10).join(' '))
      if (chunks.length > 0) {
        const chunkDur = dur / chunks.length
        for (let i = 0; i < chunks.length; i++) {
          events.push(`Dialogue: 0,${fmtTime(offset + i * chunkDur)},${fmtTime(offset + (i + 1) * chunkDur)},Default,,0,0,0,,${chunks[i]}`)
        }
      }
    }
    offset += dur
  }

  return [
    '[Script Info]', 'ScriptType: v4.00+', `PlayResX: ${W}`, `PlayResY: ${H}`, '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,DejaVu Sans,28,&H00FFFFFF,&H000000FF,&H00000000,&H99000000,0,0,0,0,100,100,0,0,4,0,0,2,${Math.round(W * 0.1)},${Math.round(W * 0.1)},${Math.round(H * 0.04)}`,
    '', '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...events,
  ].join('\n')
}

// ─── Background assembly ───

function escapeDrawtext(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/\[/g, '\\[').replace(/\]/g, '\\]')
}

async function appendCtaEndCard(mainPath: string, ctaPath: string, outPath: string, tmpDir: string): Promise<void> {
  try {
    await runFfmpeg([
      '-i', mainPath, '-i', ctaPath,
      '-filter_complex', '[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[outv][outa]',
      '-map', '[outv]', '-map', '[outa]',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', outPath,
    ])
  } catch {
    // Main video may have no audio stream — add silent audio then retry
    const mainSilenced = path.join(tmpDir, 'main_with_silence.mp4')
    const dur = await probeDuration(mainPath)
    await runFfmpeg([
      '-i', mainPath,
      '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo`,
      '-filter_complex', `[1:a]atrim=duration=${dur.toFixed(3)}[aout]`,
      '-map', '0:v', '-map', '[aout]',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-y', mainSilenced,
    ])
    await runFfmpeg([
      '-i', mainSilenced, '-i', ctaPath,
      '-filter_complex', '[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[outv][outa]',
      '-map', '[outv]', '-map', '[outa]',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', outPath,
    ])
  }
}

async function assembleInBackground(
  jobId: string,
  chapters: ChapterInfo[],
  mediaByChapter: Record<number, MediaItem[]>,
  audioByChapter: Record<number, string>,
  musicPath: string | null,
  musicVolume: number,
  tmpDir: string,
  channelName?: string,
) {
  const W = 1920, H = 1080, DEFAULT_IMAGE_DUR = 5
  const chapterIds = chapters.map(c => c.id)

  try {
    updateJob(jobId, { status: 'processing', progress: 'Starting assembly...' })

    // Probe audio durations for chapters that have voiceover
    const audioDurations: Record<number, number> = {}
    for (const chId of chapterIds) {
      const audioPath = audioByChapter[chId]
      if (audioPath) {
        try {
          const dur = await probeDuration(audioPath)
          // Only use audio-driven timing if we get a plausible duration (> 1s)
          if (dur > 1) {
            audioDurations[chId] = dur
            console.log(`[story-video] Chapter ${chId} audio duration: ${dur.toFixed(2)}s`)
          } else {
            console.log(`[story-video] Chapter ${chId} audio probe returned ${dur}s, using default image timing`)
          }
        } catch (e) {
          console.log(`[story-video] Chapter ${chId} audio probe failed, using default image timing`)
        }
      }
    }

    const chapterVideos: string[] = []
    const chapterDurations: Record<number, number> = {}

    for (let ci = 0; ci < chapterIds.length; ci++) {
      const chId = chapterIds[ci]
      const isLastChapter = ci === chapterIds.length - 1
      updateJob(jobId, { progress: `Rendering chapter ${ci + 1}/${chapterIds.length}` })

      const media = mediaByChapter[chId] || []
      const chapterVideoPath = path.join(tmpDir, `chapter_${chId}.mp4`)

      if (media.length === 0) {
        // No media — use audio duration or default 5s black frame
        const dur = audioDurations[chId] || DEFAULT_IMAGE_DUR
        await runFfmpeg([
          '-f', 'lavfi', '-i', `color=c=black:size=${W}x${H}:rate=24:d=${dur}`,
          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', '28',
          '-an', '-movflags', '+faststart', '-y', chapterVideoPath,
        ])
        chapterDurations[chId] = dur
      } else {
        // Count images vs videos to compute per-image duration from audio
        const imageCount = media.filter(m => !m.isVideo).length
        const audioDur = audioDurations[chId]
        let perImageDur = DEFAULT_IMAGE_DUR

        // If audio exists, divide its duration equally across images
        // Video clips keep their natural duration (subtracted from audio time budget)
        if (audioDur && imageCount > 0) {
          // First pass: probe video clip durations to subtract from audio budget
          let videoClipBudget = 0
          for (let j = 0; j < media.length; j++) {
            if (media[j].isVideo) {
              videoClipBudget += await probeDuration(media[j].path)
            }
          }
          // Time remaining for images after video clips (at least 2s per image)
          const imageTimeBudget = Math.max(audioDur - videoClipBudget, imageCount * 2)
          perImageDur = Math.max(imageTimeBudget / imageCount, 2)
          console.log(`[story-video] Chapter ${chId}: audio=${audioDur.toFixed(2)}s, videos=${videoClipBudget.toFixed(2)}s, ${imageCount} images @ ${perImageDur.toFixed(2)}s each`)
        }

        // Build a clip per media item
        const clips: string[] = []
        let chapterDur = 0

        for (let j = 0; j < media.length; j++) {
          const m = media[j]
          const clipPath = path.join(tmpDir, `clip_ch${chId}_${j}.mp4`)

          if (!existsSync(m.path)) {
            throw new Error(`Media file missing: ${m.path}`)
          }

          if (m.isVideo) {
            // Video: scale/pad to 1920x1080, preserve full duration
            await runFfmpeg([
              '-i', m.path,
              '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
              '-r', '24',
              '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', '28',
              '-an', '-movflags', '+faststart', '-y', clipPath,
            ])
            const clipDur = await probeDuration(clipPath)
            chapterDur += clipDur
          } else {
            // Image duration: audio-driven or default 5s (minimum 2s to avoid ffmpeg errors)
            const imgDur = Math.max(perImageDur, 2)
            const frames = Math.max(Math.round(imgDur * 24), 48)
            console.log(`[story-video] Image clip ch${chId}[${j}]: dur=${imgDur.toFixed(2)}s frames=${frames} path=${m.path}`)
            // Use lavfi color source + overlay with subtle Ken Burns.
            // Scale to 2x target (not 8000) to avoid OOM on the VPS — zoom is only 0.0005/frame.
            await runFfmpeg([
              '-f', 'lavfi', '-i', `color=black:size=${W}x${H}:rate=24`,
              '-i', m.path,
              '-filter_complex', `[1:v]scale=${W * 2}:-1,zoompan=z='zoom+0.0005':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=24,setsar=1[zoomed];[0:v][zoomed]overlay=shortest=1`,
              '-t', String(imgDur),
              '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '23',
              '-y', clipPath,
            ])
            chapterDur += imgDur
          }
          clips.push(clipPath)
        }

        // Concat clips into chapter video (trailing newline ensures last entry is read)
        const concatList = path.join(tmpDir, `concat_ch${chId}.txt`)
        await writeFile(concatList, clips.map(f => `file '${f}'`).join('\n') + '\n')
        const chapterVideoOnly = path.join(tmpDir, `chapter_${chId}_video.mp4`)
        await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', '-y', chapterVideoOnly])

        // Mux chapter audio into the chapter video if available
        const chapterAudioPath = audioByChapter[chId]
        if (chapterAudioPath && existsSync(chapterAudioPath)) {
          console.log(`[story-video] Muxing audio into chapter ${chId} video`)
          await runFfmpeg([
            '-i', chapterVideoOnly,
            '-i', chapterAudioPath,
            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
            '-shortest', '-movflags', '+faststart', '-y', chapterVideoPath,
          ])
        } else {
          // No audio — just rename
          await rename(chapterVideoOnly, chapterVideoPath)
        }

        // Add 0.5s buffer to final chapter to prevent early cutoff
        if (isLastChapter) {
          chapterDur += 0.5
        }
        chapterDurations[chId] = chapterDur
      }

      chapterVideos.push(chapterVideoPath)
    }

    // Concat all chapters into raw video (trailing newline ensures last chapter is included)
    updateJob(jobId, { progress: 'Joining chapters...' })
    const masterConcat = path.join(tmpDir, 'master_concat.txt')
    await writeFile(masterConcat, chapterVideos.map(f => `file '${f}'`).join('\n') + '\n')
    const masterRaw = path.join(tmpDir, 'master_raw.mp4')
    await runFfmpeg([
      '-f', 'concat', '-safe', '0', '-i', masterConcat,
      '-c', 'copy', '-movflags', '+faststart', '-y', masterRaw,
    ])

    // Burn subtitles (chapterDurations already computed with actual video durations above)
    updateJob(jobId, { progress: 'Burning subtitles...' })
    const assPath = path.join(tmpDir, 'subtitles.ass')
    await writeFile(assPath, buildAss(chapters, chapterDurations, W, H))
    const escapedAss = assPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "'\\\\\\''")
    const masterFinal = path.join(tmpDir, 'master_final.mp4')
    await runFfmpeg([
      '-i', masterRaw,
      '-vf', `ass='${escapedAss}'`,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', '28',
      '-c:a', 'copy', '-movflags', '+faststart', '-y', masterFinal,
    ])

    // Mix background music if provided
    let outputVideo = masterFinal
    if (musicPath && existsSync(musicPath)) {
      updateJob(jobId, { progress: 'Mixing background music...' })
      const masterWithMusic = path.join(tmpDir, 'master_with_music.mp4')
      const vol = Math.max(0, Math.min(1, musicVolume))

      // Probe the video file for audio streams
      const hasAudioStream = await new Promise<boolean>((resolve) => {
        const proc = spawn('ffprobe', [
          '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index',
          '-of', 'csv=p=0', masterFinal,
        ])
        let out = ''
        proc.stdout.on('data', (d: Buffer) => { out += d.toString() })
        proc.on('close', () => resolve(out.trim().length > 0))
        proc.on('error', () => resolve(false))
      })
      console.log(`[story-video] Video has audio stream: ${hasAudioStream}`)

      // Pre-loop the music track to exactly the video duration before mixing.
      // Using -stream_loop + -shortest at mix time can truncate the full video
      // to the music track length when the track is shorter than the video.
      const videoDuration = await probeDuration(masterFinal)
      console.log(`[story-video] Pre-looping music to ${videoDuration.toFixed(2)}s`)
      const loopedMusicPath = path.join(tmpDir, 'bg_music_looped.aac')
      try {
        await runFfmpeg([
          '-stream_loop', '-1', '-i', musicPath,
          '-t', videoDuration.toFixed(3),
          '-vn', '-c:a', 'aac', '-b:a', '128k',
          '-y', loopedMusicPath,
        ])
      } catch {
        // Fallback: trim without looping (music fades out if shorter than video)
        console.warn('[story-video] Music pre-loop failed, trimming without loop')
        try {
          await runFfmpeg([
            '-i', musicPath,
            '-t', videoDuration.toFixed(3),
            '-vn', '-c:a', 'aac', '-b:a', '128k',
            '-y', loopedMusicPath,
          ])
        } catch {
          console.warn('[story-video] Music trim also failed — skipping music')
        }
      }
      const musicInput = existsSync(loopedMusicPath) ? loopedMusicPath : null

      if (musicInput) {
        if (hasAudioStream) {
          // Mix music under existing voiceover audio
          await runFfmpeg([
            '-i', masterFinal,
            '-i', musicInput,
            '-filter_complex', `[1:a]volume=${vol}[music];[0:a][music]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
            '-map', '0:v', '-map', '[aout]',
            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
            '-movflags', '+faststart', '-y', masterWithMusic,
          ])
        } else {
          // No voiceover — add music as the only audio track
          await runFfmpeg([
            '-i', masterFinal,
            '-i', musicInput,
            '-filter_complex', `[1:a]volume=${vol}[aout]`,
            '-map', '0:v', '-map', '[aout]',
            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
            '-movflags', '+faststart', '-y', masterWithMusic,
          ])
        }
        outputVideo = masterWithMusic
      }
    }

    // Append 5-second CTA end card if a channel name is provided
    if (channelName) {
      try {
        updateJob(jobId, { progress: 'Adding end card...' })
        const ch = getChannel(channelName)
        const boldFont = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
        const regFont = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
        const colorHex = ch.primary.replace('#', '0x')
        const nameEsc = escapeDrawtext(ch.name)
        const handleEsc = escapeDrawtext(ch.handle)
        const ctaDur = 5
        const ctaCard = path.join(tmpDir, 'cta_end_card.mp4')
        const vfFilters = [
          `drawtext=fontfile='${boldFont}':text='${nameEsc}':fontcolor=${colorHex}:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2-80`,
          `drawtext=fontfile='${regFont}':text='${handleEsc}':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=(h-text_h)/2+20`,
          `drawtext=fontfile='${regFont}':text='Subscribe for more':fontcolor=0xAAAAAA:fontsize=32:x=(w-text_w)/2:y=(h-text_h)/2+80`,
          `fade=t=in:st=0:d=0.5`,
          `fade=t=out:st=${ctaDur - 0.5}:d=0.5`,
        ].join(',')
        await runFfmpeg([
          '-f', 'lavfi', '-i', `color=c=black:s=1920x1080:d=${ctaDur}:r=30`,
          '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo`,
          '-t', String(ctaDur),
          '-vf', vfFilters,
          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast',
          '-c:a', 'aac', '-b:a', '128k',
          '-y', ctaCard,
        ])
        const withCta = path.join(tmpDir, 'master_with_cta.mp4')
        await appendCtaEndCard(outputVideo, ctaCard, withCta, tmpDir)
        outputVideo = withCta
        console.log(`[story-video] CTA end card appended for "${channelName}"`)
      } catch (e) {
        console.warn('[story-video] CTA end card failed (non-fatal):', e instanceof Error ? e.message : e)
      }
    }

    const totalDuration = Object.values(chapterDurations).reduce((a, b) => a + b, 0)

    // Copy final video to /data/videos/ so it survives Docker restarts
    let persistedVideoPath = outputVideo
    try {
      if (!existsSync(VIDEOS_DIR)) await mkdir(VIDEOS_DIR, { recursive: true })
      const persistedName = `${jobId}.mp4`
      const dest = path.join(VIDEOS_DIR, persistedName)
      await copyFile(outputVideo, dest)
      persistedVideoPath = dest
      console.log(`[story-video] Video persisted to ${dest}`)
    } catch (e) {
      console.warn('[story-video] Failed to persist video to /data/videos (using tmp path):', e instanceof Error ? e.message : e)
    }

    updateJob(jobId, {
      status: 'complete',
      progress: 'Complete',
      videoPath: persistedVideoPath,
      duration: totalDuration,
      tmpDir,
      chapterOrder: chapters.map(c => c.id),
      chapterDurations,
      chapterTitles: Object.fromEntries(
        chapters.filter(c => c.title).map(c => [c.id, c.title!])
      ),
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

    const chapters: ChapterInfo[] = JSON.parse(chaptersRaw)
    console.log(`[story-video/start] chapters=${JSON.stringify(chapters)}`)

    // Stream media files to disk
    const mediaFiles = formData.getAll('media') as File[]
    const mediaChapterIds = formData.getAll('mediaChapterIds') as string[]
    console.log(`[story-video/start] received ${mediaFiles.length} media files, ${mediaChapterIds.length} chapterIds`)
    mediaFiles.forEach((f, i) => console.log(`  media[${i}]: name=${f.name} type=${f.type} size=${(f.size/1024).toFixed(1)}KB chapterId=${mediaChapterIds[i]}`))
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

    // Stream chapter audio files to disk
    const audioFiles = formData.getAll('audio') as File[]
    const audioChapterIds = formData.getAll('audioChapterIds') as string[]
    const audioByChapter: Record<number, string> = {}

    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i]
      const chId = parseInt(audioChapterIds[i])
      const ext = file.type.includes('wav') ? 'wav' : 'mp3'
      const audioPath = path.join(tmpDir, `audio_ch${chId}.${ext}`)
      await streamToDisk(file, audioPath)
      audioByChapter[chId] = audioPath
      console.log(`[story-video] Received audio for chapter ${chId}: ${file.name} (${(file.size / 1024).toFixed(1)} KB, type=${file.type})`)
    }
    console.log(`[story-video] Audio files received for ${Object.keys(audioByChapter).length} chapters: [${Object.keys(audioByChapter).join(', ')}]`)

    // Stream background music to disk — either uploaded file or Drive mood pick
    let musicPath: string | null = null
    let musicVolume = 0.15
    const musicFile = formData.get('music') as File | null
    const musicMood = formData.get('musicMood') as string | null
    const musicVolumeRaw = formData.get('musicVolume') as string | null
    // musicEnabled='false' means skip all music mixing (voiceover stays; no bed)
    const musicEnabled = formData.get('musicEnabled') !== 'false'

    if (!musicEnabled) {
      console.log('[story-video] Music disabled — skipping music track')
    } else if (musicFile && musicFile.size > 0) {
      // Legacy: uploaded file
      const ext = musicFile.name.split('.').pop() || 'mp3'
      musicPath = path.join(tmpDir, `bg_music.${ext}`)
      await streamToDisk(musicFile, musicPath)
    } else if (musicMood === 'calm' || musicMood === 'energy') {
      // Pick a random track: try Google Drive first, fall back to local /music/ mount
      try {
        const track = await getRandomDriveMusicTrack(musicMood)
        if (track) {
          const ext = track.name.split('.').pop() || 'mp3'
          musicPath = path.join(tmpDir, `bg_music.${ext}`)
          await downloadDriveFileToPath(track.id, musicPath)
          console.log(`[story-video] Drive music track (${musicMood}): ${track.name}`)
        } else {
          // Drive folder is empty — try local fallback
          const local = pickLocalMusicTrack(musicMood)
          if (local) {
            musicPath = local
            console.log(`[story-video] Local music fallback (${musicMood}): ${path.basename(local)}`)
          } else {
            console.warn(`[story-video] No tracks found in Drive or local /music/${musicMood === 'calm' ? 'Ambient' : 'Energetic'}/ — continuing without music`)
          }
        }
      } catch (e) {
        console.warn(`[story-video] Drive music fetch failed for mood "${musicMood}":`, e instanceof Error ? e.message : e)
        // Try local fallback on Drive error
        const local = pickLocalMusicTrack(musicMood)
        if (local) {
          musicPath = local
          console.log(`[story-video] Local music fallback (after Drive error, ${musicMood}): ${path.basename(local)}`)
        }
      }
    }
    if (musicVolumeRaw) {
      musicVolume = Math.max(0, Math.min(1, parseFloat(musicVolumeRaw) || 0.15))
    }

    const channelName = (formData.get('channel') as string | null) || undefined

    const job = createJob()
    const mediaSummary = Object.entries(mediaByChapter).map(([ch, items]) => `ch${ch}:${items.length}files`).join(', ')
    console.log(`[story-video/start] spawning job ${job.id} — media: ${mediaSummary || 'none'}, music: ${musicPath ? 'yes' : 'no'}, channel: ${channelName}`)
    assembleInBackground(job.id, chapters, mediaByChapter, audioByChapter, musicPath, musicVolume, tmpDir, channelName)
    return NextResponse.json({ jobId: job.id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-video/start] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

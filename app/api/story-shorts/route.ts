import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { exec } from 'child_process'
import { writeFile, mkdir, readFile, rm } from 'fs/promises'
import { createWriteStream, existsSync } from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import path from 'path'

const execAsync = (cmd: string) => promisify(exec)(cmd, { maxBuffer: 50 * 1024 * 1024, timeout: 120_000 })

export const maxDuration = 300
export const dynamic = 'force-dynamic'

type ChapterTimestamp = {
  chapterId: number
  title: string
  startTime: number
  endTime: number
}

export async function POST(req: NextRequest) {
  const tmpDir = `/tmp/story_shorts_${Date.now()}`
  try {
    const contentType = req.headers.get('content-type') || ''
    const isFormData = contentType.includes('multipart/form-data')

    let chapters: ChapterTimestamp[]
    const masterPath = path.join(tmpDir, 'master.mp4')
    await mkdir(tmpDir, { recursive: true })

    if (isFormData) {
      // New path: video sent as binary file via FormData
      const formData = await req.formData()
      chapters = JSON.parse(formData.get('chapters') as string)
      const videoFile = formData.get('video') as File
      if (!videoFile) {
        return NextResponse.json({ error: 'video file is required' }, { status: 400 })
      }
      // Stream video to disk
      const webStream = videoFile.stream()
      const nodeReadable = Readable.fromWeb(webStream as Parameters<typeof Readable.fromWeb>[0])
      await pipeline(nodeReadable, createWriteStream(masterPath))
    } else {
      // Legacy JSON path
      const { videoBase64, chapters: ch } = await req.json() as {
        videoBase64: string
        chapters: ChapterTimestamp[]
      }
      chapters = ch
      if (!videoBase64) {
        return NextResponse.json({ error: 'videoBase64 is required' }, { status: 400 })
      }
      const match = videoBase64.match(/^data:[^;]+;base64,(.+)$/)
      if (!match) {
        return NextResponse.json({ error: 'Invalid video data URL' }, { status: 400 })
      }
      await writeFile(masterPath, Buffer.from(match[1], 'base64'))
    }

    if (!chapters || chapters.length === 0) {
      return NextResponse.json({ error: 'chapters array is required' }, { status: 400 })
    }

    // Cut each chapter
    const shorts: Array<{ chapterId: number; title: string; video: string; duration: number }> = []

    for (const ch of chapters) {
      const duration = ch.endTime - ch.startTime
      if (duration <= 0) continue

      const shortPath = path.join(tmpDir, `short_ch${ch.chapterId}.mp4`)
      await execAsync(
        `ffmpeg -i "${masterPath}" -ss ${ch.startTime} -to ${ch.endTime} ` +
        `-c:v libx264 -preset ultrafast -crf 23 -c:a aac -b:a 128k ` +
        `-r 30 -movflags +faststart -y "${shortPath}"`
      )

      // Shorts are small enough for base64 (individual chapter clips, typically < 30MB)
      const videoBuffer = await readFile(shortPath)
      shorts.push({
        chapterId: ch.chapterId,
        title: ch.title,
        video: `data:video/mp4;base64,${videoBuffer.toString('base64')}`,
        duration: Math.round(duration),
      })
    }

    return NextResponse.json({ shorts })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-shorts] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    try {
      if (existsSync(tmpDir)) await rm(tmpDir, { recursive: true, force: true })
    } catch { /* ignore cleanup errors */ }
  }
}

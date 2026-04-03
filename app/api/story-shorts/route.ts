import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'child_process'
import { exec } from 'child_process'
import { writeFile, mkdir, readFile, rm } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

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
    const { videoBase64, chapters } = await req.json() as {
      videoBase64: string
      chapters: ChapterTimestamp[]
    }

    if (!videoBase64 || !chapters || chapters.length === 0) {
      return NextResponse.json(
        { error: 'videoBase64 and chapters array are required' },
        { status: 400 }
      )
    }

    await mkdir(tmpDir, { recursive: true })

    // Write master video to disk
    const match = videoBase64.match(/^data:[^;]+;base64,(.+)$/)
    if (!match) {
      return NextResponse.json({ error: 'Invalid video data URL' }, { status: 400 })
    }
    const masterPath = path.join(tmpDir, 'master.mp4')
    await writeFile(masterPath, Buffer.from(match[1], 'base64'))

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

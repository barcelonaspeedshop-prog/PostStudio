import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, existsSync } from 'fs'
import { spawn } from 'child_process'
import path from 'path'
import { google } from 'googleapis'
import { getAuthenticatedClient } from '@/lib/youtube'
import { getJob, updateJob } from '../jobs'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
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

async function getVideoPathForFormat(
  jobId: string,
  format: string,
): Promise<string> {
  const job = getJob(jobId)
  if (!job) throw new Error('Job not found')
  if (job.status !== 'complete') throw new Error('Job not complete')
  if (!job.videoPath || !existsSync(job.videoPath)) throw new Error('Video file not found')

  if (format === 'youtube' || format === 'original') return job.videoPath

  const tmpDir = job.tmpDir || '/tmp'

  if (format === 'square') {
    const squarePath = job.squarePath && existsSync(job.squarePath)
      ? job.squarePath
      : path.join(tmpDir, 'format_square.mp4')
    if (!existsSync(squarePath)) {
      await runFfmpeg([
        '-i', job.videoPath,
        '-vf', 'crop=1080:1080:(iw-1080)/2:0,setsar=1',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', '23',
        '-c:a', 'copy', '-movflags', '+faststart', '-y', squarePath,
      ])
      updateJob(jobId, { squarePath })
    }
    return squarePath
  }

  if (format === 'reels') {
    const reelsPath = job.reelsPath && existsSync(job.reelsPath)
      ? job.reelsPath
      : path.join(tmpDir, 'format_reels.mp4')
    if (!existsSync(reelsPath)) {
      await runFfmpeg([
        '-i', job.videoPath,
        '-vf', 'scale=1080:608:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', '23',
        '-c:a', 'copy', '-movflags', '+faststart', '-y', reelsPath,
      ])
      updateJob(jobId, { reelsPath })
    }
    return reelsPath
  }

  throw new Error(`Unknown format: ${format}`)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      jobId: string
      channelName: string
      title: string
      description: string
      tags: string[]
      format?: string
      thumbnailBase64?: string
      privacyStatus?: string
    }

    const { jobId, channelName, title, description, tags, thumbnailBase64 } = body
    const format = body.format || 'youtube'
    const privacyStatus = body.privacyStatus || 'public'

    if (!jobId || !channelName || !title) {
      return NextResponse.json({ error: 'jobId, channelName, and title are required' }, { status: 400 })
    }

    const videoPath = await getVideoPathForFormat(jobId, format)

    const oauth2 = await getAuthenticatedClient(channelName)
    const youtube = google.youtube({ version: 'v3', auth: oauth2 })

    console.log(`[publish] Uploading "${title}" to ${channelName} (format: ${format})`)

    const insertRes = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description,
          tags,
          categoryId: '17',
          defaultLanguage: 'en',
          defaultAudioLanguage: 'en',
        },
        status: { privacyStatus },
      },
      media: {
        mimeType: 'video/mp4',
        body: createReadStream(videoPath),
      },
    })

    const videoId = insertRes.data.id
    if (!videoId) throw new Error('YouTube did not return a video ID')

    console.log(`[publish] Upload complete: https://youtube.com/watch?v=${videoId}`)

    // Set custom thumbnail if provided
    if (thumbnailBase64) {
      try {
        const thumbBuffer = Buffer.from(thumbnailBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
        const { Readable } = await import('stream')
        await youtube.thumbnails.set({
          videoId,
          media: {
            mimeType: 'image/jpeg',
            body: Readable.from(thumbBuffer),
          },
        })
        console.log(`[publish] Thumbnail set for video ${videoId}`)
      } catch (thumbErr) {
        console.warn(`[publish] Thumbnail upload failed (non-fatal):`, thumbErr instanceof Error ? thumbErr.message : thumbErr)
      }
    }

    return NextResponse.json({
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      channelName,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[publish] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

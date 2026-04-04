import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, existsSync, statSync } from 'fs'
import { Readable } from 'stream'
import { getJob } from '../../jobs'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const job = getJob(jobId)

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.status !== 'complete') return NextResponse.json({ error: 'Job not complete' }, { status: 400 })
  if (!job.videoPath || !existsSync(job.videoPath)) {
    return NextResponse.json({ error: 'Video file not found' }, { status: 404 })
  }

  const stat = statSync(job.videoPath)
  const stream = Readable.toWeb(createReadStream(job.videoPath)) as ReadableStream

  return new Response(stream, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(stat.size),
      'Content-Disposition': 'attachment; filename="story_video.mp4"',
    },
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, existsSync, statSync } from 'fs'
import { Readable } from 'stream'
import { getJob } from '../../../jobs'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string; format: string }> }
) {
  const { jobId, format } = await params

  if (format !== 'landscape' && format !== 'portrait') {
    return NextResponse.json({ error: 'Format must be landscape or portrait' }, { status: 400 })
  }

  const job = getJob(jobId)
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  if (job.status !== 'complete') {
    return NextResponse.json({ error: 'Job not complete' }, { status: 400 })
  }

  const filePath = format === 'landscape' ? job.landscapePath : job.portraitPath
  if (!filePath || !existsSync(filePath)) {
    return NextResponse.json({ error: 'Video file not found' }, { status: 404 })
  }

  const stat = statSync(filePath)
  const fileStream = createReadStream(filePath)
  const webStream = Readable.toWeb(fileStream) as ReadableStream

  return new Response(webStream, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(stat.size),
      'Content-Disposition': `attachment; filename="story_${format}.mp4"`,
    },
  })
}

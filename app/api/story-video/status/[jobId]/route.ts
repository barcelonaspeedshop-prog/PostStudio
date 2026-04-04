import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '../../jobs'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const job = getJob(jobId)

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const response: Record<string, unknown> = {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
  }

  if (job.status === 'complete') {
    response.downloadUrl = `/api/story-video/download/${jobId}`
    response.duration = job.duration
    response.chapterTimestamps = job.chapterTimestamps
  }

  if (job.status === 'error') response.error = job.error

  return NextResponse.json(response)
}

import { rm } from 'fs/promises'
import { existsSync } from 'fs'

export type JobStatus = 'pending' | 'processing' | 'complete' | 'error'

export type Job = {
  id: string
  status: JobStatus
  progress: string
  videoPath?: string
  duration?: number
  error?: string
  tmpDir?: string
  createdAt: number
  // Chapter timing data — used by the clip route to cut at boundaries
  chapterOrder?: number[]
  chapterDurations?: Record<number, number>
  chapterTitles?: Record<number, string>
  // Cached format variants (created on first request)
  squarePath?: string
  reelsPath?: string
}

const jobs = new Map<string, Job>()

export function createJob(): Job {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const job: Job = { id, status: 'pending', progress: 'Preparing...', createdAt: Date.now() }
  jobs.set(id, job)
  return job
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id)
}

export function updateJob(id: string, updates: Partial<Job>) {
  const job = jobs.get(id)
  if (job) Object.assign(job, updates)
}

export async function cleanOldJobs() {
  const cutoff = Date.now() - 60 * 60 * 1000
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) {
      if (job.tmpDir && existsSync(job.tmpDir)) {
        try { await rm(job.tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
      }
      jobs.delete(id)
    }
  }
}

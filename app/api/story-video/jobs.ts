import { rm } from 'fs/promises'
import { existsSync } from 'fs'

export type JobStatus = 'pending' | 'processing' | 'complete' | 'error'

export type Job = {
  id: string
  status: JobStatus
  progress: string
  landscapePath?: string   // file path on disk (not base64)
  portraitPath?: string    // file path on disk (not base64)
  duration?: number
  chapterTimestamps?: Array<{ chapterId: number; startTime: number; endTime: number }>
  error?: string
  tmpDir?: string          // tmp directory to clean up later
  createdAt: number
}

// In-memory job store
const jobs = new Map<string, Job>()

export function createJob(): Job {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const job: Job = {
    id,
    status: 'pending',
    progress: 'Preparing...',
    createdAt: Date.now(),
  }
  jobs.set(id, job)
  return job
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id)
}

export function updateJob(id: string, updates: Partial<Job>) {
  const job = jobs.get(id)
  if (job) {
    Object.assign(job, updates)
  }
}

// Clean up jobs older than 1 hour, including their tmp directories
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

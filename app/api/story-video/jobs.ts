export type JobStatus = 'pending' | 'processing' | 'complete' | 'error'

export type Job = {
  id: string
  status: JobStatus
  progress: string
  landscape?: string   // data URL when complete
  portrait?: string    // data URL when complete
  duration?: number
  chapterTimestamps?: Array<{ chapterId: number; startTime: number; endTime: number }>
  error?: string
  createdAt: number
}

// In-memory job store (survives across requests in the same Next.js server process)
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

// Clean up jobs older than 1 hour
export function cleanOldJobs() {
  const cutoff = Date.now() - 60 * 60 * 1000
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) {
      jobs.delete(id)
    }
  }
}

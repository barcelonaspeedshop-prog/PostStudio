import { rm, readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

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
  // Cached format variant (created on first request)
  squarePath?: string
}

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
export const VIDEOS_DIR = path.join(DATA_DIR, 'videos')
const JOBS_PATH = path.join(DATA_DIR, 'jobs.json')

const jobs = new Map<string, Job>()

// ─── Disk persistence ────────────────────────────────────────────────────────

async function ensureDirs() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  if (!existsSync(VIDEOS_DIR)) await mkdir(VIDEOS_DIR, { recursive: true })
}

async function persistJobs(): Promise<void> {
  try {
    await ensureDirs()
    const completeJobs = [...jobs.values()].filter(j => j.status === 'complete')
    await writeFile(JOBS_PATH, JSON.stringify(completeJobs, null, 2))
  } catch (e) {
    console.warn('[jobs] Failed to persist jobs.json:', e instanceof Error ? e.message : e)
  }
}

export async function loadPersistedJobs(): Promise<void> {
  try {
    if (!existsSync(JOBS_PATH)) return
    const raw = await readFile(JOBS_PATH, 'utf-8')
    const saved: Job[] = JSON.parse(raw)
    for (const job of saved) {
      // Only restore if the video file still exists on disk
      if (job.videoPath && existsSync(job.videoPath)) {
        jobs.set(job.id, job)
      }
    }
    if (saved.length > 0) {
      console.log(`[jobs] Restored ${jobs.size} jobs from disk`)
    }
  } catch (e) {
    console.warn('[jobs] Failed to load jobs.json:', e instanceof Error ? e.message : e)
  }
}

// Load persisted jobs when this module is first imported
loadPersistedJobs()

// ─── Job CRUD ────────────────────────────────────────────────────────────────

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
  if (job) {
    Object.assign(job, updates)
    // Persist whenever a job completes so it survives restarts
    if (updates.status === 'complete') {
      persistJobs()
    }
  }
}

export async function cleanOldJobs() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000 // keep for 24h
  let changed = false
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) {
      if (job.tmpDir && existsSync(job.tmpDir)) {
        try { await rm(job.tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
      }
      jobs.delete(id)
      changed = true
    }
  }
  if (changed) persistJobs()
}

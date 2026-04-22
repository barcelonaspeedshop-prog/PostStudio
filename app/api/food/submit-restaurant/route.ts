import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DATA_DIR  = '/data'
const DATA_FILE = path.join(DATA_DIR, 'restaurant-submissions.json')

type Submission = {
  id: string
  name: string
  city: string
  why: string
  email?: string
  submittedAt: string
}

async function readSubmissions(): Promise<Submission[]> {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8')
    return JSON.parse(raw) as Submission[]
  } catch {
    return []
  }
}

async function writeSubmissions(data: Submission[]): Promise<void> {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export async function POST(req: NextRequest) {
  try {
    const { name, city, why, email } = await req.json()

    if (!name?.trim() || !city?.trim() || !why?.trim()) {
      return NextResponse.json({ error: 'name, city and why are required' }, { status: 400 })
    }

    const submissions = await readSubmissions()
    const entry: Submission = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name:  name.trim().slice(0, 200),
      city:  city.trim().slice(0, 200),
      why:   why.trim().slice(0, 2000),
      email: email?.trim().slice(0, 200) || undefined,
      submittedAt: new Date().toISOString(),
    }
    submissions.push(entry)
    await writeSubmissions(submissions)

    console.log(`[food/submit] New submission: "${entry.name}" — ${entry.city}`)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[food/submit] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

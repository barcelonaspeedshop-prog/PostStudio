import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DATA_DIR  = '/data'
const DATA_FILE = path.join(DATA_DIR, 'newsletter.json')

type Subscriber = {
  id: string
  email: string
  signedUpAt: string
}

async function readSubscribers(): Promise<Subscriber[]> {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8')
    return JSON.parse(raw) as Subscriber[]
  } catch {
    return []
  }
}

async function writeSubscribers(data: Subscriber[]): Promise<void> {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email?.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const normalised = email.trim().toLowerCase().slice(0, 320)
    const subscribers = await readSubscribers()

    if (subscribers.some(s => s.email === normalised)) {
      return NextResponse.json({ ok: true, duplicate: true })
    }

    subscribers.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email: normalised,
      signedUpAt: new Date().toISOString(),
    })
    await writeSubscribers(subscribers)

    console.log(`[food/newsletter] New subscriber: ${normalised}`)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[food/newsletter] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

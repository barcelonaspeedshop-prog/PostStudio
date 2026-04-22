import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DATA_DIR  = '/data'
const DATA_FILE = path.join(DATA_DIR, 'food-research-approved.json')

type SavedRestaurant = {
  id: string
  savedAt: string
  series: 'no-frills' | 'top5'
  name: string
  city: string
  country: string
  cuisine: string
  priceRange: string
  credibilityScore: number
  hiddenGemScore: number
  whyItKills: string
  mustTry: string
  localBuzz: string
  sources: string[]
  mapsQuery: string
  bookingUrl: string
}

async function readSaved(): Promise<SavedRestaurant[]> {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8')
    return JSON.parse(raw) as SavedRestaurant[]
  } catch {
    return []
  }
}

async function writeSaved(data: SavedRestaurant[]): Promise<void> {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { series, name, city } = body

    if (!series || !name || !city) {
      return NextResponse.json({ error: 'series, name, and city are required' }, { status: 400 })
    }

    const saved = await readSaved()

    if (saved.some(s => s.name === name && s.city === city)) {
      return NextResponse.json({ ok: true, duplicate: true })
    }

    saved.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      savedAt: new Date().toISOString(),
      ...body,
    })
    await writeSaved(saved)

    console.log(`[food-research/save] Saved: ${name}, ${city} → ${series}`)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[food-research/save] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  try {
    const saved = await readSaved()
    return NextResponse.json(saved)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

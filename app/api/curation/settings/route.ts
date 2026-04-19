import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const SETTINGS_PATH = path.join(DATA_DIR, 'curation-settings.json')

type ChannelSettings = { autoSkip: boolean }
type Settings = Record<string, ChannelSettings>

async function loadSettings(): Promise<Settings> {
  try {
    if (!existsSync(SETTINGS_PATH)) return {}
    return JSON.parse(await readFile(SETTINGS_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

async function saveSettings(settings: Settings): Promise<void> {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2))
}

export async function GET() {
  return NextResponse.json(await loadSettings())
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { channel, autoSkip } = body
  if (!channel || typeof autoSkip !== 'boolean') {
    return NextResponse.json({ error: 'channel and autoSkip required' }, { status: 400 })
  }
  const settings = await loadSettings()
  settings[channel] = { ...settings[channel], autoSkip }
  await saveSettings(settings)
  return NextResponse.json({ ok: true })
}

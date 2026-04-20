import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json')

export type AppSettings = {
  /** Whether to include a background music bed on generated posts. Default: true */
  includeMusic: boolean
}

const DEFAULTS: AppSettings = {
  includeMusic: true,
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    if (!existsSync(SETTINGS_PATH)) return { ...DEFAULTS }
    const raw = await readFile(SETTINGS_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    // Merge with defaults so new fields are always present
    return { ...DEFAULTS, ...parsed }
  } catch {
    return { ...DEFAULTS }
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2))
}

import { NextResponse } from 'next/server'
import { readdir, unlink, stat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const COMPOSITES_DIR = path.join(process.env.TOKEN_STORAGE_PATH || '/data', 'composites')
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function POST() {
  try {
    if (!existsSync(COMPOSITES_DIR)) {
      await mkdir(COMPOSITES_DIR, { recursive: true })
      return NextResponse.json({ deleted: 0, message: 'Directory created, nothing to clean' })
    }

    const files = await readdir(COMPOSITES_DIR)
    const now = Date.now()
    let deleted = 0
    const errors: string[] = []

    for (const file of files) {
      if (!/^[\w-]+\.jpe?g$/i.test(file)) continue
      const filePath = path.join(COMPOSITES_DIR, file)
      try {
        const { mtimeMs } = await stat(filePath)
        if (now - mtimeMs > MAX_AGE_MS) {
          await unlink(filePath)
          deleted++
        }
      } catch { errors.push(file) }
    }

    console.log(`[composites/cleanup] deleted=${deleted} errors=${errors.length}`)
    return NextResponse.json({ deleted, errors: errors.length > 0 ? errors : undefined })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[composites/cleanup]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const APPROVALS_PATH = path.join(DATA_DIR, 'approvals.json')

// GET /api/approvals/[id]/video
// Returns the stored carousel video as an mp4 download for manual YouTube Shorts upload.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // Basic safety: UUIDs are hex chars and dashes only
  if (!id || !/^[\w-]+$/.test(id) || id.length > 100) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    if (!existsSync(APPROVALS_PATH)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const raw = await readFile(APPROVALS_PATH, 'utf-8')
    const items: Array<{ id: string; headline?: string; channel?: string; videoBase64?: string }> = JSON.parse(raw)
    const item = items.find(i => i.id === id)

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (!item.videoBase64) {
      return NextResponse.json({ error: 'No video available for this item' }, { status: 404 })
    }

    // Strip the data URI prefix if present (data:video/mp4;base64,...)
    const base64 = item.videoBase64.startsWith('data:')
      ? item.videoBase64.split(',')[1]
      : item.videoBase64

    const buffer = Buffer.from(base64, 'base64')
    const slug = (item.headline || 'video')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
    const channel = (item.channel || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 30)
    const filename = `${channel}-${slug}.mp4`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(buffer.length),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[approvals/video] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { saveToDrive } from '@/lib/drive-images'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST /api/drive-images/save { channel, category, image (base64), filename }
// Saves an image to the channel/category Drive folder.
export async function POST(req: NextRequest) {
  try {
    const { channel, category, image, filename } = await req.json()
    if (!channel || !category || !image || !filename) {
      return NextResponse.json({ error: 'channel, category, image, and filename are required' }, { status: 400 })
    }
    if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
      return NextResponse.json({ error: 'GOOGLE_DRIVE_FOLDER_ID is not configured' }, { status: 503 })
    }
    const fileId = await saveToDrive(channel, category, image, filename)
    return NextResponse.json({ fileId })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('[drive-images/save] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

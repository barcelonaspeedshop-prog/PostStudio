import { NextRequest, NextResponse } from 'next/server'
import { searchDriveImages, getDriveImageAsBase64 } from '@/lib/drive-images'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET /api/drive-images?channel=X&category=Generated&query=Y
// Lists image files from the channel/category Drive folder
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const channel = searchParams.get('channel') || ''
  const category = searchParams.get('category') || 'Generated'
  const query = searchParams.get('query') || ''

  if (!channel) {
    return NextResponse.json({ error: 'channel is required' }, { status: 400 })
  }

  if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
    return NextResponse.json({ error: 'GOOGLE_DRIVE_FOLDER_ID is not configured' }, { status: 503 })
  }

  try {
    const files = await searchDriveImages(channel, category, query)
    return NextResponse.json({ files })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('[drive-images] GET error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/drive-images { fileId }
// Downloads a Drive file and returns it as a base64 data URI
export async function POST(req: NextRequest) {
  try {
    const { fileId } = await req.json()
    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
    }

    const base64 = await getDriveImageAsBase64(fileId)
    return NextResponse.json({ base64 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('[drive-images] POST error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

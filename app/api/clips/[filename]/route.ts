import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, existsSync, statSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const CLIPS_DIR = path.join(DATA_DIR, 'clips')

export async function GET(
  _req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const { filename } = params

  // Prevent path traversal
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  // Only allow .mp4 and .jpg files from the clips directory
  const isVideo = filename.endsWith('.mp4')
  const isImage = filename.endsWith('.jpg') || filename.endsWith('.jpeg')
  if (!isVideo && !isImage) {
    return NextResponse.json({ error: 'Only mp4 and jpg files are served here' }, { status: 400 })
  }

  const filePath = path.join(CLIPS_DIR, filename)

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
  }

  const contentType = isVideo ? 'video/mp4' : 'image/jpeg'
  const stat = statSync(filePath)
  const stream = createReadStream(filePath)

  const webStream = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk))
      stream.on('end', () => controller.close())
      stream.on('error', (err) => controller.error(err))
    },
    cancel() {
      stream.destroy()
    },
  })

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(stat.size),
      'Content-Disposition': isImage
        ? `inline; filename="${filename}"`
        : `attachment; filename="${filename}"`,
      'Cache-Control': isImage ? 'public, max-age=86400' : 'no-store',
    },
  })
}

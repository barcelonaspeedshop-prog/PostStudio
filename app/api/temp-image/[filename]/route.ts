import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const TEMP_DIR = path.join(process.env.TOKEN_STORAGE_PATH || '/data', 'temp-images')

export async function GET(
  _req: NextRequest,
  { params }: { params: { filename: string } },
) {
  try {
    // Sanitise: strip any path separators to prevent directory traversal
    const filename = path.basename(params.filename)
    if (!filename || !/^[\w-]+\.(jpe?g|mp4)$/i.test(filename)) {
      return new NextResponse('Not found', { status: 404 })
    }

    const filePath = path.join(TEMP_DIR, filename)
    if (!existsSync(filePath)) {
      return new NextResponse('Not found', { status: 404 })
    }

    const buffer = await readFile(filePath)
    const isVideo = filename.toLowerCase().endsWith('.mp4')
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': isVideo ? 'video/mp4' : 'image/jpeg',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[temp-image]', message)
    return new NextResponse('Internal error', { status: 500 })
  }
}

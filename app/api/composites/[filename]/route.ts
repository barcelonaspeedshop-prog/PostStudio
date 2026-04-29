import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const COMPOSITES_DIR = path.join(process.env.TOKEN_STORAGE_PATH || '/data', 'composites')

export async function GET(
  _req: NextRequest,
  { params }: { params: { filename: string } },
) {
  try {
    const filename = path.basename(params.filename)
    if (!filename || !/^[\w-]+\.jpe?g$/i.test(filename)) {
      return new NextResponse('Not found', { status: 404 })
    }

    const filePath = path.join(COMPOSITES_DIR, filename)
    if (!existsSync(filePath)) {
      return new NextResponse('Not found', { status: 404 })
    }

    const buffer = await readFile(filePath)
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[composites]', message)
    return new NextResponse('Internal error', { status: 500 })
  }
}

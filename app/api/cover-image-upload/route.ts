import { NextRequest, NextResponse } from 'next/server'
import { uploadToR2, isR2Configured } from '@/lib/r2'

export const dynamic = 'force-dynamic'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
const MAX_BYTES = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json({ error: 'R2 not configured' }, { status: 500 })
    }

    const { base64, mimeType } = await req.json()
    if (!base64 || !mimeType) {
      return NextResponse.json({ error: 'base64 and mimeType are required' }, { status: 400 })
    }
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
    }

    const b64 = base64.startsWith('data:') ? base64.replace(/^data:[^;]+;base64,/, '') : base64
    const buffer = Buffer.from(b64, 'base64')
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large (max 10 MB)' }, { status: 400 })
    }

    const url = await uploadToR2(buffer, mimeType)
    return NextResponse.json({ url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cover-image-upload] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

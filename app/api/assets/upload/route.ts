import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import crypto from 'crypto'
import sharp from 'sharp'
import {
  analyzeImage,
  loadAssets,
  saveAssets,
  ASSETS_DIR,
  type AssetEntry,
} from '@/lib/assets'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
}

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  try {
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid multipart/form-data body' }, { status: 400 })
    }

    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: '"file" field is required' }, { status: 400 })
    }

    // Validate MIME type
    const ext = ALLOWED_TYPES[file.type]
    if (!ext) {
      return NextResponse.json(
        { error: `Unsupported file type "${file.type}". Allowed: jpg, png, webp` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 })
    }

    // Read into buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate unique filename
    const uuid = crypto.randomUUID()
    const filename = `${uuid}.${ext}`

    // Ensure storage directory exists
    if (!existsSync(ASSETS_DIR)) {
      await mkdir(ASSETS_DIR, { recursive: true })
    }

    // Persist file
    const filePath = `${ASSETS_DIR}/${filename}`
    await writeFile(filePath, buffer)

    // Extract image dimensions with Sharp
    let width = 0
    let height = 0
    try {
      const meta = await sharp(buffer).metadata()
      width = meta.width ?? 0
      height = meta.height ?? 0
    } catch (e) {
      console.warn('[assets/upload] Sharp metadata failed:', e instanceof Error ? e.message : e)
    }

    // AI tagging — uses Sonnet vision; fallback to empty tags if vision fails
    const mimeType = file.type === 'image/jpg' ? 'image/jpeg' : file.type
    const analysis = await analyzeImage(buffer, mimeType)

    // Build asset entry
    const entry: AssetEntry = {
      originalName: file.name,
      filename,
      uploadedAt: new Date().toISOString(),
      channel: analysis.channel,
      type: analysis.type,
      subjects: analysis.subjects,
      tags: analysis.tags,
      mood: analysis.mood,
      usageCount: 0,
      lastUsed: null,
      dimensions: { width, height },
      fileSize: buffer.length,
    }

    // Persist to assets.json
    const assets = await loadAssets()
    assets[uuid] = entry
    await saveAssets(assets)

    console.log(
      `[assets/upload] Saved ${filename} (${(buffer.length / 1024).toFixed(0)} KB) ` +
      `— type: ${entry.type}, channels: [${entry.channel.join(', ')}], ` +
      `tags: [${entry.tags.slice(0, 4).join(', ')}]`
    )

    return NextResponse.json({ uuid, ...entry }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[assets/upload] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

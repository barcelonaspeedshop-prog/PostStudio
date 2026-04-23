import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { createWriteStream, existsSync } from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import path from 'path'
import { randomBytes } from 'crypto'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

type ManifestEntry =
  | { type: 'media'; chapterId: number; filePath: string; isVideo: boolean }
  | { type: 'audio'; chapterId: number; filePath: string }

interface Manifest {
  entries: ManifestEntry[]
  counters: Record<number, number>
}

function extFromMime(mime: string): string {
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('quicktime') || mime.includes('mov')) return 'mov'
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('wav')) return 'wav'
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3'
  return 'jpg'
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    let stageId = formData.get('stageId') as string | null
    const type = formData.get('type') as string
    const chapterId = parseInt((formData.get('chapterId') as string) || '0')

    if (!stageId) {
      stageId = randomBytes(16).toString('hex')
    }

    const stageDir = `/tmp/stage_${stageId}`
    await mkdir(stageDir, { recursive: true })

    const manifestPath = path.join(stageDir, 'manifest.json')
    let manifest: Manifest = { entries: [], counters: {} }
    if (existsSync(manifestPath)) {
      manifest = JSON.parse(await readFile(manifestPath, 'utf-8'))
    }

    if (type === 'media') {
      const file = formData.get('file') as File
      if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

      if (manifest.counters[chapterId] === undefined) manifest.counters[chapterId] = 0
      const idx = String(manifest.counters[chapterId]++).padStart(4, '0')
      const ext = extFromMime(file.type)
      const filePath = path.join(stageDir, `media_ch${chapterId}_${idx}.${ext}`)

      const readable = Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0])
      await pipeline(readable, createWriteStream(filePath))

      manifest.entries.push({ type: 'media', chapterId, filePath, isVideo: file.type.startsWith('video/') })
      console.log(`[stage] media ch${chapterId}: ${(file.size / 1024).toFixed(1)} KB → ${path.basename(filePath)}`)

    } else if (type === 'audio') {
      const base64 = formData.get('audio_b64') as string
      const mime = (formData.get('audio_mime') as string) || 'audio/mpeg'
      if (!base64) return NextResponse.json({ error: 'audio_b64 required' }, { status: 400 })

      const ext = extFromMime(mime)
      const filePath = path.join(stageDir, `audio_ch${chapterId}.${ext}`)
      const buf = Buffer.from(base64, 'base64')
      await writeFile(filePath, buf)

      manifest.entries = manifest.entries.filter(e => !(e.type === 'audio' && e.chapterId === chapterId))
      manifest.entries.push({ type: 'audio', chapterId, filePath })
      console.log(`[stage] audio ch${chapterId}: ${(buf.byteLength / 1024).toFixed(1)} KB`)

    } else if (type === 'empty') {
      // Just initialize the stage directory with an empty manifest

    } else {
      return NextResponse.json({ error: `unknown type: ${type}` }, { status: 400 })
    }

    await writeFile(manifestPath, JSON.stringify(manifest))
    return NextResponse.json({ stageId })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-video/stage] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

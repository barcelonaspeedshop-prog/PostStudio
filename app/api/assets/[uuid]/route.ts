import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { loadAssets, saveAssets, ASSETS_DIR } from '@/lib/assets'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { uuid: string } }

/**
 * PATCH /api/assets/[uuid]
 * Update any writable field on an asset entry.
 * Body: Partial<AssetEntry> — omit uuid, filename, originalName, uploadedAt, fileSize, dimensions.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { uuid } = params
    if (!uuid) return NextResponse.json({ error: 'uuid is required' }, { status: 400 })

    const assets = await loadAssets()
    if (!assets[uuid]) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const body = await req.json()

    // Allow updating only these fields
    const EDITABLE = ['channel', 'type', 'subjects', 'tags', 'mood', 'usageCount', 'lastUsed'] as const
    type EditableKey = typeof EDITABLE[number]

    for (const key of EDITABLE) {
      if (key in body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (assets[uuid] as any)[key] = body[key as EditableKey]
      }
    }

    await saveAssets(assets)
    return NextResponse.json({ uuid, ...assets[uuid] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[assets/uuid] PATCH error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/assets/[uuid]
 * Remove the image file from disk and its entry from assets.json.
 */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { uuid } = params
    if (!uuid) return NextResponse.json({ error: 'uuid is required' }, { status: 400 })

    const assets = await loadAssets()
    const entry = assets[uuid]
    if (!entry) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Delete file from disk
    const filePath = path.join(ASSETS_DIR, entry.filename)
    if (existsSync(filePath)) {
      try {
        await unlink(filePath)
      } catch (e) {
        console.warn(`[assets/uuid] Could not delete file ${filePath}:`, e instanceof Error ? e.message : e)
      }
    }

    // Remove from index
    delete assets[uuid]
    await saveAssets(assets)

    console.log(`[assets/uuid] Deleted asset ${uuid} (${entry.originalName})`)
    return NextResponse.json({ deleted: true, uuid })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[assets/uuid] DELETE error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/assets/[uuid]
 * Return a single asset entry.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { uuid } = params
    const assets = await loadAssets()
    const entry = assets[uuid]
    if (!entry) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    return NextResponse.json({ uuid, ...entry })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

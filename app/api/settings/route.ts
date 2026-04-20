import { NextRequest, NextResponse } from 'next/server'
import { loadSettings, saveSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

/** GET /api/settings — return current app settings */
export async function GET() {
  try {
    const settings = await loadSettings()
    return NextResponse.json(settings)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** PUT /api/settings — update one or more settings fields */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const current = await loadSettings()
    const updated = { ...current }

    if (typeof body.includeMusic === 'boolean') {
      updated.includeMusic = body.includeMusic
    }

    await saveSettings(updated)
    return NextResponse.json(updated)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

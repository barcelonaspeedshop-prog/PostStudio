import { NextRequest, NextResponse } from 'next/server'
import { loadAssets } from '@/lib/assets'

export const dynamic = 'force-dynamic'

/**
 * GET /api/assets
 * Returns all assets as an array, newest first.
 * Optional query params:
 *   ?channel=   — filter by channel name (substring match)
 *   ?tag=       — filter by tag or subject (substring match)
 *   ?search=    — search across name, tags, subjects, mood, type
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const channelFilter = searchParams.get('channel')?.toLowerCase()
    const tagFilter = searchParams.get('tag')?.toLowerCase()
    const searchFilter = searchParams.get('search')?.toLowerCase()

    const assets = await loadAssets()

    let entries = Object.entries(assets).map(([uuid, entry]) => ({ uuid, ...entry }))

    if (channelFilter) {
      entries = entries.filter(e =>
        e.channel.some(c => c.toLowerCase().includes(channelFilter))
      )
    }

    if (tagFilter) {
      entries = entries.filter(e =>
        e.tags.some(t => t.toLowerCase().includes(tagFilter)) ||
        e.subjects.some(s => s.toLowerCase().includes(tagFilter))
      )
    }

    if (searchFilter) {
      entries = entries.filter(e =>
        e.originalName.toLowerCase().includes(searchFilter) ||
        e.type.toLowerCase().includes(searchFilter) ||
        e.mood.toLowerCase().includes(searchFilter) ||
        e.tags.some(t => t.toLowerCase().includes(searchFilter)) ||
        e.subjects.some(s => s.toLowerCase().includes(searchFilter)) ||
        e.channel.some(c => c.toLowerCase().includes(searchFilter))
      )
    }

    // Newest first
    entries.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

    return NextResponse.json(entries)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[assets] GET error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { markStoryUsed } from '@/lib/stories'
import { CHANNELS } from '@/lib/channels'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { channel, title } = await req.json()

    if (!channel || !CHANNELS[channel]) {
      return NextResponse.json({ error: 'valid channel is required' }, { status: 400 })
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    await markStoryUsed(channel, title.trim())
    console.log(`[mark-story-used] "${title}" marked used for "${channel}"`)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[mark-story-used] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

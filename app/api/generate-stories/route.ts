import { NextRequest, NextResponse } from 'next/server'
import { generateStoryBank, loadUsedStories } from '@/lib/stories'
import { CHANNELS } from '@/lib/channels'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET — return used-stories data (last-used dates per channel) for the stories page pacing hints
export async function GET() {
  try {
    const usedStories = await loadUsedStories()
    return NextResponse.json({ usedStories })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST — generate a story bank for a given channel
export async function POST(req: NextRequest) {
  try {
    const { channel } = await req.json()

    if (!channel || !CHANNELS[channel]) {
      return NextResponse.json(
        { error: `channel must be one of: ${Object.keys(CHANNELS).join(', ')}` },
        { status: 400 }
      )
    }

    console.log(`[generate-stories] Generating story bank for "${channel}"`)
    const stories = await generateStoryBank(channel)
    console.log(`[generate-stories] Generated ${stories.length} stories for "${channel}"`)

    return NextResponse.json({ stories })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[generate-stories] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

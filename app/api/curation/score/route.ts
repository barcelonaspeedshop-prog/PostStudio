import { NextRequest, NextResponse } from 'next/server'
import { scoreStories, type UnscoredStory } from '@/lib/curation'
import { CHANNELS } from '@/lib/channels'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { channel, stories } = body as { channel: string; stories: UnscoredStory[] }

  if (!channel) {
    return NextResponse.json({ error: 'channel is required' }, { status: 400 })
  }
  if (!CHANNELS[channel]) {
    return NextResponse.json({ error: `Unknown channel: ${channel}` }, { status: 400 })
  }
  if (!Array.isArray(stories) || stories.length === 0) {
    return NextResponse.json({ error: 'stories must be a non-empty array' }, { status: 400 })
  }

  const invalid = stories.find(s => !s.topic || !s.headline || !s.articleUrl)
  if (invalid) {
    return NextResponse.json(
      { error: 'Each story must have topic, headline, and articleUrl' },
      { status: 400 },
    )
  }

  const scored = await scoreStories(stories, channel)
  return NextResponse.json({ channel, scored })
}

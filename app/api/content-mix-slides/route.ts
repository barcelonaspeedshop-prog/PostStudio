import { NextRequest, NextResponse } from 'next/server'
import { generateContentSlides, extractPollFromSlides, type ContentType } from '@/lib/content-mix'
import { CHANNELS } from '@/lib/channels'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { channel, contentType } = await req.json() as { channel: string; contentType: ContentType }
    if (!channel || !contentType) {
      return NextResponse.json({ error: 'channel and contentType are required' }, { status: 400 })
    }

    const channelCfg = CHANNELS[channel]
    if (!channelCfg?.contentMix) {
      return NextResponse.json({ error: `No contentMix config for channel: ${channel}` }, { status: 400 })
    }

    const { slides, topic } = await generateContentSlides(
      contentType, channel, channelCfg.contentMix, channelCfg.primary,
    )

    const { pollQuestion, pollOptions } = extractPollFromSlides(slides)

    return NextResponse.json({ slides, topic, pollQuestion, pollOptions })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[content-mix-slides] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

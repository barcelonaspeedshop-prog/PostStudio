import { NextRequest, NextResponse } from 'next/server'
import { generateHooks, type HookPlatform } from '@/lib/hooks'
import { CHANNELS } from '@/lib/channels'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VALID_CHANNELS = Object.keys(CHANNELS)
const VALID_PLATFORMS: HookPlatform[] = ['instagram', 'tiktok', 'facebook', 'youtube']

export async function POST(req: NextRequest) {
  try {
    const { topic, channel, platforms } = await req.json()

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 })
    }
    if (!channel || !VALID_CHANNELS.includes(channel)) {
      return NextResponse.json({ error: `channel must be one of: ${VALID_CHANNELS.join(', ')}` }, { status: 400 })
    }

    const requestedPlatforms: HookPlatform[] = Array.isArray(platforms)
      ? platforms.filter((p): p is HookPlatform => VALID_PLATFORMS.includes(p as HookPlatform))
      : VALID_PLATFORMS

    if (requestedPlatforms.length === 0) {
      return NextResponse.json({ error: 'at least one valid platform is required' }, { status: 400 })
    }

    console.log(`[generate-hooks] topic="${topic.substring(0, 80)}" channel="${channel}" platforms=${requestedPlatforms.join(',')}`)

    const hooks = await generateHooks(topic.trim(), channel, requestedPlatforms)

    return NextResponse.json({ hooks })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[generate-hooks] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

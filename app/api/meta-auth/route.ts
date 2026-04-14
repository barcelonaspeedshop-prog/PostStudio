import { NextRequest, NextResponse } from 'next/server'
import { loadMetaTokens, saveMetaTokens } from '@/lib/meta'

export const dynamic = 'force-dynamic'

// GET /api/meta-auth — return connection status for all channels
export async function GET() {
  try {
    const store = await loadMetaTokens()

    // Return presence info only — never expose raw tokens to the client
    const status: Record<string, {
      connected: boolean
      instagramAccountId?: string
      facebookPageId?: string
    }> = {}

    for (const [channel, cfg] of Object.entries(store)) {
      status[channel] = {
        connected: Boolean(cfg.pageAccessToken && cfg.facebookPageId),
        instagramAccountId: cfg.instagramAccountId || undefined,
        facebookPageId: cfg.facebookPageId,
      }
    }

    return NextResponse.json({ status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/meta-auth — save credentials for a channel
// Body: { channel, pageAccessToken, instagramAccountId, facebookPageId }
export async function POST(req: NextRequest) {
  try {
    const { channel, pageAccessToken, instagramAccountId, facebookPageId } = await req.json()

    if (!channel || typeof channel !== 'string') {
      return NextResponse.json({ error: 'channel is required' }, { status: 400 })
    }
    if (!pageAccessToken || typeof pageAccessToken !== 'string') {
      return NextResponse.json({ error: 'pageAccessToken is required' }, { status: 400 })
    }
    if (!facebookPageId || typeof facebookPageId !== 'string') {
      return NextResponse.json({ error: 'facebookPageId is required' }, { status: 400 })
    }

    const store = await loadMetaTokens()
    store[channel] = {
      pageAccessToken,
      instagramAccountId: instagramAccountId || '',
      facebookPageId,
    }
    await saveMetaTokens(store)

    return NextResponse.json({ ok: true, channel })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/meta-auth — remove credentials for a channel
// Body: { channel }
export async function DELETE(req: NextRequest) {
  try {
    const { channel } = await req.json()
    if (!channel) return NextResponse.json({ error: 'channel is required' }, { status: 400 })

    const store = await loadMetaTokens()
    delete store[channel]
    await saveMetaTokens(store)

    return NextResponse.json({ ok: true, channel })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

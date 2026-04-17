import { NextRequest, NextResponse } from 'next/server'
import { getOAuth2Client, loadTokens, deleteTokenForChannel } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  // Return connected status for all channels
  if (action === 'status') {
    const tokens = await loadTokens()
    const status: Record<string, { connected: boolean; youtube_channel_name?: string; youtube_channel_id?: string; youtube_handle?: string }> = {}
    for (const [channel, token] of Object.entries(tokens)) {
      status[channel] = {
        connected: true,
        youtube_channel_name: token.youtube_channel_name,
        youtube_channel_id: token.youtube_channel_id,
        youtube_handle: token.youtube_handle,
      }
    }
    return NextResponse.json(status)
  }

  // Disconnect a channel
  if (action === 'disconnect') {
    const channel = searchParams.get('channel')
    if (!channel) {
      return NextResponse.json({ error: 'channel is required' }, { status: 400 })
    }
    await deleteTokenForChannel(channel)
    return NextResponse.json({ success: true })
  }

  // OAuth redirect — start consent flow
  const channel = searchParams.get('channel')
  if (!channel) {
    return NextResponse.json({ error: 'channel query param is required' }, { status: 400 })
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'YOUTUBE_CLIENT_ID not configured' }, { status: 500 })
  }

  const oauth2 = getOAuth2Client()
  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    // 'select_account consent' forces Google to always show the account-picker
    // AND the full consent screen, so the user can switch to the correct Brand
    // Account for each channel instead of silently reusing the last session.
    prompt: 'select_account consent',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      // drive.file lets PostStudio save generated slides to the shared Drive library
      'https://www.googleapis.com/auth/drive.file',
    ],
    state: channel,
  })

  return NextResponse.redirect(authUrl)
}

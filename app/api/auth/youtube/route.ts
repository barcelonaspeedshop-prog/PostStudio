import { NextRequest, NextResponse } from 'next/server'
import { getOAuth2Client, loadTokens, saveTokens, deleteTokenForChannel } from '@/lib/youtube'

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

  // Health check — detect channels sharing the same refresh token.
  // Shared tokens mean multiple channels authenticate as the same Google Account
  // and all uploads go to that account's default channel.
  if (action === 'health') {
    const tokens = await loadTokens()
    const byRefresh: Record<string, string[]> = {}
    for (const [ch, tok] of Object.entries(tokens)) {
      const key = tok.refresh_token || 'none'
      if (!byRefresh[key]) byRefresh[key] = []
      byRefresh[key].push(ch)
    }
    const sharedGroups = Object.entries(byRefresh)
      .filter(([, channels]) => channels.length > 1)
      .map(([, channels]) => ({ channels }))
    const channelList = Object.entries(tokens).map(([channel, token]) => ({
      channel,
      channelId: token.youtube_channel_id,
      channelName: token.youtube_channel_name,
      handle: token.youtube_handle,
      shared: sharedGroups.some(g => g.channels.includes(channel)),
    }))
    return NextResponse.json({ sharedGroups, channels: channelList })
  }

  // Revoke a channel's token at Google and remove all channels sharing it.
  // This forces a fresh OAuth grant (new refresh token) on next connect.
  if (action === 'revoke') {
    const channel = searchParams.get('channel')
    if (!channel) {
      return NextResponse.json({ error: 'channel is required' }, { status: 400 })
    }
    const tokens = await loadTokens()
    const token = tokens[channel]
    if (token?.refresh_token) {
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token.refresh_token)}`,
          { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )
      } catch { /* non-fatal — Google revocation may return errors for already-expired tokens */ }
      // Remove every channel that shares this refresh token
      const sharedRefresh = token.refresh_token
      for (const [ch, tok] of Object.entries(tokens)) {
        if (tok.refresh_token === sharedRefresh) delete tokens[ch]
      }
      await saveTokens(tokens)
    }
    return NextResponse.json({ success: true, channel })
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

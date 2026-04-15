import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { saveDriveToken } from '@/lib/drive-images'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'

  if (error || !code) {
    console.error('[drive-auth] OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/accounts?drive_error=${encodeURIComponent(error || 'no_code')}`)
  }

  try {
    const driveRedirectUri = `${baseUrl}/api/auth/drive/callback`
    const oauth2 = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      driveRedirectUri,
    )

    const { tokens } = await oauth2.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('OAuth response missing access_token or refresh_token')
    }

    await saveDriveToken({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date ?? Date.now() + 3600_000,
    })

    console.log('[drive-auth] Drive OAuth token saved successfully')
    return NextResponse.redirect(`${baseUrl}/accounts?drive_connected=1`)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[drive-auth] Token exchange failed:', msg)
    return NextResponse.redirect(`${baseUrl}/accounts?drive_error=${encodeURIComponent(msg)}`)
  }
}

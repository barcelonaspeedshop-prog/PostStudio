import { NextRequest, NextResponse } from 'next/server'
import { getOAuth2Client } from '@/lib/youtube'
import { loadDriveToken } from '@/lib/drive-images'

export const dynamic = 'force-dynamic'

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
]

// GET /api/auth/drive?action=status  → connection status
// GET /api/auth/drive                → begin OAuth flow
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'status') {
    const token = await loadDriveToken()
    return NextResponse.json({ connected: !!token })
  }

  // Initiate OAuth consent
  const oauth2 = getOAuth2Client()
  // Override redirect URI to Drive-specific callback
  const driveRedirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'}/api/auth/drive/callback`
  // Re-create with correct redirect URI
  const { google } = await import('googleapis')
  const driveOAuth2 = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    driveRedirectUri,
  )

  const url = driveOAuth2.generateAuthUrl({
    access_type: 'offline',
    scope: DRIVE_SCOPES,
    prompt: 'consent', // force refresh_token to be returned
  })

  return NextResponse.redirect(url)
}

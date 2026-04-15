/**
 * Drive auth endpoint — Drive access is now bundled with YouTube OAuth.
 *
 * GET /api/auth/drive?action=status
 *   Returns { connected: boolean } — true when the DRIVE_AUTH_CHANNEL YouTube
 *   token exists (and therefore can be used for Drive API calls).
 *
 * GET /api/auth/drive
 *   Redirects to the YouTube OAuth flow for DRIVE_AUTH_CHANNEL so the user
 *   can (re-)connect and pick up the drive.file scope.
 */

import { NextRequest, NextResponse } from 'next/server'
import { loadTokens } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

const DRIVE_AUTH_CHANNEL = process.env.DRIVE_AUTH_CHANNEL || 'Gentlemen of Fuel'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'status') {
    const tokens = await loadTokens()
    const connected = Boolean(tokens[DRIVE_AUTH_CHANNEL])
    return NextResponse.json({ connected, channel: DRIVE_AUTH_CHANNEL })
  }

  // Redirect to YouTube OAuth for the Drive auth channel so it picks up
  // the drive.file scope that was added to the YouTube consent screen.
  const youtubeAuthUrl = `${BASE_URL}/api/auth/youtube?channel=${encodeURIComponent(DRIVE_AUTH_CHANNEL)}`
  return NextResponse.redirect(youtubeAuthUrl)
}

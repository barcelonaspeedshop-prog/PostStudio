/**
 * GET /api/drive-setup
 *
 * One-time helper — initiates a Google OAuth flow requesting Drive scope,
 * then the callback creates the "Premira First — Master Credentials" Google Doc.
 *
 * One-time setup required in Google Cloud Console:
 *   APIs & Services → Credentials → OAuth 2.0 Client → Authorised redirect URIs
 *   Add: https://app.premirafirst.com/api/drive-setup/callback
 */

import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

const REDIRECT_URI = 'https://app.premirafirst.com/api/drive-setup/callback'

export async function GET() {
  const clientId     = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET not set' }, { status: 500 })
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive'],
    prompt: 'consent',
  })

  return NextResponse.redirect(url)
}

/**
 * Drive auth status endpoint — Drive access uses a service account key file,
 * not user OAuth. This endpoint reports whether the key file is present.
 *
 * GET /api/auth/drive?action=status
 *   Returns { connected: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

const KEY_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || '/data/service-account.json'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'status') {
    const connected = existsSync(KEY_FILE)
    return NextResponse.json({ connected })
  }

  return NextResponse.json({ error: 'Drive uses a service account — no OAuth flow required' }, { status: 400 })
}

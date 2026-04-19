import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'

// GET /api/curation/cron?secret=CRON_SECRET
// Called by external scheduler (e.g. crontab, Coolify cron, uptime robot) at 6am UTC.
// Populates today's curation queue for all channels so it's ready for morning review.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[curation/cron] Triggered — populating all channels')

  const res = await fetch(`${BASE_URL}/api/curation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'populate' }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[curation/cron] Populate failed:', text)
    return NextResponse.json({ error: 'Populate failed', detail: text }, { status: 500 })
  }

  const queue = await res.json()
  const channelCount = Object.keys(queue.channels || {}).length
  console.log(`[curation/cron] Done — ${channelCount} channels populated`)

  return NextResponse.json({ ok: true, date: queue.date, channels: channelCount })
}

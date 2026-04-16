import { NextRequest, NextResponse } from 'next/server'
import { loadMetaTokens, saveMetaTokens } from '@/lib/meta'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type RefreshResult = {
  channel: string
  success: boolean
  tokenType?: 'permanent' | 'short'
  error?: string
  skipped?: string
}

// POST /api/meta-auth/refresh-all
// Body (optional): { channel: string }  — if provided, refresh only that channel.
//                  If omitted, refresh all channels that have a userAccessToken.
//
// Flow per channel:
//   1. Exchange stored userAccessToken → long-lived user token (60 days)
//   2. GET /{pageId}?fields=access_token → permanent page token (never expires)
//   3. Update meta-tokens.json
export async function POST(req: NextRequest) {
  const appId     = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: 'META_APP_ID and META_APP_SECRET must be set to refresh tokens' },
      { status: 503 }
    )
  }

  let targetChannel: string | null = null
  try {
    const body = await req.json().catch(() => ({})) as { channel?: string }
    targetChannel = body.channel || null
  } catch { /* no body */ }

  const store   = await loadMetaTokens()
  const results: RefreshResult[] = []
  let   anyUpdated = false

  const channels = targetChannel
    ? Object.entries(store).filter(([ch]) => ch === targetChannel)
    : Object.entries(store)

  for (const [channel, cfg] of channels) {
    const { userAccessToken, facebookPageId, instagramAccountId } = cfg

    if (!userAccessToken) {
      results.push({ channel, success: false, skipped: 'No userAccessToken stored — reconnect this channel manually' })
      continue
    }
    if (!facebookPageId) {
      results.push({ channel, success: false, skipped: 'No facebookPageId stored' })
      continue
    }

    try {
      // ── Step 1: exchange user token for long-lived user token ──────────────
      const step1Url =
        `https://graph.facebook.com/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${encodeURIComponent(appId)}` +
        `&client_secret=${encodeURIComponent(appSecret)}` +
        `&fb_exchange_token=${encodeURIComponent(userAccessToken)}`

      const step1Res  = await fetch(step1Url)
      const step1Data = await step1Res.json() as {
        access_token?: string
        expires_in?: number
        error?: { message: string; code: number }
      }

      if (step1Data.error || !step1Data.access_token) {
        const msg = step1Data.error?.message || 'No access_token returned'
        console.warn(`[refresh-all] [${channel}] Step 1 failed: ${msg}`)
        results.push({ channel, success: false, error: `Token exchange failed: ${msg}` })
        continue
      }

      const longLivedUserToken = step1Data.access_token
      console.log(`[refresh-all] [${channel}] Long-lived user token obtained`)

      // ── Step 2: get permanent page access token ────────────────────────────
      const step2Url =
        `https://graph.facebook.com/${encodeURIComponent(facebookPageId)}` +
        `?fields=access_token` +
        `&access_token=${encodeURIComponent(longLivedUserToken)}`

      const step2Res  = await fetch(step2Url)
      const step2Data = await step2Res.json() as {
        access_token?: string
        error?: { message: string; code: number }
      }

      let finalToken = longLivedUserToken
      let tokenType: 'permanent' | 'short' = 'short'

      if (step2Data.error || !step2Data.access_token) {
        const msg = step2Data.error?.message || 'No page access_token returned'
        console.warn(`[refresh-all] [${channel}] Step 2 failed (using long-lived user token): ${msg}`)
      } else {
        finalToken = step2Data.access_token
        tokenType  = 'permanent'
        console.log(`[refresh-all] [${channel}] Permanent page token obtained`)
      }

      // ── Save updated token ─────────────────────────────────────────────────
      store[channel] = {
        ...cfg,
        pageAccessToken:  finalToken,
        instagramAccountId: instagramAccountId || '',
        tokenType,
        userAccessToken:  longLivedUserToken, // upgrade the stored user token too
        tokenSavedAt:     Date.now(),
      }
      anyUpdated = true
      results.push({ channel, success: true, tokenType })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[refresh-all] [${channel}] Error:`, msg)
      results.push({ channel, success: false, error: msg })
    }
  }

  if (anyUpdated) {
    await saveMetaTokens(store)
  }

  const summary = {
    total:    results.length,
    refreshed: results.filter(r => r.success).length,
    failed:   results.filter(r => !r.success && !r.skipped).length,
    skipped:  results.filter(r => r.skipped).length,
  }

  console.log(`[refresh-all] Done — ${summary.refreshed} refreshed, ${summary.failed} failed, ${summary.skipped} skipped`)

  return NextResponse.json({ summary, results })
}

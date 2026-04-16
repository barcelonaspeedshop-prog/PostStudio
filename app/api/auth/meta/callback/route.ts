import { NextRequest, NextResponse } from 'next/server'
import { loadMetaTokens, saveMetaTokens } from '@/lib/meta'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type PageFromGraph = {
  id: string
  name: string
  access_token: string
  instagram_business_account?: { id: string; username?: string }
}

// GET /api/auth/meta/callback
// Facebook sends ?code=... here after the user approves the OAuth consent.
// We exchange it for a user token, then immediately run the full setup:
//   1. code → short-lived user token
//   2. short-lived → long-lived user token (fb_exchange_token)
//   3. /me/accounts → permanent page tokens + Instagram IDs for all pages
//   4. Match pages to channels by stored facebookPageId and save
//   5. Redirect to /accounts with a summary
export async function GET(req: NextRequest) {
  const baseUrl     = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'
  const appId       = process.env.META_APP_ID
  const appSecret   = process.env.META_APP_SECRET
  const redirectUri = `${baseUrl}/api/auth/meta/callback`

  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')

  if (error || !code) {
    const msg = errorDesc || error || 'no_code'
    console.error('[meta-callback] OAuth error:', msg)
    return NextResponse.redirect(
      `${baseUrl}/accounts?meta_error=${encodeURIComponent(msg)}`
    )
  }

  if (!appId || !appSecret) {
    return NextResponse.redirect(
      `${baseUrl}/accounts?meta_error=${encodeURIComponent('META_APP_ID / META_APP_SECRET not configured')}`
    )
  }

  try {
    // ── Step 1: exchange code → short-lived user token ─────────────────────
    const tokenUrl =
      `https://graph.facebook.com/v25.0/oauth/access_token` +
      `?client_id=${encodeURIComponent(appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_secret=${encodeURIComponent(appSecret)}` +
      `&code=${encodeURIComponent(code)}`

    const tokenRes  = await fetch(tokenUrl)
    const tokenData = await tokenRes.json() as {
      access_token?: string
      error?: { message: string }
    }

    if (tokenData.error || !tokenData.access_token) {
      throw new Error(`Code exchange failed: ${tokenData.error?.message || 'no access_token'}`)
    }

    const shortLivedToken = tokenData.access_token
    console.log('[meta-callback] Short-lived user token obtained')

    // ── Step 2: exchange → long-lived user token (60 days) ─────────────────
    const llUrl =
      `https://graph.facebook.com/v25.0/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${encodeURIComponent(appId)}` +
      `&client_secret=${encodeURIComponent(appSecret)}` +
      `&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`

    const llRes  = await fetch(llUrl)
    const llData = await llRes.json() as {
      access_token?: string
      expires_in?: number
      error?: { message: string }
    }

    if (llData.error || !llData.access_token) {
      throw new Error(`Long-lived exchange failed: ${llData.error?.message || 'no access_token'}`)
    }

    const longLivedToken = llData.access_token
    console.log(`[meta-callback] Long-lived user token obtained (expires_in: ${llData.expires_in ?? 'unknown'})`)

    // ── Step 3: fetch all managed pages + Instagram IDs ────────────────────
    const pagesUrl =
      `https://graph.facebook.com/v25.0/me/accounts` +
      `?fields=id,name,access_token,instagram_business_account%7Bid%2Cusername%7D` +
      `&access_token=${encodeURIComponent(longLivedToken)}`

    const pagesRes  = await fetch(pagesUrl)
    const pagesData = await pagesRes.json() as {
      data?: PageFromGraph[]
      error?: { message: string }
    }

    if (pagesData.error || !pagesData.data) {
      throw new Error(`/me/accounts failed: ${pagesData.error?.message || 'no data'}`)
    }

    const pages = pagesData.data
    console.log(`[meta-callback] Found ${pages.length} pages: ${pages.map(p => `${p.name}(${p.id})`).join(', ')}`)

    // ── Step 4: match pages to channels and save permanent tokens ──────────
    const store    = await loadMetaTokens()
    const pageById = new Map<string, PageFromGraph>(pages.map(p => [p.id, p]))

    let matched = 0
    let igFound = 0

    for (const [channel, cfg] of Object.entries(store)) {
      const { facebookPageId, instagramAccountId } = cfg
      if (!facebookPageId) continue

      const page = pageById.get(facebookPageId)
      if (!page) {
        console.warn(`[meta-callback] [${channel}] Page ${facebookPageId} not in /me/accounts response`)
        continue
      }

      const igId       = page.instagram_business_account?.id       || instagramAccountId || ''
      const igUsername = page.instagram_business_account?.username || ''

      store[channel] = {
        ...cfg,
        pageAccessToken:    page.access_token,  // permanent page token
        instagramAccountId: igId,
        tokenType:          'permanent',
        userAccessToken:    longLivedToken,
        tokenSavedAt:       Date.now(),
      }

      matched++
      if (igId) igFound++
      console.log(`[meta-callback] [${channel}] Saved — page="${page.name}", ig=${igId || 'none'} (@${igUsername || '?'})`)
    }

    await saveMetaTokens(store)

    console.log(`[meta-callback] Complete — ${matched} channels updated, ${igFound} Instagram IDs saved`)

    return NextResponse.redirect(
      `${baseUrl}/accounts?meta_connected=${matched}&meta_ig=${igFound}`
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[meta-callback] Error:', msg)
    return NextResponse.redirect(
      `${baseUrl}/accounts?meta_error=${encodeURIComponent(msg)}`
    )
  }
}

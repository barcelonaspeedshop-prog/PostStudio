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
    // We need to look in TWO places because pages can be either:
    //   (a) Owned directly by the user (returned by /me/accounts), or
    //   (b) Owned by a Business Portfolio (returned by /{business-id}/owned_pages
    //       and /{business-id}/client_pages — these DO NOT appear in /me/accounts).
    // Facebook Login for Business connections almost always use (b), so we must
    // enumerate the user's businesses and collect all their pages.
    const pageMap = new Map<string, PageFromGraph>()
    const fields = 'id,name,access_token,instagram_business_account%7Bid%2Cusername%7D'

    async function collectPages(url: string, label: string) {
      try {
        const r  = await fetch(url)
        const j  = await r.json() as { data?: PageFromGraph[]; error?: { message: string } }
        if (j.error) {
          console.warn(`[meta-callback] ${label} returned error: ${j.error.message}`)
          return
        }
        const list = j.data || []
        for (const p of list) if (p?.id && !pageMap.has(p.id)) pageMap.set(p.id, p)
        console.log(`[meta-callback] ${label} returned ${list.length} pages`)
      } catch (err) {
        console.warn(`[meta-callback] ${label} fetch failed:`, err instanceof Error ? err.message : err)
      }
    }

    // (a) Personal pages
    await collectPages(
      `https://graph.facebook.com/v25.0/me/accounts?fields=${fields}&limit=200&access_token=${encodeURIComponent(longLivedToken)}`,
      '/me/accounts'
    )

    // (b) Business-owned pages — enumerate businesses first
    const bizUrl =
      `https://graph.facebook.com/v25.0/me/businesses` +
      `?fields=id,name&limit=200` +
      `&access_token=${encodeURIComponent(longLivedToken)}`
    const bizRes  = await fetch(bizUrl)
    const bizData = await bizRes.json() as {
      data?: Array<{ id: string; name: string }>
      error?: { message: string }
    }
    if (bizData.error) {
      console.warn(`[meta-callback] /me/businesses returned error: ${bizData.error.message}`)
    }
    const businesses = bizData.data || []
    console.log(`[meta-callback] Found ${businesses.length} businesses: ${businesses.map(b => `${b.name}(${b.id})`).join(', ')}`)

    for (const biz of businesses) {
      await collectPages(
        `https://graph.facebook.com/v25.0/${biz.id}/owned_pages?fields=${fields}&limit=200&access_token=${encodeURIComponent(longLivedToken)}`,
        `/${biz.id}/owned_pages`
      )
      await collectPages(
        `https://graph.facebook.com/v25.0/${biz.id}/client_pages?fields=${fields}&limit=200&access_token=${encodeURIComponent(longLivedToken)}`,
        `/${biz.id}/client_pages`
      )
    }

    const pages = Array.from(pageMap.values())

    // Some business-owned pages don't include an access_token in the list response.
    // Fetch it individually for any page that's missing one.
    for (const p of pages) {
      if (p.access_token) continue
      try {
        const tUrl =
          `https://graph.facebook.com/v25.0/${p.id}` +
          `?fields=access_token&access_token=${encodeURIComponent(longLivedToken)}`
        const tRes  = await fetch(tUrl)
        const tData = await tRes.json() as { access_token?: string; error?: { message: string } }
        if (tData.access_token) p.access_token = tData.access_token
        else console.warn(`[meta-callback] Could not fetch page token for ${p.name}(${p.id}): ${tData.error?.message || 'no token'}`)
      } catch (err) {
        console.warn(`[meta-callback] Token fetch failed for ${p.name}(${p.id}):`, err instanceof Error ? err.message : err)
      }
    }

    console.log(`[meta-callback] Found ${pages.length} total pages: ${pages.map(p => `${p.name}(${p.id})`).join(', ')}`)

    if (pages.length === 0) {
      throw new Error('No pages returned from /me/accounts, /me/businesses/owned_pages, or /me/businesses/client_pages. Make sure the Business Portfolio has pages and the app has pages_show_list and business_management scopes.')
    }

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

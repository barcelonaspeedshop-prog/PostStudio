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

type SetupResult = {
  channel: string
  pageId: string
  pageName: string
  tokenType: 'permanent' | 'short'
  instagramId: string | null
  instagramUsername: string | null
  matched: boolean
}

// POST /api/meta-auth/setup
// Body: { userAccessToken: string }
//
// One-shot bulk setup for all channels:
//   1. Exchange userAccessToken → long-lived user token
//   2. GET /me/accounts → all pages the user manages + their page tokens
//      (page tokens from a long-lived user token are already permanent)
//   3. For each channel already stored with a facebookPageId, find the
//      matching page in the response and update its pageAccessToken.
//      Also captures Instagram Business Account IDs automatically.
//   4. Saves everything in one write.
export async function POST(req: NextRequest) {
  const appId     = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: 'META_APP_ID and META_APP_SECRET must be set' },
      { status: 503 }
    )
  }

  let userAccessToken: string
  try {
    const body = await req.json() as { userAccessToken?: string }
    userAccessToken = (body.userAccessToken || '').trim()
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON with userAccessToken field' }, { status: 400 })
  }

  if (!userAccessToken) {
    return NextResponse.json({ error: 'userAccessToken is required' }, { status: 400 })
  }

  try {
    // ── Step 1: exchange for long-lived user token ─────────────────────────
    const exchangeUrl =
      `https://graph.facebook.com/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${encodeURIComponent(appId)}` +
      `&client_secret=${encodeURIComponent(appSecret)}` +
      `&fb_exchange_token=${encodeURIComponent(userAccessToken)}`

    const exchangeRes  = await fetch(exchangeUrl)
    const exchangeData = await exchangeRes.json() as {
      access_token?: string
      expires_in?: number
      error?: { message: string; code: number }
    }

    if (exchangeData.error || !exchangeData.access_token) {
      const msg = exchangeData.error?.message || 'No access_token returned'
      return NextResponse.json({ error: `Token exchange failed: ${msg}` }, { status: 400 })
    }

    const longLivedUserToken = exchangeData.access_token
    console.log(`[meta-setup] Long-lived user token obtained (expires_in: ${exchangeData.expires_in ?? 'unknown'})`)

    // ── Step 2: fetch all managed pages ────────────────────────────────────
    const pagesUrl =
      `https://graph.facebook.com/v25.0/me/accounts` +
      `?fields=id,name,access_token,instagram_business_account{id,username}` +
      `&access_token=${encodeURIComponent(longLivedUserToken)}`

    const pagesRes  = await fetch(pagesUrl)
    const pagesData = await pagesRes.json() as {
      data?: PageFromGraph[]
      error?: { message: string; code: number }
    }

    if (pagesData.error || !pagesData.data) {
      const msg = pagesData.error?.message || 'No pages returned'
      return NextResponse.json({ error: `Failed to fetch pages: ${msg}` }, { status: 400 })
    }

    const pages = pagesData.data
    console.log(`[meta-setup] Found ${pages.length} pages: ${pages.map(p => `${p.name} (${p.id})`).join(', ')}`)

    // ── Step 3: match pages to stored channels and update tokens ───────────
    const store   = await loadMetaTokens()
    const results: SetupResult[] = []

    // Build a page lookup by ID for fast matching
    const pageById = new Map<string, PageFromGraph>(pages.map(p => [p.id, p]))

    // Also expose unmatched pages so the caller can see what's available
    const unmatchedPages: Array<{ id: string; name: string; instagramId: string | null }> = []

    for (const [channel, cfg] of Object.entries(store)) {
      const { facebookPageId, instagramAccountId } = cfg

      if (!facebookPageId) {
        console.warn(`[meta-setup] [${channel}] No facebookPageId stored — skipping`)
        continue
      }

      const page = pageById.get(facebookPageId)
      if (!page) {
        console.warn(`[meta-setup] [${channel}] Page ID ${facebookPageId} not found in /me/accounts response`)
        results.push({
          channel,
          pageId: facebookPageId,
          pageName: '(not found in response)',
          tokenType: cfg.tokenType ?? 'short',
          instagramId: instagramAccountId || null,
          instagramUsername: null,
          matched: false,
        })
        continue
      }

      // Page tokens from a long-lived user token are permanent
      const pageToken  = page.access_token
      const igId       = page.instagram_business_account?.id       || instagramAccountId || ''
      const igUsername = page.instagram_business_account?.username || null

      store[channel] = {
        ...cfg,
        pageAccessToken:    pageToken,
        instagramAccountId: igId,
        tokenType:          'permanent',
        userAccessToken:    longLivedUserToken,
        tokenSavedAt:       Date.now(),
      }

      console.log(`[meta-setup] [${channel}] Updated — page="${page.name}", ig=${igId || 'none'} (@${igUsername ?? '?'})`)

      results.push({
        channel,
        pageId:            page.id,
        pageName:          page.name,
        tokenType:         'permanent',
        instagramId:       igId || null,
        instagramUsername: igUsername,
        matched:           true,
      })
    }

    // Surface pages that didn't match any channel (useful for initial setup)
    const matchedPageIds = new Set(results.filter(r => r.matched).map(r => r.pageId))
    for (const page of pages) {
      if (!matchedPageIds.has(page.id)) {
        unmatchedPages.push({
          id:          page.id,
          name:        page.name,
          instagramId: page.instagram_business_account?.id || null,
        })
      }
    }

    await saveMetaTokens(store)

    const summary = {
      pagesFound:  pages.length,
      matched:     results.filter(r => r.matched).length,
      unmatched:   results.filter(r => !r.matched).length,
      unmatchedPages,
    }

    console.log(`[meta-setup] Done — ${summary.matched} channels updated, ${unmatchedPages.length} pages unmatched`)

    return NextResponse.json({ summary, results })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[meta-setup] Fatal error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

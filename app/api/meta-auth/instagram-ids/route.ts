import { NextResponse } from 'next/server'
import { loadMetaTokens, saveMetaTokens } from '@/lib/meta'

export const dynamic = 'force-dynamic'

type GraphIgAccount = { id: string; username?: string }
type GraphPageResponse = {
  instagram_business_account?: GraphIgAccount
  error?: { message: string; code: number }
  id?: string
}

type ChannelResult = {
  channel: string
  facebookPageId: string
  instagramAccountId: string | null   // what is NOW stored
  discovered: string | null           // what the Graph API returned
  username: string | null
  updated: boolean                    // whether we wrote a new ID to the store
  error?: string
}

// GET /api/meta-auth/instagram-ids
// For every channel that has a pageAccessToken + facebookPageId, queries the
// Graph API to find the linked Instagram Business Account and, if the stored
// instagramAccountId is missing or stale, saves the new ID automatically.
export async function GET() {
  try {
    const store   = await loadMetaTokens()
    const results: ChannelResult[] = []
    let   anyUpdated = false

    for (const [channel, cfg] of Object.entries(store)) {
      const { pageAccessToken, facebookPageId, instagramAccountId } = cfg

      // Skip channels without the minimum credentials
      if (!pageAccessToken || !facebookPageId) {
        results.push({
          channel,
          facebookPageId: facebookPageId || '',
          instagramAccountId: instagramAccountId || null,
          discovered: null,
          username:   null,
          updated:    false,
          error: 'Missing pageAccessToken or facebookPageId',
        })
        continue
      }

      // Query the Graph API for the Instagram Business Account linked to this page
      const url =
        `https://graph.facebook.com/v25.0/${encodeURIComponent(facebookPageId)}` +
        `?fields=instagram_business_account%7Bid%2Cusername%7D` +
        `&access_token=${encodeURIComponent(pageAccessToken)}`

      try {
        const res  = await fetch(url)
        const data = await res.json() as GraphPageResponse

        if (data.error) {
          console.warn(`[instagram-ids] [${channel}] Graph API error: ${data.error.message} (code ${data.error.code})`)
          results.push({
            channel,
            facebookPageId,
            instagramAccountId: instagramAccountId || null,
            discovered: null,
            username:   null,
            updated:    false,
            error: `Graph API: ${data.error.message} (code ${data.error.code})`,
          })
          continue
        }

        const igAccount  = data.instagram_business_account
        const discoveredId = igAccount?.id       || null
        const username     = igAccount?.username || null

        console.log(
          `[instagram-ids] [${channel}] page=${facebookPageId}` +
          ` → ig=${discoveredId ?? 'none'} (@${username ?? '?'})`
        )

        // Update the store if we found an ID that differs from what's saved
        let updated = false
        if (discoveredId && discoveredId !== instagramAccountId) {
          store[channel] = { ...cfg, instagramAccountId: discoveredId }
          anyUpdated = true
          updated    = true
          console.log(`[instagram-ids] [${channel}] Saved new Instagram account ID: ${discoveredId}`)
        }

        results.push({
          channel,
          facebookPageId,
          instagramAccountId: updated ? discoveredId : (instagramAccountId || null),
          discovered: discoveredId,
          username,
          updated,
        })
      } catch (fetchErr: unknown) {
        const message = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
        console.error(`[instagram-ids] [${channel}] Fetch error: ${message}`)
        results.push({
          channel,
          facebookPageId,
          instagramAccountId: instagramAccountId || null,
          discovered: null,
          username:   null,
          updated:    false,
          error: message,
        })
      }
    }

    // Persist any newly discovered IDs in one write
    if (anyUpdated) {
      await saveMetaTokens(store)
    }

    const summary = {
      total:    results.length,
      updated:  results.filter(r => r.updated).length,
      found:    results.filter(r => r.discovered).length,
      missing:  results.filter(r => !r.discovered && !r.error).length,
      errors:   results.filter(r => r.error).length,
    }

    console.log(`[instagram-ids] Done — ${summary.found} found, ${summary.updated} updated, ${summary.errors} errors`)

    return NextResponse.json({ summary, results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[instagram-ids] Fatal error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

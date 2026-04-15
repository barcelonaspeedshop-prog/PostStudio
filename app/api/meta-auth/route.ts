import { NextRequest, NextResponse } from 'next/server'
import { loadMetaTokens, saveMetaTokens } from '@/lib/meta'

export const dynamic = 'force-dynamic'

// GET /api/meta-auth — return connection status for all channels
export async function GET() {
  try {
    const store = await loadMetaTokens()

    // Return presence info only — never expose raw tokens to the client
    const status: Record<string, {
      connected: boolean
      instagramAccountId?: string
      facebookPageId?: string
      tokenType?: 'permanent' | 'short'
    }> = {}

    for (const [channel, cfg] of Object.entries(store)) {
      status[channel] = {
        connected: Boolean(cfg.pageAccessToken && cfg.facebookPageId),
        instagramAccountId: cfg.instagramAccountId || undefined,
        facebookPageId: cfg.facebookPageId,
        tokenType: cfg.tokenType,
      }
    }

    return NextResponse.json({ status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/meta-auth — save credentials for a channel
// Body: { channel, pageAccessToken, instagramAccountId, facebookPageId }
//
// Automatically upgrades a short-lived token to a permanent Page Access Token:
//   1. Exchange via fb_exchange_token  → long-lived user token (60 days)
//   2. GET /{page_id}?fields=access_token  → permanent page token (never expires)
// Requires META_APP_ID and META_APP_SECRET env vars.  If either is missing the
// token is stored as-is with tokenType='short'.
export async function POST(req: NextRequest) {
  try {
    const { channel, pageAccessToken, instagramAccountId, facebookPageId } = await req.json()

    if (!channel || typeof channel !== 'string') {
      return NextResponse.json({ error: 'channel is required' }, { status: 400 })
    }
    if (!pageAccessToken || typeof pageAccessToken !== 'string') {
      return NextResponse.json({ error: 'pageAccessToken is required' }, { status: 400 })
    }
    if (!facebookPageId || typeof facebookPageId !== 'string') {
      return NextResponse.json({ error: 'facebookPageId is required' }, { status: 400 })
    }

    const appId     = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET

    // ── Debug: log env var presence so we can verify they are injected ────────
    console.log(`[meta-auth] [${channel}] ENV CHECK — META_APP_ID: ${appId ? `"${appId}"` : 'NOT SET'}, META_APP_SECRET: ${appSecret ? `set (${appSecret.length} chars)` : 'NOT SET'}`)

    let finalToken  = pageAccessToken
    let tokenType: 'permanent' | 'short' = 'short'
    let exchangeNote = ''

    if (appId && appSecret) {
      try {
        // ── Step 1: short-lived token → long-lived user token (60 days) ──────
        const exchangeUrl =
          `https://graph.facebook.com/oauth/access_token` +
          `?grant_type=fb_exchange_token` +
          `&client_id=${encodeURIComponent(appId)}` +
          `&client_secret=${encodeURIComponent(appSecret)}` +
          `&fb_exchange_token=${encodeURIComponent(pageAccessToken)}`

        console.log(`[meta-auth] [${channel}] Step 1: exchanging token via fb_exchange_token...`)
        const exchangeRes  = await fetch(exchangeUrl)
        const exchangeData = await exchangeRes.json() as { access_token?: string; token_type?: string; expires_in?: number; error?: { message: string; type: string; code: number } }
        console.log(`[meta-auth] [${channel}] Step 1 response — status: ${exchangeRes.status}, has access_token: ${Boolean(exchangeData.access_token)}, error: ${exchangeData.error?.message ?? 'none'}`)

        if (exchangeData.error) {
          exchangeNote = `Token exchange step 1 failed: ${exchangeData.error.message} (code ${exchangeData.error.code})`
          console.warn(`[meta-auth] [${channel}]`, exchangeNote)
        } else if (exchangeData.access_token) {
          const longLivedUserToken = exchangeData.access_token
          console.log(`[meta-auth] [${channel}] Step 1 succeeded — got long-lived user token (expires_in: ${exchangeData.expires_in ?? 'unknown'})`)

          // ── Step 2: long-lived user token → permanent page access token ───
          const pageUrl =
            `https://graph.facebook.com/${encodeURIComponent(facebookPageId)}` +
            `?fields=access_token` +
            `&access_token=${encodeURIComponent(longLivedUserToken)}`

          console.log(`[meta-auth] [${channel}] Step 2: fetching permanent page token for page ${facebookPageId}...`)
          const pageRes  = await fetch(pageUrl)
          const pageData = await pageRes.json() as { access_token?: string; id?: string; error?: { message: string; type: string; code: number } }
          console.log(`[meta-auth] [${channel}] Step 2 response — status: ${pageRes.status}, has access_token: ${Boolean(pageData.access_token)}, error: ${pageData.error?.message ?? 'none'}`)

          if (pageData.error) {
            exchangeNote = `Page token step 2 failed: ${pageData.error.message} (code ${pageData.error.code}) — stored long-lived user token instead`
            console.warn(`[meta-auth] [${channel}]`, exchangeNote)
            finalToken = longLivedUserToken
            tokenType  = 'short' // 60-day user token, not permanent
          } else if (pageData.access_token) {
            finalToken = pageData.access_token
            tokenType  = 'permanent'
            console.log(`[meta-auth] [${channel}] Step 2 succeeded — permanent page access token stored for page ${facebookPageId}`)
          } else {
            exchangeNote = 'Step 2 returned no access_token and no error — stored long-lived user token'
            console.warn(`[meta-auth] [${channel}]`, exchangeNote, pageData)
            finalToken = longLivedUserToken
            tokenType  = 'short'
          }
        } else {
          exchangeNote = 'Step 1 returned no access_token and no error — token stored as-is'
          console.warn(`[meta-auth] [${channel}]`, exchangeNote, exchangeData)
        }
      } catch (exchangeErr: unknown) {
        exchangeNote = `Token upgrade threw: ${exchangeErr instanceof Error ? exchangeErr.message : String(exchangeErr)} — stored as-is`
        console.warn(`[meta-auth] [${channel}]`, exchangeNote)
      }
    } else {
      exchangeNote = `META_APP_ID ${appId ? 'OK' : 'MISSING'} / META_APP_SECRET ${appSecret ? 'OK' : 'MISSING'} — token stored as-is without exchange`
      console.warn(`[meta-auth] [${channel}]`, exchangeNote)
    }

    const store = await loadMetaTokens()
    store[channel] = {
      pageAccessToken: finalToken,
      instagramAccountId: instagramAccountId || '',
      facebookPageId,
      tokenType,
    }
    await saveMetaTokens(store)

    return NextResponse.json({
      ok: true,
      channel,
      tokenType,
      ...(exchangeNote ? { note: exchangeNote } : {}),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/meta-auth — remove credentials for a channel
// Body: { channel }
export async function DELETE(req: NextRequest) {
  try {
    const { channel } = await req.json()
    if (!channel) return NextResponse.json({ error: 'channel is required' }, { status: 400 })

    const store = await loadMetaTokens()
    delete store[channel]
    await saveMetaTokens(store)

    return NextResponse.json({ ok: true, channel })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

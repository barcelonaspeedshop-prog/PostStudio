#!/usr/bin/env node
/**
 * setup-meta.js
 *
 * Refreshes all Meta/Instagram page access tokens for every channel in
 * meta-tokens.json.
 *
 * Fast path (no browser):
 *   Uses fb_exchange_token with the stored user access token to get a fresh
 *   long-lived token, then fetches a permanent page token per channel.
 *   This works for ~60 days after the last full OAuth login.
 *
 * Fallback path (Puppeteer):
 *   When the stored token is expired/missing, launches a headless browser,
 *   logs into Facebook with credentials from credentials.json, and completes
 *   the full OAuth flow through the live app at app.premirafirst.com.
 *   The server callback (/api/auth/meta/callback) handles the token exchange
 *   and saves all channels automatically.
 *
 * Usage:
 *   node scripts/setup-meta.js
 *
 * Prerequisites:
 *   npm install puppeteer  (run once in /var/www/poststudio or this repo)
 *   Ensure /docker/poststudio/data/credentials.json exists with:
 *   {
 *     "facebook": { "email": "you@example.com", "password": "..." },
 *     ...
 *   }
 */

'use strict'

const fs   = require('fs')
const path = require('path')
const https = require('https')
const http  = require('http')

// ── Config ───────────────────────────────────────────────────────────────────

const DATA_DIR         = process.env.TOKEN_STORAGE_PATH || '/docker/poststudio/data'
const CREDENTIALS_PATH = path.join(DATA_DIR, 'credentials.json')
const TOKENS_PATH      = path.join(DATA_DIR, 'meta-tokens.json')

const APP_ID     = process.env.META_APP_ID     || '915633637891649'
const APP_SECRET = process.env.META_APP_SECRET || '836c440ab53a8d981ea7e592f3588c48'
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, res => {
      let body = ''
      res.on('data', d => body += d)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }) }
        catch (e) { reject(new Error(`JSON parse failed: ${body.slice(0, 200)}`)) }
      })
    }).on('error', reject)
  })
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

// ── Fast path: API-only token refresh ────────────────────────────────────────

async function refreshViaApi(userToken) {
  console.log('[meta] Trying API fast path with stored user token...')

  // Step 1: extend the user token to a new 60-day long-lived token
  const extUrl =
    `https://graph.facebook.com/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${APP_ID}` +
    `&client_secret=${APP_SECRET}` +
    `&fb_exchange_token=${encodeURIComponent(userToken)}`

  const { status: s1, data: d1 } = await fetchJson(extUrl)
  if (s1 !== 200 || !d1.access_token) {
    throw new Error(`fb_exchange_token failed (${s1}): ${d1?.error?.message || JSON.stringify(d1)}`)
  }

  const longToken = d1.access_token
  console.log('[meta] Got fresh long-lived user token')

  // Step 2: load channels and get a permanent page token for each
  const store = loadJson(TOKENS_PATH) || {}
  const nowMs = Date.now()
  let updated = 0

  for (const [channel, cfg] of Object.entries(store)) {
    const pageId = cfg.facebookPageId
    if (!pageId) {
      console.log(`[meta] [${channel}] Skipped — no facebookPageId`)
      continue
    }

    const pageUrl =
      `https://graph.facebook.com/${pageId}` +
      `?fields=access_token` +
      `&access_token=${encodeURIComponent(longToken)}`

    try {
      const { status: s2, data: d2 } = await fetchJson(pageUrl)
      if (s2 !== 200 || !d2.access_token) {
        console.warn(`[meta] [${channel}] Page token fetch failed (${s2}): ${d2?.error?.message || JSON.stringify(d2)}`)
        continue
      }
      cfg.pageAccessToken = d2.access_token
      cfg.userAccessToken = longToken
      cfg.tokenType       = 'permanent'
      cfg.tokenSavedAt    = nowMs
      console.log(`[meta] [${channel}] ✓ Token refreshed`)
      updated++
    } catch (e) {
      console.warn(`[meta] [${channel}] Error: ${e.message}`)
    }
  }

  saveJson(TOKENS_PATH, store)
  console.log(`\n[meta] API fast path complete — ${updated} channel(s) updated`)
  return updated
}

// ── Fallback: Puppeteer full OAuth login ─────────────────────────────────────

async function refreshViaPuppeteer(credentials) {
  console.log('[meta] Starting Puppeteer full OAuth flow...')

  let puppeteer
  try {
    puppeteer = require('puppeteer')
  } catch {
    console.error('[meta] Puppeteer not installed. Run: npm install puppeteer')
    process.exit(1)
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,900',
    ],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  )

  try {
    // Navigate to the app's Meta OAuth entry point
    const oauthStartUrl = `${APP_URL}/api/auth/meta`
    console.log(`[meta] Navigating to ${oauthStartUrl}`)
    await page.goto(oauthStartUrl, { waitUntil: 'networkidle2', timeout: 30000 })

    const currentUrl = page.url()
    console.log(`[meta] Landed on: ${currentUrl}`)

    // ── Facebook login ────────────────────────────────────────────────────
    if (currentUrl.includes('facebook.com')) {
      console.log('[meta] Facebook login page detected')

      // Accept cookies if prompted
      try {
        const cookieBtn = await page.waitForSelector(
          '[data-testid="cookie-policy-manage-dialog-accept-button"], ' +
          'button[title="Allow all cookies"], ' +
          '#accept-btn',
          { timeout: 5000 }
        )
        if (cookieBtn) { await cookieBtn.click(); await sleep(1000) }
      } catch { /* no cookie dialog */ }

      // Enter email
      await page.waitForSelector('#email', { timeout: 15000 })
      await page.type('#email', credentials.facebook.email, { delay: 60 })

      // Enter password
      await page.waitForSelector('#pass', { timeout: 5000 })
      await page.type('#pass', credentials.facebook.password, { delay: 60 })

      // Submit
      await page.click('[name="login"]')
      console.log('[meta] Submitted Facebook credentials')

      // Wait for redirect — either to consent screen or back to app
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
      console.log(`[meta] After login: ${page.url()}`)
    }

    // ── Facebook permissions consent screen ───────────────────────────────
    // May appear after login if the app hasn't been authorized yet
    const afterLoginUrl = page.url()
    if (afterLoginUrl.includes('facebook.com') && afterLoginUrl.includes('oauth')) {
      console.log('[meta] Consent / permission screen detected')

      // Look for the Continue / OK button
      try {
        const continueBtn = await page.waitForSelector(
          '[data-testid="login_review_screen__confirm_button"], ' +
          'button[name="__CONFIRM__"], ' +
          'button[value="OK"], ' +
          '__confirm__',
          { timeout: 10000 }
        )
        if (continueBtn) {
          await continueBtn.click()
          console.log('[meta] Clicked continue on consent screen')
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
        }
      } catch {
        // Try a more generic approach
        const buttons = await page.$$('button')
        for (const btn of buttons) {
          const text = await page.evaluate(el => el.textContent, btn)
          if (/continue|ok|allow|yes/i.test(text || '')) {
            await btn.click()
            console.log(`[meta] Clicked "${text}" on consent page`)
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
            break
          }
        }
      }
    }

    // ── Wait for app callback to complete ─────────────────────────────────
    console.log('[meta] Waiting for app callback to process...')
    await page.waitForFunction(
      url => window.location.href.includes(url),
      { timeout: 30000 },
      APP_URL.replace('https://', '').replace('http://', '')
    )

    const finalUrl = page.url()
    console.log(`[meta] Final URL: ${finalUrl}`)

    if (finalUrl.includes('meta_connected=')) {
      const match = finalUrl.match(/meta_connected=(\d+)/)
      const count = match ? match[1] : '?'
      console.log(`\n[meta] ✓ Puppeteer OAuth complete — ${count} channel(s) connected`)
    } else if (finalUrl.includes('meta_error=')) {
      const errMatch = finalUrl.match(/meta_error=([^&]+)/)
      const errMsg = errMatch ? decodeURIComponent(errMatch[1]) : 'unknown error'
      throw new Error(`App callback returned error: ${errMsg}`)
    } else {
      console.warn('[meta] Unexpected final URL — check manually:', finalUrl)
    }
  } finally {
    await browser.close()
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log('=== PostStudio Meta Token Refresh ===\n')

  // Load credentials
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(`credentials.json not found at ${CREDENTIALS_PATH}`)
    console.error('Create it with:')
    console.error(JSON.stringify({
      facebook: { email: 'your@email.com', password: 'yourpassword' },
      google:   { email: 'your@email.com', password: 'yourpassword' },
    }, null, 2))
    process.exit(1)
  }

  const credentials = loadJson(CREDENTIALS_PATH)

  // Load existing tokens
  const store = loadJson(TOKENS_PATH) || {}
  const storedUserToken = Object.values(store).find(c => c.userAccessToken)?.userAccessToken

  // Try API fast path first
  if (storedUserToken) {
    try {
      const updated = await refreshViaApi(storedUserToken)
      if (updated > 0) {
        console.log('\n✓ Done — all tokens refreshed via API (no browser needed)')
        return
      }
    } catch (e) {
      console.warn(`[meta] API fast path failed: ${e.message}`)
      console.log('[meta] Falling back to Puppeteer full OAuth...\n')
    }
  } else {
    console.log('[meta] No stored user token — going straight to Puppeteer OAuth...\n')
  }

  // Fallback: Puppeteer
  if (!credentials.facebook?.email || !credentials.facebook?.password) {
    console.error('credentials.json must contain facebook.email and facebook.password for Puppeteer fallback')
    process.exit(1)
  }

  await refreshViaPuppeteer(credentials)
}

main().catch(e => {
  console.error('\n[meta] Fatal error:', e.message)
  process.exit(1)
})

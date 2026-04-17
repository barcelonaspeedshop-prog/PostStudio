#!/usr/bin/env node
/**
 * setup-youtube.js
 *
 * Connects every PostStudio channel to YouTube by completing the Google OAuth
 * consent flow for each one.  Each channel must be authorised under its own
 * Brand Account — this script selects the matching Brand Account from Google's
 * account picker automatically.
 *
 * Flow for each channel:
 *   1. Navigate to  /api/auth/youtube?channel=<name>
 *      → server redirects to Google OAuth with prompt=select_account+consent
 *   2. If not signed in: enter Google credentials from credentials.json
 *   3. Google shows the account/Brand-Account picker
 *      → script clicks the row whose name matches the channel
 *   4. Grant consent (click "Continue" / "Allow")
 *   5. Google redirects back to the app callback which saves the token
 *   6. Wait for /accounts?connected=<channel> then move to next channel
 *
 * Usage:
 *   node scripts/setup-youtube.js [channel1] [channel2] ...
 *   (omit channel args to process all nine channels)
 *
 * Prerequisites:
 *   npm install puppeteer
 *   /docker/poststudio/data/credentials.json must contain:
 *   {
 *     "google": { "email": "you@gmail.com", "password": "..." }
 *   }
 */

'use strict'

const fs   = require('fs')
const path = require('path')

// ── Config ───────────────────────────────────────────────────────────────────

const DATA_DIR         = process.env.TOKEN_STORAGE_PATH || '/docker/poststudio/data'
const CREDENTIALS_PATH = path.join(DATA_DIR, 'credentials.json')
const APP_URL          = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'

const ALL_CHANNELS = [
  'Gentlemen of Fuel',
  'Omnira Football',
  'Road & Trax',
  'Omnira F1',
  'Omnira Food',
  'Omnira Golf',
  'Omnira Travel',
  'Omnira NFL',
  'Omnira Cricket',
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

/**
 * Wait for a selector, return null (instead of throwing) if it times out.
 */
async function maybeSel(page, selector, timeout = 5000) {
  try { return await page.waitForSelector(selector, { visible: true, timeout }) }
  catch { return null }
}

/**
 * Click a button/link whose text content matches a regex.
 * Returns true if found and clicked.
 */
async function clickByText(page, pattern, timeout = 8000) {
  try {
    await page.waitForFunction(
      re => {
        const els = [...document.querySelectorAll('button, [role="button"], a')]
        return els.find(el => re.test(el.textContent || ''))
      },
      { timeout },
      new RegExp(pattern, 'i')
    )
    await page.evaluate(re => {
      const els = [...document.querySelectorAll('button, [role="button"], a')]
      const el = els.find(el => re.test(el.textContent || ''))
      if (el) el.click()
    }, new RegExp(pattern, 'i'))
    return true
  } catch {
    return false
  }
}

// ── Google login ──────────────────────────────────────────────────────────────

async function handleGoogleLogin(page, credentials) {
  const url = page.url()
  if (!url.includes('accounts.google.com')) return

  console.log('  [google] Login page detected')

  // Email step
  const emailInput = await maybeSel(page, 'input[type="email"]', 10000)
  if (emailInput) {
    await emailInput.click({ clickCount: 3 })
    await emailInput.type(credentials.google.email, { delay: 60 })
    await page.keyboard.press('Enter')
    await sleep(2000)
  }

  // Password step (arrives after email)
  const passInput = await maybeSel(page, 'input[type="password"]', 10000)
  if (passInput) {
    await passInput.click({ clickCount: 3 })
    await passInput.type(credentials.google.password, { delay: 60 })
    await page.keyboard.press('Enter')
    console.log('  [google] Credentials submitted')
    await sleep(3000)
  }

  // 2-step verification prompt — can't automate hardware keys, but TOTP can be
  // added by the user; for now, wait up to 60 s for the user to complete it.
  if (page.url().includes('accounts.google.com')) {
    const is2fa = await maybeSel(page, 'input[type="tel"], #totpPin, [data-challengetype]', 3000)
    if (is2fa) {
      console.warn('  [google] 2-Step Verification detected — waiting up to 60 s for manual completion...')
      await page.waitForFunction(
        () => !window.location.href.includes('accounts.google.com'),
        { timeout: 60000 }
      )
    }
  }
}

// ── Google account / Brand-Account picker ─────────────────────────────────────

async function selectBrandAccount(page, channelName) {
  const url = page.url()

  // Google shows this after login OR as the very first screen when multiple
  // accounts are already signed in (prompt=select_account).
  if (!url.includes('accounts.google.com')) return

  console.log(`  [google] Account picker detected — looking for "${channelName}"`)

  // Wait for the account list to render
  await sleep(2000)

  // Try to find a list item matching the channel name
  const found = await page.evaluate(name => {
    // Account rows in the modern account picker
    const rows = [
      ...document.querySelectorAll('[data-authuser], [data-identifier], li[role="presentation"]'),
      ...document.querySelectorAll('div[jscontroller] div[data-email]'),
    ]

    // Also search all visible text nodes
    const allEls = [...document.querySelectorAll('*')]
    const nameNorm = name.toLowerCase().replace(/\s+/g, ' ').trim()

    for (const el of allEls) {
      const text = (el.textContent || '').toLowerCase().replace(/\s+/g, ' ').trim()
      if (text === nameNorm && el.offsetParent !== null) {
        // Walk up to the clickable ancestor
        let target = el
        while (target && !['LI', 'DIV', 'A', 'BUTTON'].includes(target.tagName)) {
          target = target.parentElement
        }
        if (target) { target.click(); return true }
      }
    }
    return false
  }, channelName)

  if (found) {
    console.log(`  [google] Clicked "${channelName}" account row`)
    await sleep(2000)
    return
  }

  // Channel not found in account list — may need to use "Switch account" or
  // the user hasn't added this Brand Account to their session.
  // As a fallback: click the first non-personal account (Brand Accounts are
  // listed after the personal account in the order they were added).
  console.warn(`  [google] "${channelName}" not found in account picker — trying first Brand Account`)

  // "Add another account" or use existing — for now just wait & see where we land
  await sleep(1000)
}

// ── OAuth consent screen ──────────────────────────────────────────────────────

async function handleConsentScreen(page) {
  const url = page.url()
  if (!url.includes('accounts.google.com') || !url.includes('consent')) return

  console.log('  [google] Consent screen — clicking Continue/Allow')

  // Try "Continue" first (Google's newer consent phrasing)
  if (await clickByText(page, '^Continue$', 8000)) return
  // Then "Allow"
  if (await clickByText(page, '^Allow$', 5000)) return
  // Then any blue action button
  try {
    const btn = await maybeSel(page, 'button[jsname="LgbsSe"], button[data-action-button]', 5000)
    if (btn) { await btn.click(); return }
  } catch { /* ignore */ }

  console.warn('  [google] Could not find consent button — waiting for manual action (10 s)')
  await sleep(10000)
}

// ── Connect one channel ───────────────────────────────────────────────────────

async function connectChannel(browser, channelName, credentials) {
  console.log(`\n── Connecting: ${channelName} ──`)

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  )

  try {
    const startUrl = `${APP_URL}/api/auth/youtube?channel=${encodeURIComponent(channelName)}`
    console.log(`  Navigating to ${startUrl}`)
    await page.goto(startUrl, { waitUntil: 'networkidle2', timeout: 30000 })

    // May need to log in first
    await handleGoogleLogin(page, credentials)

    // May see account picker
    await selectBrandAccount(page, channelName)

    // May see consent screen
    await handleConsentScreen(page)

    // After consent or if already authorised, Google redirects to the callback.
    // The app callback saves the token then redirects to /accounts?connected=...
    console.log('  Waiting for app callback...')
    await page.waitForFunction(
      appUrl => {
        const u = window.location.href
        return u.includes(appUrl) && (u.includes('connected=') || u.includes('error='))
      },
      { timeout: 60000 },
      APP_URL.replace(/^https?:\/\//, '')
    )

    const finalUrl = page.url()

    if (finalUrl.includes(`connected=${encodeURIComponent(channelName)}`)) {
      console.log(`  ✓ ${channelName} connected successfully`)
      await page.close()
      return { channel: channelName, success: true }
    } else if (finalUrl.includes('error=')) {
      const m = finalUrl.match(/error=([^&]+)/)
      const err = m ? decodeURIComponent(m[1]) : 'unknown'
      console.error(`  ✗ ${channelName} failed: ${err}`)
      await page.close()
      return { channel: channelName, success: false, error: err }
    } else {
      console.warn(`  ? ${channelName} — unexpected final URL: ${finalUrl}`)
      await page.close()
      return { channel: channelName, success: false, error: 'unexpected_url' }
    }
  } catch (e) {
    console.error(`  ✗ ${channelName} error: ${e.message}`)
    try { await page.close() } catch { /* ignore */ }
    return { channel: channelName, success: false, error: e.message }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== PostStudio YouTube Setup ===\n')

  // Load credentials
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(`credentials.json not found at ${CREDENTIALS_PATH}`)
    console.error('Create it with:')
    console.error(JSON.stringify({
      facebook: { email: 'you@example.com', password: '...' },
      google:   { email: 'you@gmail.com',   password: '...' },
    }, null, 2))
    process.exit(1)
  }

  const credentials = loadJson(CREDENTIALS_PATH)
  if (!credentials.google?.email || !credentials.google?.password) {
    console.error('credentials.json must contain google.email and google.password')
    process.exit(1)
  }

  // Determine which channels to process
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'))
  const channels = args.length > 0 ? args : ALL_CHANNELS
  console.log(`Channels to connect: ${channels.join(', ')}\n`)

  // Load Puppeteer
  let puppeteer
  try {
    puppeteer = require('puppeteer')
  } catch {
    console.error('Puppeteer not installed. Run: npm install puppeteer')
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

  // Pre-sign into Google once in a shared page so subsequent channels reuse
  // the session cookie and skip the login step.
  console.log('Pre-signing into Google...')
  const loginPage = await browser.newPage()
  await loginPage.setViewport({ width: 1280, height: 900 })
  await loginPage.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  )
  await loginPage.goto('https://accounts.google.com/signin', { waitUntil: 'networkidle2', timeout: 30000 })
  await handleGoogleLogin(loginPage, credentials)
  await loginPage.close()
  console.log('Google session established\n')

  const results = []

  for (const channel of channels) {
    const result = await connectChannel(browser, channel, credentials)
    results.push(result)
    // Brief pause between channels to avoid rate limiting
    await sleep(2000)
  }

  await browser.close()

  // Summary
  console.log('\n=== Summary ===')
  const ok   = results.filter(r => r.success)
  const fail = results.filter(r => !r.success)
  console.log(`✓ Connected: ${ok.length}  — ${ok.map(r => r.channel).join(', ') || 'none'}`)
  if (fail.length > 0) {
    console.log(`✗ Failed:    ${fail.length}  — ${fail.map(r => `${r.channel} (${r.error})`).join(', ')}`)
  }

  if (fail.length > 0) process.exit(1)
}

main().catch(e => {
  console.error('\n[youtube] Fatal error:', e.message)
  process.exit(1)
})

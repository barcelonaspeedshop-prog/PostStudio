#!/usr/bin/env node
/**
 * create-credentials-doc-oauth.js
 *
 * Creates "Premira First — Master Credentials" Google Doc using a one-time
 * OAuth 2.0 user flow (Drive scope) with the existing YouTube OAuth client.
 *
 * Step 1: Run with no args → prints an auth URL. Visit it, authorise, copy the code.
 * Step 2: Run with the code as first arg → creates the doc and prints the URL.
 *
 * Usage:
 *   node create-credentials-doc-oauth.js
 *   node create-credentials-doc-oauth.js "4/0AX4XfWj..."
 *
 * Required env vars (already set in docker-compose):
 *   YOUTUBE_CLIENT_ID
 *   YOUTUBE_CLIENT_SECRET
 *   GOOGLE_DRIVE_FOLDER_ID   (default: 1wtB_6-2kTfPs7fnvo905MCw7Qr5Gk--Z)
 */

'use strict'

const { google } = require('googleapis')
const { Readable } = require('stream')

const CLIENT_ID     = process.env.YOUTUBE_CLIENT_ID
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET env vars are required.')
  process.exit(1)
}
const REDIRECT_URI  = 'urn:ietf:wg:oauth:2.0:oob'   // out-of-band — no redirect server needed
const ROOT_FOLDER   = process.env.GOOGLE_DRIVE_FOLDER_ID || '1wtB_6-2kTfPs7fnvo905MCw7Qr5Gk--Z'
const DOC_TITLE     = 'Premira First — Master Credentials'

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

// ── Channel data ─────────────────────────────────────────────────────────────

const CHANNELS = [
  { channel: 'Gentlemen of Fuel', emailSuffix: 'gof',          passwordSuffix: 'gof',      youtube: '@gentlemenoffuel', instagram: '@gentlemenoffuel',  facebook: 'Gentlemen of Fuel' },
  { channel: 'Omnira F1',         emailSuffix: 'omniraf1',      passwordSuffix: 'f1',       youtube: '@omniraf1',        instagram: '@omniraf1',          facebook: 'Omnira F1' },
  { channel: 'Road & Trax',       emailSuffix: 'roadandtrax',   passwordSuffix: 'trax',     youtube: '@roadandtrax',     instagram: '@roadandtrax',       facebook: 'Road & Trax' },
  { channel: 'Omnira Football',   emailSuffix: 'omnirafoot',    passwordSuffix: 'football', youtube: '@omnirafc',        instagram: '@omnirafootball',    facebook: 'Omnira Football' },
  { channel: 'Omnira Cricket',    emailSuffix: 'omniracricket', passwordSuffix: 'cricket',  youtube: '@OmniraCricket',   instagram: '@omniracricket',     facebook: 'Omnira Cricket' },
  { channel: 'Omnira Golf',       emailSuffix: 'omniragolf',    passwordSuffix: 'golf',     youtube: '@OmniraGolf',      instagram: '@omniragolf',        facebook: 'Omnira Golf' },
  { channel: 'Omnira NFL',        emailSuffix: 'omniranfl',     passwordSuffix: 'nfl',      youtube: '@OmniraNFL',       instagram: '@omniranfl',         facebook: 'Omnira NFL' },
  { channel: 'Omnira Food',       emailSuffix: 'omnirafood',    passwordSuffix: 'food',     youtube: '@OmniraFood',      instagram: '@omnirafood',        facebook: 'Omnira Food' },
  { channel: 'Omnira Travel',     emailSuffix: 'omniratravel',  passwordSuffix: 'travel',   youtube: '@OmniraTravel',    instagram: '@omniratravel',      facebook: 'Omnira Travel' },
]

// ── HTML builder ─────────────────────────────────────────────────────────────

function buildHtml() {
  const th = (t) => `<th style="background:#1a1a2e;color:#fff;font-weight:bold;padding:8px 12px;border:1px solid #ccc;font-size:11pt;text-align:left;">${t}</th>`
  const td = (t, muted) => `<td style="padding:7px 12px;border:1px solid #ccc;font-size:10pt;vertical-align:top;${muted ? 'color:#888;font-style:italic;' : ''}">${t || '—'}</td>`

  const headers = ['Channel','Email','Password','YouTube','Instagram','Facebook','TikTok (future)','X (future)','Notes']
  const headerRow = `<tr>${headers.map(th).join('')}</tr>`

  const dataRows = CHANNELS.map((ch, i) => {
    const email = `barcelonaspeedshop+${ch.emailSuffix}@gmail.com`
    const pwd   = `Omn1ra.${ch.passwordSuffix}`
    const bg    = i % 2 === 0 ? '#ffffff' : '#f9f9f9'
    return `<tr style="background:${bg};">
      ${td(`<strong>${ch.channel}</strong>`)}
      ${td(email)}
      ${td(pwd)}
      ${td(ch.youtube)}
      ${td(ch.instagram)}
      ${td(ch.facebook)}
      ${td('', true)}
      ${td('', true)}
      ${td('', true)}
    </tr>`
  }).join('\n')

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${DOC_TITLE}</title></head>
<body style="font-family:Arial,sans-serif;margin:40px;color:#222;">
  <h1 style="font-size:20pt;color:#1a1a2e;margin-bottom:4px;">${DOC_TITLE}</h1>
  <p style="font-size:10pt;color:#666;margin-bottom:24px;">Generated ${new Date().toUTCString()} · CONFIDENTIAL — store securely</p>
  <table style="border-collapse:collapse;width:100%;">
    ${headerRow}
    ${dataRows}
  </table>
  <div style="background:#fff8e1;border-left:4px solid #f0ad00;padding:10px 14px;margin-top:24px;font-size:10pt;color:#5a4000;">
    ⚠ <strong>CONFIDENTIAL</strong> — This document contains account credentials.
    Restrict sharing to authorised team members only.
    TikTok and X columns are reserved for future use.
  </div>
</body></html>`
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const code = process.argv[2]

  if (!code) {
    // Step 1: print auth URL
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive'],
      prompt: 'consent',
    })
    console.log('\n╔══════════════════════════════════════════════════════════╗')
    console.log('║  STEP 1 — Open this URL in a browser and authorise       ║')
    console.log('╚══════════════════════════════════════════════════════════╝\n')
    console.log(url)
    console.log('\n╔══════════════════════════════════════════════════════════╗')
    console.log('║  STEP 2 — After authorising, copy the code shown and run ║')
    console.log('║  node create-credentials-doc-oauth.js "PASTE_CODE_HERE"  ║')
    console.log('╚══════════════════════════════════════════════════════════╝\n')
    return
  }

  // Step 2: exchange code → token → create doc
  console.log('🔑 Exchanging code for token...')
  const { tokens } = await oauth2Client.getToken(code.trim())
  oauth2Client.setCredentials(tokens)
  console.log('✅ Token obtained')

  const drive = google.drive({ version: 'v3', auth: oauth2Client })

  // Check if already exists
  const existing = await drive.files.list({
    q: `name='${DOC_TITLE}' and '${ROOT_FOLDER}' in parents and trashed=false`,
    fields: 'files(id,name,webViewLink)',
    pageSize: 1,
  })

  if (existing.data.files && existing.data.files.length > 0) {
    const f = existing.data.files[0]
    console.log(`\n⚠  Document already exists — updating content...`)
    const html = buildHtml()
    await drive.files.update({
      fileId: f.id,
      media: { mimeType: 'text/html', body: Readable.from(Buffer.from(html, 'utf-8')) },
    })
    console.log('\n✅ Document updated!')
    console.log(`\n🔗 ${f.webViewLink}`)
    return
  }

  console.log('📄 Creating Google Doc...')
  const html = buildHtml()
  const created = await drive.files.create({
    requestBody: {
      name: DOC_TITLE,
      mimeType: 'application/vnd.google-apps.document',
      parents: [ROOT_FOLDER],
    },
    media: { mimeType: 'text/html', body: Readable.from(Buffer.from(html, 'utf-8')) },
    fields: 'id,webViewLink',
  })

  console.log('\n✅ Document created successfully!')
  console.log(`\n🔗 ${created.data.webViewLink}`)
  console.log('\n📋 9 channels included with pre-filled email + password columns.')
}

main().catch(err => {
  console.error('❌ Error:', err.message || err)
  process.exit(1)
})

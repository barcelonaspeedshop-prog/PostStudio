#!/usr/bin/env node
/**
 * create-credentials-doc.js
 *
 * Creates a "Premira First — Master Credentials" Google Doc in the
 * root Drive folder (GOOGLE_DRIVE_FOLDER_ID) using the service account.
 *
 * The doc contains a formatted table with columns:
 *   Channel | Email | Password | YouTube | Instagram | Facebook | TikTok | X | Notes
 *
 * Auth: service account JSON key file.
 *   Path: GOOGLE_SERVICE_ACCOUNT_KEY_FILE env var, or /data/service-account.json
 *
 * Required env vars:
 *   GOOGLE_DRIVE_FOLDER_ID            – ID of the root Drive folder
 *   GOOGLE_SERVICE_ACCOUNT_KEY_FILE   – path to service account JSON (optional, default /data/service-account.json)
 *
 * Usage:
 *   node create-credentials-doc.js
 *
 *   # All env vars inline:
 *   GOOGLE_DRIVE_FOLDER_ID=1wtB_6-2kTfPs7fnvo905MCw7Qr5Gk--Z \
 *   GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/data/service-account.json \
 *   node create-credentials-doc.js
 */

'use strict'

const { google } = require('googleapis')
const fs = require('fs')
const { Readable } = require('stream')

// ── Config ───────────────────────────────────────────────────────────────────

const SERVICE_ACCOUNT_PATH =
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || '/data/service-account.json'

const ROOT_FOLDER_ID =
  process.env.GOOGLE_DRIVE_FOLDER_ID || '1wtB_6-2kTfPs7fnvo905MCw7Qr5Gk--Z'

const DOC_TITLE = 'Premira First — Master Credentials'

// ── Channel data ─────────────────────────────────────────────────────────────

const CHANNELS = [
  {
    channel: 'Gentlemen of Fuel',
    emailSuffix: 'gof',
    passwordSuffix: 'gof',
    youtube: '@gentlemenoffuel',
    instagram: '@gentlemenoffuel',
    facebook: 'Gentlemen of Fuel',
    tiktok: '@gentlemenoffuel',
    x: '',
    notes: '',
  },
  {
    channel: 'Omnira F1',
    emailSuffix: 'omniraf1',
    passwordSuffix: 'f1',
    youtube: '@omniraf1',
    instagram: '@omniraf1',
    facebook: 'Omnira F1',
    tiktok: '@omniraf1',
    x: '',
    notes: '',
  },
  {
    channel: 'Road & Trax',
    emailSuffix: 'roadandtrax',
    passwordSuffix: 'trax',
    youtube: '@roadandtrax',
    instagram: '@roadandtrax',
    facebook: 'Road & Trax',
    tiktok: '@roadandtrax',
    x: '',
    notes: '',
  },
  {
    channel: 'Omnira Football',
    emailSuffix: 'omnirafoot',
    passwordSuffix: 'football',
    youtube: '@omnirafc',
    instagram: '@omnirafootball',
    facebook: 'Omnira Football',
    tiktok: '@omnirafootball',
    x: '',
    notes: '',
  },
  {
    channel: 'Omnira Cricket',
    emailSuffix: 'omniracricket',
    passwordSuffix: 'cricket',
    youtube: '@OmniraCricket',
    instagram: '@omniracricket',
    facebook: 'Omnira Cricket',
    tiktok: '@omniracricket',
    x: '',
    notes: '',
  },
  {
    channel: 'Omnira Golf',
    emailSuffix: 'omniragolf',
    passwordSuffix: 'golf',
    youtube: '@OmniraGolf',
    instagram: '@omniragolf',
    facebook: 'Omnira Golf',
    tiktok: '@omniragolf',
    x: '',
    notes: '',
  },
  {
    channel: 'Omnira NFL',
    emailSuffix: 'omniranfl',
    passwordSuffix: 'nfl',
    youtube: '@OmniraNFL',
    instagram: '@omniranfl',
    facebook: 'Omnira NFL',
    tiktok: '@omniranfl',
    x: '',
    notes: '',
  },
  {
    channel: 'Omnira Food',
    emailSuffix: 'omnirafood',
    passwordSuffix: 'food',
    youtube: '@OmniraFood',
    instagram: '@omnirafood',
    facebook: 'Omnira Food',
    tiktok: '@omnirafood',
    x: '',
    notes: '',
  },
  {
    channel: 'Omnira Travel',
    emailSuffix: 'omniratravel',
    passwordSuffix: 'travel',
    youtube: '@OmniraTravel',
    instagram: '@omniratravel',
    facebook: 'Omnira Travel',
    tiktok: '@omniratravel',
    x: '',
    notes: '',
  },
]

// ── Auth ─────────────────────────────────────────────────────────────────────

function getAuth() {
  let key
  try {
    key = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'))
  } catch (e) {
    throw new Error(
      `Cannot load service account key from ${SERVICE_ACCOUNT_PATH}: ` +
      (e instanceof Error ? e.message : String(e))
    )
  }

  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents',
    ],
  })
}

// ── HTML table builder ───────────────────────────────────────────────────────
// Drive accepts an HTML upload and converts it to a Google Doc natively.

function buildHtml() {
  const thStyle = 'background-color:#1a1a2e;color:#ffffff;font-weight:bold;padding:8px 12px;text-align:left;border:1px solid #ccc;font-size:11pt;'
  const tdStyle = 'padding:7px 12px;border:1px solid #ccc;font-size:10pt;vertical-align:top;'
  const tdMuted = tdStyle + 'color:#888888;font-style:italic;'

  const headers = ['Channel', 'Email', 'Password', 'YouTube', 'Instagram', 'Facebook', 'TikTok (future)', 'X (future)', 'Notes']

  const headerRow = `<tr>${headers.map(h => `<th style="${thStyle}">${h}</th>`).join('')}</tr>`

  const dataRows = CHANNELS.map((ch, i) => {
    const email = `barcelonaspeedshop+${ch.emailSuffix}@gmail.com`
    const password = `Omn1ra.${ch.passwordSuffix}`
    const rowBg = i % 2 === 0 ? '#ffffff' : '#f9f9f9'
    const td = (val, muted = false) =>
      `<td style="${muted ? tdMuted : tdStyle}background-color:${rowBg};">${val || '—'}</td>`

    return `<tr>
      ${td(`<strong>${ch.channel}</strong>`)}
      ${td(email)}
      ${td(password)}
      ${td(ch.youtube)}
      ${td(ch.instagram)}
      ${td(ch.facebook)}
      ${td('', true)}
      ${td('', true)}
      ${td(ch.notes || '', true)}
    </tr>`
  }).join('\n')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${DOC_TITLE}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #222; }
    h1 { font-size: 20pt; margin-bottom: 4px; color: #1a1a2e; }
    .subtitle { font-size: 10pt; color: #666; margin-bottom: 24px; }
    table { border-collapse: collapse; width: 100%; margin-top: 16px; }
    .warning { background:#fff8e1; border-left:4px solid #f0ad00; padding:10px 14px; margin-top:24px; font-size:10pt; color:#5a4000; }
  </style>
</head>
<body>
  <h1>${DOC_TITLE}</h1>
  <p class="subtitle">Generated ${new Date().toUTCString()} · CONFIDENTIAL — store securely</p>
  <table>
    ${headerRow}
    ${dataRows}
  </table>
  <div class="warning">
    ⚠ <strong>CONFIDENTIAL</strong> — This document contains account credentials.
    Restrict sharing to authorised team members only.
    TikTok and X columns are reserved for future use.
  </div>
</body>
</html>`
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔐 Loading service account from', SERVICE_ACCOUNT_PATH)
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })

  // Check if doc already exists in root folder
  const existing = await drive.files.list({
    q: `name='${DOC_TITLE}' and '${ROOT_FOLDER_ID}' in parents and trashed=false`,
    fields: 'files(id,name,webViewLink)',
    pageSize: 1,
  })

  if (existing.data.files && existing.data.files.length > 0) {
    const f = existing.data.files[0]
    console.log(`\n⚠  Document already exists — updating content...`)
    console.log(`   ID:  ${f.id}`)
    console.log(`   URL: ${f.webViewLink}`)

    // Update existing file content
    const html = buildHtml()
    const stream = Readable.from(Buffer.from(html, 'utf-8'))
    await drive.files.update({
      fileId: f.id,
      media: {
        mimeType: 'text/html',
        body: stream,
      },
    })
    console.log('\n✅ Document updated successfully!')
    console.log(`\n🔗 URL: ${f.webViewLink}`)
    return
  }

  // Create new Google Doc by uploading HTML (Drive converts it automatically)
  console.log('📄 Creating Google Doc...')
  const html = buildHtml()
  const stream = Readable.from(Buffer.from(html, 'utf-8'))

  const created = await drive.files.create({
    requestBody: {
      name: DOC_TITLE,
      mimeType: 'application/vnd.google-apps.document',
      parents: [ROOT_FOLDER_ID],
    },
    media: {
      mimeType: 'text/html',
      body: stream,
    },
    fields: 'id,webViewLink',
  })

  const fileId = created.data.id
  const url = created.data.webViewLink

  console.log('\n✅ Document created successfully!')
  console.log(`   ID:  ${fileId}`)
  console.log(`\n🔗 URL: ${url}`)
  console.log('\n📋 Channels included:')
  CHANNELS.forEach(ch => {
    const email = `barcelonaspeedshop+${ch.emailSuffix}@gmail.com`
    const pwd = `Omn1ra.${ch.passwordSuffix}`
    console.log(`   ${ch.channel.padEnd(20)} ${email.padEnd(42)} ${pwd}`)
  })
}

main().catch(err => {
  console.error('❌ Error:', err.message || err)
  process.exit(1)
})

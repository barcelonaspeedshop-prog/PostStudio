#!/usr/bin/env node
/**
 * setup-drive-folders.js
 *
 * Creates the Premira First image library folder structure in Google Drive
 * and saves all folder IDs to /docker/poststudio/data/drive-folders.json.
 *
 * Auth: reuses the existing "Gentlemen of Fuel" YouTube OAuth token from
 * youtube-tokens.json.  That token must include the drive.file scope
 * (added to the YouTube consent screen — re-connect GoF on the Accounts
 * page once if you haven't already).
 *
 * Auth priority:
 *   1. Service account key file  → GOOGLE_SERVICE_ACCOUNT_KEY_FILE env var
 *                                   or ./service-account.json
 *   2. GoF YouTube OAuth token   → loaded from YOUTUBE_TOKENS_PATH env var
 *                                   or first existing path in TOKEN_SEARCH_PATHS
 *                                   Channel key controlled by DRIVE_AUTH_CHANNEL
 *                                   (default: "Gentlemen of Fuel")
 *
 * Required env vars:
 *   GOOGLE_DRIVE_FOLDER_ID   – ID of the root Drive folder to build under
 *   YOUTUBE_CLIENT_ID        – Google OAuth client ID
 *   YOUTUBE_CLIENT_SECRET    – Google OAuth client secret
 *
 * Usage:
 *   node setup-drive-folders.js
 *
 *   # All env vars inline:
 *   GOOGLE_DRIVE_FOLDER_ID=1AbCd... \
 *   YOUTUBE_CLIENT_ID=xxx \
 *   YOUTUBE_CLIENT_SECRET=yyy \
 *   node setup-drive-folders.js
 *
 *   # Custom channel or token path:
 *   DRIVE_AUTH_CHANNEL="Omnira F1" \
 *   YOUTUBE_TOKENS_PATH=/data/youtube-tokens.json \
 *   node setup-drive-folders.js
 */

'use strict'

const fs   = require('fs')
const path = require('path')

// ── Resolve googleapis ────────────────────────────────────────────────────────
let google
const MODULE_CANDIDATES = [
  path.join(__dirname, 'node_modules', 'googleapis'),
  path.join(__dirname, '..', 'node_modules', 'googleapis'),
  'googleapis',
]
for (const candidate of MODULE_CANDIDATES) {
  try { google = require(candidate).google; break } catch (_) { /* next */ }
}
if (!google) {
  console.error('googleapis not found. Run: npm install  (inside the project directory)')
  process.exit(1)
}

// ── Config ────────────────────────────────────────────────────────────────────

const ROOT_FOLDER_ID    = process.env.GOOGLE_DRIVE_FOLDER_ID || ''
const DRIVE_AUTH_CHANNEL = process.env.DRIVE_AUTH_CHANNEL || 'Gentlemen of Fuel'

let OUTPUT_DIR  = process.env.OUTPUT_DIR || '/docker/poststudio/data'
let OUTPUT_FILE = path.join(OUTPUT_DIR, 'drive-folders.json')

// youtube-tokens.json search order (first existing file wins)
const YOUTUBE_TOKEN_PATHS = [
  process.env.YOUTUBE_TOKENS_PATH,
  '/data/youtube-tokens.json',                      // inside container / Docker volume
  '/docker/poststudio/data/youtube-tokens.json',    // host-side bind mount
  path.join(__dirname, 'youtube-tokens.json'),      // next to this script
].filter(Boolean)

// Service account key file search order (alternative auth)
const SERVICE_ACCOUNT_PATHS = [
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
  path.join(__dirname, 'service-account.json'),
  '/root/service-account.json',
].filter(Boolean)

// ── Folder tree ───────────────────────────────────────────────────────────────

const FOLDER_TREE = {
  'Gentlemen of Fuel': ['Cars', 'Events', 'Lifestyle', 'AI Generated'],
  'Omnira F1':         ['Drivers', 'Teams', 'Circuits', 'Technical', 'AI Generated'],
  'Road & Trax':       ['Rally', 'Endurance', 'Circuits', 'AI Generated'],
  'Omnira Football':   ['Players', 'Stadiums', 'Matches', 'AI Generated'],
  'Omnira Cricket':    ['Players', 'Stadiums', 'Matches', 'AI Generated'],
  'Omnira Golf':       ['Players', 'Courses', 'Tournaments', 'AI Generated'],
  'Omnira NFL':        ['Players', 'Stadiums', 'Teams', 'AI Generated'],
  'Omnira Food':       ['Dishes', 'Restaurants', 'Chefs', 'AI Generated'],
  'Omnira Travel':     ['Destinations', 'Hotels', 'Landscapes', 'AI Generated'],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readJsonFile(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch { return null }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function buildServiceAccountClient(keyFilePath) {
  const key = readJsonFile(keyFilePath)
  if (!key) return null
  console.log(`  Service account: ${key.client_email}`)
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

async function buildYouTubeTokenClient() {
  const clientId     = process.env.YOUTUBE_CLIENT_ID     || ''
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || ''

  if (!clientId || !clientSecret) {
    console.warn('  YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET not set — skipping OAuth')
    return null
  }

  // Find youtube-tokens.json
  let tokensPath = null
  for (const p of YOUTUBE_TOKEN_PATHS) {
    if (fs.existsSync(p)) { tokensPath = p; break }
  }
  if (!tokensPath) {
    console.warn('  youtube-tokens.json not found. Searched:')
    YOUTUBE_TOKEN_PATHS.forEach(p => console.warn(`    ${p}`))
    return null
  }

  const store = readJsonFile(tokensPath)
  if (!store) {
    console.warn(`  Could not parse ${tokensPath}`)
    return null
  }

  const token = store[DRIVE_AUTH_CHANNEL]
  if (!token) {
    console.warn(`  No token for channel "${DRIVE_AUTH_CHANNEL}" in ${tokensPath}`)
    console.warn(`  Available channels: ${Object.keys(store).join(', ') || '(none)'}`)
    return null
  }
  if (!token.refresh_token) {
    console.warn(`  Token for "${DRIVE_AUTH_CHANNEL}" is missing refresh_token`)
    return null
  }

  console.log(`  YouTube token: ${tokensPath}  [channel: "${DRIVE_AUTH_CHANNEL}"]`)

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret)
  oauth2.setCredentials({
    access_token:  token.access_token,
    refresh_token: token.refresh_token,
    expiry_date:   token.expiry_date,
  })

  // Refresh if expired or within 2 minutes of expiry
  if (!token.expiry_date || Date.now() >= token.expiry_date - 120_000) {
    console.log('  Token expired — refreshing…')
    try {
      const { credentials } = await oauth2.refreshAccessToken()
      oauth2.setCredentials(credentials)

      // Persist refreshed token back into the store
      store[DRIVE_AUTH_CHANNEL] = {
        ...token,
        access_token: credentials.access_token  ?? token.access_token,
        expiry_date:  credentials.expiry_date   ?? token.expiry_date,
        // keep refresh_token unchanged unless Google rotated it
        ...(credentials.refresh_token ? { refresh_token: credentials.refresh_token } : {}),
      }
      fs.writeFileSync(tokensPath, JSON.stringify(store, null, 2))
      console.log(`  Token refreshed and saved → ${tokensPath}`)
    } catch (e) {
      throw new Error(`Token refresh failed: ${e.message}`)
    }
  }

  return google.drive({ version: 'v3', auth: oauth2 })
}

async function buildDriveClient() {
  // 1. Try service account
  for (const saPath of SERVICE_ACCOUNT_PATHS) {
    if (fs.existsSync(saPath)) {
      const drive = buildServiceAccountClient(saPath)
      if (drive) return drive
    }
  }
  // 2. Try GoF YouTube token
  const drive = await buildYouTubeTokenClient()
  if (drive) return drive

  throw new Error(
    'No valid auth credentials found.\n\n' +
    `Option A — YouTube token (preferred):\n` +
    `  1. Re-connect "${DRIVE_AUTH_CHANNEL}" on the Accounts page\n` +
    `     (the YouTube OAuth now requests drive.file scope).\n` +
    `  2. Ensure YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET are set.\n` +
    `  3. Ensure youtube-tokens.json is readable at one of:\n` +
    YOUTUBE_TOKEN_PATHS.map(p => `     ${p}`).join('\n') + '\n\n' +
    'Option B — Service account:\n' +
    '  1. Create a service account in Google Cloud Console.\n' +
    '  2. Download the JSON key, save as ./service-account.json.\n' +
    '  3. Share the root Drive folder with the service account email.\n' +
    '  Set GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/path/to/key.json to override path.'
  )
}

// ── Drive folder helpers ──────────────────────────────────────────────────────

async function findOrCreateFolder(drive, name, parentId) {
  const safeN = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const q = [
    `name='${safeN}'`,
    `'${parentId}' in parents`,
    `mimeType='application/vnd.google-apps.folder'`,
    `trashed=false`,
  ].join(' and ')

  const list = await drive.files.list({ q, fields: 'files(id,name)', pageSize: 1, spaces: 'drive' })
  const existing = list.data.files && list.data.files[0]
  if (existing && existing.id) return { id: existing.id, created: false }

  const res = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
  })
  return { id: res.data.id, created: true }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log()
  console.log('╔═══════════════════════════════════════════════════════╗')
  console.log('║    Premira First — Google Drive Folder Setup          ║')
  console.log('╚═══════════════════════════════════════════════════════╝')
  console.log()

  if (!ROOT_FOLDER_ID) {
    console.error('Error: GOOGLE_DRIVE_FOLDER_ID is not set.\n')
    console.error('Steps:')
    console.error('  1. Create a folder in Google Drive called')
    console.error('     "Premira First — Image Library"')
    console.error('  2. Copy its ID from the URL:')
    console.error('     drive.google.com/drive/folders/<FOLDER_ID>')
    console.error('  3. Re-run with:')
    console.error('     GOOGLE_DRIVE_FOLDER_ID=<id> node setup-drive-folders.js')
    process.exit(1)
  }

  console.log(`Root folder ID    : ${ROOT_FOLDER_ID}`)
  console.log(`Drive auth channel: ${DRIVE_AUTH_CHANNEL}`)
  console.log(`Output file       : ${OUTPUT_FILE}`)
  console.log()

  // ── Auth
  console.log('── Authenticating ──────────────────────────────────────')
  const drive = await buildDriveClient()
  console.log()

  // ── Verify root folder
  console.log('── Verifying root folder ───────────────────────────────')
  try {
    const meta = await drive.files.get({ fileId: ROOT_FOLDER_ID, fields: 'id,name' })
    console.log(`  ✓  "${meta.data.name}"  (${ROOT_FOLDER_ID})`)
  } catch (e) {
    console.error(`  ✗  Cannot access root folder: ${e.message}`)
    console.error()
    console.error('  Possible causes:')
    console.error('  • GOOGLE_DRIVE_FOLDER_ID is wrong')
    console.error('  • The authenticated account does not have access to the folder')
    console.error('  • The YouTube token does not yet have drive.file scope —')
    console.error(`    re-connect "${DRIVE_AUTH_CHANNEL}" on the Accounts page first`)
    process.exit(1)
  }
  console.log()

  // ── Create folder tree
  console.log('── Building folder tree ────────────────────────────────')
  const folderIds = {}
  const stats = { created: 0, existing: 0 }

  for (const [channel, subcategories] of Object.entries(FOLDER_TREE)) {
    const ch = await findOrCreateFolder(drive, channel, ROOT_FOLDER_ID)
    folderIds[channel] = ch.id
    console.log(`  ${ch.created ? '✚ CREATED' : '· exists '}  ${channel}`)
    console.log(`            ${ch.id}`)
    ch.created ? stats.created++ : stats.existing++

    for (const cat of subcategories) {
      const sub = await findOrCreateFolder(drive, cat, ch.id)
      folderIds[`${channel}/${cat}`] = sub.id
      console.log(`  ${sub.created ? '  ✚ CREATED' : '  · exists '}  └─ ${cat}`)
      console.log(`                ${sub.id}`)
      sub.created ? stats.created++ : stats.existing++
    }
    console.log()
  }

  // ── Save results
  console.log('── Saving folder IDs ───────────────────────────────────')
  try {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  } catch (e) {
    const fallback = path.join(__dirname, 'drive-folders.json')
    console.warn(`  Warning: cannot create ${OUTPUT_DIR}: ${e.message}`)
    console.warn(`  Writing to fallback: ${fallback}`)
    OUTPUT_DIR  = path.dirname(fallback)
    OUTPUT_FILE = fallback
  }

  const output = {
    _meta: { generatedAt: new Date().toISOString(), rootFolderId: ROOT_FOLDER_ID },
    ...folderIds,
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))
  console.log(`  Saved → ${OUTPUT_FILE}`)
  console.log()

  // ── Summary
  console.log('── Summary ─────────────────────────────────────────────')
  console.log(`  Channels           : ${Object.keys(FOLDER_TREE).length}`)
  console.log(`  Folders checked    : ${stats.created + stats.existing}`)
  console.log(`  Newly created      : ${stats.created}`)
  console.log(`  Already existed    : ${stats.existing}`)
  console.log()

  // ── Full ID table
  console.log('── Folder ID reference ─────────────────────────────────')
  const maxLen = Math.max(...Object.keys(folderIds).map(k => k.length))
  for (const [key, id] of Object.entries(folderIds)) {
    console.log(`  ${key.padEnd(maxLen)}  →  ${id}`)
  }
  console.log()
  console.log('  Set in .env / docker-compose.yml:')
  console.log(`  GOOGLE_DRIVE_FOLDER_ID=${ROOT_FOLDER_ID}`)
  console.log()
  console.log('Done ✓')
  console.log()
}

main().catch(e => {
  console.error('\nFatal:', e.message || e)
  process.exit(1)
})

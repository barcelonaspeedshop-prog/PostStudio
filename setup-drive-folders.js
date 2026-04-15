#!/usr/bin/env node
/**
 * setup-drive-folders.js
 *
 * Creates the Premira First image library folder structure in Google Drive
 * and saves all folder IDs to /docker/poststudio/data/drive-folders.json.
 *
 * Auth priority:
 *   1. Service account key file  → GOOGLE_SERVICE_ACCOUNT_KEY_FILE env var
 *                                   or ./service-account.json
 *   2. OAuth2 user token         → loaded from TOKEN_PATH env var
 *                                   or first existing path in TOKEN_SEARCH_PATHS
 *                                   Uses YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET
 *
 * Required env vars (at minimum):
 *   GOOGLE_DRIVE_FOLDER_ID   – ID of the root Drive folder to build under
 *
 * Usage:
 *   node /root/setup-drive-folders.js
 *
 *   # Override root folder ID at runtime:
 *   GOOGLE_DRIVE_FOLDER_ID=1AbCd... node /root/setup-drive-folders.js
 *
 *   # Point at a specific OAuth token:
 *   TOKEN_PATH=/data/drive-token.json node /root/setup-drive-folders.js
 *
 * Deployment: copy this file to /root/setup-drive-folders.js on your server
 * and run it there once after the Drive OAuth flow is complete.
 */

'use strict'

const fs   = require('fs')
const path = require('path')

// ── Resolve googleapis ────────────────────────────────────────────────────────
// Tries local node_modules, then a globally installed package.
let google
const MODULE_CANDIDATES = [
  path.join(__dirname, 'node_modules', 'googleapis'),
  path.join(__dirname, '..', 'node_modules', 'googleapis'),
  'googleapis', // global / system path
]
for (const candidate of MODULE_CANDIDATES) {
  try {
    google = require(candidate).google
    break
  } catch (_) { /* try next */ }
}
if (!google) {
  console.error('googleapis not found. Run one of:')
  console.error('  npm install          (inside the project directory)')
  console.error('  npm install -g googleapis')
  process.exit(1)
}

// ── Config ────────────────────────────────────────────────────────────────────

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || ''

// Where to write the folder-ID map on the host
const OUTPUT_DIR  = process.env.OUTPUT_DIR || '/docker/poststudio/data'
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'drive-folders.json')

// OAuth token search order (first existing file wins)
const TOKEN_SEARCH_PATHS = [
  process.env.TOKEN_PATH,
  '/data/drive-token.json',                      // inside the container
  '/docker/poststudio/data/drive-token.json',    // host-side volume
  path.join(__dirname, 'drive-token.json'),      // next to this script
].filter(Boolean)

// Service account key file search order
const SERVICE_ACCOUNT_PATHS = [
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
  path.join(__dirname, 'service-account.json'),
  '/root/service-account.json',
].filter(Boolean)

// ── Folder tree definition ────────────────────────────────────────────────────

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

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`  Created directory: ${dir}`)
  }
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

async function buildOAuthClient() {
  const clientId     = process.env.YOUTUBE_CLIENT_ID     || ''
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || ''

  if (!clientId || !clientSecret) {
    console.warn('  YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET not set — skipping OAuth')
    return null
  }

  let tokenPath = null
  for (const p of TOKEN_SEARCH_PATHS) {
    if (fs.existsSync(p)) { tokenPath = p; break }
  }

  if (!tokenPath) {
    console.warn('  No OAuth token found. Searched:')
    TOKEN_SEARCH_PATHS.forEach(p => console.warn(`    ${p}`))
    return null
  }

  const token = readJsonFile(tokenPath)
  if (!token || !token.refresh_token) {
    console.warn(`  Token at ${tokenPath} is missing refresh_token`)
    return null
  }

  console.log(`  OAuth token: ${tokenPath}`)

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
      const updated = {
        access_token:  credentials.access_token  ?? token.access_token,
        refresh_token: credentials.refresh_token ?? token.refresh_token,
        expiry_date:   credentials.expiry_date   ?? token.expiry_date,
      }
      fs.writeFileSync(tokenPath, JSON.stringify(updated, null, 2))
      console.log(`  Token refreshed and saved → ${tokenPath}`)
    } catch (e) {
      throw new Error(`Token refresh failed: ${e.message}`)
    }
  }

  return google.drive({ version: 'v3', auth: oauth2 })
}

async function buildDriveClient() {
  // 1. Try service account key
  for (const saPath of SERVICE_ACCOUNT_PATHS) {
    if (fs.existsSync(saPath)) {
      const drive = buildServiceAccountClient(saPath)
      if (drive) return drive
    }
  }
  // 2. Try OAuth user token
  const drive = await buildOAuthClient()
  if (drive) return drive

  throw new Error(
    'No valid auth credentials found.\n\n' +
    'Option A — Service account (recommended for scripts):\n' +
    '  1. In Google Cloud Console → IAM → Service Accounts, create a key (JSON).\n' +
    '  2. Share the root Drive folder with the service account email.\n' +
    '  3. Save the JSON as ./service-account.json (next to this script)\n' +
    '     or set GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/path/to/key.json\n\n' +
    'Option B — Existing OAuth token:\n' +
    '  1. Complete the Drive OAuth flow at https://app.premirafirst.com/api/auth/drive\n' +
    '  2. Ensure YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET are set.\n' +
    '  3. Copy /data/drive-token.json from the container to one of:\n' +
    TOKEN_SEARCH_PATHS.map(p => `     ${p}`).join('\n')
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

  const list = await drive.files.list({
    q,
    fields: 'files(id,name)',
    pageSize: 1,
    spaces: 'drive',
  })

  const existing = list.data.files && list.data.files[0]
  if (existing && existing.id) return { id: existing.id, created: false }

  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
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
    console.error('     GOOGLE_DRIVE_FOLDER_ID=<FOLDER_ID> node setup-drive-folders.js')
    process.exit(1)
  }

  console.log(`Root folder ID : ${ROOT_FOLDER_ID}`)
  console.log(`Output file    : ${OUTPUT_FILE}`)
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
    console.error('  Ensure GOOGLE_DRIVE_FOLDER_ID is correct and the')
    console.error('  authenticated account has at least Editor access to it.')
    process.exit(1)
  }
  console.log()

  // ── Create folders
  console.log('── Building folder tree ────────────────────────────────')
  const folderIds = {}
  const stats = { created: 0, existing: 0 }

  for (const [channel, subcategories] of Object.entries(FOLDER_TREE)) {
    const ch = await findOrCreateFolder(drive, channel, ROOT_FOLDER_ID)
    folderIds[channel] = ch.id
    const chTag = ch.created ? '✚ CREATED' : '· exists '
    console.log(`  ${chTag}  ${channel}`)
    console.log(`            ${ch.id}`)
    ch.created ? stats.created++ : stats.existing++

    for (const cat of subcategories) {
      const sub = await findOrCreateFolder(drive, cat, ch.id)
      const subKey = `${channel}/${cat}`
      folderIds[subKey] = sub.id
      const subTag = sub.created ? '  ✚ CREATED' : '  · exists '
      console.log(`  ${subTag}  └─ ${cat}`)
      console.log(`                ${sub.id}`)
      sub.created ? stats.created++ : stats.existing++
    }
    console.log()
  }

  // ── Save output
  console.log('── Saving folder IDs ───────────────────────────────────')
  try {
    ensureDir(OUTPUT_DIR)
  } catch (e) {
    // OUTPUT_DIR may not be writable from this machine (e.g. /docker/...)
    // Fall back to writing next to the script
    console.warn(`  Warning: cannot create ${OUTPUT_DIR}: ${e.message}`)
    const fallback = path.join(__dirname, 'drive-folders.json')
    console.warn(`  Writing to fallback location: ${fallback}`)
    OUTPUT_FILE = fallback // reassigned — acceptable in a script
  }

  const output = {
    _meta: {
      generatedAt:  new Date().toISOString(),
      rootFolderId: ROOT_FOLDER_ID,
    },
    ...folderIds,
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))
  console.log(`  Saved → ${OUTPUT_FILE}`)
  console.log()

  // ── Summary
  console.log('── Summary ─────────────────────────────────────────────')
  const totalChannels  = Object.keys(FOLDER_TREE).length
  const totalFolders   = stats.created + stats.existing
  console.log(`  Channels           : ${totalChannels}`)
  console.log(`  Folders checked    : ${totalFolders}`)
  console.log(`  Newly created      : ${stats.created}`)
  console.log(`  Already existed    : ${stats.existing}`)
  console.log()

  // ── Full ID reference table
  console.log('── Folder ID reference ─────────────────────────────────')
  const maxLen = Math.max(...Object.keys(folderIds).map(k => k.length))
  for (const [key, id] of Object.entries(folderIds)) {
    console.log(`  ${key.padEnd(maxLen)}  →  ${id}`)
  }
  console.log()
  console.log('  Copy the root ID into your .env / docker-compose.yml:')
  console.log(`  GOOGLE_DRIVE_FOLDER_ID=${ROOT_FOLDER_ID}`)
  console.log()
  console.log('Done ✓')
  console.log()
}

main().catch(e => {
  console.error('\nFatal:', e.message || e)
  process.exit(1)
})

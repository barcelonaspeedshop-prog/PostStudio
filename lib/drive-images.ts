/**
 * Google Drive image library integration.
 *
 * Auth: uses the same OAuth2 client credentials as YouTube (YOUTUBE_CLIENT_ID /
 * YOUTUBE_CLIENT_SECRET) but with drive.file scope.  Tokens are stored
 * separately in /data/drive-token.json.
 *
 * Folder structure inside the root GOOGLE_DRIVE_FOLDER_ID:
 *   <root>/
 *     <channel name>/
 *       Generated/          ← auto-saved composited slides
 *       <category>/         ← manually assigned categories
 */

import { google, drive_v3 } from 'googleapis'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getOAuth2Client } from './youtube'

const TOKENS_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const DRIVE_TOKEN_PATH = path.join(TOKENS_DIR, 'drive-token.json')

export type DriveToken = {
  access_token: string
  refresh_token: string
  expiry_date: number
}

export type DriveImageFile = {
  id: string
  name: string
  thumbnailLink?: string
  createdTime?: string
}

// ── Token store ──────────────────────────────────────────────────────────────

export async function loadDriveToken(): Promise<DriveToken | null> {
  try {
    if (!existsSync(DRIVE_TOKEN_PATH)) return null
    const raw = await readFile(DRIVE_TOKEN_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function saveDriveToken(token: DriveToken): Promise<void> {
  if (!existsSync(TOKENS_DIR)) {
    await mkdir(TOKENS_DIR, { recursive: true })
  }
  await writeFile(DRIVE_TOKEN_PATH, JSON.stringify(token, null, 2))
}

// ── Authenticated Drive client ───────────────────────────────────────────────

export async function getDriveClient(): Promise<drive_v3.Drive> {
  const token = await loadDriveToken()
  if (!token) throw new Error('Google Drive not connected. Visit /api/auth/drive to authorise.')

  const oauth2 = getOAuth2Client()
  oauth2.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expiry_date: token.expiry_date,
  })

  // Auto-refresh if expired or expiring within 2 minutes
  const isExpired = !token.expiry_date || Date.now() >= token.expiry_date - 120_000
  if (isExpired) {
    try {
      const { credentials } = await oauth2.refreshAccessToken()
      oauth2.setCredentials(credentials)
      await saveDriveToken({
        access_token: credentials.access_token ?? token.access_token,
        refresh_token: credentials.refresh_token ?? token.refresh_token,
        expiry_date: credentials.expiry_date ?? token.expiry_date,
      })
    } catch (e) {
      throw new Error(`Drive token refresh failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return google.drive({ version: 'v3', auth: oauth2 })
}

// ── Folder helpers ───────────────────────────────────────────────────────────

/**
 * Find a folder by name under parentId, creating it if it doesn't exist.
 * Returns the folder ID.
 */
async function findOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string,
): Promise<string> {
  const safeN = name.replace(/'/g, "\\'")
  const q = `name='${safeN}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const res = await drive.files.list({ q, fields: 'files(id,name)', pageSize: 1 })
  const existing = res.data.files?.[0]
  if (existing?.id) return existing.id

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  })
  return created.data.id!
}

/**
 * Resolve (find or create) the full folder path:
 *   <root> / <channel> / <category>
 */
async function resolveFolder(
  drive: drive_v3.Drive,
  channel: string,
  category: string,
): Promise<string> {
  const rootId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!rootId) throw new Error('GOOGLE_DRIVE_FOLDER_ID env var is not set')
  const channelId = await findOrCreateFolder(drive, channel, rootId)
  return findOrCreateFolder(drive, category, channelId)
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Search a channel/category folder for image files matching `query`.
 * If query is empty, returns the most recent 20 images.
 */
export async function searchDriveImages(
  channel: string,
  category: string,
  query: string,
): Promise<DriveImageFile[]> {
  const drive = await getDriveClient()
  const folderId = await resolveFolder(drive, channel, category)

  const nameClause = query.trim()
    ? `name contains '${query.replace(/'/g, "\\'")}'`
    : ''
  const q = [
    `'${folderId}' in parents`,
    "mimeType contains 'image/'",
    'trashed=false',
    nameClause,
  ].filter(Boolean).join(' and ')

  const res = await drive.files.list({
    q,
    fields: 'files(id,name,thumbnailLink,createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 20,
  })

  return (res.data.files || []).map(f => ({
    id: f.id!,
    name: f.name!,
    thumbnailLink: f.thumbnailLink ?? undefined,
    createdTime: f.createdTime ?? undefined,
  }))
}

/**
 * Save a base64 JPEG image to the channel/category folder in Drive.
 * Returns the Drive file ID.
 */
export async function saveToDrive(
  channel: string,
  category: string,
  imageBase64: string,
  filename: string,
): Promise<string> {
  const drive = await getDriveClient()
  const folderId = await resolveFolder(drive, channel, category)

  // Strip data URI header if present
  const b64 = imageBase64.startsWith('data:')
    ? imageBase64.replace(/^data:image\/\w+;base64,/, '')
    : imageBase64
  const buffer = Buffer.from(b64, 'base64')

  const { Readable } = await import('stream')
  const stream = Readable.from(buffer)

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType: 'image/jpeg',
      body: stream,
    },
    fields: 'id',
  })

  return res.data.id!
}

/**
 * Download a Drive file by ID and return it as a base64 data URI.
 */
export async function getDriveImageAsBase64(fileId: string): Promise<string> {
  const drive = await getDriveClient()
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' },
  )
  const buf = Buffer.from(res.data as ArrayBuffer)
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

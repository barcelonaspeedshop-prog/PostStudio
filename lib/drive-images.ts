/**
 * Google Drive image library integration.
 *
 * Auth: Google service account JSON key file.
 * Path: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE  (default: /data/service-account.json)
 *
 * The service account must have Editor access to the root Drive folder
 * (GOOGLE_DRIVE_FOLDER_ID).  Share the folder with the service account's
 * email address (found in the key file as "client_email").
 *
 * Folder structure inside the root GOOGLE_DRIVE_FOLDER_ID:
 *   <root>/
 *     <channel name>/
 *       Generated/          ← auto-saved composited slides
 *       <category>/         ← manually assigned categories
 */

import { google, drive_v3 } from 'googleapis'
import { readFileSync } from 'fs'

const SERVICE_ACCOUNT_PATH =
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || '/data/service-account.json'

export type DriveImageFile = {
  id: string
  name: string
  thumbnailLink?: string
  createdTime?: string
}

// ── Authenticated Drive client ───────────────────────────────────────────────

export async function getDriveClient(): Promise<drive_v3.Drive> {
  let key: Record<string, string>
  try {
    key = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'))
  } catch (e) {
    throw new Error(
      `Cannot load service account key from ${SERVICE_ACCOUNT_PATH}: ` +
      (e instanceof Error ? e.message : String(e)) +
      '. Place the JSON key file at that path or set GOOGLE_SERVICE_ACCOUNT_KEY_FILE.'
    )
  }

  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })

  return google.drive({ version: 'v3', auth })
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

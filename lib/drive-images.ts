/**
 * Google Drive image library integration.
 *
 * Auth: reuses the existing YouTube OAuth token for the "Gentlemen of Fuel"
 * channel (stored in /data/youtube-tokens.json).  That token must include the
 * https://www.googleapis.com/auth/drive.file scope — added to the YouTube
 * consent screen in app/api/auth/youtube/route.ts.  Re-connect GoF on the
 * Accounts page once to pick up the new scope.
 *
 * The channel used for Drive auth is controlled by the DRIVE_AUTH_CHANNEL env
 * var (defaults to "Gentlemen of Fuel").
 *
 * Folder structure inside the root GOOGLE_DRIVE_FOLDER_ID:
 *   <root>/
 *     <channel name>/
 *       Generated/          ← auto-saved composited slides
 *       <category>/         ← manually assigned categories
 */

import { google, drive_v3 } from 'googleapis'
import { getAuthenticatedClient } from './youtube'

// The YouTube channel whose token is used for all Drive operations.
const DRIVE_AUTH_CHANNEL = process.env.DRIVE_AUTH_CHANNEL || 'Gentlemen of Fuel'

export type DriveImageFile = {
  id: string
  name: string
  thumbnailLink?: string
  createdTime?: string
}

// ── Authenticated Drive client ───────────────────────────────────────────────

export async function getDriveClient(): Promise<drive_v3.Drive> {
  try {
    const oauth2 = await getAuthenticatedClient(DRIVE_AUTH_CHANNEL)
    return google.drive({ version: 'v3', auth: oauth2 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(
      `Drive auth failed (using "${DRIVE_AUTH_CHANNEL}" YouTube token): ${msg}. ` +
      `Re-connect ${DRIVE_AUTH_CHANNEL} on the Accounts page to grant Drive access.`
    )
  }
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

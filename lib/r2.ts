import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

function makeClient(): S3Client | null {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null
  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  })
}

let _client: S3Client | null | undefined

function client(): S3Client | null {
  if (_client === undefined) _client = makeClient()
  return _client
}

export function isR2Configured(): boolean {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env
  return !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && R2_PUBLIC_URL)
}

export async function uploadToR2(buffer: Buffer, mimeType: string): Promise<string> {
  const c = client()
  if (!c) throw new Error('R2 not configured')
  const ext = mimeType === 'video/mp4' ? 'mp4' : 'jpg'
  const key = `slides/${randomUUID()}.${ext}`
  await c.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: 'public, max-age=3600',
  }))
  return `${process.env.R2_PUBLIC_URL!.replace(/\/$/, '')}/${key}`
}

export async function deleteFromR2(key: string): Promise<void> {
  const c = client()
  if (!c || !key) return
  try {
    await c.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }))
  } catch { /* ignore */ }
}

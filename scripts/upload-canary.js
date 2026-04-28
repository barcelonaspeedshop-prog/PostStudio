#!/usr/bin/env node
/**
 * One-time setup script — upload health/canary.jpg to R2.
 * Run once: node scripts/upload-canary.js
 * The canary object is used by GET /api/health/r2 to verify public R2 access.
 * Never delete health/canary.jpg from the bucket.
 */

const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')

async function main() {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
    console.error('Missing required env vars: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL')
    process.exit(1)
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  })

  // Check if already exists — don't re-upload unnecessarily
  try {
    await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: 'health/canary.jpg' }))
    const publicUrl = `${R2_PUBLIC_URL.replace(/\/$/, '')}/health/canary.jpg`
    console.log('Canary already exists:', publicUrl)
    return
  } catch {
    // Doesn't exist — upload it
  }

  // Minimal valid 1×1 white JPEG (631 bytes)
  const canaryJpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy' +
    'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEB' +
    'AxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUEB//EAB8QAAIBBAMBAAAAAAAAAAAAAAABAgMREiExQf/E' +
    'ABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCl2jXt' +
    'tCzSEXRhfJL5P3QAAB//2Q==',
    'base64'
  )

  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: 'health/canary.jpg',
    Body: canaryJpeg,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=86400',
  }))

  const publicUrl = `${R2_PUBLIC_URL.replace(/\/$/, '')}/health/canary.jpg`
  console.log('Canary uploaded to:', publicUrl)
}

main().catch(e => { console.error(e.message); process.exit(1) })

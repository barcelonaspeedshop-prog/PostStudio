import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Canary object uploaded once and never deleted — confirms public R2 access is working.
// URL: https://pub-05204aab4f2d4cbeb3d786b0f03d35c0.r2.dev/health/canary.jpg
// Uploaded via: node scripts/upload-canary.js (run once during initial setup)
const CANARY_KEY = 'health/canary.jpg'

const REQUIRED_ENV_VARS = [
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT',
  'R2_BUCKET',
  'R2_PUBLIC_URL',
]

function authorized(req: NextRequest): boolean {
  const token = process.env.PREVIEW_TOKEN
  if (!token) return false
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${token}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const timestamp = new Date().toISOString()

  // ── Check (c): env vars present ──────────────────────
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v])
  const envVarsCheck = { ok: missing.length === 0, missing }

  // ── Check (a): public read ────────────────────────────
  const publicUrl = `${process.env.R2_PUBLIC_URL?.replace(/\/$/, '')}/${CANARY_KEY}`
  const t0 = Date.now()
  let publicReadCheck: { ok: boolean; latencyMs: number; error?: string }
  try {
    const res = await fetch(publicUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    const latencyMs = Date.now() - t0
    if (res.ok) {
      publicReadCheck = { ok: true, latencyMs }
    } else {
      publicReadCheck = { ok: false, latencyMs, error: `HTTP ${res.status} ${res.statusText}` }
    }
  } catch (e) {
    publicReadCheck = {
      ok: false,
      latencyMs: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e),
    }
  }

  // ── Check (b): authenticated write + delete ───────────
  const t1 = Date.now()
  let authedCheck: { ok: boolean; latencyMs: number; error?: string }
  try {
    const c = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
    const key = `health/healthcheck-${Date.now()}.txt`
    await c.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: timestamp,
      ContentType: 'text/plain',
    }))
    await c.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
    }))
    authedCheck = { ok: true, latencyMs: Date.now() - t1 }
  } catch (e) {
    authedCheck = {
      ok: false,
      latencyMs: Date.now() - t1,
      error: e instanceof Error ? e.message : String(e),
    }
  }

  const ok = envVarsCheck.ok && publicReadCheck.ok && authedCheck.ok

  const body = {
    ok,
    checks: {
      envVarsPresent: envVarsCheck,
      publicRead: publicReadCheck,
      authedWriteDelete: authedCheck,
    },
    timestamp,
  }

  console.log(`[health/r2] ok=${ok} checks=${JSON.stringify(body.checks)}`)
  return NextResponse.json(body, { status: ok ? 200 : 503 })
}

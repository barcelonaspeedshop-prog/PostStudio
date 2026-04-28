import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const INDEX_PATH = path.join(DATA_DIR, 'published', 'index.json')

export async function GET() {
  try {
    if (!existsSync(INDEX_PATH)) return NextResponse.json([])
    const articles = JSON.parse(await readFile(INDEX_PATH, 'utf-8'))
    return NextResponse.json(articles)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

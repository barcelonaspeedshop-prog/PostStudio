import { NextResponse } from 'next/server'
import { getAllRestaurants } from '@/lib/restaurants-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const all = getAllRestaurants()
    return NextResponse.json(all)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

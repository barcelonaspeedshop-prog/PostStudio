import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { restaurants as staticRestaurants, type Restaurant } from './restaurants'

const AI_FILE = path.join('/data', 'restaurants-ai.json')

function loadAiRestaurants(): Restaurant[] {
  try {
    if (!existsSync(AI_FILE)) return []
    const raw = readFileSync(AI_FILE, 'utf-8')
    return JSON.parse(raw) as Restaurant[]
  } catch {
    return []
  }
}

/** All restaurants: static entries overridden/extended by AI-generated entries */
export function getAllRestaurants(): Restaurant[] {
  const ai = loadAiRestaurants()
  if (!ai.length) return staticRestaurants

  const staticSlugs = new Set(staticRestaurants.map(r => r.slug))
  const aiSlugs = new Set(ai.map(r => r.slug))

  // Static entries that have no AI override, plus all AI entries
  const base = staticRestaurants.filter(r => !aiSlugs.has(r.slug))
  return [...base, ...ai]
}

/** Look up a restaurant by slug — checks AI overrides first, then static */
export function getRestaurantServer(slug: string): Restaurant | undefined {
  const ai = loadAiRestaurants()
  const fromAi = ai.find(r => r.slug === slug)
  if (fromAi) return fromAi
  return staticRestaurants.find(r => r.slug === slug)
}

/** Related restaurants for a given restaurant */
export function getRelatedServer(restaurant: Restaurant): Restaurant[] {
  return restaurant.related
    .map(slug => getRestaurantServer(slug))
    .filter(Boolean) as Restaurant[]
}

/** Check if a slug exists in either source */
export function restaurantExists(slug: string): boolean {
  const ai = loadAiRestaurants()
  return ai.some(r => r.slug === slug) || staticRestaurants.some(r => r.slug === slug)
}

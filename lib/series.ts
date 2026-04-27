export type SeriesEntry = { slug: string; name: string; description: string }

export const SERIES: Record<string, SeriesEntry[]> = {
  food: [
    { slug: 'news', name: 'News', description: 'Standard news/feature article' },
    { slug: 'no-frills', name: 'No Frills', description: 'Honest reviews of unfussy restaurants that punch above their weight' },
    { slug: 'top-5', name: 'Top 5', description: 'Top 5 places in a given location' },
  ],
  f1: [
    { slug: 'news', name: 'News', description: 'Standard news/feature article' },
    { slug: 'the-archive', name: 'The Archive', description: 'Historic race deep-dives' },
    { slug: 'pit-lane', name: 'Pit Lane', description: 'Race weekend tactical breakdowns' },
    { slug: 'paddock-notes', name: 'Paddock Notes', description: 'Mid-week analysis' },
    { slug: 'off-the-line', name: 'Off The Line', description: 'One overtake, one moment' },
  ],
  fuel: [
    { slug: 'news', name: 'News', description: 'Standard news/feature article' },
    { slug: 'driven', name: 'Driven', description: 'First-person classic car drives' },
    { slug: 'garage-finds', name: 'Garage Finds', description: 'Featured classic car of the week' },
    { slug: 'the-auction-block', name: 'The Auction Block', description: "What sold, what didn't" },
    { slug: 'workshop-stories', name: 'Workshop Stories', description: 'Restoration journeys' },
  ],
  football: [
    { slug: 'news', name: 'News', description: 'Standard news/feature article' },
    { slug: 'match-day', name: 'Match Day', description: 'One big match, broken down' },
    { slug: 'tactical-board', name: 'Tactical Board', description: 'Formation and tactics analysis' },
    { slug: 'transfer-files', name: 'Transfer Files', description: 'Deep dives on transfers' },
    { slug: 'the-manager', name: 'The Manager', description: "A manager's decisions and methods" },
  ],
}

export const CHANNEL_TO_SERIES_KEY: Record<string, string> = {
  'Omnira Food': 'food',
  'Omnira F1': 'f1',
  'Omnira Football': 'football',
  'Gentlemen of Fuel': 'fuel',
  food: 'food',
  f1: 'f1',
  football: 'football',
  fuel: 'fuel',
}

export function getSeriesByChannel(channel: string): SeriesEntry[] {
  const key = CHANNEL_TO_SERIES_KEY[channel] ?? channel.toLowerCase()
  return SERIES[key] ?? []
}

export function getSeriesBySlug(channel: string, slug: string): SeriesEntry | null {
  return getSeriesByChannel(channel).find(s => s.slug === slug) ?? null
}

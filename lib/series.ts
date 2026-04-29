export type SeriesEntry = { slug: string; name: string; description: string }

export const SERIES: Record<string, SeriesEntry[]> = {
  f1: [
    { slug: 'the-archive', name: 'The Archive', description: 'Historic race deep-dives. The moments that defined the sport.' },
    { slug: 'pit-lane', name: 'Pit Lane', description: 'Race weekend tactical breakdowns and strategy reads.' },
    { slug: 'the-garage', name: 'The Garage', description: 'Engineering, aerodynamics, regulations. The technical side.' },
    { slug: 'paddock-notes', name: 'Paddock Notes', description: 'Mid-week analysis of the championship narratives.' },
  ],
  fuel: [
    { slug: 'barn-find', name: 'Barn Find', description: 'Forgotten cars, recovered and remembered.' },
    { slug: 'the-auction-room', name: 'The Auction Room', description: 'Notable cars at auction. What sold, what it means.' },
    { slug: 'coachwork', name: 'Coachwork', description: 'Design icons, body styles, the cars that defined eras.' },
    { slug: 'the-workshop', name: 'The Workshop', description: 'Restoration stories, builds, and the people behind them.' },
  ],
  football: [
    { slug: 'the-window', name: 'The Window', description: 'Transfer market analysis. Deals, rumours, and what they mean.' },
    { slug: 'matchday', name: 'Matchday', description: 'Game-by-game tactical reads from the weekend.' },
    { slug: 'the-table', name: 'The Table', description: 'League positioning, title races, relegation battles. The big picture.' },
    { slug: 'continental', name: 'Continental', description: "Champions League, European football, what's happening beyond England." },
  ],
  food: [
    { slug: 'no-frills', name: 'No Frills', description: 'Hole-in-the-wall greatness. The places that matter without trying.' },
    { slug: 'the-5', name: 'The 5', description: 'Five essential restaurants in one city, neighbourhood, or category.' },
    { slug: 'the-pass', name: 'The Pass', description: "Chef profiles. Who's making the food that matters right now." },
    { slug: 'openings', name: 'Openings', description: "New restaurants. What's launching, where, and why it matters." },
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

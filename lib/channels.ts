export type ChannelConfig = {
  name: string
  primary: string
  bg: string
  handle: string
  tagline: string
}

export const CHANNELS: Record<string, ChannelConfig> = {
  'Gentlemen of Fuel': { name: 'Gentlemen of Fuel', primary: '#e8a020', bg: '#1a1208', handle: '@gentlemenoffuel', tagline: 'Cars · Culture · Class' },
  'Omnira F1': { name: 'Omnira F1', primary: '#378add', bg: '#0a1628', handle: '@omniraf1', tagline: 'Formula 1 · Grand Prix · Racing' },
  'Road & Trax': { name: 'Road & Trax', primary: '#5dcaa5', bg: '#081410', handle: '@roadandtrax', tagline: 'Motorsport · Rally · Endurance' },
  'Omnira Football': { name: 'Omnira Football', primary: '#d85a30', bg: '#1a0c08', handle: '@omnirafootball', tagline: 'Football · Transfers · Matchday' },
  'Omnira Cricket': { name: 'Omnira Cricket', primary: '#16a34a', bg: '#0a1a0e', handle: '@OmniraCricket', tagline: 'Cricket · Test · T20 · IPL' },
  'Omnira Golf': { name: 'Omnira Golf', primary: '#15803d', bg: '#081408', handle: '@OmniraGolf', tagline: 'Golf · PGA Tour · Majors' },
  'Omnira NFL': { name: 'Omnira NFL', primary: '#dc2626', bg: '#1a0808', handle: '@OmniraNFL', tagline: 'NFL · American Football · Playoffs' },
  'Omnira Food': { name: 'Omnira Food', primary: '#ea580c', bg: '#1a0c08', handle: '@OmniraFood', tagline: 'Food · Recipes · Culture' },
  'Omnira Travel': { name: 'Omnira Travel', primary: '#0891b2', bg: '#08141a', handle: '@OmniraTravel', tagline: 'Travel · Destinations · Adventure' },
}

export function getChannel(name: string): ChannelConfig {
  return CHANNELS[name] || CHANNELS['Gentlemen of Fuel']
}

export type ChannelScoringCriteria = {
  context: string
  high: string
  medium: string
  low: string
}

export const CHANNEL_SCORING: Partial<Record<string, ChannelScoringCriteria>> = {
  'Omnira F1': {
    context: 'A Formula 1 channel covering races, drivers, teams, and championship battles.',
    high: 'Race results, qualifying/pole, championship standings shifts, confirmed driver signings or departures, major technical regulation changes, FIA rulings that affect the grid, engine/power unit news',
    medium: 'Practice session updates, mid-season car development, sponsorship announcements, driver press conference quotes, team strategy breakdowns',
    low: 'Unconfirmed rumours, minor team social content, historical throwbacks with no news hook, non-F1 motorsport unless directly related',
  },
  'Omnira Football': {
    context: 'A football channel focused on top European leagues — Premier League, Champions League, La Liga, Bundesliga, Serie A, and major transfers.',
    high: 'Title-deciding matches, Champions League or Europa League knockouts, confirmed major transfers (£20m+), managerial sackings or appointments at top clubs, cup finals, international tournament results',
    medium: 'Mid-table match reports, injury updates to squad players, press conference news, domestic cup early rounds, loan deals',
    low: 'Lower-league results with no elite connection, vague transfer speculation, historical stats with no news angle, social media clips without substance',
  },
}

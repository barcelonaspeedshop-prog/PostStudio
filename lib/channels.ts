export type ChannelConfig = {
  name: string
  primary: string
  bg: string
  handle: string
  tagline: string
  hookStyle: string
  ctaStyle: string
}

export const CHANNELS: Record<string, ChannelConfig> = {
  'Gentlemen of Fuel': { name: 'Gentlemen of Fuel', primary: '#e8a020', bg: '#1a1208', handle: '@gentlemenoffuel', tagline: 'Cars · Culture · Class', hookStyle: 'reverent and vintage — speak with the quiet authority of a connoisseur; evoke heritage, rarity, and craftsmanship without hyperbole', ctaStyle: 'collector-to-collector — invite readers to share their own heritage; ask about ownership stories, favourite models, or memories at auctions; keep the tone reverential and specific to this exact car or era' },
  'Omnira F1': { name: 'Omnira F1', primary: '#378add', bg: '#0a1628', handle: '@omniraf1', tagline: 'Formula 1 · Grand Prix · Racing', hookStyle: 'insider and technical — write like a paddock journalist; use precise F1 vocabulary, imply inside knowledge, reward fans who understand the sport deeply', ctaStyle: 'insider debate — spark a technical or strategic argument specific to this story; ask for predictions, constructor allegiances, or driver rankings; use paddock vocabulary; feel like a question from a fellow obsessive, not a content manager' },
  'Road & Trax': { name: 'Road & Trax', primary: '#5dcaa5', bg: '#081410', handle: '@roadandtrax', tagline: 'Motorsport · Rally · Endurance', hookStyle: 'gritty and racer — raw, no-nonsense, smell of fuel and rubber; speak to drivers and crew, not spectators', ctaStyle: 'competitive spirit — challenge readers to share their race day stories, lap times, or team loyalties tied to this specific event or topic; raw and direct, no fluff' },
  'Omnira Football': { name: 'Omnira Football', primary: '#d85a30', bg: '#1a0c08', handle: '@omnirafootball', tagline: 'Football · Transfers · Matchday', hookStyle: 'passionate and partisan — tribal energy, matchday adrenaline, transfer-window urgency; fans feel it in their chest', ctaStyle: 'fan passion — ask for match predictions, transfer opinions, or player ratings tied directly to this story; feel like overheard terrace banter, not a social media exec asking for engagement' },
  'Omnira Cricket': { name: 'Omnira Cricket', primary: '#16a34a', bg: '#0a1a0e', handle: '@OmniraCricket', tagline: 'Cricket · Test · T20 · IPL', hookStyle: 'respectful and traditional — honour the game\'s history, celebrate skill and character, measured but not dry; appeals to purists and IPL fans alike', ctaStyle: 'purist respect — invite readers to share match memories, player tributes, or all-time XI picks related to this story; measured, thoughtful, cricket-specific' },
  'Omnira Golf': { name: 'Omnira Golf', primary: '#15803d', bg: '#081408', handle: '@OmniraGolf', tagline: 'Golf · PGA Tour · Majors', hookStyle: 'refined and analytical — measured, intelligent, appreciates the strategic and mental dimensions; the voice of a thoughtful caddie, not a cheerleader', ctaStyle: 'strategic curiosity — prompt course opinions, major predictions, or mental game observations tied to this specific story; the voice of a post-round conversation at the 19th hole, not a content team' },
  'Omnira NFL': { name: 'Omnira NFL', primary: '#dc2626', bg: '#1a0808', handle: '@OmniraNFL', tagline: 'NFL · American Football · Playoffs', hookStyle: 'bold and hyperbolic — go big, use superlatives unapologetically, primetime energy, everything is historic or legendary', ctaStyle: 'bold takes — demand predictions, championship picks, or GOAT arguments sparked by this exact story; superlative energy, big declarations, feels like the stadium is full' },
  'Omnira Food': { name: 'Omnira Food', primary: '#ea580c', bg: '#1a0c08', handle: '@OmniraFood', tagline: 'Food · Recipes · Culture', hookStyle: 'sensory and enticing — make readers taste and smell it; invoke texture, aroma, and pleasure; warm but never cloying', ctaStyle: 'sensory sharing — ask about personal recipes, restaurant memories, or food associations tied to this specific dish or chef; warm, inviting, never generic' },
  'Omnira Travel': { name: 'Omnira Travel', primary: '#0891b2', bg: '#08141a', handle: '@OmniraTravel', tagline: 'Travel · Destinations · Adventure', hookStyle: 'aspirational and wonder-filled — ignite wanderlust; paint vivid scenes, hint at transformation, make staying home feel like a mistake', ctaStyle: 'wanderlust spark — invite readers to share their own stories from this exact destination or type of trip; aspirational and personal, like a conversation between two travellers' },
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
  'Gentlemen of Fuel': {
    context: 'A classic car channel covering auctions, concours, restorations, and motoring heritage.',
    high: 'Major auction results (Pebble Beach, Monaco, RM Sotheby\'s), record sale prices, significant barn finds, major concours wins (Goodwood, Villa d\'Este), death of legendary figures (designers, racers, collectors), milestone anniversaries of iconic models',
    medium: 'New classic car restorations, museum exhibitions, regional concours, manufacturer heritage announcements, documentaries/film releases',
    low: 'Generic listings for sale, minor auctions, rumour pieces, modern car news dressed as classic',
  },
  'Road & Trax': {
    context: 'A road and endurance racing channel focused on the Citroen C1 Endurance Championship and major endurance races.',
    high: 'Citroen C1 Endurance Championship rounds (results and previews), major endurance races (Le Mans, Spa 24h, Nürburgring 24h), championship-deciding rounds, death of endurance racing figures, grassroots racing milestones',
    medium: 'Mid-season endurance race results, driver changes, team launches, rule changes affecting endurance racing',
    low: 'Minor club racing, single-driver personal news, non-racing automotive content',
  },
  'Omnira Cricket': {
    context: 'A cricket channel covering international Tests, ODIs, T20s, the IPL, and major ICC tournaments.',
    high: 'Test series deciders, World Cup / ICC tournament matches, record-breaking performances, major retirements/debuts, IPL finals and playoffs, Ashes matches',
    medium: 'Ongoing series results, player form analysis, squad announcements for major tournaments, significant injuries',
    low: 'Minor domestic matches, transfer speculation, off-field filler',
  },
  'Omnira Golf': {
    context: 'A golf channel covering the PGA Tour, DP World Tour, LIV Golf, and the four Majors.',
    high: 'Majors (Masters, PGA Championship, US Open, The Open Championship), Ryder Cup, record-breaking rounds, Hall of Fame inductions, major equipment breakthroughs, Tiger Woods news',
    medium: 'PGA/DP World/LIV tournament wins, leaderboard drama at non-majors, equipment launches from major brands',
    low: 'Pro-am events, minor tournaments, generic equipment reviews',
  },
  'Omnira NFL': {
    context: 'An NFL channel covering games, trades, injuries, the draft, and playoff football.',
    high: 'Playoff games, Super Bowl, Thursday/Sunday/Monday night primetime matchups, major trades, star player injuries, coaching firings at top teams, draft first-round news',
    medium: 'Regular season results, fantasy-relevant injuries, mid-tier trades, conference standings shifts',
    low: 'Preseason filler, training camp gossip, minor roster moves',
  },
  'Omnira Food': {
    context: 'A food channel covering fine dining, food culture, viral trends, and the restaurant industry.',
    high: 'Michelin Guide announcements, major chef news (deaths, major moves, new restaurant openings from household names), viral food trends, seasonal produce peaks (truffle season etc.), major food industry disruptions',
    medium: 'Restaurant openings in major cities, cookbook launches, seasonal recipe highlights, food documentary releases',
    low: 'Minor restaurant reviews, generic recipe content, grocery chain news',
  },
  'Omnira Travel': {
    context: 'A travel channel covering destinations, airline news, hotel openings, and travel industry trends.',
    high: 'Major destination news (border changes, visa updates, major events), seasonal peaks (cherry blossom, Diwali, Christmas markets timing), airline industry major news, iconic hotel openings, major travel disruptions (volcanic eruptions, political unrest affecting tourism)',
    medium: 'New flight routes, hotel openings in secondary cities, destination trend pieces, travel industry analysis',
    low: 'Generic "10 best beaches" listicles, minor regional news, sponsored content',
  },
}

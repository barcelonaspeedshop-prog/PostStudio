export type ChannelConfig = {
  name: string
  primary: string   // accent / highlight colour
  bg: string         // dark background colour
  handle: string     // social handle
  tagline: string    // short channel descriptor
}

export const CHANNELS: Record<string, ChannelConfig> = {
  'Gentlemen of Fuel': {
    name: 'Gentlemen of Fuel',
    primary: '#e8a020',
    bg: '#1a1208',
    handle: '@gentlemenoffuel',
    tagline: 'Cars · Culture · Class',
  },
  'Omnira F1': {
    name: 'Omnira F1',
    primary: '#378add',
    bg: '#0a1628',
    handle: '@omniraf1',
    tagline: 'Formula 1 · Grand Prix · Racing',
  },
  'Road & Trax': {
    name: 'Road & Trax',
    primary: '#5dcaa5',
    bg: '#081410',
    handle: '@roadandtrax',
    tagline: 'Motorsport · Rally · Endurance',
  },
  'Omnira Football': {
    name: 'Omnira Football',
    primary: '#d85a30',
    bg: '#1a0c08',
    handle: '@omnirafootball',
    tagline: 'Football · Transfers · Matchday',
  },
}

export function getChannel(name: string): ChannelConfig {
  return CHANNELS[name] || CHANNELS['Gentlemen of Fuel']
}

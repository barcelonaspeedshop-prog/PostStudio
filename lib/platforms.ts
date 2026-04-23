export type Platform = {
  id: string
  label: string
  color: string
  handle: string
  tip: string
  charLimit: number
}

export const PLATFORMS: Platform[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    color: '#E1306C',
    handle: '@yourhandle',
    tip: 'Instagram loves square crops and 3–5 hashtags in the first comment.',
    charLimit: 2200,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    color: '#333',
    handle: '@yourhandle',
    tip: 'TikTok rewards vertical 9:16 video. Use trending audio for more reach.',
    charLimit: 2200,
  },
  {
    id: 'twitter',
    label: 'X / Twitter',
    color: '#1DA1F2',
    handle: '@yourhandle',
    tip: 'Keep tweets under 280 chars. Threads boost engagement significantly.',
    charLimit: 280,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    handle: 'Your Page',
    tip: 'Facebook favours native video uploads. Add a clear call to action.',
    charLimit: 63206,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: '#0A66C2',
    handle: 'Your Page',
    tip: 'LinkedIn posts peak Mon–Wed mornings. Professional tone performs best.',
    charLimit: 3000,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    color: '#FF0000',
    handle: '@yourchannel',
    tip: 'YouTube Shorts max is 60s vertical. Add chapters for longer videos.',
    charLimit: 5000,
  },
]

export const TONES = ['casual', 'professional', 'funny', 'inspirational', 'promotional']

export const FORMATS = [
  '3 min video',
  'Static image', 'Carousel', 'Story',
]

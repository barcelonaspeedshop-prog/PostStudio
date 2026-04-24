/**
 * Extracts a YouTube video ID from any common YouTube URL format.
 * Handles: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/
 * Returns null if the URL is not a valid YouTube URL or ID cannot be parsed.
 */
export function extractYouTubeId(url: string): string | null {
  if (!url || !url.includes('youtu')) return null
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

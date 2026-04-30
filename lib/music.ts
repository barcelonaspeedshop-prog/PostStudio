// Music bed configuration — change these two values if needed, everything else reads from here

// In-container path: /docker/poststudio/data/ on VPS → /data/ inside container
export const MUSIC_FILE_PATH = '/data/music/music-default.mp3'
export const MUSIC_TOP5_FILE_PATH = '/data/music/music-top5.mp3'

export const MUSIC_VOLUME_DB = -22 // dB relative to voiceover. -22 is subtle background.

// Convert dB to linear scale for ffmpeg volume filter
export const MUSIC_VOLUME_LINEAR = Math.pow(10, MUSIC_VOLUME_DB / 20)
// -22dB ≈ 0.0794

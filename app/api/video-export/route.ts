import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir, readFile, unlink, rmdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const execAsync = promisify(exec)

async function downloadImage(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(dest)
    const protocol = url.startsWith('https') ? https : http
    protocol.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', (err) => {
      require('fs').unlink(dest, () => {})
      reject(err)
    })
  })
}

export async function POST(req: NextRequest) {
  const tmpDir = `/tmp/carousel_${Date.now()}`
  
  try {
    const { slides, slideDuration: rawDuration = 5, audioUrl, musicVolume = 20, musicEnabled = true } = await req.json()
    const videoW = 1080
    const videoH = 1350
    const scaleFilter = `scale=${videoW}:${videoH}:force_original_aspect_ratio=decrease,pad=${videoW}:${videoH}:(ow-iw)/2:(oh-ih)/2,setsar=1`
    // Enforce minimum 5 seconds per slide
    const slideDuration = Math.max(5, Number(rawDuration) || 5)
    // Per-tile durations — text tiles need longer display time
    const TILE_DURATIONS: Record<string, number> = {
      'hook': slideDuration,
      'brand': Math.max(8, slideDuration + 3),
      'story': slideDuration,
      'story-text': Math.max(8, slideDuration + 3),
      'cta': slideDuration,
    }
    const getTileDuration = (slide: { tileType?: string }) =>
      TILE_DURATIONS[slide.tileType || 'story'] || slideDuration

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return NextResponse.json({ error: 'slides array is required' }, { status: 400 })
    }

    // Create temp directory
    await mkdir(tmpDir, { recursive: true })

    // Download or create images for each slide
    const imageFiles: string[] = []
    
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]
      const imgPath = path.join(tmpDir, `slide_${i.toString().padStart(2, '0')}.jpg`)
      
      if (slide.image && slide.image.startsWith('http')) {
        // Download from URL
        await downloadImage(slide.image, imgPath)
      } else if (slide.image && (slide.image.startsWith('data:') || slide.image.startsWith('blob:'))) {
        // Base64 image
        const base64Data = slide.image.replace(/^data:image\/\w+;base64,/, '')
        await writeFile(imgPath, Buffer.from(base64Data, 'base64'))
      } else {
        // Generate solid color placeholder
        const color = getAccentColor(slide.accent || 'red')
        await execAsync(`ffmpeg -f lavfi -i color=c=${color}:size=1080x1350:rate=1 -frames:v 1 ${imgPath}`)
      }
      imageFiles.push(imgPath)
    }

    // Create ffmpeg input list — last entry repeated without duration holds final frame
    const listPath = path.join(tmpDir, 'input.txt')
    const lines: string[] = []
    for (let i = 0; i < imageFiles.length; i++) {
      lines.push(`file '${imageFiles[i]}'`)
      lines.push(`duration ${getTileDuration(slides[i] || {})}`)
    }
    // Repeat last file so its duration is honoured (concat demuxer requirement)
    lines.push(`file '${imageFiles[imageFiles.length - 1]}'`)
    await writeFile(listPath, lines.join('\n') + '\n')

    // Output path
    const outputPath = path.join(tmpDir, 'carousel.mp4')

    // Build ffmpeg command
    let ffmpegCmd: string

    if (audioUrl && musicEnabled !== false) {
      const audioPath = path.join(tmpDir, 'audio.mp3')
      if (audioUrl.startsWith('data:')) {
        const base64Data = audioUrl.replace(/^data:audio\/\w+;base64,/, '')
        await writeFile(audioPath, Buffer.from(base64Data, 'base64'))
      } else {
        await downloadImage(audioUrl, audioPath)
      }
      const totalDuration = slides.reduce((sum: number, s: { tileType?: string }) => sum + getTileDuration(s), 0)
      // Clamp volume to 0-100 and convert to ffmpeg volume factor (0.0-1.0)
      const vol = Math.max(0, Math.min(100, Number(musicVolume) || 20)) / 100
      ffmpegCmd = `ffmpeg -f concat -safe 0 -i ${listPath} -i ${audioPath} -vf "${scaleFilter}" -af "volume=${vol}" -r 30 -vsync cfr -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -preset fast -crf 23 -c:a aac -b:a 128k -t ${totalDuration} -shortest -movflags +faststart -y ${outputPath}`
    } else {
      ffmpegCmd = `ffmpeg -f concat -safe 0 -i ${listPath} -vf "${scaleFilter}" -r 30 -vsync cfr -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -preset fast -crf 23 -an -movflags +faststart -y ${outputPath}`
    }

    await execAsync(ffmpegCmd)

    // Read output and return as base64
    const videoBuffer = await readFile(outputPath)
    const base64Video = videoBuffer.toString('base64')

    // Cleanup
    await execAsync(`rm -rf ${tmpDir}`)

    return NextResponse.json({ 
      video: `data:video/mp4;base64,${base64Video}`,
      duration: slides.length * slideDuration
    })

  } catch (err: unknown) {
    // Cleanup on error
    if (existsSync(tmpDir)) {
      await execAsync(`rm -rf ${tmpDir}`).catch(() => {})
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[video-export]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function getAccentColor(accent: string): string {
  const colors: Record<string, string> = {
    red: '1a0e08',
    amber: '0e0c08',
    blue: '0c0e10',
    green: '0a1008',
    purple: '0e0c14',
    teal: '081010',
  }
  return colors[accent] || '1a1a1a'
}

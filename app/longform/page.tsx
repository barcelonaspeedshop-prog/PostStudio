'use client'
import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/Sidebar'

type Chapter = { id: number; title: string; type: string; narration: string; visual: string }
type Script = { title: string; summary: string; chapters: Chapter[] }
type BuildPhase = 'idle' | 'script' | 'prompts' | 'images' | 'voiceover' | 'assembly' | 'complete' | 'error'

const CHANNELS = ['Gentlemen of Fuel', 'Omnira F1', 'Road & Trax', 'Omnira Football', 'Omnira Cricket', 'Omnira Golf', 'Omnira NFL', 'Omnira Food', 'Omnira Travel']
const CALM_CHANNELS = ['Omnira Food', 'Omnira Travel']

const VOICES = [
  { id: 'v1Oa3bMmaLK6LwTzVkOy', label: 'Peter — BBC Type' },
  { id: 'P9S3WZL3JE8uQqgYH5B7', label: 'James — Softer UK' },
  { id: 'B9PDs7mcHTMxHUw5U8Cf', label: 'Holly — Soft UK' },
  { id: 'yl2ZDV1MzN4HbQJbMihG', label: 'Alex — Energy USA' },
  { id: 'gnPxliFHTp6OK6tcoA6i', label: 'Sam — Sports USA' },
  { id: 'oTQK6KgOJHp8UGGZjwUu', label: 'Dexter — Energetic (all channels)' },
  { id: '4dZr8J4CBeokyRkTRpoN', label: 'Harwood — Authoritative (F1, Gentlemen of Fuel)' },
]

const BUILD_STEPS: { id: BuildPhase; label: string }[] = [
  { id: 'script',    label: 'Script' },
  { id: 'prompts',   label: 'Prompts' },
  { id: 'images',    label: 'Images' },
  { id: 'voiceover', label: 'Voiceover' },
  { id: 'assembly',  label: 'Assembly' },
]

const Spinner = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
  </svg>
)

const YT_ICON = (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)

function deriveTagsFromScript(s: Script | null): { ytTags: string; igTags: string } {
  if (!s) return { ytTags: '', igTags: '' }
  const stop = new Set(['with','this','that','from','have','will','been','they','were','when','what','your','into','more','also','some','than','then','them','these','their','here','just','over','after','very','each','much','such','both','even','most','only','about','which'])
  const raw = `${s.title} ${s.chapters.map(c => c.title || '').join(' ')}`
  const words = [...new Set(
    raw.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length >= 3 && !stop.has(w))
  )].slice(0, 15)
  return {
    ytTags: words.join(', '),
    igTags: words.map(w => `#${w}`).join(' '),
  }
}

const DRAFT_KEY = 'draft_longvideo'

export default function LongFormPage() {
  // ─── Mode ───
  const [advancedMode, setAdvancedMode] = useState(false)

  // ─── Build pipeline ───
  const [buildPhase, setBuildPhase] = useState<BuildPhase>('idle')
  const [buildMessage, setBuildMessage] = useState('')
  const [buildSubProgress, setBuildSubProgress] = useState<{ done: number; total: number } | null>(null)
  const [buildError, setBuildError] = useState<string | null>(null)
  const [showScript, setShowScript] = useState(false)
  const [showPromptsAccordion, setShowPromptsAccordion] = useState(false)

  // ─── Core state ───
  const [topic, setTopic] = useState('')
  const [channel, setChannel] = useState(CHANNELS[0])
  const [script, setScript] = useState<Script | null>(null)
  const [generating, setGenerating] = useState(false)
  const [chapterMedia, setChapterMedia] = useState<Record<number, File[]>>({})
  const [assembling, setAssembling] = useState(false)
  const [assemblyProgress, setAssemblyProgress] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type?: 'error' | 'success' } | null>(null)
  const [chapterAudio, setChapterAudio] = useState<Record<number, string>>({})
  const [voiceoverStatus, setVoiceoverStatus] = useState<Record<number, 'generating' | 'ready'>>({})
  const [generatingAllVoiceovers, setGeneratingAllVoiceovers] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [testDuration, setTestDuration] = useState<10 | 30>(10)
  const [musicMood, setMusicMood] = useState<'calm' | 'energy'>('energy')
  const [musicEnabled, setMusicEnabled] = useState(true)
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [clippingVideo, setClippingVideo] = useState(false)
  const [clips, setClips] = useState<{ chapterId: number; title: string; duration: number; clipFile: string; thumbFile: string }[]>([])
  const [draftSaved, setDraftSaved] = useState(false)
  const [isRestored, setIsRestored] = useState(false)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Image prompts ───
  const [imagePrompts, setImagePrompts] = useState<Record<number, string[]>>({})
  const [promptTitles, setPromptTitles] = useState<Record<number, string>>({})
  const [generatingPrompts, setGeneratingPrompts] = useState(false)
  const [copiedPromptKey, setCopiedPromptKey] = useState<string | null>(null)
  const [showPromptsPanel, setShowPromptsPanel] = useState(false)

  // ─── DALL-E ───
  const [dalleImages, setDalleImages] = useState<Record<number, string>>({})
  const [generatingDalleFor, setGeneratingDalleFor] = useState<Record<number, boolean>>({})
  const [dalleProgress, setDalleProgress] = useState<{ done: number; total: number } | null>(null)
  const [dallePromptIndex, setDallePromptIndex] = useState<Record<number, number>>({})

  // ─── Thumbnail ───
  const [thumbnailAccentWord, setThumbnailAccentWord] = useState('')
  const [thumbnailHeroFile, setThumbnailHeroFile] = useState<File | null>(null)
  const [thumbnailGenerating, setThumbnailGenerating] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const thumbnailFileRef = useRef<HTMLInputElement>(null)

  // ─── Publish panel ───
  const [publishPanelOpen, setPublishPanelOpen] = useState(false)
  const [ytConnected, setYtConnected] = useState<Record<string, boolean>>({})
  const [metaConnected, setMetaConnected] = useState<Record<string, { instagram: boolean; facebook: boolean }>>({})
  // Per-channel platform selection: each platform is independently toggled
  const [channelPlatforms, setChannelPlatforms] = useState<Record<string, { yt: boolean; ig: boolean; fb: boolean }>>({})
  // Per-channel metadata with separate tag fields per platform
  const [publishMeta, setPublishMeta] = useState<Record<string, { title: string; description: string; ytTags: string; igTags: string }>>({})
  // Separate status + error tracking per platform
  const [ytStatus, setYtStatus] = useState<Record<string, 'idle' | 'connecting' | 'uploading' | 'done' | 'error'>>({})
  const [metaStatus, setMetaStatus] = useState<Record<string, 'idle' | 'uploading' | 'done' | 'error'>>({})
  const [ytError, setYtError] = useState<Record<string, string>>({})
  const [metaError, setMetaError] = useState<Record<string, string>>({})
  const [ytPublishedUrl, setYtPublishedUrl] = useState<Record<string, string>>({})
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false)

  // ─── Restore draft ───
  useEffect(() => {
    // Check for URL params first (coming from /stories "Use this story →")
    let fromStories = false
    try {
      const params = new URLSearchParams(window.location.search)
      const urlTopic = params.get('topic')
      const urlChannel = params.get('channel')
      if (urlTopic) {
        fromStories = true
        setTopic(urlTopic)
        setScript(null)
        setChapterAudio({})
        setVoiceoverStatus({})
      }
      if (urlChannel && CHANNELS.includes(urlChannel)) {
        setChannel(urlChannel)
        setMusicMood(CALM_CHANNELS.includes(urlChannel) ? 'calm' : 'energy')
      }
    } catch {}

    // Restore localStorage draft only when not arriving from /stories
    if (!fromStories) {
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (raw) {
          const d = JSON.parse(raw)
          if (d.topic) setTopic(d.topic)
          if (d.channel) setChannel(d.channel)
          if (d.script) setScript(d.script)
          if (d.musicMood) setMusicMood(d.musicMood)
          if (d.selectedVoice) setSelectedVoice(d.selectedVoice)
          if (d.chapterAudio && typeof d.chapterAudio === 'object') setChapterAudio(d.chapterAudio)
          if (d.voiceoverStatus && typeof d.voiceoverStatus === 'object') setVoiceoverStatus(d.voiceoverStatus)
          if (typeof d.testMode === 'boolean') setTestMode(d.testMode)
          if (d.testDuration) setTestDuration(d.testDuration)
        }
      } catch {}
    }

    try {
      const savedMode = localStorage.getItem('longform_advancedMode')
      if (savedMode) setAdvancedMode(savedMode === 'true')
    } catch {}

    // Restore assembled video across page navigations (sessionStorage survives tab reloads)
    try {
      const savedVideo = sessionStorage.getItem('longform_video')
      if (savedVideo) {
        const { jobId, videoUrl: savedUrl } = JSON.parse(savedVideo)
        if (jobId && savedUrl) {
          setCurrentJobId(jobId)
          setVideoUrl(savedUrl)
          setBuildPhase('complete')
          setBuildMessage('ready to publish')
        }
      }
    } catch {}

    setIsRestored(true)
  }, [])

  // ─── Save draft ───
  useEffect(() => {
    if (!isRestored) return
    if (!topic && !script) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        topic, channel, script, musicMood, selectedVoice, chapterAudio, voiceoverStatus, testMode, testDuration,
      }))
      setDraftSaved(true)
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      draftTimerRef.current = setTimeout(() => setDraftSaved(false), 2000)
    } catch {
      // Quota exceeded (large audio) — fail silently
    }
  }, [isRestored, topic, channel, script, musicMood, selectedVoice, chapterAudio, voiceoverStatus, testMode, testDuration])

  // ─── Load global music setting ───
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(s => { if (typeof s.includeMusic === 'boolean') setMusicEnabled(s.includeMusic) })
      .catch(() => {})
  }, [])

  const toggleAdvancedMode = (val: boolean) => {
    setAdvancedMode(val)
    localStorage.setItem('longform_advancedMode', String(val))
  }

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ─── Test audio ───
  const generateTestAudio = (durationSeconds: number): string => {
    const sampleRate = 8000
    const numSamples = sampleRate * durationSeconds
    const numChannels = 1
    const bitsPerSample = 16
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
    const blockAlign = numChannels * (bitsPerSample / 8)
    const dataSize = numSamples * blockAlign
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)
    const writeStr = (off: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i))
    }
    writeStr(0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeStr(8, 'WAVE')
    writeStr(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitsPerSample, true)
    writeStr(36, 'data')
    view.setUint32(40, dataSize, true)
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return 'data:audio/wav;base64,' + btoa(binary)
  }

  const generateTestVoiceover = (chapterId: number) => {
    const audioDataUrl = generateTestAudio(testDuration)
    setChapterAudio(prev => ({ ...prev, [chapterId]: audioDataUrl }))
    setVoiceoverStatus(prev => ({ ...prev, [chapterId]: 'ready' }))
    showToast(`Chapter ${chapterId} test audio ready (${testDuration}s)`)
  }

  // ─── Script generation (advanced mode) ───
  const generateScript = async () => {
    if (!topic.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/story-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, channel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setScript(data.script)
      setChapterMedia({})
      setChapterAudio({})
      setVoiceoverStatus({})
      setVideoUrl(null)
      showToast('Script generated!')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error generating script', 'error')
    } finally {
      setGenerating(false)
    }
  }

  // ─── Media handling ───
  const addMedia = (chapterId: number, files: FileList | null) => {
    if (!files || files.length === 0) return
    setChapterMedia(prev => ({
      ...prev,
      [chapterId]: [...(prev[chapterId] || []), ...Array.from(files)],
    }))
    showToast(`${files.length} file${files.length > 1 ? 's' : ''} added`)
  }

  const removeMedia = (chapterId: number, index: number) => {
    setChapterMedia(prev => ({
      ...prev,
      [chapterId]: (prev[chapterId] || []).filter((_, i) => i !== index),
    }))
  }

  // ─── Video assembly (advanced mode) ───
  const assembleVideo = async () => {
    if (!script) return
    setAssembling(true)
    setAssemblyProgress('Uploading media...')
    setVideoUrl(null)
    setClips([])
    try {
      const formData = new FormData()
      formData.append('chapters', JSON.stringify(script.chapters.map(ch => ({ id: ch.id, narration: ch.narration, title: ch.title }))))
      for (const [chIdStr, files] of Object.entries(chapterMedia)) {
        for (const file of files) {
          formData.append('media', file, `ch${chIdStr}_${file.name}`)
          formData.append('mediaChapterIds', chIdStr)
        }
      }
      for (const [chIdStr, dataUrl] of Object.entries(chapterAudio)) {
        const base64 = dataUrl.split(',')[1]
        const mime = dataUrl.split(';')[0].split(':')[1] || 'audio/mpeg'
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const ext = mime.includes('wav') ? 'wav' : 'mp3'
        const blob = new Blob([bytes], { type: mime })
        formData.append('audio', blob, `ch${chIdStr}_voiceover.${ext}`)
        formData.append('audioChapterIds', chIdStr)
      }
      formData.append('musicMood', musicMood)
      formData.append('musicVolume', '0.15')
      formData.append('musicEnabled', String(musicEnabled))
      formData.append('channel', channel)
      const startRes = await fetch('/api/story-video/start', { method: 'POST', body: formData })
      const startData = await startRes.json()
      if (!startRes.ok) throw new Error(startData.error)
      setAssemblyProgress('Rendering video...')
      const result = await new Promise<{ downloadUrl: string; duration: number }>((resolve, reject) => {
        const poll = async () => {
          try {
            const res = await fetch(`/api/story-video/status/${startData.jobId}`)
            const data = await res.json()
            if (data.status === 'complete') { resolve(data); return }
            if (data.status === 'error') { reject(new Error(data.error || 'Assembly failed')); return }
            if (data.progress) setAssemblyProgress(data.progress)
            setTimeout(poll, 3000)
          } catch (e) { reject(e) }
        }
        poll()
      })
      setCurrentJobId(startData.jobId)
      setVideoUrl(result.downloadUrl)
      setClips([])
      sessionStorage.setItem('longform_video', JSON.stringify({ jobId: startData.jobId, videoUrl: result.downloadUrl }))
      showToast(`Video ready — ${Math.round(result.duration)}s`)
      openPublishPanel()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error assembling video', 'error')
    } finally {
      setAssembling(false)
      setAssemblyProgress('')
    }
  }

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    sessionStorage.removeItem('longform_video')
    setTopic('')
    setChannel(CHANNELS[0])
    setScript(null)
    setMusicMood('energy')
    setSelectedVoice(VOICES[0].id)
    setChapterAudio({})
    setVoiceoverStatus({})
    setChapterMedia({})
    setVideoUrl(null)
    setCurrentJobId(null)
    setClips([])
    setDraftSaved(false)
    setBuildPhase('idle')
    setBuildError(null)
    setDalleImages({})
    setImagePrompts({})
    showToast('Draft cleared')
  }

  // ─── DALL-E helpers ───
  const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const [header, b64] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
    const bytes = atob(b64)
    const array = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i)
    return new File([array], filename, { type: mime })
  }

  const generateDalleForChapter = async (chapterId: number, prompt: string, promptIndex: number) => {
    setGeneratingDalleFor(prev => ({ ...prev, [chapterId]: true }))
    try {
      const res = await fetch('/api/story-dalle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, chapterId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDalleImages(prev => ({ ...prev, [chapterId]: data.imageDataUrl }))
      setDallePromptIndex(prev => ({ ...prev, [chapterId]: promptIndex }))
      const file = dataUrlToFile(data.imageDataUrl, `dalle_ch${chapterId}.png`)
      setChapterMedia(prev => ({
        ...prev,
        [chapterId]: [file, ...(prev[chapterId] || []).filter(f => !f.name.startsWith('dalle_ch'))],
      }))
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : `Image generation failed for chapter ${chapterId}`, 'error')
    } finally {
      setGeneratingDalleFor(prev => ({ ...prev, [chapterId]: false }))
    }
  }

  const generateAllDalle = async () => {
    if (!script) return
    const chaptersWithPrompts = script.chapters.filter(ch => (imagePrompts[ch.id]?.length ?? 0) > 0)
    if (chaptersWithPrompts.length === 0) { showToast('Generate image prompts first', 'error'); return }
    setDalleProgress({ done: 0, total: chaptersWithPrompts.length })
    for (let i = 0; i < chaptersWithPrompts.length; i++) {
      const ch = chaptersWithPrompts[i]
      await generateDalleForChapter(ch.id, imagePrompts[ch.id][0], 0)
      setDalleProgress({ done: i + 1, total: chaptersWithPrompts.length })
    }
    setDalleProgress(null)
    showToast(`${chaptersWithPrompts.length} images generated and added to chapters`)
  }

  // ─── Chapter clips ───
  const createClips = async () => {
    if (!currentJobId) return
    setClippingVideo(true)
    setClips([])
    try {
      const clipRes = await fetch('/api/story-video/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: currentJobId }),
      })
      const clipData = await clipRes.json()
      if (!clipRes.ok) throw new Error(clipData.error || 'Clip creation failed')
      setClips(clipData.clips || [])
      showToast(`${clipData.clipCount} chapter clip${clipData.clipCount !== 1 ? 's' : ''} ready`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Clip creation failed', 'error')
    } finally {
      setClippingVideo(false)
    }
  }

  // ─── Voiceover ───
  const generateVoiceover = async (chapterId: number, text: string) => {
    setVoiceoverStatus(prev => ({ ...prev, [chapterId]: 'generating' }))
    try {
      const res = await fetch('/api/story-voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId: selectedVoice }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setChapterAudio(prev => ({ ...prev, [chapterId]: data.audio }))
      setVoiceoverStatus(prev => ({ ...prev, [chapterId]: 'ready' }))
      return true
    } catch (e: unknown) {
      setVoiceoverStatus(prev => { const n = { ...prev }; delete n[chapterId]; return n })
      showToast(e instanceof Error ? e.message : 'Voiceover failed', 'error')
      return false
    }
  }

  const generateAllVoiceovers = async () => {
    if (!script) return
    if (testMode) {
      for (const chapter of script.chapters) {
        if (!chapterAudio[chapter.id]) generateTestVoiceover(chapter.id)
      }
      showToast('All test audio ready!')
      return
    }
    setGeneratingAllVoiceovers(true)
    let success = 0
    for (const chapter of script.chapters) {
      if (chapterAudio[chapter.id]) { success++; continue }
      const ok = await generateVoiceover(chapter.id, chapter.narration)
      if (ok) success++
    }
    setGeneratingAllVoiceovers(false)
    showToast(`${success}/${script.chapters.length} voiceovers generated`)
  }

  const downloadCombinedAudio = async () => {
    if (!script) return
    const chunks: ArrayBuffer[] = []
    for (const chapter of script.chapters) {
      const dataUrl = chapterAudio[chapter.id]
      if (!dataUrl) continue
      const base64 = dataUrl.split(',')[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      chunks.push(bytes.buffer)
    }
    if (chunks.length === 0) { showToast('No voiceovers to download', 'error'); return }
    const blob = new Blob(chunks, { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${channel.replace(/\s+/g, '_')}_voiceover.mp3`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Audio downloaded!')
  }

  // ─── Image prompts (advanced mode) ───
  const generateImagePrompts = async () => {
    if (!script) return
    setGeneratingPrompts(true)
    setShowPromptsPanel(true)
    try {
      const res = await fetch('/api/story-image-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapters: script.chapters, channel, topic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const promptMap: Record<number, string[]> = {}
      const titleMap: Record<number, string> = {}
      for (const item of data.prompts) {
        promptMap[item.chapterId] = item.prompts
        titleMap[item.chapterId] = item.title
      }
      setImagePrompts(promptMap)
      setPromptTitles(titleMap)
      const total = Object.values(promptMap).reduce((s, arr) => s + arr.length, 0)
      showToast(`${total} image prompts generated across ${data.prompts.length} chapters`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to generate prompts', 'error')
    } finally {
      setGeneratingPrompts(false)
    }
  }

  const copyPrompt = (chapterId: number, index: number) => {
    const prompts = imagePrompts[chapterId]
    if (!prompts || !prompts[index]) return
    const key = `${chapterId}-${index}`
    navigator.clipboard.writeText(prompts[index]).then(() => {
      setCopiedPromptKey(key)
      setTimeout(() => setCopiedPromptKey(null), 2000)
    })
  }

  const copyAllPrompts = () => {
    if (!script) return
    const all = script.chapters
      .map(ch => {
        const prompts = imagePrompts[ch.id]
        if (!prompts || prompts.length === 0) return null
        return `=== Chapter ${ch.id} — ${ch.title} ===\n` +
          prompts.map((p, i) => `Image ${i + 1}: ${p}`).join('\n\n')
      })
      .filter(Boolean)
      .join('\n\n')
    if (!all) return
    navigator.clipboard.writeText(all).then(() => showToast('All prompts copied to clipboard!'))
  }

  // ─── AUTO BUILD PIPELINE ───
  const runAutoBuild = async () => {
    setBuildPhase('script')
    setBuildMessage('Writing your script...')
    setBuildSubProgress(null)
    setBuildError(null)
    setScript(null)
    setChapterMedia({})
    setChapterAudio({})
    setVoiceoverStatus({})
    setVideoUrl(null)
    setCurrentJobId(null)
    setDalleImages({})
    setImagePrompts({})
    setPromptTitles({})
    setClips([])

    try {
      // ── Step 1: Script ──
      const scriptRes = await fetch('/api/story-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() || null, channel }),
      })
      const scriptData = await scriptRes.json()
      if (!scriptRes.ok) throw new Error(scriptData.error || 'Script generation failed')
      const generatedScript: Script = scriptData.script
      setScript(generatedScript)
      setBuildMessage(`"${generatedScript.title}"`)

      // ── Step 2: Image prompts ──
      setBuildPhase('prompts')
      setBuildMessage('Generating image prompts...')
      const promptRes = await fetch('/api/story-image-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapters: generatedScript.chapters, channel, topic: topic.trim() }),
      })
      const promptData = await promptRes.json()
      if (!promptRes.ok) throw new Error(promptData.error || 'Prompt generation failed')
      const promptMap: Record<number, string[]> = {}
      const titleMap: Record<number, string> = {}
      for (const item of promptData.prompts) {
        promptMap[item.chapterId] = item.prompts
        titleMap[item.chapterId] = item.title
      }
      setImagePrompts(promptMap)
      setPromptTitles(titleMap)
      const totalPrompts = Object.values(promptMap).reduce((s, arr) => s + arr.length, 0)
      setBuildMessage(`${totalPrompts} prompts across ${generatedScript.chapters.length} chapters`)

      // ── Step 3: Images (Pexels → DALL-E fallback) ──
      setBuildPhase('images')
      const localMedia: Record<number, File[]> = {}
      let pexelsCount = 0
      let dalleCount = 0

      for (let i = 0; i < generatedScript.chapters.length; i++) {
        const ch = generatedScript.chapters[i]
        setBuildSubProgress({ done: i, total: generatedScript.chapters.length })
        setBuildMessage(`Finding image ${i + 1} of ${generatedScript.chapters.length}…`)
        const prompts = promptMap[ch.id]
        if (!prompts || prompts.length === 0) continue

        let imageDataUrl: string | null = null

        // ── Try Pexels first ──
        try {
          const pexelsRes = await fetch('/api/story-pexels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompts[0], title: ch.title, channel, chapterId: ch.id }),
          })
          if (pexelsRes.ok) {
            const pexelsData = await pexelsRes.json()
            imageDataUrl = pexelsData.imageDataUrl
            pexelsCount++
            console.log(`[auto-build] ch${ch.id}: Pexels OK — "${pexelsData.query}"`)
          } else {
            console.log(`[auto-build] ch${ch.id}: Pexels ${pexelsRes.status} — trying DALL-E`)
          }
        } catch (e) {
          console.warn(`[auto-build] ch${ch.id}: Pexels error:`, e)
        }

        // ── Fall back to DALL-E if Pexels failed ──
        if (!imageDataUrl) {
          setBuildMessage(`Image ${i + 1}: using DALL·E fallback…`)
          try {
            const dalleRes = await fetch('/api/story-dalle', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: prompts[0], chapterId: ch.id }),
            })
            if (dalleRes.ok) {
              const dalleData = await dalleRes.json()
              imageDataUrl = dalleData.imageDataUrl
              dalleCount++
            }
          } catch (e) {
            console.warn(`[auto-build] ch${ch.id}: DALL-E fallback failed:`, e)
          }
        }

        if (imageDataUrl) {
          const ext = imageDataUrl.startsWith('data:image/png') ? 'png' : 'jpg'
          const file = dataUrlToFile(imageDataUrl, `img_ch${ch.id}.${ext}`)
          localMedia[ch.id] = [file]
          setDalleImages(prev => ({ ...prev, [ch.id]: imageDataUrl! }))
          setChapterMedia(prev => ({ ...prev, [ch.id]: [file] }))
        }
      }

      setBuildSubProgress({ done: generatedScript.chapters.length, total: generatedScript.chapters.length })
      const imageSummary = [
        pexelsCount > 0 && `${pexelsCount} from Pexels`,
        dalleCount > 0  && `${dalleCount} from DALL·E`,
      ].filter(Boolean).join(', ')
      setBuildMessage(`${Object.keys(localMedia).length} images sourced${imageSummary ? ` (${imageSummary})` : ''}`)

      // ── Step 4: Voiceover ──
      setBuildPhase('voiceover')
      const localAudio: Record<number, string> = {}
      for (let i = 0; i < generatedScript.chapters.length; i++) {
        const ch = generatedScript.chapters[i]
        setBuildSubProgress({ done: i, total: generatedScript.chapters.length })
        setBuildMessage(`Recording voiceover ${i + 1} of ${generatedScript.chapters.length}`)
        setVoiceoverStatus(prev => ({ ...prev, [ch.id]: 'generating' }))
        try {
          const voiceRes = await fetch('/api/story-voiceover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: ch.narration, voiceId: selectedVoice }),
          })
          const voiceData = await voiceRes.json()
          if (!voiceRes.ok) throw new Error(voiceData.error)
          localAudio[ch.id] = voiceData.audio
          setChapterAudio(prev => ({ ...prev, [ch.id]: voiceData.audio }))
          setVoiceoverStatus(prev => ({ ...prev, [ch.id]: 'ready' }))
        } catch (e) {
          console.warn(`Voiceover failed for chapter ${ch.id}:`, e)
          setVoiceoverStatus(prev => { const n = { ...prev }; delete n[ch.id]; return n })
        }
      }
      setBuildSubProgress({ done: generatedScript.chapters.length, total: generatedScript.chapters.length })

      // ── Step 5: Assembly ──
      setBuildPhase('assembly')
      setBuildMessage('Assembling video...')
      setBuildSubProgress(null)

      const formData = new FormData()
      formData.append('chapters', JSON.stringify(generatedScript.chapters.map(ch => ({
        id: ch.id, narration: ch.narration, title: ch.title,
      }))))

      for (const [chIdStr, files] of Object.entries(localMedia)) {
        for (const file of files) {
          formData.append('media', file, `ch${chIdStr}_${file.name}`)
          formData.append('mediaChapterIds', chIdStr)
        }
      }

      for (const [chIdStr, dataUrl] of Object.entries(localAudio)) {
        const base64 = dataUrl.split(',')[1]
        const mime = dataUrl.split(';')[0].split(':')[1] || 'audio/mpeg'
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const ext = mime.includes('wav') ? 'wav' : 'mp3'
        const blob = new Blob([bytes], { type: mime })
        formData.append('audio', blob, `ch${chIdStr}_voiceover.${ext}`)
        formData.append('audioChapterIds', chIdStr)
      }

      formData.append('musicMood', musicMood)
      formData.append('musicVolume', '0.15')
      formData.append('musicEnabled', String(musicEnabled))
      formData.append('channel', channel)

      const startRes = await fetch('/api/story-video/start', { method: 'POST', body: formData })
      const startData = await startRes.json()
      if (!startRes.ok) throw new Error(startData.error || 'Assembly start failed')

      setCurrentJobId(startData.jobId)

      const result = await new Promise<{ downloadUrl: string; duration: number }>((resolve, reject) => {
        const poll = async () => {
          try {
            const statusRes = await fetch(`/api/story-video/status/${startData.jobId}`)
            const statusData = await statusRes.json()
            if (statusData.status === 'complete') { resolve(statusData); return }
            if (statusData.status === 'error') { reject(new Error(statusData.error || 'Assembly failed')); return }
            if (statusData.progress) setBuildMessage(statusData.progress)
            setTimeout(poll, 3000)
          } catch (e) { reject(e) }
        }
        poll()
      })

      setVideoUrl(result.downloadUrl)
      setBuildPhase('complete')
      setBuildMessage(`${Math.round(result.duration)}s · ready to download`)
      sessionStorage.setItem('longform_video', JSON.stringify({ jobId: startData.jobId, videoUrl: result.downloadUrl }))
      openPublishPanel()

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Build failed'
      setBuildError(msg)
      setBuildPhase('error')
    }
  }

  // ─── Thumbnail ───
  const generateThumbnail = async () => {
    if (!script) return
    setThumbnailGenerating(true)
    setThumbnailUrl(null)
    try {
      let heroImageBase64: string | undefined
      if (thumbnailHeroFile) {
        const reader = new FileReader()
        heroImageBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(thumbnailHeroFile)
        })
      }
      const res = await fetch('/api/generate-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          title: script.title,
          accentWord: thumbnailAccentWord.trim(),
          heroImageBase64,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setThumbnailUrl(data.thumbnailBase64)
      showToast('Thumbnail generated and saved to Drive')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Thumbnail generation failed', 'error')
    } finally {
      setThumbnailGenerating(false)
    }
  }

  // ─── Publish panel ───
  const openPublishPanel = async () => {
    if (!currentJobId && videoUrl) {
      const m = videoUrl.match(/\/download\/([^/?]+)/)
      if (m?.[1]) setCurrentJobId(m[1])
    }
    let metaMap: Record<string, { instagram: boolean; facebook: boolean }> = {}
    try {
      const [ytRes, metaRes] = await Promise.all([
        fetch('/api/auth/youtube?action=status'),
        fetch('/api/auth/meta?action=status'),
      ])
      const ytSt = ytRes.ok ? await ytRes.json() : {}
      const metaSt = metaRes.ok ? await metaRes.json() : {}
      const ytMap: Record<string, boolean> = {}
      for (const ch of CHANNELS) {
        ytMap[ch] = !!ytSt[ch]?.connected
        metaMap[ch] = { instagram: !!metaSt[ch]?.instagram, facebook: !!metaSt[ch]?.facebook }
      }
      setYtConnected(ytMap)
      setMetaConnected(metaMap)
    } catch { /* non-fatal */ }

    // Default: current channel selected, yt always on (requires login anyway), ig/fb per connection
    setChannelPlatforms(prev => {
      const platforms: Record<string, { yt: boolean; ig: boolean; fb: boolean }> = {}
      for (const ch of CHANNELS) {
        platforms[ch] = prev[ch] || { yt: false, ig: false, fb: false }
      }
      if (!prev[channel] || (!prev[channel].yt && !prev[channel].ig && !prev[channel].fb)) {
        platforms[channel] = {
          yt: true,
          ig: !!metaMap[channel]?.instagram,
          fb: !!metaMap[channel]?.facebook,
        }
      }
      return platforms
    })

    const { ytTags, igTags } = deriveTagsFromScript(script)
    setPublishMeta(prev => {
      const meta: Record<string, { title: string; description: string; ytTags: string; igTags: string }> = {}
      for (const ch of CHANNELS) {
        meta[ch] = prev[ch] || {
          title: script?.title ?? '',
          description: script?.summary || script?.chapters?.map(c => c.narration).join(' ').slice(0, 400) || '',
          ytTags,
          igTags,
        }
      }
      return meta
    })
    setYtStatus({})
    setMetaStatus({})
    setYtError({})
    setMetaError({})
    setYtPublishedUrl({})
    setPublishPanelOpen(true)
  }

  // Open YouTube OAuth popup for one channel; auto-upload after successful login
  const loginAndUploadYouTube = (ch: string) => {
    // If already connected, skip OAuth and upload directly
    if (ytConnected[ch]) {
      uploadToYouTube(ch)
      return
    }
    setYtStatus(prev => ({ ...prev, [ch]: 'connecting' }))
    const popup = window.open(
      `/api/auth/youtube?channel=${encodeURIComponent(ch)}`,
      `yt_auth_${ch.replace(/\s/g, '_')}`,
      'width=600,height=700,left=200,top=100',
    )
    const poll = setInterval(async () => {
      if (!popup || popup.closed) {
        clearInterval(poll)
        try {
          const res = await fetch('/api/auth/youtube?action=status')
          const st = await res.json()
          const ok = !!st[ch]?.connected
          setYtConnected(prev => ({ ...prev, [ch]: ok }))
          if (ok) {
            uploadToYouTube(ch)
          } else {
            setYtStatus(prev => ({ ...prev, [ch]: 'idle' }))
          }
        } catch {
          setYtStatus(prev => ({ ...prev, [ch]: 'error' }))
          setYtError(prev => ({ ...prev, [ch]: 'Connection check failed' }))
        }
      }
    }, 1000)
  }

  // Upload video to YouTube only (no Meta)
  const uploadToYouTube = async (ch: string) => {
    const jobId = currentJobId || videoUrl?.match(/\/download\/([^/?]+)/)?.[1]
    if (!jobId) return
    setYtStatus(prev => ({ ...prev, [ch]: 'uploading' }))
    setYtError(prev => { const n = { ...prev }; delete n[ch]; return n })
    try {
      const meta = publishMeta[ch] || { title: script?.title || '', description: '', ytTags: '', igTags: '' }
      const tags = meta.ytTags.split(',').map(t => t.trim()).filter(Boolean)
      const res = await fetch('/api/story-video/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          channelName: ch,
          title: meta.title,
          description: meta.description,
          tags,
          format: 'youtube',
          thumbnailBase64: thumbnailUrl || undefined,
          publishInstagram: false,
          publishFacebook: false,
          storyTopic: script?.title,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setYtStatus(prev => ({ ...prev, [ch]: 'done' }))
      if (data.videoUrl) setYtPublishedUrl(prev => ({ ...prev, [ch]: data.videoUrl }))
    } catch (e: unknown) {
      setYtStatus(prev => ({ ...prev, [ch]: 'error' }))
      setYtError(prev => ({ ...prev, [ch]: e instanceof Error ? e.message : 'Upload failed' }))
    }
  }

  // Publish to Instagram and/or Facebook for one channel (no YouTube)
  const publishMetaForChannel = async (ch: string) => {
    const jobId = currentJobId || videoUrl?.match(/\/download\/([^/?]+)/)?.[1]
    if (!jobId) return
    const plat = channelPlatforms[ch]
    if (!plat?.ig && !plat?.fb) return
    setMetaStatus(prev => ({ ...prev, [ch]: 'uploading' }))
    setMetaError(prev => { const n = { ...prev }; delete n[ch]; return n })
    try {
      const meta = publishMeta[ch] || { title: script?.title || '', description: '', ytTags: '', igTags: '' }
      const caption = `${meta.description}\n\n${meta.igTags}`.trim()
      const res = await fetch('/api/story-video/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          channelName: ch,
          title: meta.title,
          description: caption,
          tags: [],
          format: 'youtube',
          thumbnailBase64: thumbnailUrl || undefined,
          publishInstagram: !!plat?.ig,
          publishFacebook: !!plat?.fb,
          storyTopic: script?.title,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Publish failed')
      // If neither Instagram nor Facebook succeeded, surface the error
      const igErr = data.errors?.instagram as string | undefined
      const fbErr = data.errors?.facebook as string | undefined
      const anyMetaSuccess = !!(data.instagram || data.facebook)
      if (!anyMetaSuccess) {
        throw new Error(igErr || fbErr || 'Publish failed — no platforms succeeded')
      }
      setMetaStatus(prev => ({ ...prev, [ch]: 'done' }))
      // Warn about partial failures (e.g. IG ok but FB failed)
      const partialErr = (plat?.ig && igErr) ? igErr : (plat?.fb && fbErr) ? fbErr : null
      if (partialErr) showToast(`${ch}: ${partialErr}`, 'error')
    } catch (e: unknown) {
      setMetaStatus(prev => ({ ...prev, [ch]: 'error' }))
      setMetaError(prev => ({ ...prev, [ch]: e instanceof Error ? e.message : 'Publish failed' }))
    }
  }

  // Show confirmation dialog before publishing anything
  const handlePublishButton = () => {
    const hasAny = CHANNELS.some(ch => channelPlatforms[ch]?.yt || channelPlatforms[ch]?.ig || channelPlatforms[ch]?.fb)
    if (!hasAny) { showToast('Select at least one platform to publish', 'error'); return }
    setConfirmPublishOpen(true)
  }

  // Execute after user confirms: publish Meta immediately, start YT login flows
  const executePublish = async () => {
    setConfirmPublishOpen(false)
    for (const ch of CHANNELS) {
      const plat = channelPlatforms[ch]
      if (!plat) continue
      if ((plat.ig || plat.fb) && metaStatus[ch] !== 'done' && metaStatus[ch] !== 'uploading') {
        publishMetaForChannel(ch)
      }
      // Hard guard: YouTube only runs for Gentlemen of Fuel
      if (plat.yt && ch === 'Gentlemen of Fuel' && ytStatus[ch] !== 'done' && ytStatus[ch] !== 'uploading' && ytStatus[ch] !== 'connecting') {
        loginAndUploadYouTube(ch)
      }
    }
  }

  // ─── Computed ───
  const voiceoverCount = Object.keys(chapterAudio).length
  const allVoiceoversReady = script ? voiceoverCount === script.chapters.length : false
  const hasAnyMedia = Object.values(chapterMedia).some(f => f.length > 0)
  const totalMedia = Object.values(chapterMedia).reduce((s, f) => s + f.length, 0)
  const chapterLabel = (type: string) => type === 'intro' ? 'INTRO' : type === 'outro' ? 'OUTRO' : 'CHAPTER'
  const chapterColor = (type: string) => type === 'intro' ? 'bg-blue-100 text-blue-700' : type === 'outro' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'
  const isBuilding = ['script', 'prompts', 'images', 'voiceover', 'assembly'].includes(buildPhase)
  const stepIndex = BUILD_STEPS.findIndex(s => s.id === buildPhase)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* ─── Topbar ─── */}
        <div className="h-12 bg-white border-b border-stone-100 flex items-center justify-between px-5 pl-14 md:pl-5 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-medium text-stone-900">Long form story</span>
            {advancedMode && (
              <>
                <button
                  onClick={() => setTestMode(prev => !prev)}
                  className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                    testMode ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${testMode ? 'bg-amber-500' : 'bg-stone-300'}`} />
                  Test mode
                </button>
                {testMode && (
                  <>
                    <select value={testDuration} onChange={(e) => setTestDuration(Number(e.target.value) as 10 | 30)} className="hidden md:block text-[11px] border border-amber-300 rounded-lg px-2 py-1 bg-amber-50 text-amber-800 focus:outline-none">
                      <option value={10}>10s</option>
                      <option value={30}>30s</option>
                    </select>
                    <span className="hidden md:inline text-[11px] text-amber-600 font-medium">Test mode — no ElevenLabs charges</span>
                  </>
                )}
              </>
            )}
            {draftSaved && <span className="hidden md:inline text-[11px] text-stone-400">Draft saved</span>}
          </div>
          <div className="flex items-center gap-2">
            {(topic || script) && (
              <button onClick={clearDraft} className="px-3 py-2 min-h-[44px] text-[13px] font-medium border border-stone-200 text-stone-500 rounded-lg hover:bg-stone-50 transition-colors">
                Clear
              </button>
            )}
            <button
              onClick={() => toggleAdvancedMode(!advancedMode)}
              className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-[12px] font-medium rounded-lg border transition-colors ${
                advancedMode
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {advancedMode ? '← Simple mode' : 'Advanced mode'}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SIMPLE MODE
        ═══════════════════════════════════════════════ */}
        {!advancedMode && (
          <div className="flex-1 overflow-y-auto">

            {/* ── IDLE: Input form ── */}
            {buildPhase === 'idle' && (
              <div className="flex items-center justify-center min-h-full p-6">
                <div className="w-full max-w-md">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-stone-900 rounded-2xl mb-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.867V15.133a1 1 0 01-1.447.902L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                      </svg>
                    </div>
                    <h1 className="text-[22px] font-bold text-stone-900 mb-1">Build a story video</h1>
                    <p className="text-[13px] text-stone-500">Script · Images · Voiceover · Video — fully automatic</p>
                  </div>

                  <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
                    {/* Channel */}
                    <div>
                      <label className="text-[11px] font-medium text-stone-500 uppercase tracking-widest block mb-1.5">Channel</label>
                      <select
                        value={channel}
                        onChange={(e) => { setChannel(e.target.value); setMusicMood(CALM_CHANNELS.includes(e.target.value) ? 'calm' : 'energy') }}
                        className="w-full text-[14px] border border-stone-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                      >
                        {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Topic */}
                    <div>
                      <label className="text-[11px] font-medium text-stone-500 uppercase tracking-widest block mb-1.5">
                        Topic <span className="normal-case font-normal text-stone-400">(optional — leave blank for AI suggestion)</span>
                      </label>
                      <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder={`e.g. The untold story of Senna at Monaco 1984`}
                        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-[14px] resize-none focus:outline-none focus:ring-1 focus:ring-stone-400"
                        rows={3}
                      />
                    </div>

                    {/* Voice */}
                    <div>
                      <label className="text-[11px] font-medium text-stone-500 uppercase tracking-widest block mb-1.5">Voice</label>
                      <select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="w-full text-[14px] border border-stone-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                      >
                        {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                      </select>
                    </div>

                    {/* Music */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-medium text-stone-500 uppercase tracking-widest">Music</label>
                        {/* On/Off toggle */}
                        <button
                          onClick={() => setMusicEnabled(v => !v)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${musicEnabled ? 'bg-stone-800' : 'bg-stone-200'}`}
                          aria-label={musicEnabled ? 'Disable music' : 'Enable music'}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${musicEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                      {/* Calm/Energy buttons — only when music is on */}
                      {musicEnabled ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setMusicMood('calm')}
                            className={`flex-1 py-2.5 text-[13px] font-medium rounded-xl border transition-colors ${
                              musicMood === 'calm' ? 'bg-sky-100 text-sky-700 border-sky-300' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                            }`}
                          >
                            🎵 Calm
                          </button>
                          <button
                            onClick={() => setMusicMood('energy')}
                            className={`flex-1 py-2.5 text-[13px] font-medium rounded-xl border transition-colors ${
                              musicMood === 'energy' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                            }`}
                          >
                            ⚡ Energy
                          </button>
                        </div>
                      ) : (
                        <p className="text-[11px] text-stone-400 py-1">No background music — voiceover only</p>
                      )}
                    </div>

                    {/* Build button */}
                    <button
                      onClick={runAutoBuild}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-stone-900 text-white text-[14px] font-semibold rounded-xl hover:bg-stone-800 active:bg-stone-950 transition-colors mt-2"
                    >
                      <span>Generate &amp; Build</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>

                    <p className="text-center text-[11px] text-stone-400">
                      Builds a complete ~4 min video · typically 8–12 minutes
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── BUILDING: Step progress ── */}
            {isBuilding && (
              <div className="flex items-center justify-center min-h-full p-6">
                <div className="w-full max-w-lg">

                  {/* Step tracker */}
                  <div className="flex items-start justify-between mb-10">
                    {BUILD_STEPS.map((step, i) => {
                      const isComplete = stepIndex > i
                      const isCurrent = stepIndex === i
                      return (
                        <div key={step.id} className="flex flex-col items-center gap-2 flex-1">
                          <div className="relative flex items-center w-full">
                            {i > 0 && (
                              <div className={`absolute right-[calc(50%+14px)] left-0 top-3.5 h-0.5 transition-colors duration-500 ${isComplete ? 'bg-emerald-400' : 'bg-stone-200'}`} />
                            )}
                            <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-all duration-300 ${
                              isComplete ? 'bg-emerald-500 text-white' :
                              isCurrent ? 'bg-stone-900 text-white ring-4 ring-stone-100' :
                              'bg-stone-100 text-stone-400'
                            }`}>
                              {isComplete ? (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : isCurrent ? (
                                <Spinner className="w-3.5 h-3.5" />
                              ) : (
                                <span className="text-[10px] font-bold">{i + 1}</span>
                              )}
                            </div>
                            {i < BUILD_STEPS.length - 1 && (
                              <div className={`absolute left-[calc(50%+14px)] right-0 top-3.5 h-0.5 transition-colors duration-500 ${isComplete ? 'bg-emerald-400' : 'bg-stone-200'}`} />
                            )}
                          </div>
                          <span className={`text-[11px] font-medium transition-colors text-center ${isCurrent ? 'text-stone-900' : isComplete ? 'text-emerald-600' : 'text-stone-400'}`}>
                            {step.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Status message */}
                  <div className="text-center space-y-4">
                    <p className="text-[15px] font-medium text-stone-800 min-h-[24px]">{buildMessage}</p>
                    {buildSubProgress && (
                      <div className="space-y-1.5 max-w-xs mx-auto">
                        <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-stone-700 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.round((buildSubProgress.done / buildSubProgress.total) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-stone-400">{buildSubProgress.done} of {buildSubProgress.total} complete</p>
                      </div>
                    )}
                    <p className="text-[12px] text-stone-400 mt-6">This typically takes 8–12 minutes · keep this tab open</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── COMPLETE: Results ── */}
            {buildPhase === 'complete' && videoUrl && (
              <div className="max-w-2xl mx-auto py-8 px-6 space-y-5">

                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-[17px] font-bold text-stone-900 leading-tight">{script?.title || 'Video ready'}</h2>
                    <p className="text-[12px] text-stone-500">{buildMessage}</p>
                  </div>
                </div>

                {/* Video player */}
                <div className="bg-black rounded-2xl overflow-hidden aspect-video shadow-md">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    src={`${videoUrl}?format=youtube`}
                    controls
                    className="w-full h-full"
                    preload="metadata"
                  />
                </div>

                {/* Download */}
                <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2">
                  <p className="text-[11px] font-medium text-stone-400 uppercase tracking-widest mb-3">Download</p>
                  <a href={`${videoUrl}?format=youtube`} download="story_youtube_16x9.mp4"
                    className="flex items-center justify-between w-full px-4 py-3 text-[13px] font-medium bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors">
                    <span>YouTube</span><span className="opacity-60 text-[11px]">16:9 ↓</span>
                  </a>
                  <a href={`${videoUrl}?format=square`} download="story_instagram_square.mp4"
                    className="flex items-center justify-between w-full px-4 py-3 text-[13px] font-medium border border-stone-200 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors">
                    <span>Instagram Square</span><span className="opacity-60 text-[11px]">1:1 ↓</span>
                  </a>
                  <a href={`${videoUrl}?format=reels`} download="story_instagram_reels.mp4"
                    className="flex items-center justify-between w-full px-4 py-3 text-[13px] font-medium border border-stone-200 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors">
                    <span>Reels</span><span className="opacity-60 text-[11px]">9:16 ↓</span>
                  </a>
                  <button
                    onClick={publishPanelOpen ? () => setPublishPanelOpen(false) : openPublishPanel}
                    className="flex items-center justify-between w-full px-4 py-3 text-[13px] font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors mt-2"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      Publish to channels
                    </span>
                    <svg className={`w-4 h-4 opacity-80 transition-transform duration-200 ${publishPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Thumbnail generator */}
                <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
                  <p className="text-[11px] font-medium text-stone-400 uppercase tracking-widest">YouTube Thumbnail</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={thumbnailAccentWord}
                      onChange={(e) => setThumbnailAccentWord(e.target.value)}
                      placeholder="Accent word (highlighted in colour)"
                      className="flex-1 px-3 py-2 text-[13px] border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center gap-2 px-3 py-2 border border-dashed border-stone-300 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors">
                      <input
                        ref={thumbnailFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setThumbnailHeroFile(e.target.files?.[0] ?? null)}
                      />
                      <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4a3 3 0 014 0l4 4M14 12l2-2a3 3 0 014 0l2 2M8 21h8m-4-4v4" />
                      </svg>
                      <span className="text-[12px] text-stone-500 truncate">
                        {thumbnailHeroFile ? thumbnailHeroFile.name : 'Hero image (optional)'}
                      </span>
                    </label>
                    {thumbnailHeroFile && (
                      <button onClick={() => setThumbnailHeroFile(null)} className="text-[11px] text-stone-400 hover:text-stone-600 shrink-0">✕</button>
                    )}
                  </div>
                  <button
                    onClick={generateThumbnail}
                    disabled={thumbnailGenerating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-medium bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50"
                  >
                    {thumbnailGenerating ? <><Spinner className="w-3.5 h-3.5" /> Generating...</> : 'Generate Thumbnail'}
                  </button>
                  {thumbnailUrl && (
                    <div className="rounded-xl overflow-hidden border border-stone-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbnailUrl} alt="Generated thumbnail" className="w-full block" />
                      <div className="px-3 py-2 flex items-center justify-between bg-stone-50">
                        <p className="text-[11px] text-stone-500">Saved to Drive · AI Generated</p>
                        <a
                          href={thumbnailUrl}
                          download={`thumbnail_${channel.replace(/\s+/g, '_')}.jpg`}
                          className="text-[12px] font-bold text-stone-600 hover:text-stone-900"
                        >
                          ↓ Download
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Publish panel — per-platform channel selection */}
                {publishPanelOpen && (
                  <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                    <div className="p-4 space-y-3">
                      {CHANNELS.map(ch => {
                        const plat = channelPlatforms[ch] || { yt: false, ig: false, fb: false }
                        const anySelected = plat.yt || plat.ig || plat.fb
                        const igOk = !!metaConnected[ch]?.instagram
                        const fbOk = !!metaConnected[ch]?.facebook
                        const ytAlready = !!ytConnected[ch]
                        const ytEnabled = ch === 'Gentlemen of Fuel'
                        const yt = ytStatus[ch] || 'idle'
                        const meta = metaStatus[ch] || 'idle'
                        return (
                          <div key={ch} className="rounded-xl border border-stone-100 overflow-hidden">
                            {/* Channel header + platform toggles */}
                            <div className="flex items-center gap-3 px-3 py-2.5">
                              <span className="text-[13px] font-medium text-stone-800 min-w-0 flex-1">{ch}</span>
                              <div className="flex gap-1.5 shrink-0">
                                {ytEnabled && (
                                  <button
                                    onClick={() => setChannelPlatforms(p => ({ ...p, [ch]: { ...p[ch], yt: !plat.yt } }))}
                                    title={ytAlready ? 'YouTube — already connected, will upload directly' : 'YouTube — login required'}
                                    className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-colors ${plat.yt ? 'bg-red-50 text-red-600 border-red-300' : 'bg-stone-50 text-stone-400 border-stone-200 hover:border-stone-300'}`}
                                  >YT</button>
                                )}
                                <button
                                  onClick={() => setChannelPlatforms(p => ({ ...p, [ch]: { ...p[ch], ig: !plat.ig } }))}
                                  title={igOk ? 'Instagram' : 'Instagram — connect via Accounts page first'}
                                  className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-colors ${plat.ig ? 'bg-pink-50 text-pink-600 border-pink-300' : 'bg-stone-50 text-stone-400 border-stone-200 hover:border-stone-300'}`}
                                >IG</button>
                                <button
                                  onClick={() => setChannelPlatforms(p => ({ ...p, [ch]: { ...p[ch], fb: !plat.fb } }))}
                                  title={fbOk ? 'Facebook' : 'Facebook — connect via Accounts page first'}
                                  className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-colors ${plat.fb ? 'bg-blue-50 text-blue-600 border-blue-300' : 'bg-stone-50 text-stone-400 border-stone-200 hover:border-stone-300'}`}
                                >FB</button>
                              </div>
                            </div>

                            {/* Expanded metadata + per-platform actions */}
                            {anySelected && (
                              <div className="border-t border-stone-100 px-3 py-2.5 space-y-2 bg-stone-50">
                                <input
                                  value={publishMeta[ch]?.title || ''}
                                  onChange={e => setPublishMeta(p => ({ ...p, [ch]: { ...p[ch], title: e.target.value } }))}
                                  placeholder="Title"
                                  className="w-full px-2.5 py-1.5 text-[12px] border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300 bg-white"
                                />
                                <textarea
                                  value={publishMeta[ch]?.description || ''}
                                  onChange={e => setPublishMeta(p => ({ ...p, [ch]: { ...p[ch], description: e.target.value } }))}
                                  placeholder="Description"
                                  rows={2}
                                  className="w-full px-2.5 py-1.5 text-[12px] border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300 resize-none bg-white"
                                />
                                {/* YouTube tags always visible — useful for manual uploads even when YT publish is disabled */}
                                <input
                                  value={publishMeta[ch]?.ytTags || ''}
                                  onChange={e => setPublishMeta(p => ({ ...p, [ch]: { ...p[ch], ytTags: e.target.value } }))}
                                  placeholder="YouTube tags: formula1, f1, grand prix, ..."
                                  className="w-full px-2.5 py-1.5 text-[12px] border border-red-100 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-red-200 bg-white"
                                />
                                {plat.ig && (
                                  <input
                                    value={publishMeta[ch]?.igTags || ''}
                                    onChange={e => setPublishMeta(p => ({ ...p, [ch]: { ...p[ch], igTags: e.target.value } }))}
                                    placeholder="Instagram hashtags: #f1 #formula1 #motorsport"
                                    className="w-full px-2.5 py-1.5 text-[12px] border border-pink-100 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-pink-200 bg-white"
                                  />
                                )}

                                {/* YouTube per-channel action — GoF only */}
                                {plat.yt && (
                                  <div className="pt-0.5">
                                    {yt === 'done' ? (
                                      <a href={ytPublishedUrl[ch] || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[12px] text-emerald-600 font-medium">✓ YouTube uploaded ↗</a>
                                    ) : yt === 'uploading' ? (
                                      <span className="flex items-center gap-1.5 text-[12px] text-stone-500"><Spinner className="w-3.5 h-3.5" /> Uploading to YouTube...</span>
                                    ) : yt === 'connecting' ? (
                                      <span className="flex items-center gap-1.5 text-[12px] text-stone-500"><Spinner className="w-3.5 h-3.5" /> Logging in to YouTube...</span>
                                    ) : (
                                      <div>
                                        {yt === 'error' && <p className="text-[11px] text-red-500 mb-1.5">{ytError[ch]}</p>}
                                        <button
                                          onClick={() => ytAlready ? uploadToYouTube(ch) : loginAndUploadYouTube(ch)}
                                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                                        >
                                          {YT_ICON} {ytAlready ? 'Upload to YouTube' : 'Login & Upload'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Meta status */}
                                {(plat.ig || plat.fb) && (
                                  <div className="text-[11px]">
                                    {meta === 'done' && <p className="text-emerald-600 font-medium">✓ Published to {[plat.ig && 'Instagram', plat.fb && 'Facebook'].filter(Boolean).join(' & ')}</p>}
                                    {meta === 'uploading' && <span className="flex items-center gap-1.5 text-stone-500"><Spinner className="w-3 h-3" /> Publishing to {[plat.ig && 'Instagram', plat.fb && 'Facebook'].filter(Boolean).join(' & ')}...</span>}
                                    {meta === 'error' && <p className="text-red-500">{metaError[ch]}</p>}
                                    {meta === 'idle' && <p className="text-stone-400">Will publish when you click Publish below</p>}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Publish button */}
                      <button
                        onClick={handlePublishButton}
                        disabled={!CHANNELS.some(ch => channelPlatforms[ch]?.yt || channelPlatforms[ch]?.ig || channelPlatforms[ch]?.fb)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40"
                      >
                        {CHANNELS.some(ch => ytStatus[ch] === 'uploading' || metaStatus[ch] === 'uploading')
                          ? <><Spinner className="w-3.5 h-3.5" /> Publishing...</>
                          : 'Publish selected platforms'}
                      </button>
                      {thumbnailUrl && <p className="text-[11px] text-stone-400 text-center">Generated thumbnail will be applied to YouTube uploads</p>}
                    </div>
                  </div>
                )}

                {/* Chapter clips */}
                {currentJobId && (
                  <div className="bg-white border border-stone-200 rounded-2xl p-4">
                    <p className="text-[11px] font-medium text-stone-400 uppercase tracking-widest mb-3">Chapter Clips (9:16)</p>
                    <button
                      onClick={createClips}
                      disabled={clippingVideo}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-medium border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors disabled:opacity-50"
                    >
                      {clippingVideo
                        ? <><Spinner className="w-3.5 h-3.5" /> Creating clips...</>
                        : clips.length > 0 ? `✂ Regenerate chapter clips` : '✂ Create chapter clips'}
                    </button>
                    {clips.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {clips.map((clip) => (
                          <div key={clip.chapterId} className="bg-stone-50 rounded-xl overflow-hidden border border-stone-100">
                            {clip.thumbFile && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`/api/clips/${clip.thumbFile}`} alt={clip.title} className="w-full aspect-square object-cover" />
                            )}
                            <div className="p-2">
                              <p className="text-[10px] text-stone-700 truncate font-medium leading-tight">{clip.title}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-stone-400">{clip.duration}s</span>
                                <a href={`/api/clips/${clip.clipFile}`} download={clip.clipFile} className="text-[12px] font-bold text-stone-600 hover:text-stone-900">↓</a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Script accordion */}
                {script && (
                  <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setShowScript(s => !s)}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-[13px] font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      <span>📄 Script ({script.chapters.length} chapters)</span>
                      <svg className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${showScript ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showScript && (
                      <div className="border-t border-stone-100 divide-y divide-stone-50">
                        {script.chapters.map(ch => (
                          <div key={ch.id} className="px-4 py-3 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${chapterColor(ch.type)}`}>{chapterLabel(ch.type)}</span>
                              <p className="text-[13px] font-semibold text-stone-900">{ch.title}</p>
                            </div>
                            <p className="text-[12px] text-stone-600 leading-relaxed">{ch.narration}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Prompts accordion */}
                {Object.keys(imagePrompts).length > 0 && (
                  <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setShowPromptsAccordion(s => !s)}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-[13px] font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      <span>✦ AI Image Prompts</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); copyAllPrompts() }}
                          className="text-[11px] text-stone-400 hover:text-stone-600 px-2 py-0.5 rounded border border-stone-200 hover:bg-stone-50 transition-colors"
                        >
                          Copy all
                        </button>
                        <svg className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${showPromptsAccordion ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {showPromptsAccordion && script && (
                      <div className="border-t border-stone-100 divide-y divide-stone-50">
                        {script.chapters.map(ch => {
                          const prompts = imagePrompts[ch.id]
                          if (!prompts || prompts.length === 0) return null
                          return (
                            <div key={ch.id} className="px-4 py-3 space-y-2">
                              <p className="text-[11px] font-semibold text-stone-700">{ch.title}</p>
                              {prompts.map((p, i) => (
                                <div key={i} className="flex items-start gap-2 group">
                                  <span className="text-[10px] font-bold text-stone-300 mt-0.5 shrink-0 w-4">#{i + 1}</span>
                                  <p className="text-[11px] text-stone-500 leading-relaxed flex-1">{p}</p>
                                  <button
                                    onClick={() => copyPrompt(ch.id, i)}
                                    className={`shrink-0 px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                                      copiedPromptKey === `${ch.id}-${i}`
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-stone-100 text-stone-400 hover:bg-stone-200 opacity-0 group-hover:opacity-100'
                                    }`}
                                  >
                                    {copiedPromptKey === `${ch.id}-${i}` ? '✓' : '⎘'}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 pb-4">
                  <button
                    onClick={() => { setBuildPhase('idle'); setBuildError(null) }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-semibold bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors"
                  >
                    + Build another video
                  </button>
                  <button
                    onClick={() => toggleAdvancedMode(true)}
                    className="px-4 py-3 text-[13px] font-medium border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 transition-colors"
                  >
                    Advanced
                  </button>
                </div>
              </div>
            )}

            {/* ── ERROR ── */}
            {buildPhase === 'error' && (
              <div className="flex items-center justify-center min-h-full p-6">
                <div className="w-full max-w-sm text-center space-y-5">
                  <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[16px] font-semibold text-stone-900 mb-1">Build failed</p>
                    <p className="text-[13px] text-stone-500">{buildError}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={runAutoBuild}
                      className="flex-1 px-4 py-2.5 bg-stone-900 text-white text-[13px] font-medium rounded-xl hover:bg-stone-800 transition-colors"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => setBuildPhase('idle')}
                      className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-600 text-[13px] font-medium rounded-xl hover:bg-stone-50 transition-colors"
                    >
                      Start over
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            ADVANCED MODE
        ═══════════════════════════════════════════════ */}
        {advancedMode && (
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

            {/* Left panel */}
            <div className="w-full md:w-72 border-r border-stone-100 overflow-y-auto p-4 md:p-5 flex flex-col gap-4 shrink-0">
              <div>
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Story topic</p>
                <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. The untold story of the 1966 Le Mans rivalry" className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-[16px] md:text-[13px] resize-none focus:outline-none focus:ring-1 focus:ring-stone-400" rows={3} />
              </div>

              <div>
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Channel</p>
                <select value={channel} onChange={(e) => { setChannel(e.target.value); setMusicMood(CALM_CHANNELS.includes(e.target.value) ? 'calm' : 'energy') }} className="w-full text-[16px] md:text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 min-h-[44px] bg-white focus:outline-none focus:ring-1 focus:ring-stone-400">
                  {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <button onClick={generateScript} disabled={generating} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 text-white text-[13px] font-medium rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50">
                {generating ? <><Spinner /> Writing script...</> : <><span className="text-[11px]">&#x270E;</span> Generate story</>}
              </button>

              {/* Voiceover */}
              {script && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex flex-col gap-3">
                  <p className="text-[10px] font-medium text-violet-700 uppercase tracking-widest">Voiceover</p>
                  {!testMode && (
                    <div>
                      <p className="text-[10px] text-violet-500 mb-1">Voice</p>
                      <select
                        value={selectedVoice}
                        onChange={(e) => { setSelectedVoice(e.target.value); setChapterAudio({}); setVoiceoverStatus({}) }}
                        className="w-full text-[12px] border border-violet-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                      >
                        {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                      </select>
                    </div>
                  )}
                  <button
                    onClick={generateAllVoiceovers}
                    disabled={generatingAllVoiceovers || allVoiceoversReady}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50 ${testMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-violet-600 hover:bg-violet-700'}`}
                  >
                    {generatingAllVoiceovers ? <><Spinner /> Generating...</> : allVoiceoversReady ? 'All voiceovers ready' : testMode ? 'Use test audio (all)' : <><span className="text-[11px]">&#9835;</span> Generate all voiceovers</>}
                  </button>
                  <p className="text-[10px] text-violet-500">{voiceoverCount}/{script.chapters.length} chapters voiced</p>
                  {allVoiceoversReady && (
                    <button onClick={downloadCombinedAudio} className="w-full px-3 py-2 text-[12px] font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                      &#8595; Download combined audio
                    </button>
                  )}
                </div>
              )}

              {/* Background music */}
              {script && (
                <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">Background music</p>
                    <button
                      onClick={() => setMusicEnabled(v => !v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${musicEnabled ? 'bg-stone-800' : 'bg-stone-200'}`}
                      aria-label={musicEnabled ? 'Disable music' : 'Enable music'}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${musicEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  {musicEnabled ? (
                    <>
                      <div className="flex gap-2">
                        <button onClick={() => setMusicMood('calm')} className={`flex-1 py-2 text-[12px] font-medium rounded-lg border transition-colors ${musicMood === 'calm' ? 'bg-sky-100 text-sky-700 border-sky-300' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'}`}>Calm</button>
                        <button onClick={() => setMusicMood('energy')} className={`flex-1 py-2 text-[12px] font-medium rounded-lg border transition-colors ${musicMood === 'energy' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'}`}>Energy</button>
                      </div>
                      <p className="text-[10px] text-stone-400">Track auto-selected from library</p>
                    </>
                  ) : (
                    <p className="text-[11px] text-stone-400">Music off — voiceover only</p>
                  )}
                </div>
              )}

              {/* AI Image Prompts */}
              {script && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium text-indigo-700 uppercase tracking-widest">AI Image Prompts</p>
                    {Object.keys(imagePrompts).length > 0 && (
                      <button onClick={() => setShowPromptsPanel(p => !p)} className="text-[10px] text-indigo-500 hover:text-indigo-700 transition-colors">
                        {showPromptsPanel ? 'Hide' : 'Show'}
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-indigo-500 leading-relaxed">Generate one detailed image prompt per chapter — ready to paste into Midjourney or ChatGPT.</p>
                  <button onClick={generateImagePrompts} disabled={generatingPrompts} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-[13px] font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {generatingPrompts ? <><Spinner /> Generating prompts...</> : <><span className="text-[11px]">✦</span> {Object.keys(imagePrompts).length > 0 ? 'Regenerate prompts' : 'Generate image prompts'}</>}
                  </button>
                  {Object.keys(imagePrompts).length > 0 && (
                    <button onClick={copyAllPrompts} className="w-full px-3 py-2 text-[12px] font-medium bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors">
                      ⎘ Copy all prompts
                    </button>
                  )}
                  {Object.keys(imagePrompts).length > 0 && (() => {
                    const total = Object.values(imagePrompts).reduce((s, arr) => s + arr.length, 0)
                    return <p className="text-[10px] text-indigo-500">{total} prompts across {Object.keys(imagePrompts).length} chapters</p>
                  })()}
                  {Object.keys(imagePrompts).length > 0 && (
                    <div className="pt-2 border-t border-indigo-200 flex flex-col gap-2">
                      <button
                        onClick={generateAllDalle}
                        disabled={!!dalleProgress || generatingPrompts || Object.values(generatingDalleFor).some(Boolean)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-[13px] font-medium rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50"
                      >
                        {dalleProgress ? <><Spinner /> {dalleProgress.done}/{dalleProgress.total} generating…</> : <>🎨 Auto-generate with DALL·E</>}
                      </button>
                      {dalleProgress && (
                        <div className="w-full bg-violet-100 rounded-full h-1.5">
                          <div className="bg-violet-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.round((dalleProgress.done / dalleProgress.total) * 100)}%` }} />
                        </div>
                      )}
                      {Object.keys(dalleImages).length > 0 && !dalleProgress && (
                        <p className="text-[10px] text-violet-600">{Object.keys(dalleImages).length} image{Object.keys(dalleImages).length !== 1 ? 's' : ''} generated · added to chapters</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Assembly */}
              {script && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col gap-3">
                  <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-widest">Video assembly</p>
                  <button onClick={assembleVideo} disabled={assembling || !hasAnyMedia} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-[13px] font-medium rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50">
                    {assembling ? <><Spinner /> Assembling...</> : !hasAnyMedia ? 'Upload images first' : <><span className="text-[11px]">&#9654;</span> Assemble video</>}
                  </button>
                  {(assembling || clippingVideo) && assemblyProgress && <p className="text-[10px] text-emerald-600">{assemblyProgress}</p>}
                  {!hasAnyMedia && <p className="text-[10px] text-emerald-500">Add images to chapters to enable</p>}
                  {videoUrl && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-widest">Download format</p>
                      <a href={`${videoUrl}?format=youtube`} download="story_youtube_16x9.mp4" className="flex items-center justify-between w-full px-3 py-2 text-[12px] font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                        <span>YouTube</span><span className="opacity-75 text-[10px]">16:9 ↓</span>
                      </a>
                      <a href={`${videoUrl}?format=square`} download="story_instagram_square.mp4" className="flex items-center justify-between w-full px-3 py-2 text-[12px] font-medium border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
                        <span>Instagram Square</span><span className="opacity-75 text-[10px]">1:1 ↓</span>
                      </a>
                      <a href={`${videoUrl}?format=reels`} download="story_instagram_reels.mp4" className="flex items-center justify-between w-full px-3 py-2 text-[12px] font-medium border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
                        <span>Reels (full video)</span><span className="opacity-75 text-[10px]">9:16 ↓</span>
                      </a>
                      {/* Publish button — always visible when video is ready */}
                      <button
                        onClick={publishPanelOpen ? () => setPublishPanelOpen(false) : openPublishPanel}
                        className="flex items-center justify-between w-full px-3 py-2 text-[12px] font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                          Publish to channels
                        </span>
                        <svg className={`w-3 h-3 opacity-80 transition-transform ${publishPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {/* Publish panel content — advanced mode */}
                  {publishPanelOpen && videoUrl && (
                    <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
                      <div className="p-2 space-y-2">
                      {CHANNELS.map(ch => {
                        const plat = channelPlatforms[ch] || { yt: false, ig: false, fb: false }
                        const anySelected = plat.yt || plat.ig || plat.fb
                        const igOk = !!metaConnected[ch]?.instagram
                        const fbOk = !!metaConnected[ch]?.facebook
                        const ytAlready = !!ytConnected[ch]
                        const ytEnabled = ch === 'Gentlemen of Fuel'
                        const yt = ytStatus[ch] || 'idle'
                        const meta = metaStatus[ch] || 'idle'
                        return (
                          <div key={ch} className="rounded-xl border border-stone-100 overflow-hidden">
                            <div className="flex items-center gap-3 px-3 py-2.5">
                              <span className="text-[12px] font-medium text-stone-800 min-w-0 flex-1">{ch}</span>
                              <div className="flex gap-1.5 shrink-0">
                                {ytEnabled && (
                                  <button
                                    onClick={() => setChannelPlatforms(p => ({ ...p, [ch]: { ...p[ch], yt: !plat.yt } }))}
                                    title={ytAlready ? 'YouTube — already connected, will upload directly' : 'YouTube — login required'}
                                    className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-colors ${plat.yt ? 'bg-red-50 text-red-600 border-red-300' : 'bg-stone-50 text-stone-400 border-stone-200 hover:border-stone-300'}`}
                                  >YT</button>
                                )}
                                <button
                                  onClick={() => setChannelPlatforms(p => ({ ...p, [ch]: { ...p[ch], ig: !plat.ig } }))}
                                  title={igOk ? 'Instagram' : 'Instagram — connect via Accounts page first'}
                                  className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-colors ${plat.ig ? 'bg-pink-50 text-pink-600 border-pink-300' : 'bg-stone-50 text-stone-400 border-stone-200 hover:border-stone-300'}`}
                                >IG</button>
                                <button
                                  onClick={() => setChannelPlatforms(p => ({ ...p, [ch]: { ...p[ch], fb: !plat.fb } }))}
                                  title={fbOk ? 'Facebook' : 'Facebook — connect via Accounts page first'}
                                  className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-colors ${plat.fb ? 'bg-blue-50 text-blue-600 border-blue-300' : 'bg-stone-50 text-stone-400 border-stone-200 hover:border-stone-300'}`}
                                >FB</button>
                              </div>
                            </div>
                            {anySelected && (
                              <div className="border-t border-stone-100 px-3 py-2.5 space-y-2 bg-stone-50">
                                <input
                                  value={publishMeta[ch]?.title || ''}
                                  onChange={e => setPublishMeta(p => ({ ...p, [ch]: { ...p[ch], title: e.target.value } }))}
                                  placeholder="Title"
                                  className="w-full px-2.5 py-1.5 text-[12px] border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300 bg-white"
                                />
                                <textarea
                                  value={publishMeta[ch]?.description || ''}
                                  onChange={e => setPublishMeta(p => ({ ...p, [ch]: { ...p[ch], description: e.target.value } }))}
                                  placeholder="Description"
                                  rows={2}
                                  className="w-full px-2.5 py-1.5 text-[12px] border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300 resize-none bg-white"
                                />
                                {/* YouTube tags always visible — useful for manual uploads even when YT publish is disabled */}
                                <input
                                  value={publishMeta[ch]?.ytTags || ''}
                                  onChange={e => setPublishMeta(p => ({ ...p, [ch]: { ...p[ch], ytTags: e.target.value } }))}
                                  placeholder="YouTube tags: formula1, f1, grand prix, ..."
                                  className="w-full px-2.5 py-1.5 text-[12px] border border-red-100 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-red-200 bg-white"
                                />
                                {plat.ig && (
                                  <input
                                    value={publishMeta[ch]?.igTags || ''}
                                    onChange={e => setPublishMeta(p => ({ ...p, [ch]: { ...p[ch], igTags: e.target.value } }))}
                                    placeholder="Instagram hashtags: #f1 #formula1 #motorsport"
                                    className="w-full px-2.5 py-1.5 text-[12px] border border-pink-100 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-pink-200 bg-white"
                                  />
                                )}
                                {/* YouTube upload action — GoF only */}
                                {plat.yt && (
                                  <div className="pt-0.5">
                                    {yt === 'done' ? (
                                      <a href={ytPublishedUrl[ch] || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[12px] text-emerald-600 font-medium">✓ YouTube uploaded ↗</a>
                                    ) : yt === 'uploading' ? (
                                      <span className="flex items-center gap-1.5 text-[12px] text-stone-500"><Spinner className="w-3.5 h-3.5" /> Uploading to YouTube...</span>
                                    ) : yt === 'connecting' ? (
                                      <span className="flex items-center gap-1.5 text-[12px] text-stone-500"><Spinner className="w-3.5 h-3.5" /> Logging in to YouTube...</span>
                                    ) : (
                                      <div>
                                        {yt === 'error' && <p className="text-[11px] text-red-500 mb-1.5">{ytError[ch]}</p>}
                                        <button
                                          onClick={() => ytAlready ? uploadToYouTube(ch) : loginAndUploadYouTube(ch)}
                                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                                        >
                                          {YT_ICON} {ytAlready ? 'Upload to YouTube' : 'Login & Upload'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {(plat.ig || plat.fb) && (
                                  <div className="text-[11px]">
                                    {meta === 'done' && <p className="text-emerald-600 font-medium">✓ Published to {[plat.ig && 'Instagram', plat.fb && 'Facebook'].filter(Boolean).join(' & ')}</p>}
                                    {meta === 'uploading' && <span className="flex items-center gap-1.5 text-stone-500"><Spinner className="w-3 h-3" /> Publishing to {[plat.ig && 'Instagram', plat.fb && 'Facebook'].filter(Boolean).join(' & ')}...</span>}
                                    {meta === 'error' && <p className="text-red-500">{metaError[ch]}</p>}
                                    {meta === 'idle' && <p className="text-stone-400">Will publish when you click Publish below</p>}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <button
                        onClick={handlePublishButton}
                        disabled={!CHANNELS.some(ch => channelPlatforms[ch]?.yt || channelPlatforms[ch]?.ig || channelPlatforms[ch]?.fb)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40">
                        {CHANNELS.some(ch => ytStatus[ch] === 'uploading' || metaStatus[ch] === 'uploading')
                          ? <><Spinner className="w-3 h-3" /> Publishing...</>
                          : 'Publish selected platforms'}
                      </button>
                      </div>
                    </div>
                  )}

                  {currentJobId && (
                    <div className="pt-1 border-t border-emerald-200">
                      <button onClick={createClips} disabled={clippingVideo} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-medium border border-emerald-400 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50">
                        {clippingVideo ? <><Spinner className="w-3 h-3" /> Creating chapter clips...</> : '✂ Create chapter clips (9:16)'}
                      </button>
                      {clips.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <p className="text-[10px] font-medium text-emerald-700">{clips.length} chapter clip{clips.length !== 1 ? 's' : ''} ready</p>
                          {clips.map((clip) => (
                            <div key={clip.chapterId} className="bg-white rounded-lg border border-stone-100 overflow-hidden">
                              {clip.thumbFile && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={`/api/clips/${clip.thumbFile}`} alt={clip.title} className="w-full aspect-square object-cover" />
                              )}
                              <div className="flex items-center justify-between px-2 py-1.5">
                                <span className="text-[11px] text-stone-600 truncate max-w-[130px]">{clip.title}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] text-stone-400">{clip.duration}s</span>
                                  <a href={`/api/clips/${clip.clipFile}`} download={clip.clipFile} className="text-emerald-600 hover:text-emerald-700 font-bold text-[13px]">↓</a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Info */}
              {script && (
                <div className="text-[11px] text-stone-400 space-y-0.5">
                  <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-1">Info</p>
                  <p>{script.chapters.length} chapters</p>
                  <p>{totalMedia} media files uploaded</p>
                  <p>{voiceoverCount} voiceovers generated</p>
                </div>
              )}
            </div>

            {/* Right panel — chapters */}
            <div className="flex-1 overflow-y-auto p-6">
              {!script ? (
                <div className="flex flex-col items-center justify-center h-full text-stone-400">
                  <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <p className="text-[13px] font-medium">No script yet</p>
                  <p className="text-[12px]">Enter a topic and click Generate story</p>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-stone-900 mb-2">{script.title}</h1>
                    <p className="text-[13px] text-stone-500">{script.summary}</p>
                  </div>

                  {script.chapters.map((chapter) => (
                    <div key={chapter.id} className="bg-white border border-stone-100 rounded-xl p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${chapterColor(chapter.type)}`}>{chapterLabel(chapter.type)}</span>
                        <h2 className="text-[15px] font-semibold text-stone-900">{chapter.title}</h2>
                      </div>

                      <p className="text-[13px] text-stone-700 leading-relaxed">{chapter.narration}</p>

                      {/* Voiceover */}
                      <div className="flex items-center gap-2">
                        {voiceoverStatus[chapter.id] === 'generating' ? (
                          <div className="flex items-center gap-2 text-[12px] text-violet-600">
                            <Spinner className="w-3 h-3" />
                            <span>Generating voiceover...</span>
                          </div>
                        ) : chapterAudio[chapter.id] ? (
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                            <audio src={chapterAudio[chapter.id]} controls className="h-8 flex-1 min-w-0" />
                            <button onClick={() => generateVoiceover(chapter.id, chapter.narration)} className="shrink-0 px-2 py-1 text-[10px] border border-stone-200 rounded-md hover:bg-stone-50 text-stone-500 transition-colors">Redo</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => testMode ? generateTestVoiceover(chapter.id) : generateVoiceover(chapter.id, chapter.narration)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${testMode ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-violet-100 text-violet-700 hover:bg-violet-200'}`}
                          >
                            <span className="text-[10px]">&#9835;</span> {testMode ? 'Use test audio' : 'Generate voiceover'}
                          </button>
                        )}
                      </div>

                      <div className="bg-stone-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-0.5">Visual</p>
                        <p className="text-[12px] text-stone-500">{chapter.visual}</p>
                      </div>

                      {/* AI Image Prompts */}
                      {showPromptsPanel && imagePrompts[chapter.id] && imagePrompts[chapter.id].length > 0 && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5">
                          <p className="text-[10px] font-medium text-indigo-600 uppercase tracking-widest mb-2">
                            {imagePrompts[chapter.id].length} image prompt{imagePrompts[chapter.id].length !== 1 ? 's' : ''}
                          </p>
                          <div className="space-y-3">
                            {imagePrompts[chapter.id].map((prompt, i) => (
                              <div key={i} className={i > 0 ? 'border-t border-indigo-100 pt-3' : ''}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-semibold text-indigo-500">Image {i + 1}</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => generateDalleForChapter(chapter.id, prompt, i)}
                                      disabled={generatingDalleFor[chapter.id]}
                                      title="Generate this image with DALL·E"
                                      className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium rounded transition-colors bg-violet-100 text-violet-700 hover:bg-violet-200 disabled:opacity-40"
                                    >
                                      {generatingDalleFor[chapter.id] && dallePromptIndex[chapter.id] === i ? <Spinner className="w-2.5 h-2.5" /> : '🎨'}
                                    </button>
                                    <button
                                      onClick={() => copyPrompt(chapter.id, i)}
                                      className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${copiedPromptKey === `${chapter.id}-${i}` ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                                    >
                                      {copiedPromptKey === `${chapter.id}-${i}` ? '✓' : '⎘'}
                                    </button>
                                  </div>
                                </div>
                                <p className="text-[12px] text-indigo-800 leading-relaxed">{prompt}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {showPromptsPanel && generatingPrompts && (!imagePrompts[chapter.id] || imagePrompts[chapter.id].length === 0) && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5 flex items-center gap-2">
                          <Spinner className="w-3 h-3 text-indigo-400" />
                          <p className="text-[11px] text-indigo-400">Generating image prompts…</p>
                        </div>
                      )}

                      {/* DALL-E image */}
                      {(dalleImages[chapter.id] || generatingDalleFor[chapter.id]) && (
                        <div className="rounded-xl overflow-hidden border border-violet-200 bg-violet-50">
                          {generatingDalleFor[chapter.id] ? (
                            <div className="flex items-center justify-center gap-2 py-10">
                              <Spinner className="w-4 h-4 text-violet-500" />
                              <p className="text-[12px] text-violet-600">Generating with DALL·E 3…</p>
                            </div>
                          ) : (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={dalleImages[chapter.id]} alt={chapter.title} className="w-full block" />
                              <div className="px-3 py-2 flex items-center justify-between">
                                <p className="text-[10px] text-violet-600 font-medium">DALL·E 3 · Added to media</p>
                                <button
                                  onClick={() => {
                                    const idx = dallePromptIndex[chapter.id] ?? 0
                                    const prompt = imagePrompts[chapter.id]?.[idx] || imagePrompts[chapter.id]?.[0]
                                    if (prompt) generateDalleForChapter(chapter.id, prompt, idx)
                                  }}
                                  className="text-[10px] text-violet-600 hover:text-violet-800 font-medium transition-colors"
                                >
                                  ↺ Regenerate
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Media upload */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); addMedia(chapter.id, e.dataTransfer.files) }}
                      >
                        <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-2">Media</p>
                        {(chapterMedia[chapter.id] || []).length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {(chapterMedia[chapter.id] || []).map((file, j) => (
                              <div key={j} className="relative group">
                                {file.type.startsWith('video/') ? (
                                  <video src={URL.createObjectURL(file)} className="w-16 h-16 rounded-lg object-cover" muted playsInline />
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={URL.createObjectURL(file)} alt="" className="w-16 h-16 rounded-lg object-cover" />
                                )}
                                <button onClick={() => removeMedia(chapter.id, j)} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                              </div>
                            ))}
                          </div>
                        )}
                        <label
                          className="flex flex-col items-center justify-center min-h-[100px] border-2 border-dashed border-stone-300 rounded-lg py-6 px-4 text-center cursor-pointer hover:bg-stone-50 transition-colors"
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('bg-emerald-50', 'border-emerald-400') }}
                          onDragLeave={(e) => e.currentTarget.classList.remove('bg-emerald-50', 'border-emerald-400')}
                          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('bg-emerald-50', 'border-emerald-400'); addMedia(chapter.id, e.dataTransfer.files) }}
                        >
                          <input type="file" accept="video/mp4,.mp4,video/quicktime,.mov,image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp" multiple className="hidden" onChange={(e) => addMedia(chapter.id, e.target.files)} />
                          <svg className="w-7 h-7 mb-2 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-[12px] text-stone-500">Drop images or video here</p>
                          <p className="text-[10px] text-stone-400 mt-0.5">MP4, MOV, JPG, PNG, WEBP</p>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-[12px] font-medium shadow-sm z-50 ${toast.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
            {toast.msg}
          </div>
        )}

        {/* Publish confirmation dialog */}
        {confirmPublishOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
              <h2 className="text-[15px] font-semibold text-stone-900 mb-1">Confirm publish</h2>
              <p className="text-[13px] text-stone-500 mb-4">
                This will publish to the selected platforms. YouTube uploads will each require a login popup.
                {CHANNELS.some(ch => channelPlatforms[ch]?.ig || channelPlatforms[ch]?.fb) && (
                  <> Instagram/Facebook posts cannot be undone from here.</>
                )}
              </p>
              <div className="mb-4 space-y-1">
                {CHANNELS.filter(ch => channelPlatforms[ch]?.yt || channelPlatforms[ch]?.ig || channelPlatforms[ch]?.fb).map(ch => {
                  const plat = channelPlatforms[ch]
                  const platforms = [plat.yt && 'YT', plat.ig && 'IG', plat.fb && 'FB'].filter(Boolean).join(' + ')
                  return (
                    <div key={ch} className="flex items-center justify-between text-[12px]">
                      <span className="text-stone-700 font-medium truncate">{ch}</span>
                      <span className="text-stone-400 shrink-0 ml-2">{platforms}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmPublishOpen(false)}
                  className="flex-1 px-4 py-2 text-[13px] font-medium border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 transition-colors"
                >Cancel</button>
                <button
                  onClick={executePublish}
                  className="flex-1 px-4 py-2 text-[13px] font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                >Publish now</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/Sidebar'

type Chapter = { id: number; title: string; type: string; narration: string; visual: string }
type Script = { title: string; summary: string; chapters: Chapter[] }

const CHANNELS = ['Gentlemen of Fuel', 'Omnira F1', 'Road & Trax', 'Omnira Football', 'Omnira Cricket', 'Omnira Golf', 'Omnira NFL', 'Omnira Food', 'Omnira Travel']
const CALM_CHANNELS = ['Omnira Food', 'Omnira Travel']

const VOICES = [
  { id: 'v1Oa3bMmaLK6LwTzVkOy', label: 'Peter — BBC Type' },
  { id: 'P9S3WZL3JE8uQqgYH5B7', label: 'James — Softer UK' },
  { id: 'B9PDs7mcHTMxHUw5U8Cf', label: 'Holly — Soft UK' },
  { id: 'yl2ZDV1MzN4HbQJbMihG', label: 'Alex — Energy USA' },
  { id: 'gnPxliFHTp6OK6tcoA6i', label: 'Sam — Sports USA' },
]

const Spinner = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
  </svg>
)

export default function LongFormPage() {
  const [topic, setTopic] = useState('')
  const [channel, setChannel] = useState(CHANNELS[0])
  const [script, setScript] = useState<Script | null>(null)
  const [generating, setGenerating] = useState(false)
  const [chapterMedia, setChapterMedia] = useState<Record<number, File[]>>({})
  const [assembling, setAssembling] = useState(false)
  const [assemblyProgress, setAssemblyProgress] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type?: 'error' | 'success' } | null>(null)
  const [chapterAudio, setChapterAudio] = useState<Record<number, string>>({}) // chapterId -> base64 data URL
  const [voiceoverStatus, setVoiceoverStatus] = useState<Record<number, 'generating' | 'ready'>>({})
  const [generatingAllVoiceovers, setGeneratingAllVoiceovers] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [testDuration, setTestDuration] = useState<10 | 30>(10)
  const [musicMood, setMusicMood] = useState<'calm' | 'energy'>('energy')
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [clippingVideo, setClippingVideo] = useState(false)
  const [clips, setClips] = useState<{ chapterId: number; title: string; duration: number; clipFile: string; thumbFile: string }[]>([])
  const [draftSaved, setDraftSaved] = useState(false)
  const [isRestored, setIsRestored] = useState(false)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // AI image prompts — keyed by chapterId, value is array of scene prompts
  const [imagePrompts, setImagePrompts] = useState<Record<number, string[]>>({})
  const [promptTitles, setPromptTitles] = useState<Record<number, string>>({})
  const [generatingPrompts, setGeneratingPrompts] = useState(false)
  const [copiedPromptKey, setCopiedPromptKey] = useState<string | null>(null) // "{chapterId}-{index}"
  const [showPromptsPanel, setShowPromptsPanel] = useState(false)

  // DALL-E generated images — chapterId → data URL (also injected into chapterMedia)
  const [dalleImages, setDalleImages] = useState<Record<number, string>>({})
  const [generatingDalleFor, setGeneratingDalleFor] = useState<Record<number, boolean>>({})
  const [dalleProgress, setDalleProgress] = useState<{ done: number; total: number } | null>(null)
  const [dallePromptIndex, setDallePromptIndex] = useState<Record<number, number>>({})


  const DRAFT_KEY = 'draft_longvideo'

  // Restore draft on mount
  useEffect(() => {
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
    setIsRestored(true)
  }, [])

  // Save draft when state changes (only after restore)
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

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const generateTestAudio = (durationSeconds: number): string => {
    // Use low sample rate to keep file small and avoid base64 encoding issues
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
    view.setUint32(16, 16, true)       // PCM format chunk size
    view.setUint16(20, 1, true)        // AudioFormat: PCM
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitsPerSample, true)
    writeStr(36, 'data')
    view.setUint32(40, dataSize, true)
    // Data bytes are all zero = silence
    // Convert to base64 via Blob + FileReader workaround for large buffers
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

  // ─── Script generation ───
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

  // ─── Video assembly ───
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

      // Send chapter audio files so the backend can sync image timing to voiceover duration
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

      // Send music mood — server picks a random track from Drive
      formData.append('musicMood', musicMood)
      formData.append('musicVolume', '0.15')

      const startRes = await fetch('/api/story-video/start', { method: 'POST', body: formData })
      const startData = await startRes.json()
      if (!startRes.ok) throw new Error(startData.error)

      setAssemblyProgress('Rendering video...')

      // Poll for completion
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
      showToast(`Video ready — ${Math.round(result.duration)}s`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error assembling video', 'error')
    } finally {
      setAssembling(false)
      setAssemblyProgress('')
    }
  }

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
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
    showToast('Draft cleared')
  }

  const downloadVideo = () => {
    if (!videoUrl) return
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = `${channel.replace(/\s+/g, '_')}_story.mp4`
    a.click()
  }

  // ─── DALL-E image generation ───

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

      // Auto-assign to chapter media (replaces any previous dalle_ file, prepends to list)
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

  // ─── Create chapter clips ───
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

  // ─── Voiceover generation ───
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
    // Collect audio blobs in chapter order
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

  // ─── AI image prompts ───
  const generateImagePrompts = async () => {
    if (!script) return
    setGeneratingPrompts(true)
    setShowPromptsPanel(true)
    try {
      const res = await fetch('/api/story-image-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapters: script.chapters,
          channel,
          topic,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const promptMap: Record<number, string[]> = {}
      const titleMap: Record<number, string> = {}
      for (const item of data.prompts) {
        promptMap[item.chapterId] = item.prompts  // array of scene prompts
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
    navigator.clipboard.writeText(all).then(() => {
      showToast('All prompts copied to clipboard!')
    })
  }

  const voiceoverCount = Object.keys(chapterAudio).length
  const allVoiceoversReady = script ? voiceoverCount === script.chapters.length : false

  // ─── Computed ───
  const hasAnyMedia = Object.values(chapterMedia).some(f => f.length > 0)
  const totalMedia = Object.values(chapterMedia).reduce((s, f) => s + f.length, 0)
  const chapterLabel = (type: string) => type === 'intro' ? 'INTRO' : type === 'outro' ? 'OUTRO' : 'CHAPTER'
  const chapterColor = (type: string) => type === 'intro' ? 'bg-blue-100 text-blue-700' : type === 'outro' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <div className="h-12 bg-white border-b border-stone-100 flex items-center justify-between px-5 pl-14 md:pl-5 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-medium text-stone-900">Long form story</span>
            <button
              onClick={() => setTestMode(prev => !prev)}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                testMode
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${testMode ? 'bg-amber-500' : 'bg-stone-300'}`} />
              Test mode
            </button>
            {testMode && (
              <>
                <select
                  value={testDuration}
                  onChange={(e) => setTestDuration(Number(e.target.value) as 10 | 30)}
                  className="hidden md:block text-[11px] border border-amber-300 rounded-lg px-2 py-1 bg-amber-50 text-amber-800 focus:outline-none"
                >
                  <option value={10}>10s</option>
                  <option value={30}>30s</option>
                </select>
                <span className="hidden md:inline text-[11px] text-amber-600 font-medium">Test mode — no ElevenLabs charges</span>
              </>
            )}
            {draftSaved && (
              <span className="hidden md:inline text-[11px] text-stone-400">Draft saved</span>
            )}
          </div>
          <div className="flex gap-2">
            {(topic || script) && (
              <button
                onClick={clearDraft}
                className="px-3 py-2 min-h-[44px] text-[13px] font-medium border border-stone-200 text-stone-500 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Clear draft
              </button>
            )}
            {videoUrl && (
              <a
                href={`${videoUrl}?format=youtube`}
                download="story_youtube_16x9.mp4"
                className="px-3 py-2 min-h-[44px] text-[13px] font-medium border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors flex items-center"
              >
                ↓ Download Video
              </a>
            )}
          </div>
        </div>

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
                      onChange={(e) => {
                        setSelectedVoice(e.target.value)
                        setChapterAudio({})
                        setVoiceoverStatus({})
                      }}
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
                  <button
                    onClick={downloadCombinedAudio}
                    className="w-full px-3 py-2 text-[12px] font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    &#8595; Download combined audio
                  </button>
                )}
              </div>
            )}

            {/* Background music */}
            {script && (
              <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">Background music</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMusicMood('calm')}
                    className={`flex-1 py-2 text-[12px] font-medium rounded-lg border transition-colors ${
                      musicMood === 'calm'
                        ? 'bg-sky-100 text-sky-700 border-sky-300'
                        : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    Calm
                  </button>
                  <button
                    onClick={() => setMusicMood('energy')}
                    className={`flex-1 py-2 text-[12px] font-medium rounded-lg border transition-colors ${
                      musicMood === 'energy'
                        ? 'bg-amber-100 text-amber-700 border-amber-300'
                        : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    Energy
                  </button>
                </div>
                <p className="text-[10px] text-stone-400">Track auto-selected from library</p>
              </div>
            )}

            {/* AI Image Prompts */}
            {script && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium text-indigo-700 uppercase tracking-widest">AI Image Prompts</p>
                  {Object.keys(imagePrompts).length > 0 && (
                    <button
                      onClick={() => setShowPromptsPanel(p => !p)}
                      className="text-[10px] text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      {showPromptsPanel ? 'Hide' : 'Show'}
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-indigo-500 leading-relaxed">
                  Generate one detailed image prompt per chapter — ready to paste into Midjourney or ChatGPT.
                </p>
                <button
                  onClick={generateImagePrompts}
                  disabled={generatingPrompts}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-[13px] font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {generatingPrompts ? (
                    <><Spinner /> Generating prompts...</>
                  ) : (
                    <><span className="text-[11px]">✦</span> {Object.keys(imagePrompts).length > 0 ? 'Regenerate prompts' : 'Generate image prompts'}</>
                  )}
                </button>
                {Object.keys(imagePrompts).length > 0 && (
                  <button
                    onClick={copyAllPrompts}
                    className="w-full px-3 py-2 text-[12px] font-medium bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    ⎘ Copy all prompts
                  </button>
                )}
                {Object.keys(imagePrompts).length > 0 && (() => {
                  const total = Object.values(imagePrompts).reduce((s, arr) => s + arr.length, 0)
                  return <p className="text-[10px] text-indigo-500">{total} prompts across {Object.keys(imagePrompts).length} chapters</p>
                })()}

                {/* DALL-E auto-generate */}
                {Object.keys(imagePrompts).length > 0 && (
                  <div className="pt-2 border-t border-indigo-200 flex flex-col gap-2">
                    <button
                      onClick={generateAllDalle}
                      disabled={!!dalleProgress || generatingPrompts || Object.values(generatingDalleFor).some(Boolean)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-[13px] font-medium rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50"
                    >
                      {dalleProgress ? (
                        <><Spinner /> {dalleProgress.done}/{dalleProgress.total} generating…</>
                      ) : (
                        <>🎨 Auto-generate with DALL·E</>
                      )}
                    </button>
                    {dalleProgress && (
                      <div className="w-full bg-violet-100 rounded-full h-1.5">
                        <div
                          className="bg-violet-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.round((dalleProgress.done / dalleProgress.total) * 100)}%` }}
                        />
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
                    <a
                      href={`${videoUrl}?format=youtube`}
                      download="story_youtube_16x9.mp4"
                      className="flex items-center justify-between w-full px-3 py-2 text-[12px] font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <span>YouTube</span><span className="opacity-75 text-[10px]">16:9 ↓</span>
                    </a>
                    <a
                      href={`${videoUrl}?format=square`}
                      download="story_instagram_square.mp4"
                      className="flex items-center justify-between w-full px-3 py-2 text-[12px] font-medium border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      <span>Instagram Square</span><span className="opacity-75 text-[10px]">1:1 ↓</span>
                    </a>
                    <a
                      href={`${videoUrl}?format=reels`}
                      download="story_instagram_reels.mp4"
                      className="flex items-center justify-between w-full px-3 py-2 text-[12px] font-medium border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      <span>Reels (full video)</span><span className="opacity-75 text-[10px]">9:16 ↓</span>
                    </a>
                  </div>
                )}

                {/* Chapter clips section */}
                {currentJobId && (
                  <div className="pt-1 border-t border-emerald-200">
                    <button
                      onClick={createClips}
                      disabled={clippingVideo}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-medium border border-emerald-400 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
                    >
                      {clippingVideo ? <><Spinner className="w-3 h-3" /> Creating chapter clips...</> : '✂ Create chapter clips (9:16)'}
                    </button>
                    {clips.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <p className="text-[10px] font-medium text-emerald-700">{clips.length} chapter clip{clips.length !== 1 ? 's' : ''} ready</p>
                        {clips.map((clip) => (
                          <div key={clip.chapterId} className="bg-white rounded-lg border border-stone-100 overflow-hidden">
                            {clip.thumbFile && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`/api/clips/${clip.thumbFile}`}
                                alt={clip.title}
                                className="w-full aspect-square object-cover"
                              />
                            )}
                            <div className="flex items-center justify-between px-2 py-1.5">
                              <span className="text-[11px] text-stone-600 truncate max-w-[130px]">{clip.title}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-stone-400">{clip.duration}s</span>
                                <a
                                  href={`/api/clips/${clip.clipFile}`}
                                  download={clip.clipFile}
                                  className="text-emerald-600 hover:text-emerald-700 font-bold text-[13px]"
                                >
                                  ↓
                                </a>
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
                          <audio src={chapterAudio[chapter.id]} controls className="h-8 flex-1 min-w-0" />
                          <button
                            onClick={() => generateVoiceover(chapter.id, chapter.narration)}
                            className="shrink-0 px-2 py-1 text-[10px] border border-stone-200 rounded-md hover:bg-stone-50 text-stone-500 transition-colors"
                          >
                            Redo
                          </button>
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

                    {/* AI Image Prompts — grouped by chapter, numbered per scene */}
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
                                    className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                                      copiedPromptKey === `${chapter.id}-${i}`
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                    }`}
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

                    {/* DALL-E generated image */}
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
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-[12px] font-medium shadow-sm z-50 ${toast.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

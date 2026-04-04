'use client'
import { useState, useRef } from 'react'
import Sidebar from '@/components/Sidebar'

type Chapter = { id: number; title: string; type: 'intro' | 'chapter' | 'outro'; narration: string; visual: string; audio?: string }
type Script = { title: string; summary: string; totalWordCount: number; estimatedDuration: string; chapters: Chapter[] }
type ChapterTimestamp = { chapterId: number; startTime: number; endTime: number }

const CHANNELS = ['Gentlemen of Fuel', 'Omnira F1', 'Road & Trax', 'Omnira Football']

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
  const [generatingAudio, setGeneratingAudio] = useState<Record<number, boolean>>({})
  const [generatingAll, setGeneratingAll] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [testAudioDuration, setTestAudioDuration] = useState(10)
  const [toast, setToast] = useState<{ msg: string; type?: 'error' | 'success' } | null>(null)
  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({})

  // Media & assembly
  const [chapterImages, setChapterImages] = useState<Record<number, File[]>>({})
  const [bgMusic, setBgMusic] = useState<string | null>(null)
  const [bgMusicName, setBgMusicName] = useState('')
  const [musicVolume, setMusicVolume] = useState(0.15)
  const [assembling, setAssembling] = useState(false)
  const [assemblyProgress, setAssemblyProgress] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [chapterTimestamps, setChapterTimestamps] = useState<ChapterTimestamp[]>([])

  // Publish
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [publishDescription, setPublishDescription] = useState('')
  const [publishPlatforms, setPublishPlatforms] = useState<string[]>(['youtube', 'facebook'])
  const [publishing, setPublishing] = useState(false)

  const bgMusicInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
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
      showToast('Script generated!')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error generating script', 'error')
    } finally {
      setGenerating(false)
    }
  }

  // ─── Silent test audio ───
  const generateSilentAudio = (durationSec: number): string => {
    const sampleRate = 22050
    const numSamples = sampleRate * durationSec
    const dataSize = numSamples * 2
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)
    const writeStr = (offset: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)) }
    writeStr(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); writeStr(8, 'WAVE')
    writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
    view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
    writeStr(36, 'data'); view.setUint32(40, dataSize, true)
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return `data:audio/wav;base64,${btoa(binary)}`
  }

  // ─── Voiceover ───
  const generateVoiceover = async (chapterIndex: number) => {
    if (!script) return
    const chapter = script.chapters[chapterIndex]
    if (!chapter) return
    setGeneratingAudio(prev => ({ ...prev, [chapterIndex]: true }))
    try {
      let audioDataUrl: string
      if (testMode) {
        audioDataUrl = generateSilentAudio(testAudioDuration)
      } else {
        const res = await fetch('/api/story-voiceover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: chapter.narration }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        audioDataUrl = data.audio
      }
      setScript(prev => {
        if (!prev) return prev
        const updated = { ...prev, chapters: [...prev.chapters] }
        updated.chapters[chapterIndex] = { ...updated.chapters[chapterIndex], audio: audioDataUrl }
        return updated
      })
      showToast(`Chapter ${chapter.id} ${testMode ? 'test audio' : 'voiceover'} ready`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setGeneratingAudio(prev => ({ ...prev, [chapterIndex]: false }))
    }
  }

  const generateAllVoiceovers = async () => {
    if (!script) return
    setGeneratingAll(true)
    for (let i = 0; i < script.chapters.length; i++) {
      if (!script.chapters[i].audio) await generateVoiceover(i)
    }
    setGeneratingAll(false)
    showToast('All audio complete!')
  }

  // ─── Media upload ───
  const handleChapterMedia = (chapterId: number, files: FileList | null) => {
    if (!files || files.length === 0) return
    setChapterImages(prev => ({ ...prev, [chapterId]: [...(prev[chapterId] || []), ...Array.from(files)] }))
    showToast(`${files.length} file${files.length > 1 ? 's' : ''} added`)
  }

  const removeChapterMedia = (chapterId: number, index: number) => {
    setChapterImages(prev => ({ ...prev, [chapterId]: (prev[chapterId] || []).filter((_, i) => i !== index) }))
  }

  const handleBgMusic = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { setBgMusic(ev.target?.result as string); setBgMusicName(file.name); showToast(`Music: ${file.name}`) }
    reader.readAsDataURL(file)
  }

  // ─── Video assembly ───
  const assembleVideo = async () => {
    if (!script) return
    setAssembling(true)
    setAssemblyProgress('Uploading media...')
    setVideoUrl(null)
    try {
      const chaptersPayload = script.chapters.map(ch => ({ id: ch.id, title: ch.title, narration: ch.narration, visual: ch.visual, audioBase64: ch.audio || '' }))
      const formData = new FormData()
      formData.append('chapters', JSON.stringify(chaptersPayload))
      formData.append('musicVolume', String(musicVolume))
      for (const [chIdStr, files] of Object.entries(chapterImages)) {
        for (const file of files) {
          formData.append('media', file, `ch${chIdStr}_${file.name}`)
          formData.append('mediaChapterIds', chIdStr)
        }
      }
      if (bgMusic) {
        const bgRes = await fetch(bgMusic)
        const bgBlob = await bgRes.blob()
        formData.append('bgMusic', bgBlob, 'bg_music.mp3')
      }
      const startRes = await fetch('/api/story-video/start', { method: 'POST', body: formData })
      const startData = await startRes.json()
      if (!startRes.ok) throw new Error(startData.error)

      setAssemblyProgress('Rendering video...')
      const result = await new Promise<{ downloadUrl: string; duration: number; chapterTimestamps: ChapterTimestamp[] }>((resolve, reject) => {
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
      setVideoUrl(result.downloadUrl)
      setChapterTimestamps(result.chapterTimestamps || [])
      showToast(`Video ready — ${Math.round(result.duration)}s`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setAssembling(false)
      setAssemblyProgress('')
    }
  }

  // ─── Download & Publish ───
  const downloadVideo = () => {
    if (!videoUrl) return
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = `${channel.replace(/\s+/g, '_')}_story.mp4`
    a.click()
  }

  const publishVideo = async () => {
    if (!videoUrl || !script) return
    setPublishing(true)
    try {
      const videoRes = await fetch(videoUrl)
      const videoBlob = await videoRes.blob()
      const formData = new FormData()
      formData.append('video', videoBlob, 'story_video.mp4')
      formData.append('content', publishDescription || script.summary || '')
      formData.append('platforms', JSON.stringify(publishPlatforms))
      formData.append('title', script.title || '')
      if (thumbnail) formData.append('thumbnail', thumbnail, thumbnail.name)
      const res = await fetch('/api/publish-longform', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('Published successfully!')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error publishing', 'error')
    } finally {
      setPublishing(false)
    }
  }

  // ─── Computed ───
  const allAudioReady = script?.chapters.every(c => c.audio) ?? false
  const hasAnyMedia = Object.values(chapterImages).some(f => f.length > 0)
  const canAssemble = allAudioReady && hasAnyMedia
  const chapterLabel = (type: string) => type === 'intro' ? 'INTRO' : type === 'outro' ? 'OUTRO' : 'CHAPTER'
  const chapterColor = (type: string) => type === 'intro' ? 'bg-blue-100 text-blue-700' : type === 'outro' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <div className="h-12 bg-white border-b border-stone-100 flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-medium text-stone-900">Long form story</span>
            <label className={`flex items-center gap-2 px-2.5 py-1 rounded-lg cursor-pointer text-[11px] font-medium transition-colors ${testMode ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}>
              <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} className="sr-only" />
              <div className={`w-7 h-4 rounded-full relative transition-colors ${testMode ? 'bg-amber-500' : 'bg-stone-300'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${testMode ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
              </div>
              {testMode ? 'Test mode — no ElevenLabs charges' : 'Test mode'}
            </label>
          </div>
          <div className="flex gap-2">
            {videoUrl && (
              <button onClick={downloadVideo} className="px-3 py-1.5 text-[12px] font-medium border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
                16:9 Video
              </button>
            )}
          </div>
        </div>

        <input ref={bgMusicInputRef} type="file" accept="audio/mpeg,.mp3,audio/wav,.wav,audio/aac,.aac" className="hidden" onChange={(e) => handleBgMusic(e.target.files?.[0] || null)} />
        <input ref={thumbnailInputRef} type="file" accept="image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setThumbnail(f); setThumbnailPreview(URL.createObjectURL(f)); showToast(`Thumbnail: ${f.name}`) } }} />

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <div className="w-72 border-r border-stone-100 overflow-y-auto p-5 flex flex-col gap-4 shrink-0">
            {/* Topic */}
            <div>
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Story topic</p>
              <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. The untold story of the 1966 Le Mans rivalry" className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-[13px] resize-none focus:outline-none focus:ring-1 focus:ring-stone-400" rows={3} />
            </div>

            {/* Channel */}
            <div>
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Channel</p>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-stone-400">
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button onClick={generateScript} disabled={generating} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 text-white text-[13px] font-medium rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50">
              {generating ? <><Spinner /> Writing script...</> : <><span className="text-[11px]">&#x270E;</span> Generate story</>}
            </button>

            {/* Voiceover */}
            {script && (
              <div className={`${testMode ? 'bg-amber-50 border-amber-200' : 'bg-purple-50 border-purple-200'} border rounded-xl p-4 flex flex-col gap-3`}>
                <p className={`text-[10px] font-medium uppercase tracking-widest ${testMode ? 'text-amber-700' : 'text-purple-700'}`}>{testMode ? 'Test Audio' : 'Voiceover'}</p>
                {testMode && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-amber-600">Duration:</span>
                    {[10, 30].map(d => (
                      <button key={d} onClick={() => setTestAudioDuration(d)} className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-colors ${testAudioDuration === d ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>{d}s</button>
                    ))}
                  </div>
                )}
                <button onClick={generateAllVoiceovers} disabled={generatingAll || allAudioReady} className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50 ${testMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                  {generatingAll ? <><Spinner /> {testMode ? 'Adding test audio...' : 'Generating all...'}</> : allAudioReady ? 'All audio ready' : testMode ? `Use test audio — ${testAudioDuration}s (all)` : 'Generate full voiceover'}
                </button>
                <p className={`text-[10px] ${testMode ? 'text-amber-500' : 'text-purple-500'}`}>{script.chapters.filter(c => c.audio).length} / {script.chapters.length} chapters recorded</p>
              </div>
            )}

            {/* Background music */}
            {script && (
              <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">Background music</p>
                <button onClick={() => bgMusicInputRef.current?.click()} className="w-full px-3 py-2 text-[12px] border border-stone-200 rounded-lg hover:bg-white transition-colors text-stone-600 text-left">
                  {bgMusicName || '+ Add music track (optional)'}
                </button>
                {bgMusic && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-400">Volume:</span>
                    <input type="range" min="0" max="0.5" step="0.05" value={musicVolume} onChange={(e) => setMusicVolume(parseFloat(e.target.value))} className="flex-1 h-1 accent-stone-600" />
                    <span className="text-[10px] text-stone-500 w-8">{Math.round(musicVolume * 100)}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Video assembly */}
            {script && allAudioReady && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-widest">Video assembly</p>
                <button onClick={assembleVideo} disabled={assembling || !canAssemble} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-[13px] font-medium rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50">
                  {assembling ? <><Spinner /> Assembling...</> : !hasAnyMedia ? 'Upload images first' : <><span className="text-[11px]">&#9654;</span> Assemble video</>}
                </button>
                {assembling && assemblyProgress && <p className="text-[10px] text-emerald-600">{assemblyProgress}</p>}
                {!hasAnyMedia && <p className="text-[10px] text-emerald-500">Add images to chapters below to enable</p>}
                {videoUrl && (
                  <button onClick={downloadVideo} className="w-full px-3 py-2 text-[12px] font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                    &#8595; Download 16:9 (YouTube)
                  </button>
                )}
              </div>
            )}

            {/* Publish */}
            {videoUrl && (
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-[10px] font-medium text-sky-700 uppercase tracking-widest">Publish</p>
                <div>
                  <p className="text-[11px] text-sky-600 mb-1.5">Thumbnail</p>
                  {thumbnailPreview ? (
                    <div className="relative">
                      <img src={thumbnailPreview} alt="" className="w-full rounded-lg object-cover aspect-video" />
                      <button onClick={() => { setThumbnail(null); setThumbnailPreview(null) }} className="absolute top-1 right-1 w-5 h-5 bg-stone-900 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600">x</button>
                    </div>
                  ) : (
                    <button onClick={() => thumbnailInputRef.current?.click()} className="w-full px-3 py-2 text-[12px] border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors text-sky-600">+ Set thumbnail</button>
                  )}
                </div>
                <div>
                  <p className="text-[11px] text-sky-600 mb-1.5">Description</p>
                  <textarea value={publishDescription} onChange={(e) => setPublishDescription(e.target.value)} placeholder={script?.summary || 'Write a description...'} className="w-full px-3 py-2 text-[12px] border border-sky-200 rounded-lg bg-white resize-none focus:outline-none focus:ring-1 focus:ring-sky-400" rows={3} />
                </div>
                <div>
                  <p className="text-[11px] text-sky-600 mb-1.5">Platforms</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['youtube', 'facebook', 'instagram', 'tiktok'].map(p => (
                      <button key={p} onClick={() => setPublishPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-colors ${publishPlatforms.includes(p) ? 'bg-sky-600 text-white' : 'bg-sky-100 text-sky-600 hover:bg-sky-200'}`}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={publishVideo} disabled={publishing || publishPlatforms.length === 0} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 text-white text-[13px] font-medium rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50">
                  {publishing ? <><Spinner /> Publishing...</> : `Publish to ${publishPlatforms.length} platform${publishPlatforms.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            )}

            {/* Script info */}
            {script && (
              <div className="text-[11px] text-stone-400 space-y-0.5">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-1">Script info</p>
                <p>{script.totalWordCount} words</p>
                <p>~{script.estimatedDuration} min read</p>
                <p>{script.chapters.length} chapters</p>
                <p>{Object.values(chapterImages).reduce((s, f) => s + f.length, 0)} media uploaded</p>
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

                {script.chapters.map((chapter, i) => (
                  <div key={chapter.id} className="bg-white border border-stone-100 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${chapterColor(chapter.type)}`}>{chapterLabel(chapter.type)}</span>
                      <h2 className="text-[15px] font-semibold text-stone-900">{chapter.title}</h2>
                    </div>
                    <p className="text-[13px] text-stone-700 leading-relaxed">{chapter.narration}</p>
                    <div className="bg-stone-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-0.5">Visual</p>
                      <p className="text-[12px] text-stone-500">{chapter.visual}</p>
                    </div>

                    {/* Media upload */}
                    <div className="rounded-lg p-3" onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleChapterMedia(chapter.id, e.dataTransfer.files) }}>
                      <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-2">Media</p>
                      {(chapterImages[chapter.id] || []).length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(chapterImages[chapter.id] || []).map((file, j) => (
                            <div key={j} className="relative group">
                              {file.type.startsWith('video/') ? (
                                <video src={URL.createObjectURL(file)} className="w-16 h-16 rounded-lg object-cover" muted playsInline />
                              ) : (
                                <img src={URL.createObjectURL(file)} alt="" className="w-16 h-16 rounded-lg object-cover" />
                              )}
                              <button onClick={() => removeChapterMedia(chapter.id, j)} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <label
                        className="flex flex-col items-center justify-center min-h-[100px] border-2 border-dashed border-stone-300 rounded-lg py-6 px-4 text-center cursor-pointer hover:bg-stone-50 transition-colors"
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('bg-emerald-50', 'border-emerald-400') }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove('bg-emerald-50', 'border-emerald-400') }}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('bg-emerald-50', 'border-emerald-400'); handleChapterMedia(chapter.id, e.dataTransfer.files) }}
                      >
                        <input type="file" accept="video/mp4,.mp4,video/quicktime,.mov,video/webm,.webm,image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp" multiple className="hidden" onChange={(e) => handleChapterMedia(chapter.id, e.target.files)} />
                        <svg className="w-7 h-7 mb-2 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-[12px] text-stone-500">Drop images or video here</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">MP4, MOV, JPG, PNG, WEBP</p>
                      </label>
                    </div>

                    {/* Audio controls */}
                    <div className="flex items-center gap-2 pt-1">
                      {chapter.audio ? (
                        <div className="flex items-center gap-2 flex-1">
                          <audio ref={el => { audioRefs.current[i] = el }} src={chapter.audio} controls className="flex-1 h-8" style={{ maxWidth: '100%' }} />
                          <button onClick={() => generateVoiceover(i)} disabled={generatingAudio[i]} className="px-2.5 py-1.5 text-[11px] border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-stone-500 shrink-0">Redo</button>
                        </div>
                      ) : (
                        <button onClick={() => generateVoiceover(i)} disabled={generatingAudio[i] || generatingAll} className={`flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${testMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                          {generatingAudio[i] ? <><Spinner className="w-3 h-3" /> {testMode ? 'Adding...' : 'Generating...'}</> : testMode ? '&#9654; Use test audio' : <>&#9654; Generate voiceover</>}
                        </button>
                      )}
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

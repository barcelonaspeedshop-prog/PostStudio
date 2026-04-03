'use client'
import { useState, useRef } from 'react'
import Sidebar from '@/components/Sidebar'

type Chapter = {
  id: number
  title: string
  type: 'intro' | 'chapter' | 'outro'
  narration: string
  visual: string
  audio?: string // base64 data URL
}

type Script = {
  title: string
  summary: string
  totalWordCount: number
  estimatedDuration: string
  chapters: Chapter[]
}

type ChapterTimestamp = {
  chapterId: number
  startTime: number
  endTime: number
}

type Short = {
  chapterId: number
  title: string
  video: string
  duration: number
}

const CHANNELS = [
  'Gentlemen of Fuel',
  'Omnira F1',
  'Road & Trax',
  'Omnira Football',
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
  const [generatingAudio, setGeneratingAudio] = useState<Record<number, boolean>>({})
  const [generatingAll, setGeneratingAll] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type?: 'error' | 'success' } | null>(null)
  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({})

  // Video assembly state
  const [chapterImages, setChapterImages] = useState<Record<number, string[]>>({})
  const [bgMusic, setBgMusic] = useState<string | null>(null)
  const [bgMusicName, setBgMusicName] = useState('')
  const [musicVolume, setMusicVolume] = useState(0.15)
  const [assembling, setAssembling] = useState(false)
  const [assemblyProgress, setAssemblyProgress] = useState('')
  const [landscapeVideo, setLandscapeVideo] = useState<string | null>(null)
  const [portraitVideo, setPortraitVideo] = useState<string | null>(null)
  const [chapterTimestamps, setChapterTimestamps] = useState<ChapterTimestamp[]>([])
  const [cuttingShorts, setCuttingShorts] = useState(false)
  const [shorts, setShorts] = useState<Short[]>([])
  const bgMusicInputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  // --- Script generation ---
  const generateScript = async () => {
    if (!topic.trim()) { showToast('Enter a topic first', 'error'); return }
    setGenerating(true)
    setScript(null)
    setChapterImages({})
    setLandscapeVideo(null)
    setPortraitVideo(null)
    setShorts([])
    try {
      const res = await fetch('/api/story-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, channel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setScript(data.script)
      showToast(`Script ready — ${data.script.estimatedDuration} min`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error generating script', 'error')
    } finally {
      setGenerating(false)
    }
  }

  // --- Voiceover ---
  const generateVoiceover = async (chapterIndex: number) => {
    if (!script) return
    const chapter = script.chapters[chapterIndex]
    if (!chapter) return

    setGeneratingAudio(prev => ({ ...prev, [chapterIndex]: true }))
    try {
      const res = await fetch('/api/story-voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chapter.narration, voiceId: 'P9S3WZL3JE8uQqgYH5B7' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setScript(prev => {
        if (!prev) return prev
        const updated = { ...prev, chapters: [...prev.chapters] }
        updated.chapters[chapterIndex] = { ...updated.chapters[chapterIndex], audio: data.audio }
        return updated
      })
      showToast(`Chapter ${chapter.id} voiceover ready`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error generating voiceover', 'error')
    } finally {
      setGeneratingAudio(prev => ({ ...prev, [chapterIndex]: false }))
    }
  }

  const generateAllVoiceovers = async () => {
    if (!script) return
    setGeneratingAll(true)
    showToast('Generating all voiceovers...')
    for (let i = 0; i < script.chapters.length; i++) {
      if (!script.chapters[i].audio) {
        await generateVoiceover(i)
      }
    }
    setGeneratingAll(false)
    showToast('All voiceovers complete!')
  }

  const downloadFullAudio = () => {
    if (!script) return
    const allAudio = script.chapters.filter(c => c.audio).map(c => c.audio!)
    if (allAudio.length === 0) { showToast('Generate voiceovers first', 'error'); return }
    const combineParts = async () => {
      const parts: ArrayBuffer[] = []
      for (const dataUrl of allAudio) {
        const b64 = dataUrl.split(',')[1]
        const binary = atob(b64)
        const buf = new ArrayBuffer(binary.length)
        const view = new Uint8Array(buf)
        for (let j = 0; j < binary.length; j++) view[j] = binary.charCodeAt(j)
        parts.push(buf)
      }
      const totalLen = parts.reduce((s, p) => s + p.byteLength, 0)
      const combined = new Uint8Array(totalLen)
      let offset = 0
      for (const p of parts) { combined.set(new Uint8Array(p), offset); offset += p.byteLength }
      const blob = new Blob([combined], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${channel.replace(/\s+/g, '_')}_story_full.mp3`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Full audio downloaded!')
    }
    combineParts()
  }

  // --- Image upload per chapter ---
  const handleChapterImageUpload = (chapterId: number, files: FileList | null) => {
    if (!files || files.length === 0) return
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        setChapterImages(prev => ({
          ...prev,
          [chapterId]: [...(prev[chapterId] || []), dataUrl],
        }))
      }
      reader.readAsDataURL(file)
    })
    showToast(`${files.length} image${files.length > 1 ? 's' : ''} added`)
  }

  const removeChapterImage = (chapterId: number, index: number) => {
    setChapterImages(prev => ({
      ...prev,
      [chapterId]: (prev[chapterId] || []).filter((_, i) => i !== index),
    }))
  }

  // --- Background music ---
  const handleBgMusicUpload = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setBgMusic(ev.target?.result as string)
      setBgMusicName(file.name)
      showToast(`Music: ${file.name}`)
    }
    reader.readAsDataURL(file)
  }

  // --- Video assembly ---
  const assembleVideo = async () => {
    if (!script) return
    setAssembling(true)
    setAssemblyProgress('Preparing assets...')
    setLandscapeVideo(null)
    setPortraitVideo(null)
    setShorts([])
    try {
      const chaptersPayload = script.chapters.map(ch => ({
        id: ch.id,
        title: ch.title,
        narration: ch.narration,
        visual: ch.visual,
        audioBase64: ch.audio || '',
      }))

      const imagesPayload: Array<{ chapterId: number; imageBase64: string }> = []
      for (const [chIdStr, imgs] of Object.entries(chapterImages)) {
        const chId = parseInt(chIdStr)
        for (const img of imgs) {
          imagesPayload.push({ chapterId: chId, imageBase64: img })
        }
      }

      setAssemblyProgress('Rendering video (this may take a few minutes)...')

      const res = await fetch('/api/story-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapters: chaptersPayload,
          images: imagesPayload,
          backgroundMusicBase64: bgMusic || undefined,
          musicVolume,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setLandscapeVideo(data.landscape)
      setPortraitVideo(data.portrait)
      setChapterTimestamps(data.chapterTimestamps || [])
      showToast(`Video ready — ${Math.round(data.duration)}s`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error assembling video', 'error')
    } finally {
      setAssembling(false)
      setAssemblyProgress('')
    }
  }

  // --- Cut into shorts ---
  const cutIntoShorts = async () => {
    if (!portraitVideo || chapterTimestamps.length === 0 || !script) return
    setCuttingShorts(true)
    showToast('Cutting chapters into shorts...')
    try {
      const chaptersPayload = chapterTimestamps.map(ts => ({
        ...ts,
        title: script.chapters.find(c => c.id === ts.chapterId)?.title || `Chapter ${ts.chapterId}`,
      }))
      const res = await fetch('/api/story-shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoBase64: portraitVideo,
          chapters: chaptersPayload,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShorts(data.shorts)
      showToast(`${data.shorts.length} shorts ready!`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error cutting shorts', 'error')
    } finally {
      setCuttingShorts(false)
    }
  }

  const downloadVideo = (dataUrl: string, suffix: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${channel.replace(/\s+/g, '_')}_story_${suffix}.mp4`
    a.click()
  }

  // --- Helpers ---
  const chapterTypeLabel = (type: string) => {
    switch (type) { case 'intro': return 'INTRO'; case 'outro': return 'OUTRO'; default: return 'CHAPTER' }
  }
  const chapterTypeColor = (type: string) => {
    switch (type) { case 'intro': return 'bg-blue-100 text-blue-700'; case 'outro': return 'bg-amber-100 text-amber-700'; default: return 'bg-stone-100 text-stone-600' }
  }

  const allChaptersHaveAudio = script?.chapters.every(c => c.audio) ?? false
  const someChaptersHaveAudio = script?.chapters.some(c => c.audio) ?? false
  const hasAnyImages = Object.values(chapterImages).some(imgs => imgs.length > 0)
  const canAssemble = allChaptersHaveAudio && hasAnyImages

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <div className="h-12 bg-white border-b border-stone-100 flex items-center justify-between px-5 shrink-0">
          <span className="text-[14px] font-medium text-stone-900">Long form story</span>
          <div className="flex gap-2">
            {script && someChaptersHaveAudio && (
              <button onClick={downloadFullAudio} className="px-3 py-1.5 text-[12px] font-medium border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">
                Download audio
              </button>
            )}
            {landscapeVideo && (
              <button onClick={() => downloadVideo(landscapeVideo, 'landscape')} className="px-3 py-1.5 text-[12px] font-medium border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
                16:9 Video
              </button>
            )}
            {portraitVideo && (
              <button onClick={() => downloadVideo(portraitVideo, 'portrait')} className="px-3 py-1.5 text-[12px] font-medium border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
                9:16 Video
              </button>
            )}
          </div>
        </div>

        <input ref={bgMusicInputRef} type="file" accept="audio/mpeg,.mp3,audio/wav,.wav,audio/aac,.aac,audio/x-m4a,.m4a" className="hidden" onChange={(e) => handleBgMusicUpload(e.target.files?.[0] || null)} />

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — controls */}
          <div className="w-72 border-r border-stone-100 overflow-y-auto p-5 flex flex-col gap-4 shrink-0">
            {/* Topic */}
            <div className="bg-stone-50 border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Story topic</p>
              <textarea
                value={topic} onChange={(e) => setTopic(e.target.value)} rows={3}
                placeholder="e.g. The untold story of the 1966 Le Mans rivalry"
                className="w-full text-[13px] border border-stone-200 rounded-lg p-2.5 resize-none bg-white focus:outline-none focus:border-stone-400 text-stone-900 placeholder:text-stone-400"
              />
            </div>

            {/* Channel */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Channel</p>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full text-[13px] border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-stone-400 text-stone-900">
                {CHANNELS.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>

            {/* Generate script */}
            <button onClick={generateScript} disabled={generating} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 text-white text-[13px] font-medium rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {generating ? (<><Spinner /> Writing script...</>) : (<><span className="text-[11px]">&#x270E;</span> Generate story</>)}
            </button>

            {/* Voiceover controls */}
            {script && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-[10px] font-medium text-purple-700 uppercase tracking-widest">Voiceover</p>
                <button onClick={generateAllVoiceovers} disabled={generatingAll || allChaptersHaveAudio} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-[13px] font-medium rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {generatingAll ? (<><Spinner /> Generating all...</>) : allChaptersHaveAudio ? ('All voiceovers ready') : ('Generate full voiceover')}
                </button>
                <p className="text-[10px] text-purple-500">{script.chapters.filter(c => c.audio).length} / {script.chapters.length} chapters recorded</p>
              </div>
            )}

            {/* Background music */}
            {script && (
              <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">Background music</p>
                <button onClick={() => bgMusicInputRef.current?.click()} className="w-full px-3 py-2 text-[12px] border border-stone-200 rounded-lg hover:bg-white transition-colors text-stone-600 text-left">
                  {bgMusic ? `\u2713 ${bgMusicName}` : '+ Add music track (optional)'}
                </button>
                {bgMusic && (
                  <>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setBgMusic(null); setBgMusicName('') }} className="text-[11px] text-red-500 hover:text-red-700">Remove</button>
                    </div>
                    <div>
                      <p className="text-[11px] text-stone-400 mb-1">Volume — {Math.round(musicVolume * 100)}%</p>
                      <input type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={(e) => setMusicVolume(parseFloat(e.target.value))} className="w-full" />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Video assembly */}
            {script && allChaptersHaveAudio && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-widest">Video assembly</p>
                <button onClick={assembleVideo} disabled={assembling || !canAssemble} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-[13px] font-medium rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {assembling ? (<><Spinner /> Assembling...</>) : !hasAnyImages ? ('Upload images first') : (<><span className="text-[11px]">&#9654;</span> Assemble video</>)}
                </button>
                {assembling && assemblyProgress && (
                  <p className="text-[10px] text-emerald-600">{assemblyProgress}</p>
                )}
                {!hasAnyImages && (
                  <p className="text-[10px] text-emerald-500">Add images to chapters below to enable</p>
                )}
                {(landscapeVideo || portraitVideo) && (
                  <div className="flex flex-col gap-2">
                    {landscapeVideo && (
                      <button onClick={() => downloadVideo(landscapeVideo, 'landscape')} className="w-full px-3 py-2 text-[12px] font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                        &#8595; Download 16:9 (YouTube)
                      </button>
                    )}
                    {portraitVideo && (
                      <button onClick={() => downloadVideo(portraitVideo, 'portrait')} className="w-full px-3 py-2 text-[12px] font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                        &#8595; Download 9:16 (TikTok/Reels)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Cut into shorts */}
            {portraitVideo && chapterTimestamps.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-[10px] font-medium text-indigo-700 uppercase tracking-widest">Shorts</p>
                <button onClick={cutIntoShorts} disabled={cuttingShorts || shorts.length > 0} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-[13px] font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {cuttingShorts ? (<><Spinner /> Cutting...</>) : shorts.length > 0 ? (`${shorts.length} shorts ready`) : ('Cut into shorts')}
                </button>
                {shorts.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {shorts.map((s) => (
                      <button key={s.chapterId} onClick={() => downloadVideo(s.video, `short_ch${s.chapterId}`)} className="w-full flex items-center justify-between px-3 py-2 text-[11px] border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-indigo-700">
                        <span>{s.title}</span>
                        <span className="text-indigo-400">{s.duration}s</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Script info */}
            {script && (
              <div className="bg-white border border-stone-100 rounded-xl p-4">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Script info</p>
                <div className="flex flex-col gap-1.5 text-[12px] text-stone-600">
                  <p>{script.totalWordCount} words</p>
                  <p>~{script.estimatedDuration} min read</p>
                  <p>{script.chapters.length} chapters</p>
                  <p>{Object.values(chapterImages).reduce((s, imgs) => s + imgs.length, 0)} images uploaded</p>
                </div>
              </div>
            )}
          </div>

          {/* Main content — script chapters */}
          <div className="flex-1 overflow-y-auto p-6">
            {!script ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <p className="text-[13px] font-medium text-stone-600">No script yet</p>
                  <p className="text-[12px] text-stone-400 mt-1">Enter a topic and click Generate story</p>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto flex flex-col gap-5">
                {/* Title header */}
                <div className="mb-2">
                  <h1 className="text-[22px] font-semibold text-stone-900 leading-tight">{script.title}</h1>
                  <p className="text-[13px] text-stone-500 mt-1.5">{script.summary}</p>
                </div>

                {/* Chapters */}
                {script.chapters.map((chapter, i) => (
                  <div key={chapter.id} className="bg-white border border-stone-100 rounded-xl p-5 flex flex-col gap-3">
                    {/* Chapter header */}
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[9px] font-medium tracking-widest uppercase px-2 py-0.5 rounded ${chapterTypeColor(chapter.type)}`}>
                        {chapterTypeLabel(chapter.type)}
                      </span>
                      <h2 className="text-[15px] font-medium text-stone-900">{chapter.title}</h2>
                    </div>

                    {/* Narration text */}
                    <p className="text-[13px] text-stone-700 leading-relaxed whitespace-pre-wrap">{chapter.narration}</p>

                    {/* Visual suggestion */}
                    <div className="bg-stone-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-0.5">Visual</p>
                      <p className="text-[12px] text-stone-500">{chapter.visual}</p>
                    </div>

                    {/* Image upload */}
                    <div className="border border-dashed border-stone-200 rounded-lg p-3">
                      <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-2">Images</p>
                      {(chapterImages[chapter.id] || []).length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(chapterImages[chapter.id] || []).map((media, j) => {
                            const isVideo = media.startsWith('data:video/')
                            return (
                              <div key={j} className="relative group">
                                {isVideo ? (
                                  <div className="w-16 h-16 rounded-lg bg-stone-800 flex items-center justify-center">
                                    <span className="text-white text-[10px] font-medium">&#9654; VID</span>
                                  </div>
                                ) : (
                                  <img src={media} alt="" className="w-16 h-16 rounded-lg object-cover" />
                                )}
                                <button
                                  onClick={() => removeChapterImage(chapter.id, j)}
                                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  x
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-stone-500 cursor-pointer">
                        + Add media
                        <input type="file" accept="video/mp4,.mp4,video/quicktime,.mov,video/webm,.webm,image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp" multiple className="hidden" onChange={(e) => handleChapterImageUpload(chapter.id, e.target.files)} />
                      </label>
                      <p className="text-[10px] text-stone-400 mt-1">Images and video files supported</p>
                    </div>

                    {/* Audio controls */}
                    <div className="flex items-center gap-2 pt-1">
                      {chapter.audio ? (
                        <div className="flex items-center gap-2 flex-1">
                          <audio ref={el => { audioRefs.current[i] = el }} src={chapter.audio} controls className="flex-1 h-8" style={{ maxWidth: '100%' }} />
                          <button onClick={() => generateVoiceover(i)} disabled={generatingAudio[i]} className="px-2.5 py-1.5 text-[11px] border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-stone-500 shrink-0">
                            Redo
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => generateVoiceover(i)} disabled={generatingAudio[i] || generatingAll} className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          {generatingAudio[i] ? (<><Spinner className="w-3 h-3" /> Generating...</>) : (<>&#9654; Generate voiceover</>)}
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
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-[12px] font-medium shadow-sm z-50 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-stone-900 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

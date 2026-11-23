'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { computeClientFingerprint } from '@/lib/audio/client-fingerprint'
import {
  CONTENT_CATEGORIES,
  RECORDING_TYPES,
  RIGHTS_STATUSES,
  type ContentCategory,
  type RecordingType,
  type RightsStatus,
} from '@/lib/music/metadata'
import { TRACK_CREDIT_ROLES, type TrackCreditRole } from '@/lib/music/credits'

const ALLOWED_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/flac', 'audio/wav', 'audio/ogg']
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 200
const MAX_IMAGE_SIZE_MB = 10
const MAX_GENRES = 3

interface Genre {
  id: string
  name: string
  parent_id: string | null
}

interface Album {
  id: string
  title: string
  release_type: 'single' | 'ep' | 'album'
  cover_r2_key: string | null
}

interface CreditDraft {
  artist_id: string | null
  display_name: string
  role: TrackCreditRole
}

interface ArtistSuggestion {
  id: string
  name: string
}

export default function UploadPage() {
  const t = useTranslations('Upload')
  const metadataT = useTranslations('MusicMetadata')
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [aiGenerated, setAiGenerated] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [aiWarning, setAiWarning] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState('')
  const [genres, setGenres] = useState<Genre[]>([])
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [albumId, setAlbumId] = useState('')
  const [newAlbumTitle, setNewAlbumTitle] = useState('')
  const [newAlbumReleaseType, setNewAlbumReleaseType] = useState<'single' | 'ep' | 'album'>('album')
  const [creatingAlbum, setCreatingAlbum] = useState(false)
  const [trackNumber, setTrackNumber] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [albumCoverUploading, setAlbumCoverUploading] = useState(false)
  const [albumCoverDone, setAlbumCoverDone] = useState(false)
  const albumCoverInputRef = useRef<HTMLInputElement>(null)
  const [isrc, setIsrc] = useState('')
  const [recordingType, setRecordingType] = useState<RecordingType>('original')
  const [contentCategory, setContentCategory] = useState<ContentCategory>('none')
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceArtistName, setSourceArtistName] = useState('')
  const [sourceWorkTitle, setSourceWorkTitle] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [rightsStatus, setRightsStatus] = useState<RightsStatus>('original')
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [rightsNote, setRightsNote] = useState('')
  const [credits, setCredits] = useState<CreditDraft[]>([])
  const [creditName, setCreditName] = useState('')
  const [creditRole, setCreditRole] = useState<TrackCreditRole>('featured_artist')
  const [creditArtistId, setCreditArtistId] = useState<string | null>(null)
  const [creditSearch, setCreditSearch] = useState('')
  const [artistSuggestions, setArtistSuggestions] = useState<ArtistSuggestion[]>([])

  useEffect(() => {
    fetch('/api/genres')
      .then((r) => r.json())
      .then((d) => setGenres(d.genres ?? []))
    loadAlbums()
  }, [])

  useEffect(() => {
    const query = creditSearch.trim()
    if (query.length < 2) {
      setArtistSuggestions([])
      return
    }
    const timer = setTimeout(() => {
      fetch(`/api/artists/search?q=${encodeURIComponent(query)}`)
        .then((r) => (r.ok ? r.json() : { artists: [] }))
        .then((d) => setArtistSuggestions(d.artists ?? []))
    }, 250)
    return () => clearTimeout(timer)
  }, [creditSearch])

  function loadAlbums() {
    fetch('/api/albums?mine=true')
      .then((r) => r.json())
      .then((d) => setAlbums(d.albums ?? []))
  }

  async function createAlbum() {
    if (!newAlbumTitle.trim()) return
    setCreatingAlbum(true)
    const res = await fetch('/api/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newAlbumTitle, release_type: newAlbumReleaseType }),
    })
    const data = await res.json()
    setCreatingAlbum(false)
    if (!res.ok) { setError(t('validation.requestFailed')); return }
    setNewAlbumTitle('')
    loadAlbums()
    setAlbumId(data.album.id)
    setCoverFile(null)
  }

  function toggleGenre(id: string) {
    setSelectedGenreIds((prev) => {
      if (prev.includes(id)) return prev.filter((g) => g !== id)
      if (prev.length >= MAX_GENRES) return prev
      return [...prev, id]
    })
  }

  function changeRecordingType(next: RecordingType) {
    setRecordingType(next)
    if (next === 'original') {
      setRightsStatus('original')
    } else if (rightsStatus === 'original') {
      setRightsStatus('permission_obtained')
    }
  }

  function selectCreditArtist(artist: ArtistSuggestion) {
    setCreditName(artist.name)
    setCreditArtistId(artist.id)
    setCreditSearch('')
    setArtistSuggestions([])
  }

  function addCredit() {
    const displayName = creditName.trim()
    if (!displayName || credits.length >= 20) return
    setCredits((prev) => [...prev, { artist_id: creditArtistId, display_name: displayName, role: creditRole }])
    setCreditName('')
    setCreditArtistId(null)
    setCreditSearch('')
  }

  const macroGenres = genres.filter((g) => !g.parent_id)
  const subGenres = genres.filter((g) => g.parent_id)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError(t('validation.audioFormat'))
      return
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(t('validation.audioSize', { size: MAX_SIZE_MB }))
      return
    }
    setError('')
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  async function onAlbumCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !albumId) return
    if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
      setError(t('validation.imageFormat'))
      return
    }
    if (f.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setError(t('validation.imageSize', { size: MAX_IMAGE_SIZE_MB }))
      return
    }
    setError('')
    setAlbumCoverUploading(true)
    setAlbumCoverDone(false)
    const metaRes = await fetch('/api/albums/cover-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ album_id: albumId, content_type: f.type, content_length: f.size }),
    })
    const meta = await metaRes.json()
    if (!metaRes.ok) {
      setAlbumCoverUploading(false)
      setError(t('validation.requestFailed'))
      return
    }
    await fetch(meta.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': f.type },
      body: f,
    })
    setAlbumCoverUploading(false)
    setAlbumCoverDone(true)
    loadAlbums()
  }

  function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
      setError(t('validation.imageFormat'))
      return
    }
    if (f.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setError(t('validation.imageSize', { size: MAX_IMAGE_SIZE_MB }))
      return
    }
    setError('')
    setCoverFile(f)
  }

  async function getDuration(f: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio()
      audio.src = URL.createObjectURL(f)
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(audio.src)
        resolve(Math.ceil(audio.duration))
      })
      audio.addEventListener('error', () => resolve(0))
    })
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setError('')
    if (!rightsConfirmed) {
      setError(metadataT('rightsRequired'))
      return
    }
    setLoading(true)
    setProgress(0)

    const duration_sec = await getDuration(file)
    if (duration_sec < 1) {
      setError(t('validation.duration'))
      setLoading(false)
      return
    }

    // Step 1: 署名付きURL取得 + tracks レコード作成
    const metaRes = await fetch('/api/tracks/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content_type: file.type,
        content_length: file.size,
        title,
        duration_sec,
        ai_generated: aiGenerated,
        genre_ids: selectedGenreIds,
        album_id: albumId || undefined,
        track_number: albumId && trackNumber ? Number(trackNumber) : undefined,
        isrc: isrc || undefined,
        credits,
        recording_type: recordingType,
        content_category: contentCategory,
        source_title: sourceTitle,
        source_artist_name: sourceArtistName,
        source_work_title: sourceWorkTitle,
        source_url: sourceUrl,
        rights_status: rightsStatus,
        rights_confirmed: rightsConfirmed,
        rights_note: rightsNote,
      }),
    })
    const meta = await metaRes.json()
    if (!metaRes.ok) {
      setError(t('validation.requestFailed'))
      setLoading(false)
      return
    }

    setProgress(10)
    setStatusMsg(t('status.file'))

    // Step 2: R2 に直接 PUT（署名付きURL経由）
    const putRes = await fetch(meta.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    if (!putRes.ok) {
      setError(t('validation.uploadFailed'))
      setLoading(false)
      return
    }

    setProgress(50)

    // ジャケット画像（任意・アルバムに紐付けた場合はアルバム側のジャケットを使うため送らない）
    if (coverFile && !albumId) {
      setStatusMsg(t('status.cover'))
      const coverMetaRes = await fetch('/api/tracks/cover-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_id: meta.track_id, content_type: coverFile.type, content_length: coverFile.size }),
      })
      const coverMeta = await coverMetaRes.json()
      if (coverMetaRes.ok) {
        await fetch(coverMeta.upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': coverFile.type },
          body: coverFile,
        })
      }
    }

    setProgress(60)
    setStatusMsg(t('status.duplicate'))

    // Step 3: AI生成チェック（メタデータパターン検出）
    const aiRes = await fetch('/api/tracks/ai-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_id: meta.track_id, self_declared: aiGenerated }),
    })
    const aiData = await aiRes.json()
    if (aiData.ai_generated && aiData.reason === 'metadata_pattern') {
      setAiWarning(t('aiMetadataWarning'))
    }

    setProgress(80)
    setStatusMsg(t('status.fingerprint'))

    // Step 4: フィンガープリント生成・送信（重複検知）
    // 簡易実装（真のChromaprint互換ではない・詳細はlib/audio/client-fingerprint.tsを参照）
    let duplicateDetected = false
    const fingerprint = await computeClientFingerprint(file)
    if (fingerprint) {
      const fpRes = await fetch('/api/tracks/fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_id: meta.track_id, fingerprint, duration_sec }),
      })
      if (fpRes.status === 409) {
        const fpData = await fpRes.json()
        duplicateDetected = true
        setDuplicateWarning(
          t('duplicateWarning', { trackId: fpData.existing_track_id ?? 'unknown' })
        )
      }
    }

    setProgress(100)
    setStatusMsg('')
    setLoading(false)

    if (duplicateDetected) {
      // 重複の可能性がある場合は警告を読んでもらうため遷移を遅らせる
      setTimeout(() => router.push('/dashboard'), 4000)
    } else if (!aiData.ai_generated || aiData.reason === 'self_declared') {
      router.push('/dashboard')
    }
    // AI検出された場合は確認ダイアログを表示してから遷移
    if (!duplicateDetected && aiData.ai_generated && aiData.reason === 'metadata_pattern') {
      setTimeout(() => router.push('/dashboard'), 3000)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-12">
      <div className="max-w-lg mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-zinc-400 mt-1">{t('formats', { size: MAX_SIZE_MB })}</p>
          <p className="text-xs text-zinc-600 mt-1">
            {t('reviewNote')}
          </p>
        </div>

        {error && (
          <p role="alert" aria-live="assertive" className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {aiWarning && (
          <p role="status" aria-live="polite" className="text-sm text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded-lg px-4 py-3">
            ⚠️ {aiWarning}
          </p>
        )}

        {duplicateWarning && (
          <p role="status" aria-live="polite" className="text-sm text-orange-400 bg-orange-900/20 border border-orange-800 rounded-lg px-4 py-3">
            ⚠️ {duplicateWarning}
          </p>
        )}

        <form onSubmit={handleUpload} className="space-y-6">
          {/* ファイル選択 */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
              file ? 'border-zinc-500 bg-zinc-900' : 'border-zinc-700 hover:border-zinc-500'
            }`}
          >
            <input
              ref={fileInputRef}
              id="track-audio-file"
              type="file"
              aria-label={t('audioLabel')}
              accept={ALLOWED_TYPES.join(',')}
              className="hidden"
              onChange={onFileChange}
            />
            {file ? (
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-zinc-400 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div>
                <p className="text-4xl mb-3">🎵</p>
                <p className="text-zinc-400">{t('selectFile')}</p>
              </div>
            )}
          </div>

          {/* タイトル */}
          <div>
            <label htmlFor="track-title" className="block text-sm text-zinc-400 mb-1">{t('trackTitle')} <span className="text-red-400">*</span></label>
            <input
              id="track-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
            />
          </div>

          {/* 作品・クレジット情報 */}
          <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div>
              <h2 className="text-sm font-semibold">{metadataT('sectionTitle')}</h2>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                {metadataT('sectionDescription')}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="recording-type" className="block text-xs text-zinc-400 mb-1">{metadataT('recordingType')}</label>
                <select
                  id="recording-type"
                  value={recordingType}
                  onChange={(e) => changeRecordingType(e.target.value as RecordingType)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-400"
                >
                  {RECORDING_TYPES.map((type) => <option key={type} value={type}>{metadataT(`recordingTypes.${type}`)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="content-category" className="block text-xs text-zinc-400 mb-1">{metadataT('contentCategory')}</label>
                <select
                  id="content-category"
                  value={contentCategory}
                  onChange={(e) => setContentCategory(e.target.value as ContentCategory)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-400"
                >
                  {CONTENT_CATEGORIES.map((category) => <option key={category} value={category}>{metadataT(`contentCategories.${category}`)}</option>)}
                </select>
              </div>
            </div>

            {(recordingType !== 'original' || contentCategory !== 'none') && (
              <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                {recordingType !== 'original' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="source-title" className="block text-xs text-zinc-400 mb-1">
                        {metadataT('sourceTitle')} {['cover', 'remix', 'arrangement', 'medley'].includes(recordingType) && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        id="source-title"
                        value={sourceTitle}
                        onChange={(e) => setSourceTitle(e.target.value)}
                        maxLength={200}
                        required={['cover', 'remix', 'arrangement', 'medley'].includes(recordingType)}
                        placeholder={metadataT('sourceTitlePlaceholder')}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
                      />
                    </div>
                    <div>
                      <label htmlFor="source-artist-name" className="block text-xs text-zinc-400 mb-1">{metadataT('sourceArtistName')}</label>
                      <input
                        id="source-artist-name"
                        value={sourceArtistName}
                        onChange={(e) => setSourceArtistName(e.target.value)}
                        maxLength={200}
                        placeholder={metadataT('sourceArtistNamePlaceholder')}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
                      />
                    </div>
                  </div>
                )}
                {contentCategory !== 'none' && (
                  <div>
                    <label htmlFor="source-work-title" className="block text-xs text-zinc-400 mb-1">{metadataT('sourceWorkTitle')} <span className="text-red-400">*</span></label>
                    <input
                      id="source-work-title"
                      value={sourceWorkTitle}
                      onChange={(e) => setSourceWorkTitle(e.target.value)}
                      maxLength={200}
                      required
                      placeholder={metadataT('sourceWorkTitlePlaceholder')}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                )}
                {recordingType !== 'original' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="rights-status" className="block text-xs text-zinc-400 mb-1">{metadataT('rightsStatus')}</label>
                      <select
                        id="rights-status"
                        value={rightsStatus}
                        onChange={(e) => setRightsStatus(e.target.value as RightsStatus)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-400"
                      >
                        {RIGHTS_STATUSES.filter((status) => status !== 'original').map((status) => <option key={status} value={status}>{metadataT(`rightsStatuses.${status}`)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="source-url" className="block text-xs text-zinc-400 mb-1">{metadataT('sourceUrl')}</label>
                      <input
                        id="source-url"
                        type="url"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        maxLength={500}
                        placeholder="https://…"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
                      />
                    </div>
                  </div>
                )}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rightsConfirmed}
                    onChange={(e) => setRightsConfirmed(e.target.checked)}
                    required
                    className="mt-0.5 h-4 w-4 shrink-0 rounded accent-white"
                  />
                  <span className="text-xs leading-5 text-zinc-400">
                    {metadataT('rightsNotice')}
                  </span>
                </label>
                <textarea
                  aria-label={metadataT('rightsNote')}
                  value={rightsNote}
                  onChange={(e) => setRightsNote(e.target.value)}
                  maxLength={1000}
                  rows={2}
                  placeholder={metadataT('rightsNotePlaceholder')}
                  className="w-full resize-none bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
                />
              </div>
            )}

            {recordingType === 'original' && (
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <input
                  type="checkbox"
                  checked={rightsConfirmed}
                  onChange={(e) => setRightsConfirmed(e.target.checked)}
                  required
                  className="mt-0.5 h-4 w-4 shrink-0 rounded accent-white"
                />
                <span className="text-xs leading-5 text-zinc-400">{metadataT('rightsConfirmedOriginal')}</span>
              </label>
            )}

            <div className="border-t border-zinc-800 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-300">{metadataT('credits')}</h3>
                  <p className="mt-1 text-[11px] text-zinc-600">{metadataT('creditsDescription')}</p>
                </div>
                <span className="text-[11px] text-zinc-600">{credits.length}/20</span>
              </div>
              {credits.length > 0 && (
                <div className="mt-3 space-y-2">
                  {credits.map((credit, index) => (
                    <div key={`${credit.display_name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs">
                      <span className="min-w-0 truncate"><span className="text-zinc-500">{metadataT(`creditRoles.${credit.role}`)}</span>　{credit.display_name}</span>
                      <button type="button" onClick={() => setCredits((prev) => prev.filter((_, i) => i !== index))} className="shrink-0 text-zinc-500 underline hover:text-white">{metadataT('remove')}</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr_auto]">
                <select
                  aria-label={metadataT('creditRole')}
                  value={creditRole}
                  onChange={(e) => setCreditRole(e.target.value as TrackCreditRole)}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-zinc-400"
                >
                  {TRACK_CREDIT_ROLES.map((role) => <option key={role} value={role}>{metadataT(`creditRoles.${role}`)}</option>)}
                </select>
                <div className="relative">
                  <input
                    aria-label={metadataT('creditName')}
                    value={creditName}
                    onChange={(e) => { setCreditName(e.target.value); setCreditArtistId(null); setCreditSearch(e.target.value) }}
                    maxLength={100}
                    placeholder={metadataT('displayNamePlaceholder')}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
                  />
                  {artistSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
                      {artistSuggestions.map((artist) => (
                        <button key={artist.id} type="button" onClick={() => selectCreditArtist(artist)} className="block w-full px-3 py-2 text-left text-xs hover:bg-zinc-800">
                          {artist.name}<span className="ml-2 text-zinc-600">{metadataT('registeredArtist')}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={addCredit} disabled={!creditName.trim() || credits.length >= 20} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs hover:border-zinc-400 disabled:opacity-40">{metadataT('add')}</button>
              </div>
            </div>
          </section>

          {/* ISRC */}
          <div>
            <label htmlFor="track-isrc" className="block text-sm text-zinc-400 mb-1">{t('isrcLabel')}</label>
            <input
              id="track-isrc"
              type="text"
              value={isrc}
              onChange={(e) => setIsrc(e.target.value)}
              placeholder={t('isrcPlaceholder')}
              maxLength={15}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
            />
            <p className="mt-1 text-xs text-zinc-600">
              {t('isrcHelp')}
            </p>
          </div>

          {/* ジャンルタグ（最大{MAX_GENRES}個） */}
          {genres.length > 0 && (
            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                {t('genreLabel', { count: MAX_GENRES })}
              </label>
              <div className="flex flex-wrap gap-2">
                {[...macroGenres, ...subGenres].map((g) => {
                  const selected = selectedGenreIds.includes(g.id)
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGenre(g.id)}
                      className={`text-xs rounded-full border px-3 py-1.5 transition ${
                        selected
                          ? 'border-white bg-white text-black'
                          : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      {g.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* アルバム */}
          <div>
            <label htmlFor="track-album" className="block text-sm text-zinc-400 mb-2">{t('album.label')}</label>
            <select
              id="track-album"
              value={albumId}
              onChange={(e) => {
                setAlbumId(e.target.value)
                if (e.target.value) setCoverFile(null)
              }}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-400"
            >
              <option value="">{t('album.none')}</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({t(`releaseType.${a.release_type}`)})
                </option>
              ))}
            </select>
            {albumId && (
              <div className="mt-2">
                <label htmlFor="track-number" className="block text-xs text-zinc-500 mb-1">{t('album.trackNumber')}</label>
                <input
                  id="track-number"
                  type="number"
                  min={1}
                  value={trackNumber}
                  onChange={(e) => setTrackNumber(e.target.value)}
                  placeholder={t('album.trackNumberPlaceholder')}
                  className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
                />
              </div>
            )}
            {albumId && (
              <div className="mt-3">
                <label className="block text-xs text-zinc-500 mb-1">{t('album.cover')}</label>
                <div
                  onClick={() => albumCoverInputRef.current?.click()}
                  className="border border-dashed border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-500 hover:border-zinc-500 cursor-pointer transition"
                >
                  <input
                    ref={albumCoverInputRef}
                    type="file"
                    aria-label={t('album.coverAria')}
                    accept={ALLOWED_IMAGE_TYPES.join(',')}
                    className="hidden"
                    onChange={onAlbumCoverChange}
                  />
                  {albumCoverUploading
                    ? t('album.coverUploading')
                    : albumCoverDone
                      ? t('album.coverUpdated')
                      : albums.find((a) => a.id === albumId)?.cover_r2_key
                        ? t('album.coverSet')
                        : t('album.coverSelect')}
                </div>
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newAlbumTitle}
                onChange={(e) => setNewAlbumTitle(e.target.value)}
                maxLength={200}
                placeholder={t('album.newTitle')}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
              />
              <select
                aria-label={t('album.releaseTypeAria')}
                value={newAlbumReleaseType}
                onChange={(e) => setNewAlbumReleaseType(e.target.value as 'single' | 'ep' | 'album')}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-zinc-400"
              >
                <option value="single">{t('releaseType.single')}</option>
                <option value="ep">{t('releaseType.ep')}</option>
                <option value="album">{t('releaseType.album')}</option>
              </select>
              <button
                type="button"
                onClick={createAlbum}
                disabled={creatingAlbum || !newAlbumTitle.trim()}
                className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:border-zinc-400 disabled:opacity-40"
              >
                {creatingAlbum ? t('album.creating') : t('album.create')}
              </button>
            </div>
          </div>

          {/* ジャケット画像（アルバムに紐付ける場合はアルバム側のジャケットが使われるため、
              単独曲＝シングルとしてアップロードする場合のみ表示する） */}
          {!albumId && (
            <div>
              <label className="block text-sm text-zinc-400 mb-2">{t('cover.label')}</label>
              <div
                onClick={() => coverInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                  coverFile ? 'border-zinc-500 bg-zinc-900' : 'border-zinc-700 hover:border-zinc-500'
                }`}
              >
                <input
                  ref={coverInputRef}
                  type="file"
                  aria-label={t('cover.aria')}
                  accept={ALLOWED_IMAGE_TYPES.join(',')}
                  className="hidden"
                  onChange={onCoverChange}
                />
                {coverFile ? (
                  <p className="text-sm text-zinc-300">{coverFile.name}</p>
                ) : (
                  <p className="text-sm text-zinc-500">{t('cover.select')}</p>
                )}
              </div>
            </div>
          )}

          {/* AI生成フラグ */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={aiGenerated}
              onChange={(e) => setAiGenerated(e.target.checked)}
              className="w-5 h-5 rounded accent-white"
            />
            <div>
              <p className="text-sm font-medium">{t('ai.title')}</p>
              <p className="text-xs text-zinc-500">{t('ai.description')}</p>
            </div>
          </label>

          {/* プログレスバー */}
          {progress !== null && (
            <div className="space-y-1.5">
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {statusMsg && <p className="text-xs text-zinc-500">{statusMsg}</p>}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || !title || loading}
            className="w-full bg-white text-black font-semibold rounded-lg py-3 hover:bg-zinc-200 disabled:opacity-50 transition"
          >
            {loading ? t('uploading') : t('upload')}
          </button>
        </form>
      </div>
    </main>
  )
}

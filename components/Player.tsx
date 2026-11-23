'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { BoostButton } from './BoostButton'
import { SupportButton } from './SupportButton'
import { SupportGraph } from './SupportGraph'
import { formatTrackArtistLine, type TrackCredit } from '@/lib/music/credits'
import type { RepeatMode } from '@/lib/player/queue'

interface Track {
  id: string
  title: string
  duration_sec: number
  artists: { name: string } | null
  credits?: TrackCredit[]
}

interface PlayerControls {
  onPrev?: () => void
  onNext?: () => void
  hasNext?: boolean
  hasPrev?: boolean
  shuffleOn?: boolean
  onToggleShuffle?: () => void
  repeatMode?: RepeatMode
  onCycleRepeat?: () => void
  queueCount?: number
}

interface PlayerProps {
  track: Track
  onEnded?: () => void
  nextTrackId?: string
  controls?: PlayerControls
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const NORMALIZE_STORAGE_KEY = 'reson_normalize_audio'

export function Player({ track, onEnded, nextTrackId, controls }: PlayerProps) {
  const t = useTranslations('Player')
  const audioRef = useRef<HTMLAudioElement>(null)
  const preloadRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(track.duration_sec)
  const startedAtRef = useRef<number | null>(null)
  const logSentRef = useRef(false)

  const [normalizeOn, setNormalizeOn] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const compressorRef = useRef<DynamicsCompressorNode | null>(null)

  const [lyricsOpen, setLyricsOpen] = useState(false)
  const [lyrics, setLyrics] = useState<string | null | undefined>(undefined)

  function toggleLyrics() {
    if (!lyricsOpen && lyrics === undefined) {
      fetch(`/api/tracks/${track.id}/lyrics`)
        .then((r) => r.json())
        .then((d) => setLyrics(d.lyrics))
    }
    setLyricsOpen((v) => !v)
  }

  useEffect(() => {
    setLyrics(undefined)
    setLyricsOpen(false)
  }, [track.id])

  useEffect(() => {
    setNormalizeOn(localStorage.getItem(NORMALIZE_STORAGE_KEY) === 'true')
  }, [])

  useEffect(() => {
    // track が変わったらリセット
    setPlaying(false)
    setCurrentTime(0)
    logSentRef.current = false
    startedAtRef.current = null
    if (audioRef.current) {
      audioRef.current.src = `/api/tracks/${track.id}/stream`
      audioRef.current.load()
    }
  }, [track.id])

  // 次の曲を先読みしておくことで、曲送り時の無音区間を短縮する（近似的なギャップレス再生）
  useEffect(() => {
    if (nextTrackId && preloadRef.current) {
      preloadRef.current.src = `/api/tracks/${nextTrackId}/stream`
      preloadRef.current.load()
    }
  }, [nextTrackId])

  function ensureAudioGraph(): boolean {
    if (audioCtxRef.current) return true
    if (!audioRef.current) return false
    try {
      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioContextCtor()
      const source = ctx.createMediaElementSource(audioRef.current)
      const compressor = ctx.createDynamicsCompressor()
      compressor.threshold.value = -24
      compressor.knee.value = 30
      compressor.ratio.value = 12
      compressor.attack.value = 0.003
      compressor.release.value = 0.25
      audioCtxRef.current = ctx
      sourceNodeRef.current = source
      compressorRef.current = compressor
      source.connect(ctx.destination)
      return true
      // R2側でCORSが許可されていない場合、createMediaElementSourceが例外を投げることがある。
      // その場合はノーマライズ機能を無効のまま通常再生を継続する。
    } catch {
      return false
    }
  }

  function toggleNormalize() {
    if (!ensureAudioGraph()) return
    const ctx = audioCtxRef.current
    const source = sourceNodeRef.current
    const compressor = compressorRef.current
    if (!ctx || !source || !compressor) return
    ctx.resume()
    const next = !normalizeOn
    source.disconnect()
    if (next) {
      source.connect(compressor)
      compressor.connect(ctx.destination)
    } else {
      compressor.disconnect()
      source.connect(ctx.destination)
    }
    setNormalizeOn(next)
    localStorage.setItem(NORMALIZE_STORAGE_KEY, String(next))
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      if (startedAtRef.current === null) startedAtRef.current = Date.now()
      audio.play()
    }
    setPlaying(!playing)
  }

  function onTimeUpdate() {
    const audio = audioRef.current
    if (!audio) return
    setCurrentTime(audio.currentTime)
    if (audio.duration && !isNaN(audio.duration)) setDuration(audio.duration)
  }

  async function sendPlayLog(playedSec: number, completed: boolean) {
    if (logSentRef.current) return
    logSentRef.current = true
    await fetch(`/api/tracks/${track.id}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ played_sec: Math.floor(playedSec), completed }),
    })
  }

  function onEnded_() {
    const played = audioRef.current?.currentTime ?? duration
    sendPlayLog(played, true)

    if (controls?.repeatMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
      logSentRef.current = false
      startedAtRef.current = Date.now()
      return
    }
    setPlaying(false)
    onEnded?.()
  }

  // ページ離脱・一時停止時にも再生ログを送信
  useEffect(() => {
    function handleUnload() {
      const audio = audioRef.current
      if (!audio || logSentRef.current) return
      sendPlayLog(audio.currentTime, false)
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [track.id])

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    const t = Number(e.target.value)
    audio.currentTime = t
    setCurrentTime(t)
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <audio
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded_}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        preload="metadata"
        crossOrigin="anonymous"
      />
      <audio ref={preloadRef} preload="auto" className="hidden" />

      {/* トラック情報 */}
      <div>
        <p className="font-semibold truncate">{track.title}</p>
        <p className="text-sm text-zinc-400">
          {formatTrackArtistLine(track.artists?.name, track.credits, t('unknownArtist'))}
        </p>
      </div>

      {/* シークバー */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={duration}
          value={currentTime}
          onChange={seek}
          aria-label={t('seekPosition')}
          className="w-full accent-white h-1"
        />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* コントロール */}
      <div className="flex items-center justify-center gap-4">
        {controls && (
          <button
            onClick={controls.onToggleShuffle}
            disabled={!controls.onToggleShuffle}
            title={t('shuffle')}
            className={`text-sm ${controls.shuffleOn ? 'text-white' : 'text-zinc-500'} hover:text-white disabled:opacity-30 transition`}
          >
            🔀
          </button>
        )}
        {controls && (
          <button
            onClick={controls.onPrev}
            disabled={!controls.onPrev || controls.hasPrev === false}
            title={t('previous')}
            className="text-lg text-zinc-300 hover:text-white disabled:opacity-30 transition"
          >
            ⏮
          </button>
        )}
        <button
          onClick={togglePlay}
          className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-zinc-200 transition text-lg"
          aria-label={playing ? t('pause') : t('play')}
        >
          {playing ? '⏸' : '▶'}
        </button>
        {controls && (
          <button
            onClick={controls.onNext}
            disabled={!controls.onNext || controls.hasNext === false}
            title={t('next')}
            className="text-lg text-zinc-300 hover:text-white disabled:opacity-30 transition"
          >
            ⏭
          </button>
        )}
        {controls && (
          <button
            onClick={controls.onCycleRepeat}
            disabled={!controls.onCycleRepeat}
            title={t('repeat')}
            className={`text-sm ${controls.repeatMode !== 'off' ? 'text-white' : 'text-zinc-500'} hover:text-white disabled:opacity-30 transition`}
          >
            {controls.repeatMode === 'one' ? '🔂' : '🔁'}
          </button>
        )}
      </div>

      {controls?.queueCount ? (
        <p className="text-center text-xs text-zinc-500">{t('queue', { count: controls.queueCount })}</p>
      ) : null}

      {/* プログレス表示 */}
      <div className="w-full bg-zinc-800 rounded-full h-0.5">
        <div className="bg-white h-0.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* 音量ノーマライズ・歌詞 */}
      <div className="flex justify-center gap-2">
        <button
          onClick={toggleNormalize}
          title={t('normalizeTitle')}
          className={`text-xs rounded-full border px-3 py-1 transition ${
            normalizeOn ? 'border-white text-white' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
          }`}
        >
          {normalizeOn ? t('normalizeOn') : t('normalizeOff')}
        </button>
        <button
          onClick={toggleLyrics}
          className={`text-xs rounded-full border px-3 py-1 transition ${
            lyricsOpen ? 'border-white text-white' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
          }`}
        >
          {t('lyrics')}
        </button>
      </div>

      {lyricsOpen && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 max-h-64 overflow-y-auto">
          {lyrics === undefined ? (
            <p className="text-xs text-zinc-500">{t('loading')}</p>
          ) : lyrics ? (
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{lyrics}</p>
          ) : (
            <p className="text-xs text-zinc-500">{t('noLyrics')}</p>
          )}
        </div>
      )}

      {/* 応援・ブースト */}
      <div className="flex flex-wrap justify-center gap-2">
        <SupportButton trackId={track.id} />
        <BoostButton trackId={track.id} />
      </div>

      {/* Support Graph */}
      <SupportGraph trackId={track.id} />
    </div>
  )
}

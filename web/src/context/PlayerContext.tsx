'use client'

import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'

interface PlayerTrack {
  songId: string
  songTitle: string
  fileId: string
  fileName: string
}

interface PlayerContextValue {
  track: PlayerTrack | null
  playing: boolean
  currentTime: number
  duration: number
  play: (track: PlayerTrack) => void
  togglePlay: () => void
  seek: (fraction: number) => void
  close: () => void
  audioRef: React.RefObject<HTMLAudioElement | null>
  setOnEnded: (cb: (() => void) | null) => void
  playNext: () => void
  setOnPrev: (cb: (() => void) | null) => void
  playPrev: () => void
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onEndedRef = useRef<(() => void) | null>(null)
  const onPrevRef = useRef<(() => void) | null>(null)
  const [track, setTrack] = useState<PlayerTrack | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const setOnEnded = useCallback((cb: (() => void) | null) => {
    onEndedRef.current = cb
  }, [])

  const playNext = useCallback(() => {
    onEndedRef.current?.()
  }, [])

  const setOnPrev = useCallback((cb: (() => void) | null) => {
    onPrevRef.current = cb
  }, [])

  const playPrev = useCallback(() => {
    onPrevRef.current?.()
  }, [])

  const play = useCallback((newTrack: PlayerTrack) => {
    const audio = audioRef.current
    if (!audio) return

    const url = `/api/drive/stream/${newTrack.fileId}`

    if (track?.fileId === newTrack.fileId) {
      // Same track — just toggle
      if (playing) {
        audio.pause()
        setPlaying(false)
      } else {
        audio.play()
        setPlaying(true)
      }
      return
    }

    // New track
    audio.src = url
    audio.load()
    audio.play().then(() => setPlaying(true)).catch(() => {})
    setTrack(newTrack)
    setCurrentTime(0)
    setDuration(0)
  }, [track, playing])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !track) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
    }
  }, [playing, track])

  const seek = useCallback((fraction: number) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    audio.currentTime = fraction * duration
  }, [duration])

  const close = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.src = ''
    }
    setTrack(null)
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [])

  // Media Session API — lock screen controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    if (!track) { navigator.mediaSession.metadata = null; return }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.songTitle,
      artist: 'Heavy Sweater',
      artwork: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    })
  }, [track])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }, [playing])

  useEffect(() => {
    if (!('mediaSession' in navigator) || duration <= 0) return
    try {
      navigator.mediaSession.setPositionState({ duration, playbackRate: 1, position: Math.min(currentTime, duration) })
    } catch {}
  }, [currentTime, duration])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => { audioRef.current?.play() })
    navigator.mediaSession.setActionHandler('pause', () => { audioRef.current?.pause() })
    navigator.mediaSession.setActionHandler('nexttrack', () => { onEndedRef.current?.() })
    navigator.mediaSession.setActionHandler('previoustrack', () => { onPrevRef.current?.() })
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      if (d.seekTime != null && audioRef.current) audioRef.current.currentTime = d.seekTime
    })
    return () => {
      (['play', 'pause', 'nexttrack', 'previoustrack', 'seekto'] as MediaSessionAction[]).forEach(a => {
        try { navigator.mediaSession.setActionHandler(a, null) } catch {}
      })
    }
  }, [])

  return (
    <PlayerContext.Provider value={{ track, playing, currentTime, duration, play, togglePlay, seek, close, audioRef, setOnEnded, playNext, setOnPrev, playPrev }}>
      {children}
      <audio
        ref={audioRef}
        onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
        onDurationChange={e => setDuration(e.currentTarget.duration)}
        onEnded={() => { setPlaying(false); onEndedRef.current?.() }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}

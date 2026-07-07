'use client'

import { createContext, useContext, useRef, useState, useCallback } from 'react'

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
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [track, setTrack] = useState<PlayerTrack | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

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

  return (
    <PlayerContext.Provider value={{ track, playing, currentTime, duration, play, togglePlay, seek, close, audioRef }}>
      {children}
      <audio
        ref={audioRef}
        onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
        onDurationChange={e => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
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

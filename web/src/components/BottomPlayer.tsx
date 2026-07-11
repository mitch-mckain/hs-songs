'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { usePlayer } from '@/context/PlayerContext'

function formatTime(s: number): string {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function BottomPlayer() {
  const { track, playing, currentTime, duration, togglePlay, seek, close, playNext, playPrev } = usePlayer()
  const pathname = usePathname()

  const isEditRoute = pathname?.includes('/edit') || pathname?.includes('/new')

  useEffect(() => {
    if (isEditRoute) close()
  }, [isEditRoute])

  if (!track) return null
  if (isEditRoute) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    seek((e.clientX - rect.left) / rect.width)
  }

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      background: '#ffffff', borderTop: '1px solid #e3e0d8', boxShadow: '0 -4px 16px rgba(0,0,0,0.05)',
      zIndex: 20,
    }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Prev */}
        <button
          onClick={playPrev}
          title="Previous song"
          style={{ background: 'none', border: 'none', color: '#b8b5be', cursor: 'pointer', flex: '0 0 auto', padding: 4 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="2" width="3" height="12" rx="1"/>
            <polygon points="15,2 6,8 15,14"/>
          </svg>
        </button>

        {/* Play/pause */}
        <button
          onClick={togglePlay}
          style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#17181c', color: '#fff', fontSize: 13, cursor: 'pointer', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="4" height="12" rx="1"/>
              <rect x="8" y="1" width="4" height="12" rx="1"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style={{ marginLeft: 2 }}>
              <polygon points="2,1 13,7 2,13"/>
            </svg>
          )}
        </button>

        {/* Song info */}
        <div className="bottom-player-info" style={{ flex: '0 0 auto', minWidth: 90, maxWidth: 150 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#17181c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {track.songTitle}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10.5, color: '#b8b5be', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {track.fileName}
          </div>
        </div>

        {/* Progress bar */}
        <div
          onClick={handleProgressClick}
          style={{ flex: 1, height: 32, display: 'flex', alignItems: 'center', position: 'relative', cursor: 'pointer' }}
        >
          <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: '#e3e0d8', borderRadius: 1 }} />
          <div style={{ position: 'absolute', left: 0, height: 2, width: `${progress}%`, background: '#1a1a1f', borderRadius: 1 }} />
          <div style={{ position: 'absolute', left: `${progress}%`, width: 11, height: 11, marginLeft: -5.5, borderRadius: '50%', background: '#1a1a1f' }} />
        </div>

        {/* Time */}
        <div className="bottom-player-time" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#b8b5be', width: 76, whiteSpace: 'nowrap', textAlign: 'right', flex: '0 0 auto' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Next */}
        <button
          onClick={playNext}
          title="Next song"
          style={{ background: 'none', border: 'none', color: '#b8b5be', cursor: 'pointer', flex: '0 0 auto', padding: 4 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <polygon points="1,2 10,8 1,14"/>
            <rect x="12" y="2" width="3" height="12" rx="1"/>
          </svg>
        </button>

        {/* Close */}
        <button
          onClick={close}
          style={{ background: 'none', border: 'none', color: '#b8b5be', fontSize: 16, cursor: 'pointer', flex: '0 0 auto', padding: 4 }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

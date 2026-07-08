'use client'

import { usePlayer } from '@/context/PlayerContext'

function formatTime(s: number): string {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function BottomPlayer() {
  const { track, playing, currentTime, duration, togglePlay, seek, close } = usePlayer()

  if (!track) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    seek((e.clientX - rect.left) / rect.width)
  }

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      background: '#faf7ee', borderTop: '1px solid #17181c',
      zIndex: 20,
    }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
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
        <div style={{ flex: '0 0 auto', minWidth: 90, maxWidth: 150 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#17181c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {track.songTitle}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10.5, color: '#b6b5b2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {track.fileName}
          </div>
        </div>

        {/* Progress bar */}
        <div
          onClick={handleProgressClick}
          style={{ flex: 1, height: 32, display: 'flex', alignItems: 'center', position: 'relative', cursor: 'pointer' }}
        >
          <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: '#e0d8ca', borderRadius: 1 }} />
          <div style={{ position: 'absolute', left: 0, height: 2, width: `${progress}%`, background: '#17181c', borderRadius: 1 }} />
          <div style={{ position: 'absolute', left: `${progress}%`, width: 11, height: 11, marginLeft: -5.5, borderRadius: '50%', background: '#17181c' }} />
        </div>

        {/* Time */}
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#b6b5b2', width: 76, whiteSpace: 'nowrap', textAlign: 'right', flex: '0 0 auto' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Close */}
        <button
          onClick={close}
          style={{ background: 'none', border: 'none', color: '#b6b5b2', fontSize: 16, cursor: 'pointer', flex: '0 0 auto', padding: 4 }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

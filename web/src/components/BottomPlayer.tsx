'use client'

import { useEffect, useRef, useState } from 'react'
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

  // All hooks must be before any early returns
  const [scrubbing, setScrubbing] = useState(false)
  const [scrubFraction, setScrubFraction] = useState(0)
  const scrubFractionRef = useRef(0)

  useEffect(() => {
    if (isEditRoute) close()
  }, [isEditRoute])

  if (!track) return null
  if (isEditRoute) return null

  const audioProgress = duration > 0 ? (currentTime / duration) * 100 : 0
  const progress = scrubbing ? scrubFraction * 100 : audioProgress

  function getFraction(clientX: number, el: Element) {
    const rect = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }

  // Desktop: click to seek instantly, drag for smooth scrub
  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const f = getFraction(e.clientX, e.currentTarget)
    scrubFractionRef.current = f
        setScrubbing(true)
    setScrubFraction(f)

    function onMove(ev: MouseEvent) {
      const bar = document.querySelector('.progress-bar-desktop')
      if (!bar) return
      const fv = getFraction(ev.clientX, bar)
      scrubFractionRef.current = fv
      setScrubFraction(fv)
    }
    function onUp() {
      setScrubbing(false)
      seek(scrubFractionRef.current)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Touch: update visual only, seek once on release
  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const f = getFraction(e.touches[0].clientX, e.currentTarget)
    scrubFractionRef.current = f
    setScrubbing(true)
    setScrubFraction(f)
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    e.preventDefault()
    const f = getFraction(e.touches[0].clientX, e.currentTarget)
    scrubFractionRef.current = f
    setScrubFraction(f)
  }

  function handleTouchEnd() {
    setScrubbing(false)
    seek(scrubFractionRef.current)
  }

  const prevBtn = (
    <button onClick={playPrev} title="Previous song" style={{ background: 'none', border: 'none', color: '#b8b5be', cursor: 'pointer', flex: '0 0 auto', padding: 4 }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="2" width="3" height="12" rx="1"/>
        <polygon points="15,2 6,8 15,14"/>
      </svg>
    </button>
  )

  const playBtn = (
    <button onClick={togglePlay} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: '#17181c', color: '#fff', fontSize: 13, cursor: 'pointer', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
  )

  const nextBtn = (
    <button onClick={playNext} title="Next song" style={{ background: 'none', border: 'none', color: '#b8b5be', cursor: 'pointer', flex: '0 0 auto', padding: 4 }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <polygon points="1,2 10,8 1,14"/>
        <rect x="12" y="2" width="3" height="12" rx="1"/>
      </svg>
    </button>
  )

  const progressBar = (
    <div
      className="progress-bar-desktop"
      onMouseDown={handleMouseDown}
      style={{ flex: 1, height: 32, display: 'flex', alignItems: 'center', position: 'relative', cursor: 'pointer', userSelect: 'none' }}
    >
      <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: '#e3e0d8', borderRadius: 1 }} />
      <div style={{ position: 'absolute', left: 0, height: 2, width: `${progress}%`, background: '#1a1a1f', borderRadius: 1 }} />
      <div style={{ position: 'absolute', left: `${progress}%`, width: 11, height: 11, marginLeft: -5.5, borderRadius: '50%', background: '#1a1a1f', transform: scrubbing ? 'scale(1.4)' : 'scale(1)', transition: scrubbing ? 'none' : 'transform 0.1s' }} />
    </div>
  )

  const progressBarTouch = (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', position: 'relative', cursor: 'pointer', touchAction: 'none' }}
    >
      <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: '#e3e0d8', borderRadius: 2 }} />
      <div style={{ position: 'absolute', left: 0, height: 3, width: `${progress}%`, background: '#1a1a1f', borderRadius: 2 }} />
      <div style={{ position: 'absolute', left: `${progress}%`, width: 22, height: 22, marginLeft: -11, borderRadius: '50%', background: '#1a1a1f', transform: scrubbing ? 'scale(1.2)' : 'scale(1)', transition: scrubbing ? 'none' : 'transform 0.15s' }} />
    </div>
  )

  const timeDisplay = (
    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#b8b5be', whiteSpace: 'nowrap', flex: '0 0 auto' }}>
      {formatTime(currentTime)} / {formatTime(duration)}
    </div>
  )

  const closeBtn = (
    <button onClick={close} style={{ background: 'none', border: 'none', color: '#b8b5be', fontSize: 20, cursor: 'pointer', flex: '0 0 auto', padding: 4, lineHeight: 1 }}>
      ×
    </button>
  )

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      background: '#ffffff', borderTop: '1px solid #e3e0d8', boxShadow: '0 -4px 16px rgba(0,0,0,0.05)',
      zIndex: 20, paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {/* Desktop layout */}
      <div className="bp-desktop" style={{ maxWidth: 920, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {prevBtn}
        {playBtn}
        <div className="bottom-player-info" style={{ flex: '0 0 auto', minWidth: 90, maxWidth: 150 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#17181c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.songTitle}</div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10.5, color: '#b8b5be', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.fileName}</div>
        </div>
        {progressBar}
        <div className="bottom-player-time">{timeDisplay}</div>
        {nextBtn}
        {closeBtn}
      </div>

      {/* Mobile layout */}
      <div className="bp-mobile" style={{ display: 'none', padding: '14px 16px 28px', flexDirection: 'column', gap: 12 }}>
        {/* Row 1: song info + close */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#17181c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.songTitle}</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#b8b5be', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{track.fileName}</div>
          </div>
          {closeBtn}
        </div>
        {/* Row 2: progress + time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {progressBarTouch}
          {timeDisplay}
        </div>
        {/* Row 3: controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          <button onClick={playPrev} title="Previous song" style={{ background: 'none', border: 'none', color: '#b8b5be', cursor: 'pointer', padding: 8 }}>
            <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="2" width="3" height="12" rx="1"/>
              <polygon points="15,2 6,8 15,14"/>
            </svg>
          </button>
          <button onClick={togglePlay} style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: '#17181c', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {playing ? (
              <svg width="18" height="18" viewBox="0 0 14 14" fill="currentColor">
                <rect x="2" y="1" width="4" height="12" rx="1"/>
                <rect x="8" y="1" width="4" height="12" rx="1"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 14 14" fill="currentColor" style={{ marginLeft: 2 }}>
                <polygon points="2,1 13,7 2,13"/>
              </svg>
            )}
          </button>
          <button onClick={playNext} title="Next song" style={{ background: 'none', border: 'none', color: '#b8b5be', cursor: 'pointer', padding: 8 }}>
            <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor">
              <polygon points="1,2 10,8 1,14"/>
              <rect x="12" y="2" width="3" height="12" rx="1"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

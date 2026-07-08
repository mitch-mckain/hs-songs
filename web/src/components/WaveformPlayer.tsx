'use client'

import { useEffect, useState, useRef } from 'react'
import { usePlayer } from '@/context/PlayerContext'

const BAR_COUNT = 120

interface Props {
  songId: string
  songTitle: string
  fileId: string
  fileName: string
  logicUrl?: string
}

function formatTime(s: number): string {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function WaveformPlayer({ songId, songTitle, fileId, fileName, logicUrl }: Props) {
  const { track, playing, currentTime, duration, play, seek } = usePlayer()
  const [bars, setBars] = useState<number[]>([])
  const [loadingWaveform, setLoadingWaveform] = useState(true)
  const didFetch = useRef(false)

  const isActive = track?.fileId === fileId
  const isPlaying = isActive && playing
  const progress = isActive && duration > 0 ? currentTime / duration : 0

  useEffect(() => {
    if (didFetch.current) return
    didFetch.current = true

    async function buildWaveform() {
      try {
        const res = await fetch(`/api/drive/stream/${fileId}`)
        if (!res.ok) return
        const buffer = await res.arrayBuffer()
        const ctx = new AudioContext()
        const decoded = await ctx.decodeAudioData(buffer)
        const channelData = decoded.getChannelData(0)
        const blockSize = Math.floor(channelData.length / BAR_COUNT)
        const heights: number[] = []
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[i * blockSize + j])
          }
          heights.push(sum / blockSize)
        }
        const max = Math.max(...heights, 0.001)
        setBars(heights.map(h => 4 + Math.round((h / max) * 28)))
        await ctx.close()
      } catch {
        // Fallback: random-looking bars
        setBars(Array.from({ length: BAR_COUNT }, (_, i) => {
          const s = ((i * 9301) + 49297) % 233280
          return 6 + Math.round((s / 233280) * 26)
        }))
      } finally {
        setLoadingWaveform(false)
      }
    }

    buildWaveform()
  }, [fileId])

  function handleWaveformClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const fraction = (e.clientX - rect.left) / rect.width
    if (isActive) {
      seek(fraction)
    } else {
      play({ songId, songTitle, fileId, fileName })
      setTimeout(() => seek(fraction), 300)
    }
  }

  function handlePlayPause() {
    play({ songId, songTitle, fileId, fileName })
  }

  return (
    <div style={{ border: '1px solid #17181c', borderRadius: 2, padding: 20, background: '#faf7ee' }}>
      {/* File header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <GoogleDriveIcon />
        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12.5, color: '#5f5e5b', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</div>
        {logicUrl && (
          <a
            href={logicUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#37352f', textDecoration: 'none', border: '1px solid #17181c', borderRadius: 2, padding: '3px 8px', flexShrink: 0 }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24"><rect width="24" height="24" rx="2" fill="#17181c"/><path d="M8 8h8v8H8z" fill="none" stroke="#fff" strokeWidth="1.4"/></svg>
            Logic project <span style={{ fontSize: 10, color: '#8f8f89' }}>↗</span>
          </a>
        )}
      </div>

      {/* Player controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={handlePlayPause}
          style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#17181c', color: '#fff', cursor: 'pointer', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isPlaying ? (
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

        {/* Waveform */}
        <div
          onClick={handleWaveformClick}
          style={{ flex: 1, height: 38, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', overflow: 'hidden' }}
        >
          {loadingWaveform ? (
            <div style={{ flex: 1, height: 2, background: '#e0d8ca', borderRadius: 1 }} />
          ) : bars.map((h, i) => {
            const fraction = i / BAR_COUNT
            const played = fraction <= progress
            return (
              <div
                key={i}
                style={{ flex: '1 1 0', minWidth: 1, borderRadius: 1, height: h, background: played ? '#d0471e' : '#e0d8ca' }}
              />
            )
          })}
        </div>

        {/* Time */}
        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, color: '#a4917a', width: 76, whiteSpace: 'nowrap', textAlign: 'right', flex: '0 0 auto' }}>
          {isActive ? `${formatTime(currentTime)} / ${formatTime(duration)}` : formatTime(0)}
        </div>
      </div>
    </div>
  )
}

function GoogleDriveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 87.3 78" style={{ flex: '0 0 auto' }}>
      <path fill="#0066da" d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"/>
      <path fill="#00ac47" d="M43.65 25l-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z"/>
      <path fill="#ea4335" d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"/>
      <path fill="#00832d" d="M43.65 25l13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"/>
      <path fill="#2684fc" d="M59.7 53h-27.5l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h45.5c1.6 0 3.15-.45 4.5-1.2z"/>
      <path fill="#ffba00" d="M73.4 27.3l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 13.75 23.8h27.45c0-1.55-.4-3.1-1.2-4.5z"/>
    </svg>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  fileId: string
  title: string
}

interface Track {
  index: number
  name: string
}

// Load AlphaTab from CDN once and reuse
function loadAlphaTabScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as { alphaTab?: unknown }).alphaTab) { resolve(); return }
    if (document.getElementById('alphatab-cdn')) {
      // Script tag exists but not yet loaded — wait for it
      document.getElementById('alphatab-cdn')!.addEventListener('load', () => resolve())
      document.getElementById('alphatab-cdn')!.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.id = 'alphatab-cdn'
    script.src = 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.min.js'
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export default function AlphaTabViewer({ fileId, title }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [activeTrack, setActiveTrack] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let destroyed = false

    async function init() {
      try {
        await loadAlphaTabScript()
        if (destroyed) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const at = (window as any).alphaTab
        if (!at) throw new Error('AlphaTab failed to load from CDN')

        const settings = new at.Settings()
        settings.player.enablePlayer = true
        settings.player.enableCursor = true
        settings.player.scrollMode = 0 // Off — prevent auto-scroll to cursor
        settings.player.soundFont = 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2'
        settings.core.fontDirectory = 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/'
        settings.display.scale = 0.9

        const api = new at.AlphaTabApi(containerRef.current!, settings)
        apiRef.current = api

        api.scoreLoaded.on((score: { tracks: { name: string }[] }) => {
          if (destroyed) return
          const savedY = window.scrollY
          const trackList = score.tracks.map((t, i) => ({
            index: i,
            name: t.name?.trim() || `Track ${i + 1}`,
          }))
          setTracks(trackList)
          setLoading(false)
          requestAnimationFrame(() => window.scrollTo({ top: savedY, behavior: 'instant' }))
        })

        api.playerStateChanged.on((e: { state: number }) => {
          if (!destroyed) setPlaying(e.state === 1)
        })

        api.error.on((e: { message?: string }) => {
          if (!destroyed) {
            setError(`Could not load tab: ${e.message ?? 'unknown error'}`)
            setLoading(false)
          }
        })

        // Fetch GP file and pass as ArrayBuffer
        const res = await fetch(`/api/drive/stream/${fileId}`)
        if (!res.ok) throw new Error(`Failed to fetch tab: ${res.status}`)
        const arrayBuffer = await res.arrayBuffer()
        if (destroyed) return
        api.load(arrayBuffer, [0])

      } catch (err) {
        if (!destroyed) {
          setError(err instanceof Error ? err.message : 'Failed to initialize tab viewer')
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      destroyed = true
      try { apiRef.current?.destroy?.() } catch {}
      apiRef.current = null
    }
  }, [fileId])

  function togglePlay() {
    apiRef.current?.playPause()
  }

  function switchTrack(trackIndex: number) {
    const api = apiRef.current
    if (!api?.score) return
    setActiveTrack(trackIndex)
    api.renderTracks([api.score.tracks[trackIndex]])
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          onClick={togglePlay}
          disabled={loading || !!error}
          style={{
            width: 34, height: 34, borderRadius: '50%', border: 'none',
            background: loading || error ? '#ECE4D2' : '#17181c',
            color: '#fff', fontSize: 12,
            cursor: loading || error ? 'not-allowed' : 'pointer',
            flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
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
        <div style={{ fontSize: 12, color: '#9b9a97' }}>
          Guitar Pro tab — {title}
          {loading && !error && <span style={{ color: '#c9c8c4' }}> · Loading…</span>}
        </div>
      </div>

      {tracks.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {tracks.map(track => (
            <button
              key={track.index}
              onClick={() => switchTrack(track.index)}
              style={{
                fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${activeTrack === track.index ? '#1a1a1f' : '#e3e0d8'}`,
                background: activeTrack === track.index ? '#1a1a1f' : '#ffffff',
                color: activeTrack === track.index ? '#fff' : '#4a4850',
              }}
            >
              {track.name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div style={{ fontSize: 13, color: '#9b9a97', fontStyle: 'italic', marginBottom: 8 }}>{error}</div>
      )}

      <div ref={containerRef} style={{ width: '100%', minHeight: 420, overflow: 'auto' }} />
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePlayer } from '@/context/PlayerContext'
import type { Song } from '@/types/database'

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  demo:     { bg: '#FBE3B8', color: '#8A5A16', label: 'Demo' },
  released: { bg: '#DCEEBF', color: '#4C7A20', label: 'Released' },
}

function CassetteIcon({ spinning }: { spinning: boolean }) {
  const reelAnim: React.CSSProperties = spinning
    ? { animation: 'cassette-reel 1.8s linear infinite' }
    : {}
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" width="100%" height="100%" style={{ display: 'block', borderRadius: 2 }}>
      <style>{`@keyframes cassette-reel { to { transform: rotate(360deg); } }`}</style>
      {/* Body */}
      <rect x="0" y="0" width="160" height="100" rx="6" fill="#1e1c19"/>
      {/* Label */}
      <rect x="6" y="5" width="148" height="26" rx="3" fill="#F5F1E4"/>
      {/* Label bottom stripe */}
      <rect x="6" y="27" width="148" height="4" fill="#d6cab4"/>
      {/* Window */}
      <rect x="18" y="36" width="124" height="52" rx="4" fill="#0a0908"/>
      <rect x="21" y="39" width="118" height="45" rx="2" fill="#111"/>
      {/* Tape bridge */}
      <rect x="21" y="81" width="118" height="3" fill="#1e1c19"/>
      {/* Tape guides */}
      <circle cx="30" cy="82" r="3" fill="#2e2b27"/>
      <circle cx="130" cy="82" r="3" fill="#2e2b27"/>
      {/* Left reel */}
      <g style={{ transformOrigin: '56px 61px', ...reelAnim }}>
        <circle cx="56" cy="61" r="16" fill="#1a1815"/>
        <circle cx="56" cy="61" r="11" fill="#2e2b27"/>
        <line x1="56" y1="50" x2="56" y2="55" stroke="#555" strokeWidth="2"/>
        <line x1="56" y1="67" x2="56" y2="72" stroke="#555" strokeWidth="2"/>
        <line x1="45" y1="61" x2="50" y2="61" stroke="#555" strokeWidth="2"/>
        <line x1="62" y1="61" x2="67" y2="61" stroke="#555" strokeWidth="2"/>
        <line x1="48.2" y1="53.2" x2="51.8" y2="56.8" stroke="#555" strokeWidth="1.5"/>
        <line x1="60.2" y1="65.2" x2="63.8" y2="68.8" stroke="#555" strokeWidth="1.5"/>
        <line x1="63.8" y1="53.2" x2="60.2" y2="56.8" stroke="#555" strokeWidth="1.5"/>
        <line x1="51.8" y1="65.2" x2="48.2" y2="68.8" stroke="#555" strokeWidth="1.5"/>
        <circle cx="56" cy="61" r="5" fill="#c7c3ba"/>
        <circle cx="56" cy="61" r="2.2" fill="#1e1c19"/>
      </g>
      {/* Right reel */}
      <g style={{ transformOrigin: '104px 61px', ...reelAnim }}>
        <circle cx="104" cy="61" r="16" fill="#1a1815"/>
        <circle cx="104" cy="61" r="11" fill="#2e2b27"/>
        <line x1="104" y1="50" x2="104" y2="55" stroke="#555" strokeWidth="2"/>
        <line x1="104" y1="67" x2="104" y2="72" stroke="#555" strokeWidth="2"/>
        <line x1="93" y1="61" x2="98" y2="61" stroke="#555" strokeWidth="2"/>
        <line x1="110" y1="61" x2="115" y2="61" stroke="#555" strokeWidth="2"/>
        <line x1="96.2" y1="53.2" x2="99.8" y2="56.8" stroke="#555" strokeWidth="1.5"/>
        <line x1="108.2" y1="65.2" x2="111.8" y2="68.8" stroke="#555" strokeWidth="1.5"/>
        <line x1="111.8" y1="53.2" x2="108.2" y2="56.8" stroke="#555" strokeWidth="1.5"/>
        <line x1="99.8" y1="65.2" x2="96.2" y2="68.8" stroke="#555" strokeWidth="1.5"/>
        <circle cx="104" cy="61" r="5" fill="#c7c3ba"/>
        <circle cx="104" cy="61" r="2.2" fill="#1e1c19"/>
      </g>
      {/* Corner screws */}
      <circle cx="8" cy="9" r="3" fill="#141210"/>
      <circle cx="152" cy="9" r="3" fill="#141210"/>
      <circle cx="8" cy="93" r="3" fill="#141210"/>
      <circle cx="152" cy="93" r="3" fill="#141210"/>
      {/* Bottom notch */}
      <rect x="73" y="95" width="14" height="4" rx="1.5" fill="#141210"/>
    </svg>
  )
}

interface Props {
  songs: Song[]
  role: 'editor' | 'viewer'
}

export default function LibraryView({ songs, role }: Props) {
  const router = useRouter()
  const isEditor = role === 'editor'
  const { play, track, playing, togglePlay } = usePlayer()

  const [loadingSongId, setLoadingSongId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'demo' | 'released'>('all')

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handlePlayButton(e: React.MouseEvent, song: Song) {
    e.stopPropagation()

    if (track?.songId === song.id) {
      togglePlay()
      return
    }

    if (!song.drive_folder_url) return

    setLoadingSongId(song.id)
    try {
      const res = await fetch(`/api/drive/folder?url=${encodeURIComponent(song.drive_folder_url)}`)
      const data = await res.json()
      if (data.audioFile) {
        play({ songId: song.id, songTitle: song.title, fileId: data.audioFile.id, fileName: data.audioFile.name })
      }
    } finally {
      setLoadingSongId(null)
    }
  }

  function relativeTime(dateStr: string): string {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    if (days < 365) return `${Math.floor(days / 30)}mo ago`
    return `${Math.floor(days / 365)}y ago`
  }

  // Filter then group
  const filtered = songs.filter(s => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    return matchSearch && matchStatus
  })

  // Group: demos first, then by album
  const demos = filtered.filter(s => s.status === 'demo' || !s.album)
  const byAlbum: Record<string, Song[]> = {}
  filtered.filter(s => s.status !== 'demo' && s.album).forEach(s => {
    const album = s.album!
    if (!byAlbum[album]) byAlbum[album] = []
    byAlbum[album].push(s)
  })

  const sections: { heading: string; songs: Song[] }[] = []
  if (demos.length) sections.push({ heading: 'Demos', songs: demos })
  Object.entries(byAlbum).forEach(([album, songs]) => sections.push({ heading: album, songs }))

  return (
    <div style={{ minHeight: '100vh', background: '#fbfaf7', paddingBottom: 96 }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '48px 20px 60px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 40, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8a8790' }}>Band Database</span>
              <span style={{ fontSize: 10, color: '#b8b5be' }}>Heavy Sweater</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 800, fontSize: 'clamp(26px,7vw,38px)', color: '#1a1a1f', letterSpacing: '-0.04em', margin: 0 }}>
              Song Dashboard
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
            {isEditor && (
              <button
                onClick={() => router.push('/songs/new')}
                style={{ fontSize: 13, fontWeight: 700, padding: '7px 14px', borderRadius: 8, background: '#1a1a1f', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                + New song
              </button>
            )}
            <button
              onClick={signOut}
              style={{ fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 8, background: '#ffffff', color: '#4a4850', border: '1px solid #e3e0d8', cursor: 'pointer' }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Search + filter bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search songs…"
            style={{ flex: '1 1 180px', fontFamily: 'inherit', fontSize: 13, padding: '7px 12px', border: '1px solid #e3e0d8', borderRadius: 8, background: '#ffffff', color: '#1a1a1f', outline: 'none' }}
          />
          {(['all', 'demo', 'released'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: '1px solid', borderColor: statusFilter === f ? '#1a1a1f' : '#e3e0d8', background: statusFilter === f ? '#1a1a1f' : '#ffffff', color: statusFilter === f ? '#fff' : '#4a4850', cursor: 'pointer', textTransform: 'capitalize' }}
            >
              {f === 'all' ? 'All' : STATUS_STYLES[f].label}
            </button>
          ))}
        </div>

        {/* Song sections */}
        {sections.length === 0 ? (
          <div style={{ color: '#8f8f89', fontSize: 13, fontFamily: 'var(--font-mono), monospace' }}>
            {search || statusFilter !== 'all' ? 'No songs match.' : `No songs yet.${isEditor ? ' Add one with "+ New song".' : ''}`}
          </div>
        ) : (
          sections.map(section => (
            <div key={section.heading} style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8a8790', paddingBottom: 10, borderBottom: '1px solid #e3e0d8' }}>
                {section.heading}
              </div>
              <div>
                {section.songs.map(song => {
                  const status = STATUS_STYLES[song.status] ?? STATUS_STYLES.demo
                  const isThisPlaying = track?.songId === song.id && playing
                  const isLoading = loadingSongId === song.id
                  const hasFolder = !!song.drive_folder_url

                  return (
                    <div
                      key={song.id}
                      onClick={() => router.push(`/songs/${song.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 8px', cursor: 'pointer', borderBottom: '1px solid #e3e0d8', background: 'transparent', transition: 'background 0.1s', borderRadius: 8 }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ee'; e.currentTarget.style.borderRadius = '8px' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {/* Album art */}
                      <div style={{ flexShrink: 0, width: 96, height: 67 }} onClick={e => e.stopPropagation()}>
                        <CassetteIcon spinning={isThisPlaying} />
                      </div>

                      {/* Play button */}
                      <button
                        onClick={e => handlePlayButton(e, song)}
                        disabled={!hasFolder || isLoading}
                        style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: 'none',
                          background: hasFolder ? '#1a1a1f' : '#f5f3ee',
                          color: hasFolder ? '#fff' : '#b8b5be',
                          cursor: hasFolder && !isLoading ? 'pointer' : 'not-allowed',
                        }}
                        title={hasFolder ? undefined : 'No Drive folder linked'}
                      >
                        {isLoading ? (
                          <span style={{ fontSize: 13, lineHeight: 1 }}>…</span>
                        ) : isThisPlaying ? (
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

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, lineHeight: 1, fontSize: 12, fontWeight: 600, padding: '4px 10px 4px 8px', borderRadius: 20, background: status.bg, color: status.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
                            {status.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#8a8790', flexWrap: 'wrap', fontFamily: 'var(--font-mono), monospace' }}>
                          <span>KEY <b style={{ color: '#4a4850' }}>{song.key ?? '—'}</b></span>
                          <span>BPM <b style={{ color: '#4a4850' }}>{song.bpm ?? '—'}</b></span>
                          <span>TUNING <b style={{ color: '#4a4850' }}>{song.tuning}</b></span>
                        </div>
                      </div>

                      {/* Updated date */}
                      <div style={{ fontSize: 11, color: '#b8b5be', flexShrink: 0, whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'var(--font-mono), monospace' }}>
                        <div>{relativeTime(song.last_updated)}</div>
                        <div style={{ fontSize: 10, color: '#c9c6bc', marginTop: 2 }}>{new Date(song.last_updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

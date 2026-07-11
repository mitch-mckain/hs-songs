'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { buildDiagramData, transposeChordName, transposeShape } from '@/lib/chords'
import ChordDiagram from '@/components/ChordDiagram'
import WaveformPlayer from '@/components/WaveformPlayer'
import dynamic from 'next/dynamic'
import NotesEditor from '@/components/NotesEditor'

const AlphaTabViewer = dynamic(() => import('@/components/AlphaTabViewer'), { ssr: false })
import type { Song, SongChord, SongStructureRow } from '@/types/database'

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  demo:     { bg: '#FBE3B8', color: '#8A5A16', label: 'Demo' },
  released: { bg: '#DCEEBF', color: '#4C7A20', label: 'Released' },
}

const PILL_COLORS: Record<string, { bg: string; color: string }> = {
  intro:   { bg: '#E6E1D4', color: '#6b665a' },
  verse:   { bg: '#CDECF7', color: '#1D6E8F' },
  prehook: { bg: '#FBE3B8', color: '#8A5A16' },
  chorus:  { bg: '#DCEEBF', color: '#4C7A20' },
  bridge:  { bg: '#E3DBF0', color: '#5B4A87' },
  outro:   { bg: '#E6E1D4', color: '#6b665a' },
}

interface Props {
  song: Song
  chords: SongChord[]
  structureRows: SongStructureRow[]
  role: 'editor' | 'viewer'
}

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: open ? 18 : 0 }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#1a1a1f', flexShrink: 0 }} />
      <span style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a1f', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1.3 }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: '#e3e0d8' }} />
      <span style={{ fontSize: 12, color: '#8a8790', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', lineHeight: 1 }}>▸</span>
    </div>
  )
}

export default function SongDetail({ song, chords, structureRows, role }: Props) {
  const router = useRouter()
  const isEditor = role === 'editor'
  const status = STATUS_STYLES[song.status] ?? STATUS_STYLES.demo

  const [audioFile, setAudioFile] = useState<{ id: string; name: string } | null>(null)
  const [gpFile, setGpFile] = useState<{ id: string; name: string } | null>(null)
  const [logicFile, setLogicFile] = useState<{ url: string } | null>(null)
  const [docFile, setDocFile] = useState<{ url: string } | null>(null)
  const [practiceFiles, setPracticeFiles] = useState<{ id: string; name: string }[]>([])
  const [folderError, setFolderError] = useState<string | null>(null)

  const [lyrics, setLyrics] = useState<string | null>(null)
  const [lyricsError, setLyricsError] = useState<string | null>(null)
  const [lyricsLoading, setLyricsLoading] = useState(false)

  const [notesValue, setNotesValue] = useState(song.notes ?? '')
  const [notesEditing, setNotesEditing] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)

  const [demoOpen, setDemoOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(true)
  const [structureOpen, setStructureOpen] = useState(true)
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set())
  const [transpose, setTranspose] = useState(0)
  const [metronomePlaying, setMetronomePlaying] = useState(false)
  const metronomeRef = useRef<{ ctx: AudioContext; timerId: ReturnType<typeof setTimeout> } | null>(null)
  const [chordsOpen, setChordsOpen] = useState(true)
  const [riffsOpen, setRiffsOpen] = useState(true)
  const [lyricsOpen, setLyricsOpen] = useState(true)
  const [expandedChord, setExpandedChord] = useState<{ name: string; diagram: ReturnType<typeof buildDiagramData> } | null>(null)

  useEffect(() => {
    if (!song.drive_folder_url) return
    fetch(`/api/drive/folder?url=${encodeURIComponent(song.drive_folder_url)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setFolderError(data.error.includes('access token') ? 'Google session expired — sign out and sign back in to refresh it.' : data.error)
        } else {
          setAudioFile(data.audioFile ?? null)
          setGpFile(data.gpFile ?? null)
          setLogicFile(data.logicFile ?? null)
          setDocFile(data.docFile ?? null)
          setPracticeFiles(data.practiceFiles ?? [])
        }
      })
      .catch(() => setFolderError('Failed to scan Drive folder — try signing out and back in'))
  }, [song.drive_folder_url])

  useEffect(() => {
    if (!docFile) return
    setLyricsLoading(true)
    fetch(`/api/lyrics?url=${encodeURIComponent(docFile.url)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setLyricsError(data.error)
        else setLyrics(data.text)
      })
      .catch(() => setLyricsError('Failed to load lyrics'))
      .finally(() => setLyricsLoading(false))
  }, [docFile])

  // Metronome
  function toggleMetronome() {
    if (metronomePlaying) {
      if (metronomeRef.current) {
        clearTimeout(metronomeRef.current.timerId)
        metronomeRef.current.ctx.close()
        metronomeRef.current = null
      }
      setMetronomePlaying(false)
      return
    }
    const bpm = parseFloat(song.bpm ?? '0')
    if (!bpm) return
    const beatsPerMeasure = parseInt(song.time_signature?.split('/')[0] ?? '4') || 4
    const ctx = new AudioContext()
    const interval = 60 / bpm
    let nextTick = ctx.currentTime + 0.05
    let beatIndex = 0
    function schedule() {
      while (nextTick < ctx.currentTime + 0.25) {
        const isAccent = beatIndex % beatsPerMeasure === 0
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = isAccent ? 1320 : 880
        gain.gain.setValueAtTime(isAccent ? 0.5 : 0.3, nextTick)
        gain.gain.exponentialRampToValueAtTime(0.001, nextTick + 0.04)
        osc.start(nextTick)
        osc.stop(nextTick + 0.05)
        nextTick += interval
        beatIndex++
      }
      metronomeRef.current = { ctx, timerId: setTimeout(schedule, 100) }
    }
    schedule()
    setMetronomePlaying(true)
  }

  // Cleanup metronome on unmount
  useEffect(() => () => {
    if (metronomeRef.current) {
      clearTimeout(metronomeRef.current.timerId)
      metronomeRef.current.ctx.close()
    }
  }, [])

  // Keyboard shortcut: C = collapse/expand all structure rows
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') { setExpandedChord(null); return }
      if (e.key === 'c' || e.key === 'C') {
        setCollapsedRows(prev => {
          const allCollapsed = structureRows.every(r => prev.has(r.id))
          return allCollapsed ? new Set() : new Set(structureRows.map(r => r.id))
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [structureRows])

  const metaFields = [
    { label: 'KEY',     value: song.key ?? '—' },
    { label: 'BPM',     value: song.bpm ?? '—' },
    { label: 'TIME',    value: song.time_signature ?? '—' },
    { label: 'CAPO',    value: song.capo ?? '—' },
    { label: 'TUNING',  value: song.tuning },
    { label: 'VERSION', value: song.version ?? '—' },
  ]

  return (
    <>
    <div style={{ minHeight: '100vh', background: '#fbfaf7', paddingBottom: 80 }}>
      <div className="detail-container" style={{ maxWidth: 920, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Back + Edit */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button
            onClick={() => router.push('/')}
            style={{ width: 36, height: 36, borderRadius: '50%', background: '#ffffff', border: '1px solid #e3e0d8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#4a4850" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2L4 7l5 5"/>
            </svg>
          </button>
          {isEditor && (
            <button
              onClick={() => router.push(`/songs/${song.id}/edit`)}
              style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', background: '#ffffff', color: '#4a4850', border: '1px solid #e3e0d8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              Edit song
            </button>
          )}
        </div>

        {/* Title + status + date */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 800, fontSize: 'clamp(32px,8vw,48px)', color: '#1a1a1f', letterSpacing: '-0.04em', margin: 0 }}>
              {song.title}
            </h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, lineHeight: 1, fontSize: 12, fontWeight: 600, padding: '6px 12px 6px 9px', borderRadius: 20, background: status.bg, color: status.color }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
              {status.label}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, color: '#b8b5be', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Updated {new Date(song.last_updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        {/* Metadata grid */}
        <div className="meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, background: '#e3e0d8', borderRadius: 10, overflow: 'hidden', marginBottom: 40, boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}>
          {metaFields.map(f => (
            <div key={f.label} style={{ padding: '14px 15px', background: '#ffffff' }}>
              <div style={{ fontSize: 10, color: '#8a8790', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>{f.label}</div>
              {f.label === 'BPM' && song.bpm ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono), monospace', fontWeight: 700, fontSize: 17, color: '#1a1a1f' }}>{f.value}</span>
                  <button
                    onClick={toggleMetronome}
                    title={metronomePlaying ? 'Stop metronome' : 'Start metronome'}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: metronomePlaying ? '#1a1a1f' : '#8a8790', flexShrink: 0 }}
                  >
                    <svg width="16" height="20" viewBox="0 0 16 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      {/* Body trapezoid */}
                      <path d="M1.5 18.5 L14.5 18.5 L11 2.5 L5 2.5 Z"/>
                      {/* Top cap */}
                      <path d="M5.5 2.5 L5 0.5 L11 0.5 L10.5 2.5" fill="currentColor" stroke="none"/>
                      {/* Spindle */}
                      <line x1="8" y1="4" x2="8" y2="17" strokeWidth="1" opacity="0.5"/>
                      {/* Pendulum arm swung right */}
                      <line x1="8" y1="16" x2="13" y2="7"/>
                      {/* Weight on pendulum */}
                      <rect x="11.5" y="5.5" width="4" height="2.5" rx="1" fill="currentColor" stroke="none"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <div style={{ fontFamily: 'var(--font-mono), monospace', fontWeight: 700, fontSize: 17, color: '#1a1a1f' }}>{f.value}</div>
              )}
            </div>
          ))}
        </div>

        {/* ── DEMO ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: demoOpen ? 18 : 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#1a1a1f', flexShrink: 0 }} />
            <span
              onClick={() => setDemoOpen(o => !o)}
              style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a1f', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1.3, cursor: 'pointer', flexShrink: 0 }}
            >Demo</span>
            <div style={{ flex: 1, height: 1, background: '#e3e0d8', cursor: 'pointer' }} onClick={() => setDemoOpen(o => !o)} />
            {logicFile && (
              <a
                href={logicFile.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#4a4850', textDecoration: 'none', border: '1px solid #e3e0d8', borderRadius: 8, padding: '5px 10px', flexShrink: 0 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24"><rect width="24" height="24" rx="2" fill="#1a1a1f"/><path d="M8 8h8v8H8z" fill="none" stroke="#fff" strokeWidth="1.4"/></svg>
                Logic project <span style={{ fontSize: 11, color: '#8a8790' }}>↗</span>
              </a>
            )}
            <span
              onClick={() => setDemoOpen(o => !o)}
              style={{ fontSize: 12, color: '#8a8790', display: 'inline-block', transform: demoOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}
            >▸</span>
          </div>
          {demoOpen && (
            <div style={{ background: '#ffffff', border: '1px solid #e3e0d8', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8a8790', marginBottom: 12 }}>Logic Demo</div>
                {audioFile ? (
                  <WaveformPlayer
                    songId={song.id}
                    songTitle={song.title}
                    fileId={audioFile.id}
                    fileName={audioFile.name}
                  />
                ) : (
                  <div>
                    {folderError ? (
                      <div style={{ fontSize: 13, color: '#8a8790', fontStyle: 'italic' }}>{folderError}</div>
                    ) : song.drive_folder_url ? (
                      <div style={{ fontSize: 13, color: '#8a8790', fontStyle: 'italic' }}>Scanning Drive folder…</div>
                    ) : (
                      <div style={{ fontSize: 13, fontStyle: 'italic', color: '#8a8790' }}>No Drive folder linked yet — add one in Edit song.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Practice Recordings sub-section */}
              {practiceFiles.length > 0 && (
                <div style={{ borderTop: '1px solid #e3e0d8', padding: '14px 18px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8a8790', marginBottom: 12 }}>Practice Recordings</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {practiceFiles.length === 0 ? (
                      <div style={{ fontSize: 13, color: '#8a8790', fontStyle: 'italic' }}>No audio files found in practice folder.</div>
                    ) : practiceFiles.map(f => (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <WaveformPlayer songId={`practice-${f.id}`} songTitle={f.name} fileId={f.id} fileName={f.name} compact />
                        <div style={{ fontSize: 11, color: '#8a8790', fontFamily: 'var(--font-mono), monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── NOTES ── */}
        {(song.notes || isEditor) && (
          <div style={{ marginBottom: 32 }}>
            <SectionHeader title="Notes" open={notesOpen} onToggle={() => setNotesOpen(o => !o)} />
            {notesOpen && (
              notesEditing ? (
                <NotesEditor
                  value={notesValue}
                  onChange={setNotesValue}
                  onBlur={async () => {
                    setNotesEditing(false)
                    if (notesValue === (song.notes ?? '')) return
                    setNotesSaving(true)
                    await fetch(`/api/songs/${song.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ notes: notesValue || null }),
                    })
                    setNotesSaving(false)
                  }}
                  minHeight={120}
                />
              ) : (
                <div
                  onClick={() => isEditor && setNotesEditing(true)}
                  style={{ cursor: isEditor ? 'text' : 'default', minHeight: isEditor ? 40 : undefined, borderLeft: '2px solid #e3e0d8', paddingLeft: 14, minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}
                >
                  {notesValue ? (
                    <div
                      className="song-notes"
                      style={{ fontSize: 14.5, lineHeight: 1.6, color: '#4a4850' }}
                      dangerouslySetInnerHTML={{ __html: notesValue }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, color: '#a4917a', padding: '6px 0' }}>{isEditor ? 'Click to add notes…' : ''}</div>
                  )}
                  {notesSaving && <span style={{ fontSize: 12, color: '#a4917a' }}>Saving…</span>}
                </div>
              )
            )}
          </div>
        )}

        {/* ── CHORDS ── */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader title="Chords" open={chordsOpen} onToggle={() => setChordsOpen(o => !o)} />
          {chordsOpen && (
            chords.length === 0 ? (
              <div style={{ fontSize: 13, fontStyle: 'italic', color: '#8a8790', paddingBottom: 8 }}>No chords added yet</div>
            ) : (
              <div>
                <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, paddingRight: 200, marginBottom: 8, WebkitMaskImage: 'linear-gradient(to right, black 88%, transparent 100%)', maskImage: 'linear-gradient(to right, black 88%, transparent 100%)' }}>
                  {[...chords].sort((a, b) => a.position - b.position).map(chord => {
                    const diagram = buildDiagramData({ name: chord.name, strings: chord.strings as (number | 'x')[], barre: chord.barre }, 'large')
                    return (
                      <div key={chord.id} onClick={() => setExpandedChord({ name: chord.name, diagram })} style={{ flex: '0 0 auto', width: 108, background: '#ffffff', border: '1px solid #e3e0d8', borderRadius: 10, padding: '12px 0 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer' }}>
                        <div style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a1f', textAlign: 'center' }}>
                          {chord.name}
                        </div>
                        <ChordDiagram data={diagram} size="large" />
                      </div>
                    )
                  })}
                </div>
                </div>
                {song.tuning && !['Std', 'Eb std'].includes(song.tuning) && (
                  <div style={{ fontSize: 12.5, color: '#8a8790', marginBottom: 8 }}>
                    Played in {song.tuning} tuning
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* ── STRUCTURE ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: structureOpen ? 18 : 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#1a1a1f', flexShrink: 0 }} />
            <span
              onClick={() => setStructureOpen(o => !o)}
              style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a1f', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1.3, cursor: 'pointer', flexShrink: 0 }}
            >Structure</span>
            <div style={{ flex: 1, height: 1, background: '#e3e0d8', cursor: 'pointer' }} onClick={() => setStructureOpen(o => !o)} />
            {structureOpen && structureRows.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span className="structure-hint" style={{ fontSize: 10, color: '#b8b5be', fontFamily: 'var(--font-mono), monospace' }}>C to collapse all</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid #e3e0d8', borderRadius: 20, overflow: 'hidden' }}>
                  <button onClick={() => setTranspose(t => t - 1)} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, width: 26, height: 26, border: 'none', background: 'none', color: '#4a4850', cursor: 'pointer' }}>−</button>
                  <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, fontWeight: 700, color: transpose === 0 ? '#b8b5be' : '#1a1a1f', minWidth: 30, textAlign: 'center' }}>
                    {transpose === 0 ? '0' : transpose > 0 ? `+${transpose}` : transpose}
                  </span>
                  <button onClick={() => setTranspose(t => t + 1)} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, width: 26, height: 26, border: 'none', background: 'none', color: '#4a4850', cursor: 'pointer' }}>+</button>
                </div>
              </div>
            )}
            <span
              onClick={() => setStructureOpen(o => !o)}
              style={{ fontSize: 12, color: '#8a8790', display: 'inline-block', transform: structureOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}
            >▸</span>
          </div>
          {structureOpen && (
            structureRows.length === 0 ? (
              <div style={{ fontSize: 13, fontStyle: 'italic', color: '#8f8f89' }}>No structure added yet</div>
            ) : (
              (() => {
                const chordById = new Map(chords.map(c => [c.id, c]))
                const chordByName = new Map(chords.map(c => [c.name, c]))
                const getChord = (ref: string) => chordById.get(ref) ?? chordByName.get(ref) ?? null
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[...structureRows]
                      .sort((a, b) => a.position - b.position)
                      .map(row => {
                        const pill = PILL_COLORS[row.section_type] ?? PILL_COLORS.verse
                        const chordProgression = row.chord_progression as string[]
                        const isCollapsed = collapsedRows.has(row.id)
                        const isSameAs = chordProgression[0] === '__SAME_AS__'
                        const isSeeTab = chordProgression[0] === '__SEE_TAB__'
                        const showChords = !isCollapsed && !isSeeTab && !isSameAs && chordProgression.length > 0
                        const toggleRow = () => setCollapsedRows(prev => {
                          const next = new Set(prev)
                          next.has(row.id) ? next.delete(row.id) : next.add(row.id)
                          return next
                        })
                        return (
                          <div key={row.id} style={{ background: '#ffffff', border: '1px solid #e3e0d8', borderRadius: 10, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', opacity: isCollapsed ? 0.6 : 1 }}>
                            {/* Row header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: showChords ? 14 : 0 }}>
                              <div onClick={toggleRow} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, fontFamily: 'var(--font-display), Archivo, sans-serif', fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 6, background: pill.bg, color: pill.color, flex: '0 0 auto', textTransform: 'uppercase', letterSpacing: '0.03em', cursor: 'pointer' }}>
                                {row.section_label || row.section_type}
                              </div>
                              {row.bar_count && (
                                <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, color: '#8a8790', flex: '0 0 auto' }}>
                                  ×{row.bar_count}
                                </div>
                              )}
                              {isSameAs && (
                                <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, fontWeight: 700, color: '#4a4850', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Same as {chordProgression[1]}
                                </div>
                              )}
                              {isSeeTab && (
                                <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, fontWeight: 700, color: '#4a4850', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  See tab →
                                </div>
                              )}
                              {row.lyric_snippet && (
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#4a4850', fontStyle: 'italic' }}>"{row.lyric_snippet}"</div>
                              )}
                            </div>
                            {/* Chord chips */}
                            {showChords && (
                              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                {chordProgression.map((ref, i) => {
                                  const chord = getChord(ref)
                                  const displayName = transposeChordName(chord?.name ?? ref, transpose)
                                  const diagramChord = chord && transpose !== 0
                                    ? { ...chord, strings: transposeShape(chord.strings as (number | 'x')[], transpose) }
                                    : chord
                                  const d = diagramChord ? buildDiagramData(diagramChord, 'small') : null
                                  const isLast = i === chordProgression.length - 1
                                  return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <div
                                        onClick={() => d && setExpandedChord({ name: displayName, diagram: d })}
                                        style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fbfaf7', border: '1px solid #e3e0d8', borderRadius: 8, padding: '8px 12px 8px 8px', cursor: d ? 'pointer' : 'default' }}
                                      >
                                        {d ? (
                                          <svg width="52" height="64" viewBox="-18 0 122 128">
                                            {d.fretLabel && <text x="-10" y="32" fontSize="22" fill="#8a8790" textAnchor="middle" fontFamily="-apple-system,sans-serif" dominantBaseline="central">{d.fretLabel}</text>}
                                            {[10, 26.4, 42.8, 59.2, 75.6, 92].map(x => <line key={x} x1={x} y1="14" x2={x} y2="110" stroke="#c7c3ba" strokeWidth="1.3"/>)}
                                            {d.isOpen ? <rect x="10" y="12" width="82" height="4" fill="#1a1a1f"/> : <line x1="10" y1="14" x2="92" y2="14" stroke="#8a8790" strokeWidth="1.3"/>}
                                            {[38, 62, 86, 110].map(y => <line key={y} x1="10" y1={y} x2="92" y2={y} stroke="#e3e0d8" strokeWidth="1"/>)}
                                            {d.barreRect && <rect x={d.barreRect.x} y={d.barreRect.y} width={d.barreRect.width} height={d.barreRect.height} rx="3" fill="#1a1a1f"/>}
                                            {d.mutes.map(m => <text key={m.x} x={m.x} y="4" fontSize="20" fontWeight="700" fill="#8a8790" textAnchor="middle" dominantBaseline="central">×</text>)}
                                            {d.opens.map(o => <circle key={o.x} cx={o.x} cy="4" r="4.5" fill="none" stroke="#1a1a1f" strokeWidth="1.5"/>)}
                                            {d.dots.map((dot, j) => <circle key={j} cx={dot.x} cy={dot.y} r="9.5" fill="#1a1a1f"/>)}
                                          </svg>
                                        ) : (
                                          <div style={{ width: 52, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 10, color: '#b8b5be' }}>?</span></div>
                                        )}
                                        <span style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontSize: 15, fontWeight: 700, color: '#1a1a1f' }}>{displayName}</span>
                                      </div>
                                      {!isLast && <span style={{ color: '#c7c3ba', fontSize: 16 }}>→</span>}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                )
              })()
            )
          )}
        </div>

        {/* ── RIFFS & TAB ── */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader title="Riffs & tab" open={riffsOpen} onToggle={() => setRiffsOpen(o => !o)} />
          {riffsOpen && (
            <div style={{ border: '1px solid #e3e0d8', borderRadius: 10, padding: 16, background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              {gpFile ? (
                <AlphaTabViewer fileId={gpFile.id} title={song.title} />
              ) : song.drive_folder_url ? (
                <div style={{ minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 6 }}>
                  <div style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 15, color: '#1a1a1f' }}>No Guitar Pro file found</div>
                  <div style={{ fontSize: 13, color: '#b8b5be' }}>Add a .gp / .gp5 / .gpx file to the Drive folder</div>
                </div>
              ) : (
                <div style={{ minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 6 }}>
                  <div style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 15, color: '#1a1a1f' }}>No Drive folder linked</div>
                  <div style={{ fontSize: 13, color: '#b8b5be' }}>Add a folder URL in Edit song</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── LYRICS ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: lyricsOpen ? 18 : 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#1a1a1f', flexShrink: 0 }} />
            <span
              onClick={() => setLyricsOpen(o => !o)}
              style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a1f', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1.3, cursor: 'pointer', flexShrink: 0 }}
            >Lyrics</span>
            <div style={{ flex: 1, height: 1, background: '#e3e0d8', cursor: 'pointer' }} onClick={() => setLyricsOpen(o => !o)} />
            {docFile && (
              <a
                href={docFile.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#4a4850', textDecoration: 'none', border: '1px solid #e3e0d8', borderRadius: 8, padding: '5px 10px', flexShrink: 0 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24"><rect width="24" height="24" rx="2" fill="#4285f4"/><rect x="6" y="6" width="12" height="1.6" fill="#fff"/><rect x="6" y="10" width="12" height="1.6" fill="#fff"/><rect x="6" y="14" width="8" height="1.6" fill="#fff"/></svg>
                Lyrics doc <span style={{ fontSize: 11, color: '#8a8790' }}>↗</span>
              </a>
            )}
            <span
              onClick={() => setLyricsOpen(o => !o)}
              style={{ fontSize: 12, color: '#8a8790', display: 'inline-block', transform: lyricsOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}
            >▸</span>
          </div>
          {lyricsOpen && (
            lyricsLoading ? (
              <div style={{ fontSize: 13, fontStyle: 'italic', color: '#8a8790' }}>Loading lyrics…</div>
            ) : lyricsError ? (
              <div style={{ fontSize: 13, color: '#8a8790' }}>
                {lyricsError}
                {docFile && (
                  <> — <a href={docFile.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1D6E8F' }}>Open doc ↗</a></>
                )}
              </div>
            ) : lyrics ? (
              <div style={{ background: '#ffffff', border: '1px solid #e3e0d8', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', fontSize: 15, lineHeight: 1.8, color: '#1a1a1f' }}>
                {lyrics.split('\n').map((line, i) => {
                  if (line.startsWith('\x02TITLE\x03')) {
                    return <div key={i} style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 22, lineHeight: 1.3, marginBottom: 6 }}>{line.slice(7)}</div>
                  }
                  return <div key={i} style={{ whiteSpace: 'pre-wrap' }}>{line || '\u00a0'}</div>
                })}
              </div>
            ) : (
              <div style={{ fontSize: 13, fontStyle: 'italic', color: '#8a8790' }}>No lyrics doc linked yet</div>
            )
          )}
        </div>

      </div>
    </div>

    {/* Chord expand modal */}
    {expandedChord && (
      <div
        onClick={() => setExpandedChord(null)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ background: '#ffffff', borderRadius: 16, padding: '32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        >
          <div style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 800, fontSize: 36, color: '#1a1a1f', letterSpacing: '-0.02em' }}>{expandedChord.name}</div>
          <div style={{ transform: 'scale(2.2)', transformOrigin: 'top center', marginBottom: 90 * 2.2 - 90 + 16 }}>
            <ChordDiagram data={expandedChord.diagram} size="large" />
          </div>
          <button
            onClick={() => setExpandedChord(null)}
            style={{ marginTop: 4, fontSize: 12, color: '#8a8790', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Press Esc or click outside to close
          </button>
        </div>
      </div>
    )}
    </>
  )
}

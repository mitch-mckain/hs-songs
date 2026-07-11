'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getChordShapes, buildDiagramData, type ChordShape } from '@/lib/chords'
import ChordDiagram from '@/components/ChordDiagram'
import CustomChordBuilder from '@/components/CustomChordBuilder'
import NotesEditor from '@/components/NotesEditor'
import type { Song, SongChord, SongStructureRow } from '@/types/database'

const TUNING_OPTIONS = ['Std', 'Eb std', 'D std', 'Drop D', 'D A D F# A D', 'D A E A C# E']
const CHORD_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const CHORD_TYPES = [
  { value: 'major', label: 'Major' },
  { value: 'power', label: 'Power (5)' },
  { value: 'minor', label: 'Minor' },
  { value: '7', label: '7' },
  { value: 'maj7', label: 'Maj7' },
  { value: 'm7', label: 'm7' },
  { value: 'm7b5', label: 'm7♭5' },
  { value: 'dim7', label: 'dim7' },
  { value: '9', label: '9' },
  { value: 'sus2', label: 'Sus2' },
  { value: 'sus4', label: 'Sus4' },
]
const SECTION_TYPES = [
  { value: 'intro', label: 'Intro' },
  { value: 'verse', label: 'Verse' },
  { value: 'prehook', label: 'Pre/Hook' },
  { value: 'chorus', label: 'Chorus' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'outro', label: 'Outro' },
]

const PILL_COLORS: Record<string, { bg: string; color: string }> = {
  intro:   { bg: '#E6E1D4', color: '#6b665a' },
  verse:   { bg: '#CDECF7', color: '#1D6E8F' },
  prehook: { bg: '#FBE3B8', color: '#8A5A16' },
  chorus:  { bg: '#DCEEBF', color: '#4C7A20' },
  bridge:  { bg: '#E3DBF0', color: '#5B4A87' },
  outro:   { bg: '#E6E1D4', color: '#6b665a' },
}

interface StructureRow {
  id: string
  section_label: string
  section_type: string
  bar_count: string
  lyric_snippet: string
  chord_progression: string[]
}

interface AddedChord extends ChordShape {
  id: string
}

interface Props {
  // If provided, we're in edit mode
  initialSong?: Song
  initialChords?: SongChord[]
  initialStructureRows?: SongStructureRow[]
}

const ARROW_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%234a4850' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C%2Fsvg%3E")`

const inputStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 14,
  padding: '8px 10px',
  border: '1px solid #e3e0d8',
  borderRadius: 8,
  color: '#1a1a1f',
  background: '#ffffff',
  width: '100%',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 14,
  padding: '8px 32px 8px 10px',
  border: '1px solid #e3e0d8',
  borderRadius: 8,
  color: '#1a1a1f',
  background: '#ffffff',
  width: '100%',
  boxSizing: 'border-box',
  appearance: 'none',
  backgroundImage: ARROW_SVG,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  backgroundSize: '9px 6px',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#8a8790',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  marginBottom: 4,
  display: 'block',
  fontWeight: 600,
}

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#8a8790',
  marginBottom: 12,
}

export default function SongForm({ initialSong, initialChords = [], initialStructureRows = [] }: Props) {
  const router = useRouter()
  const isEdit = !!initialSong

  // Details
  const [title, setTitle] = useState(initialSong?.title ?? '')
  const [status, setStatus] = useState<'demo' | 'released'>(initialSong?.status ?? 'demo')
  const [album, setAlbum] = useState(initialSong?.album ?? '')
  const [key, setKey] = useState(initialSong?.key ?? '')
  const [bpm, setBpm] = useState(initialSong?.bpm ?? '')
  const [timeSignature, setTimeSignature] = useState(initialSong?.time_signature ?? '')
  const [capo, setCapo] = useState(initialSong?.capo ?? '')
  const [tuning, setTuning] = useState(initialSong?.tuning ?? 'Eb std')

  // Files
  const [driveFolderUrl, setDriveFolderUrl] = useState(initialSong?.drive_folder_url ?? '')
  const [notes, setNotes] = useState(initialSong?.notes ?? '')



  // Chord finder
  const [chordRoot, setChordRoot] = useState('G')
  const [chordType, setChordType] = useState('major')
  const [voicings, setVoicings] = useState<ChordShape[]>([])
  const [loadingVoicings, setLoadingVoicings] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTab, setPickerTab] = useState<'find' | 'custom'>('find')
  const [editingChordId, setEditingChordId] = useState<string | null>(null)
  const dragIndexRef = useRef<number | null>(null)
  const progDragRef = useRef<{ rowId: string; index: number } | null>(null)
  const rowDragIndexRef = useRef<number | null>(null)

  // Pre-populate chords from existing song
  const [addedChords, setAddedChords] = useState<AddedChord[]>(() =>
    initialChords.map(c => ({
      id: c.id,
      name: c.name,
      strings: c.strings as (number | 'x')[],
      barre: c.barre,
    }))
  )

  // Pre-populate structure rows — migrate legacy name-based progressions to chord IDs
  const [structureRows, setStructureRows] = useState<StructureRow[]>(() => {
    const nameToId = new Map(initialChords.map(c => [c.name, c.id]))
    return [...initialStructureRows]
      .sort((a, b) => a.position - b.position)
      .map(r => ({
        id: r.id,
        section_label: r.section_label,
        section_type: r.section_type,
        bar_count: r.bar_count?.toString() ?? '',
        lyric_snippet: r.lyric_snippet ?? '',
        chord_progression: (r.chord_progression as string[]).map(entry =>
          entry.startsWith('__') ? entry : (nameToId.get(entry) ?? entry)
        ),
      }))
  })

  const [saving, setSaving] = useState(false)

  const loadVoicings = useCallback(async () => {
    setLoadingVoicings(true)
    try {
      const shapes = await getChordShapes(chordRoot, chordType, tuning)
      setVoicings(shapes)
    } catch {
      setVoicings([])
    } finally {
      setLoadingVoicings(false)
    }
  }, [chordRoot, chordType, tuning])

  useEffect(() => { loadVoicings() }, [loadVoicings])

  function addChord(shape: ChordShape) {
    setAddedChords(prev => [...prev, { ...shape, id: crypto.randomUUID() }])
  }

  function removeChord(id: string) {
    const chord = addedChords.find(c => c.id === id)
    setAddedChords(prev => prev.filter(c => c.id !== id))
    if (chord) {
      setStructureRows(prev => prev.map(row => ({
        ...row,
        chord_progression: row.chord_progression.filter(id => id !== chord.id),
      })))
    }
  }

  function duplicateStructureRow(id: string) {
    setStructureRows(prev => {
      const idx = prev.findIndex(r => r.id === id)
      if (idx === -1) return prev
      const copy = { ...prev[idx], id: crypto.randomUUID() }
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]
    })
  }

  function addStructureRow() {
    setStructureRows(prev => [...prev, {
      id: crypto.randomUUID(),
      section_label: '',
      section_type: 'verse',
      bar_count: '2',
      lyric_snippet: '',
      chord_progression: [],
    }])
  }

  function updateStructureRow(id: string, patch: Partial<StructureRow>) {
    setStructureRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function appendChordToRow(rowId: string, chordId: string) {
    setStructureRows(prev => prev.map(r =>
      r.id === rowId ? { ...r, chord_progression: [...r.chord_progression, chordId] } : r
    ))
  }

  function removeChordFromRow(rowId: string, index: number) {
    setStructureRows(prev => prev.map(r =>
      r.id === rowId
        ? { ...r, chord_progression: r.chord_progression.filter((_, i) => i !== index) }
        : r
    ))
  }


  async function handleSave() {
    if (!title) return
    setSaving(true)
    try {
      const payload = {
        song: { title, status, album, key, bpm, time_signature: timeSignature, capo, tuning, drive_folder_url: driveFolderUrl, notes },
        chords: addedChords.map(c => ({ id: c.id, name: c.name, strings: c.strings, barre: c.barre })),
        structureRows: structureRows.map(r => ({
          section_label: r.section_label,
          section_type: r.section_type,
          bar_count: r.bar_count ? parseInt(r.bar_count) : null,
          lyric_snippet: r.lyric_snippet,
          chord_progression: r.chord_progression,
        })),
      }

      const res = await fetch(
        isEdit ? `/api/songs/${initialSong!.id}` : '/api/songs',
        { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      )
      const data = await res.json()
      if (data.id) router.push(`/songs/${data.id}`)
    } finally {
      setSaving(false)
    }
  }

  const cancelTarget = isEdit ? `/songs/${initialSong!.id}` : '/'

  return (
    <div className="detail-container" style={{ maxWidth: 920, margin: '0 auto', padding: '32px 20px 120px', minHeight: '100vh', background: '#fbfaf7' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => router.push(cancelTarget)}
          style={{ width: 36, height: 36, borderRadius: '50%', background: '#ffffff', border: '1px solid #e3e0d8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, marginBottom: 16 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#4a4850" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 2L4 7l5 5"/>
          </svg>
        </button>
        <div style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 800, fontSize: 'clamp(30px,7vw,44px)', color: '#1a1a1f', letterSpacing: '-0.04em' }}>
          {isEdit ? `Edit — ${initialSong!.title}` : 'New song'}
        </div>
      </div>

      {/* ── DETAILS ── */}
      <div style={sectionHeadingStyle}>Details</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 220px' }}>
          <label style={labelStyle}>Title</label>
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Song title" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 140px' }}>
          <label style={labelStyle}>Status</label>
          <select style={selectStyle} value={status} onChange={e => setStatus(e.target.value as 'demo' | 'released')}>
            <option value="demo">Demo</option>
            <option value="released">Released</option>
          </select>
        </div>
      </div>
      <div style={{ borderTop: '1px solid #e3e0d8', marginBottom: 14 }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 32 }}>
        {status === 'released' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 200px' }}>
            <label style={labelStyle}>Album</label>
            <input style={inputStyle} value={album} onChange={e => setAlbum(e.target.value)} placeholder="Album name" />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 90px' }}>
          <label style={labelStyle}>Key</label>
          <input style={inputStyle} value={key} onChange={e => setKey(e.target.value)} placeholder="G" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 90px' }}>
          <label style={labelStyle}>BPM</label>
          <input style={inputStyle} value={bpm} onChange={e => setBpm(e.target.value)} placeholder="~140" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 90px' }}>
          <label style={labelStyle}>Time sig</label>
          <input style={inputStyle} value={timeSignature} onChange={e => setTimeSignature(e.target.value)} placeholder="4/4" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 90px' }}>
          <label style={labelStyle}>Capo</label>
          <input style={inputStyle} value={capo} onChange={e => setCapo(e.target.value)} placeholder="—" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 160px' }}>
          <label style={labelStyle}>Tuning</label>
          <select style={selectStyle} value={tuning} onChange={e => setTuning(e.target.value)}>
            {TUNING_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* ── FILES ── */}
      <div style={sectionHeadingStyle}>Files (Google Drive)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
        <label style={labelStyle}>Drive Folder Link</label>
        <input
          style={inputStyle}
          value={driveFolderUrl}
          onChange={e => setDriveFolderUrl(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/…"
        />
      </div>
      <div style={{ fontSize: 12, color: '#b8b5be', marginBottom: 18 }}>
        The app will auto-detect the Logic project, lyrics doc, GP tab, and practice recordings from this folder.
      </div>

      {/* ── NOTES ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 32 }}>
        <label style={labelStyle}>Notes</label>
        <NotesEditor value={notes} onChange={setNotes} minHeight={140} />
      </div>


      {/* ── CHORDS ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={sectionHeadingStyle}>Chords</div>
        <div style={{ fontSize: 11, color: '#b8b5be' }}>Tuning: <b style={{ color: '#4a4850' }}>{tuning}</b></div>
      </div>

      {/* Chord bank */}
      {addedChords.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          {addedChords.map((chord, chordIndex) => {
            const diagram = buildDiagramData(chord, 'large')
            return (
              <div
                key={chord.id}
                draggable
                onDragStart={() => { dragIndexRef.current = chordIndex }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  const from = dragIndexRef.current
                  if (from === null || from === chordIndex) return
                  setAddedChords(prev => {
                    const next = [...prev]
                    const [moved] = next.splice(from, 1)
                    next.splice(chordIndex, 0, moved)
                    return next
                  })
                  dragIndexRef.current = null
                }}
                onClick={() => { setEditingChordId(chord.id); setPickerOpen(true); setPickerTab('build') }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  border: `1px solid ${editingChordId === chord.id ? '#1a1a1f' : '#e3e0d8'}`,
                  borderRadius: 10, padding: '20px 0 10px',
                  background: editingChordId === chord.id ? '#f5f3ee' : '#ffffff',
                  width: 108, position: 'relative', cursor: 'grab', userSelect: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <button
                  onClick={e => { e.stopPropagation(); removeChord(chord.id) }}
                  style={{ position: 'absolute', top: 4, right: 6, background: 'none', border: 'none', color: '#b8b5be', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}
                >×</button>
                <ChordDiagram data={diagram} size="large" />
                <div style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a1f', textAlign: 'center', marginTop: -14 }}>{chord.name}</div>
              </div>
            )
          })}
          {/* Add chord tile */}
          <button
            onClick={() => { setPickerOpen(true); setPickerTab('find'); setEditingChordId(null) }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px dashed #c7c3ba', borderRadius: 10, width: 108, minHeight: 128, background: 'transparent', cursor: 'pointer', color: '#8a8790' }}
          >
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/></svg>
            <span style={{ fontSize: 11, fontWeight: 600 }}>Add chord</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setPickerOpen(true); setPickerTab('find'); setEditingChordId(null) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, padding: '12px 16px', borderRadius: 8, border: '1px solid #e3e0d8', background: '#ffffff', color: '#4a4850', cursor: 'pointer', marginBottom: 14, width: '100%', boxSizing: 'border-box', justifyContent: 'center' }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/></svg>
          Add your first chord
        </button>
      )}

      {/* Chord picker panel */}
      {pickerOpen && (
        <div style={{ border: '1px solid #e3e0d8', borderRadius: 10, background: '#ffffff', marginBottom: 24, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e3e0d8' }}>
            <button
              onClick={() => setPickerTab('find')}
              style={{ flex: 1, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', padding: 11, border: 'none', cursor: 'pointer', background: pickerTab === 'find' ? '#f5f3ee' : '#ffffff', color: pickerTab === 'find' ? '#1a1a1f' : '#4a4850', borderRight: '1px solid #e3e0d8' }}
            >Find a chord</button>
            <button
              onClick={() => setPickerTab('custom')}
              style={{ flex: 1, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', padding: 11, border: 'none', cursor: 'pointer', background: pickerTab === 'custom' ? '#f5f3ee' : '#ffffff', color: pickerTab === 'custom' ? '#1a1a1f' : '#4a4850' }}
            >Build custom</button>
          </div>

          {pickerTab === 'find' && (
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: 10, color: '#8a8790', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginBottom: 6, display: 'block' }}>Root</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxWidth: 280 }}>
                    {CHORD_ROOTS.map(r => (
                      <button
                        key={r}
                        onClick={() => setChordRoot(r)}
                        style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, width: 30, height: 28, borderRadius: 6, border: '1px solid', borderColor: chordRoot === r ? '#1a1a1f' : '#e3e0d8', background: chordRoot === r ? '#1a1a1f' : '#ffffff', color: chordRoot === r ? '#fff' : '#4a4850', cursor: 'pointer' }}
                      >{r}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#8a8790', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginBottom: 6, display: 'block' }}>Type</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxWidth: 340 }}>
                    {CHORD_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setChordType(t.value)}
                        style={{ fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, padding: '0 10px', height: 28, borderRadius: 6, border: '1px solid', borderColor: chordType === t.value ? '#1a1a1f' : '#e3e0d8', background: chordType === t.value ? '#1a1a1f' : '#ffffff', color: chordType === t.value ? '#fff' : '#4a4850', cursor: 'pointer' }}
                      >{t.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: '#8a8790', marginBottom: 10 }}>
                Every fingering for {chordRoot} {CHORD_TYPES.find(t => t.value === chordType)?.label ?? chordType} — click one to add it.
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', padding: '4px 0', maxHeight: 220, overflowY: 'auto' }}>
                {loadingVoicings ? (
                  <div style={{ fontSize: 13, color: '#b8b5be', padding: 8, fontStyle: 'italic' }}>Loading…</div>
                ) : voicings.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#b8b5be', padding: 8, fontStyle: 'italic' }}>No fingerings found for this combination</div>
                ) : voicings.map((v, i) => {
                  const diagram = buildDiagramData(v, 'small')
                  return (
                    <div
                      key={i}
                      onClick={() => { addChord(v); setPickerOpen(false) }}
                      style={{ flex: '0 0 auto', width: 80, cursor: 'pointer', padding: 6, borderRadius: 6, background: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f5f3ee')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#1a1a1f', textAlign: 'center', marginBottom: 5 }}>{v.name}</div>
                      <ChordDiagram data={diagram} size="small" />
                    </div>
                  )
                })}
              </div>
              <div style={{ borderTop: '1px solid #e3e0d8', padding: '10px 0 0', display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  onClick={() => setPickerOpen(false)}
                  style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'none', color: '#8a8790', cursor: 'pointer' }}
                >Done</button>
              </div>
            </div>
          )}

          {pickerTab === 'custom' && (
            <div style={{ padding: 16 }}>
              <CustomChordBuilder
                tuning={tuning}
                initialStrings={editingChordId ? (addedChords.find(c => c.id === editingChordId)?.strings as (number | 'x')[]) : undefined}
                initialName={editingChordId ? addedChords.find(c => c.id === editingChordId)?.name : undefined}
                submitLabel={editingChordId ? 'Update chord' : 'Add chord'}
                onAdd={(shape) => {
                  if (editingChordId) {
                    setAddedChords(prev => prev.map(c => c.id === editingChordId ? { ...c, ...shape } : c))
                    setEditingChordId(null)
                  } else {
                    addChord(shape)
                  }
                  setPickerOpen(false)
                }}
                onCancel={() => { setPickerOpen(false); setEditingChordId(null) }}
              />
            </div>
          )}
        </div>
      )}

      <div style={{ height: 1, background: '#e3e0d8', marginBottom: 40 }} />

      {/* ── STRUCTURE ── */}
      <div style={sectionHeadingStyle}>Structure</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
        {structureRows.map((row, rowIndex) => {
          const pill = PILL_COLORS[row.section_type] ?? PILL_COLORS.verse
          const mode = row.chord_progression[0] === '__SEE_TAB__' ? 'seetab'
            : row.chord_progression[0] === '__SAME_AS__' ? 'sameas'
            : 'chords'
          const otherRows = structureRows.filter(r => r.id !== row.id && r.chord_progression[0] !== '__SAME_AS__')
          return (
            <div
              key={row.id}
              draggable
              onDragStart={() => { rowDragIndexRef.current = rowIndex }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                const from = rowDragIndexRef.current
                if (from === null || from === rowIndex) return
                setStructureRows(prev => {
                  const next = [...prev]
                  const [moved] = next.splice(from, 1)
                  next.splice(rowIndex, 0, moved)
                  return next
                })
                rowDragIndexRef.current = null
              }}
              style={{ border: '1px solid #e3e0d8', borderRadius: 10, padding: 14, background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <input
                  value={row.section_label}
                  onChange={e => updateStructureRow(row.id, { section_label: e.target.value })}
                  placeholder="SECTION"
                  style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, height: 34, padding: '0 10px', border: '1px solid #e3e0d8', borderRadius: 8, background: '#fbfaf7', color: '#1a1a1f', width: 118, boxSizing: 'border-box' }}
                />
                <select
                  value={row.section_type}
                  onChange={e => updateStructureRow(row.id, { section_type: e.target.value })}
                  style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 600, height: 34, padding: '0 28px 0 8px', borderRadius: 8, border: `1px solid ${pill.color}`, background: pill.bg, color: pill.color, boxSizing: 'border-box', appearance: 'none', backgroundImage: ARROW_SVG, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '9px 6px' }}
                >
                  {SECTION_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select
                  value={row.bar_count}
                  onChange={e => updateStructureRow(row.id, { bar_count: e.target.value })}
                  style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, height: 34, padding: '0 28px 0 8px', borderRadius: 8, border: '1px solid #e3e0d8', background: '#ffffff', color: '#1a1a1f', width: 72, boxSizing: 'border-box', appearance: 'none', backgroundImage: ARROW_SVG, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '9px 6px' }}
                >
                  <option value="">× reps</option>
                  {[1,2,3,4,6,8,12,16,24,32].map(n => <option key={n} value={n}>×{n}</option>)}
                </select>
                <input
                  value={row.lyric_snippet}
                  onChange={e => updateStructureRow(row.id, { lyric_snippet: e.target.value })}
                  placeholder="Lyric snippet"
                  style={{ fontFamily: 'inherit', fontSize: 12.5, height: 34, padding: '0 10px', border: '1px solid #e3e0d8', borderRadius: 8, background: '#fbfaf7', color: '#1a1a1f', flex: '1 1 140px', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <button
                    title="Duplicate"
                    onClick={() => duplicateStructureRow(row.id)}
                    style={{ width: 30, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', borderRadius: 6, color: '#b8b5be', fontSize: 15, cursor: 'pointer', padding: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ee'; e.currentTarget.style.color = '#4a4850' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#b8b5be' }}
                  >⧉</button>
                  <button
                    title="Delete"
                    onClick={() => setStructureRows(prev => prev.filter(r => r.id !== row.id))}
                    style={{ width: 30, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', borderRadius: 6, color: '#b8b5be', fontSize: 17, cursor: 'pointer', padding: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ee'; e.currentTarget.style.color = '#4a4850' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#b8b5be' }}
                  >×</button>
                  <button
                    title="Drag to reorder"
                    style={{ width: 30, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 6, background: 'none', color: '#c7c3ba', cursor: 'grab', fontSize: 14, lineHeight: 1, padding: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ee'; e.currentTarget.style.color = '#8a8790' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#c7c3ba' }}
                  >⠿</button>
                </div>
              </div>

              {/* Mode segmented control */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', border: '1px solid #e3e0d8', borderRadius: 8, overflow: 'hidden', height: 30 }}>
                  <button
                    onClick={() => { if (mode !== 'chords') updateStructureRow(row.id, { chord_progression: [] }) }}
                    style={{ fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, padding: '0 13px', border: 'none', cursor: 'pointer', background: mode === 'chords' ? '#f5f3ee' : '#ffffff', color: mode === 'chords' ? '#1a1a1f' : '#4a4850' }}
                  >Chords</button>
                  <button
                    onClick={() => updateStructureRow(row.id, { chord_progression: mode === 'sameas' ? [] : ['__SAME_AS__', otherRows[0] ? (otherRows[0].section_label || otherRows[0].section_type) : ''] })}
                    style={{ fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, padding: '0 13px', border: 'none', cursor: 'pointer', background: mode === 'sameas' ? '#f5f3ee' : '#ffffff', color: mode === 'sameas' ? '#1a1a1f' : '#4a4850', borderLeft: '1px solid #e3e0d8' }}
                  >Same as…</button>
                  <button
                    onClick={() => updateStructureRow(row.id, { chord_progression: mode === 'seetab' ? [] : ['__SEE_TAB__'] })}
                    style={{ fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, padding: '0 13px', border: 'none', cursor: 'pointer', background: mode === 'seetab' ? '#f5f3ee' : '#ffffff', color: mode === 'seetab' ? '#1a1a1f' : '#4a4850', borderLeft: '1px solid #e3e0d8' }}
                  >See tab</button>
                </div>
                {mode === 'sameas' && (
                  <select
                    value={row.chord_progression[1] ?? ''}
                    onChange={e => updateStructureRow(row.id, { chord_progression: ['__SAME_AS__', e.target.value] })}
                    style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 600, height: 30, padding: '0 28px 0 10px', borderRadius: 8, border: '1px solid #e3e0d8', background: '#ffffff', color: '#1a1a1f', boxSizing: 'border-box', appearance: 'none', backgroundImage: ARROW_SVG, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '9px 6px' }}
                  >
                    {otherRows.length === 0
                      ? <option value="">Add other sections first</option>
                      : otherRows.map(r => (
                          <option key={r.id} value={r.section_label || r.section_type}>{r.section_label || r.section_type}</option>
                        ))
                    }
                  </select>
                )}
              </div>

              {/* Chords mode content */}
              {mode === 'chords' && (
                <>
                  {addedChords.length > 0 ? (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#8a8790', marginBottom: 7 }}>Tap to add</div>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
                        {addedChords.map(chord => {
                          const d = buildDiagramData(chord, 'small')
                          return (
                            <button
                              key={chord.id}
                              onClick={() => appendChordToRow(row.id, chord.id)}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 10px 8px', borderRadius: 8, border: '1px solid #e3e0d8', background: '#ffffff', cursor: 'pointer' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#f5f3ee')}
                              onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                            >
                              <svg width="66" height="82" viewBox="-18 0 122 128">
                                {d.fretLabel && <text x="-10" y="32" fontSize="20" fill="#8a8790" textAnchor="middle" fontFamily="-apple-system,sans-serif" dominantBaseline="central">{d.fretLabel}</text>}
                                {[10, 26.4, 42.8, 59.2, 75.6, 92].map(x => <line key={x} x1={x} y1="14" x2={x} y2="110" stroke="#c7c3ba" strokeWidth="1.6"/>)}
                                {d.isOpen ? <rect x="10" y="12" width="82" height="4" fill="#1a1a1f"/> : <line x1="10" y1="14" x2="92" y2="14" stroke="#8a8790" strokeWidth="1.6"/>}
                                {[38, 62, 86, 110].map(y => <line key={y} x1="10" y1={y} x2="92" y2={y} stroke="#e3e0d8" strokeWidth="1.2"/>)}
                                {d.barreRect && <rect x={d.barreRect.x} y={d.barreRect.y} width={d.barreRect.width} height={d.barreRect.height} rx="3" fill="#1a1a1f"/>}
                                {d.mutes.map(m => <text key={m.x} x={m.x} y="4" fontSize="20" fontWeight="700" fill="#8a8790" textAnchor="middle" dominantBaseline="central">×</text>)}
                                {d.opens.map(o => <circle key={o.x} cx={o.x} cy="4" r="5" fill="none" stroke="#1a1a1f" strokeWidth="2"/>)}
                                {d.dots.map((dot, i) => <circle key={i} cx={dot.x} cy={dot.y} r="10.5" fill="#1a1a1f"/>)}
                              </svg>
                              <span style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontSize: 13, fontWeight: 700, color: '#1a1a1f' }}>{chord.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11.5, color: '#b8b5be', marginBottom: 12 }}>Add chords above first, then click one to add it here.</div>
                  )}

                  {row.chord_progression.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#8a8790', marginBottom: 7 }}>Progression</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '10px 12px', background: '#f5f3ee', borderRadius: 8 }}>
                        {row.chord_progression.map((chordId, i) => {
                          const chord = addedChords.find(c => c.id === chordId)
                          const isLast = i === row.chord_progression.length - 1
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div
                                draggable
                                onDragStart={() => { progDragRef.current = { rowId: row.id, index: i } }}
                                onDragOver={e => e.preventDefault()}
                                onDrop={() => {
                                  const from = progDragRef.current
                                  if (!from || from.rowId !== row.id || from.index === i) return
                                  setStructureRows(prev => prev.map(r => {
                                    if (r.id !== row.id) return r
                                    const prog = [...r.chord_progression]
                                    const [moved] = prog.splice(from.index, 1)
                                    prog.splice(i, 0, moved)
                                    return { ...r, chord_progression: prog }
                                  }))
                                  progDragRef.current = null
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', background: '#ffffff', border: '1px solid #e3e0d8', borderRadius: 8, overflow: 'hidden', cursor: 'grab' }}
                              >
                                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, fontWeight: 700, color: '#1a1a1f', padding: '0 10px', height: 26, display: 'flex', alignItems: 'center' }}>
                                  {chord?.name ?? chordId}
                                </span>
                                <button
                                  onClick={() => removeChordFromRow(row.id, i)}
                                  style={{ alignSelf: 'stretch', background: 'none', border: 'none', borderLeft: '1px solid #e3e0d8', color: '#8a8790', fontSize: 13, cursor: 'pointer', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#1a1a1f'; e.currentTarget.style.color = '#fff' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#8a8790' }}
                                >×</button>
                              </div>
                              {!isLast && <span style={{ color: '#c7c3ba', fontSize: 13 }}>—›</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
      <button onClick={addStructureRow} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', background: 'none', color: '#4a4850', border: '1px dashed #c7c3ba', marginBottom: 36, width: '100%' }}>
        + Add section
      </button>

      {/* ── FIXED SAVE BAR ── */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: '#ffffff', borderTop: '1px solid #e3e0d8', zIndex: 10 }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
        <button
          onClick={() => router.push(cancelTarget)}
          style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 8, cursor: 'pointer', background: '#ffffff', color: '#4a4850', border: '1px solid #e3e0d8' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!title || saving}
          style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontSize: 13, fontWeight: 800, letterSpacing: '-0.02em', padding: '9px 22px', borderRadius: 8, cursor: title ? 'pointer' : 'not-allowed', background: title ? '#1a1a1f' : '#f5f3ee', color: title ? '#fff' : '#b8b5be', border: 'none' }}
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save song'}
        </button>
      </div>
      </div>
    </div>
  )
}

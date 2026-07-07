'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getChordShapes, buildDiagramData, type ChordShape } from '@/lib/chords'
import ChordDiagram from '@/components/ChordDiagram'
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

const inputStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 14,
  padding: '8px 10px',
  border: '1px solid #ebebea',
  borderRadius: 6,
  color: '#37352f',
  background: '#fff',
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#b6b5b2',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 4,
  display: 'block',
}

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#b6b5b2',
  marginBottom: 12,
}

export default function SongForm({ initialSong, initialChords = [], initialStructureRows = [] }: Props) {
  const router = useRouter()
  const isEdit = !!initialSong

  // Details
  const [title, setTitle] = useState(initialSong?.title ?? '')
  const [status, setStatus] = useState<'demo' | 'released' | 'retired'>(initialSong?.status ?? 'demo')
  const [album, setAlbum] = useState(initialSong?.album ?? '')
  const [key, setKey] = useState(initialSong?.key ?? '')
  const [bpm, setBpm] = useState(initialSong?.bpm ?? '')
  const [capo, setCapo] = useState(initialSong?.capo ?? '')
  const [tuning, setTuning] = useState(initialSong?.tuning ?? 'Eb std')

  // Files
  const [driveFolderUrl, setDriveFolderUrl] = useState(initialSong?.drive_folder_url ?? '')
  const [logicUrl, setLogicUrl] = useState(initialSong?.logic_url ?? '')
  const [lyricsDocUrl, setLyricsDocUrl] = useState(initialSong?.lyrics_doc_url ?? '')
  const [notes, setNotes] = useState(initialSong?.notes ?? '')

  // Riff
  const [riffMode, setRiffMode] = useState<'gp_tab' | 'photo'>('gp_tab')
  const [tabFile, setTabFile] = useState<File | null>(null)

  // Chord finder
  const [chordRoot, setChordRoot] = useState('G')
  const [chordType, setChordType] = useState('major')
  const [voicings, setVoicings] = useState<ChordShape[]>([])
  const [loadingVoicings, setLoadingVoicings] = useState(false)

  // Pre-populate chords from existing song
  const [addedChords, setAddedChords] = useState<AddedChord[]>(() =>
    initialChords.map(c => ({
      id: c.id,
      name: c.name,
      strings: c.strings as (number | 'x')[],
      barre: c.barre,
    }))
  )

  // Pre-populate structure rows
  const [structureRows, setStructureRows] = useState<StructureRow[]>(() =>
    [...initialStructureRows]
      .sort((a, b) => a.position - b.position)
      .map(r => ({
        id: r.id,
        section_label: r.section_label,
        section_type: r.section_type,
        bar_count: r.bar_count?.toString() ?? '',
        lyric_snippet: r.lyric_snippet ?? '',
        chord_progression: r.chord_progression as string[],
      }))
  )

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
        chord_progression: row.chord_progression.filter(n => n !== chord.name),
      })))
    }
  }

  function addStructureRow() {
    setStructureRows(prev => [...prev, {
      id: crypto.randomUUID(),
      section_label: '',
      section_type: 'verse',
      bar_count: '',
      lyric_snippet: '',
      chord_progression: [],
    }])
  }

  function updateStructureRow(id: string, patch: Partial<StructureRow>) {
    setStructureRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function appendChordToRow(rowId: string, chordName: string) {
    setStructureRows(prev => prev.map(r =>
      r.id === rowId ? { ...r, chord_progression: [...r.chord_progression, chordName] } : r
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
        song: { title, status, album, key, bpm, capo, tuning, drive_folder_url: driveFolderUrl, logic_url: logicUrl, lyrics_doc_url: lyricsDocUrl, notes },
        chords: addedChords.map(c => ({ name: c.name, strings: c.strings, barre: c.barre })),
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
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 140px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => router.push(cancelTarget)}
          style={{ background: 'none', border: 'none', padding: '6px 8px', marginLeft: -8, fontFamily: 'inherit', fontWeight: 600, fontSize: 13, color: '#9b9a97', cursor: 'pointer', borderRadius: 6 }}
        >
          ← {isEdit ? 'Cancel' : 'Cancel'}
        </button>
      </div>
      <div style={{ fontWeight: 700, fontSize: 'clamp(24px,6vw,32px)', color: '#17181c', marginBottom: 28, letterSpacing: '-0.02em' }}>
        {isEdit ? `Edit — ${initialSong!.title}` : 'New song'}
      </div>

      {/* ── DETAILS ── */}
      <div style={sectionHeadingStyle}>Details</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 220px' }}>
          <label style={labelStyle}>Title</label>
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Song title" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 140px' }}>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value as 'demo' | 'released' | 'retired')}>
            <option value="demo">Demo</option>
            <option value="released">Released</option>
            <option value="retired">Retired</option>
          </select>
        </div>
        {status === 'released' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 200px' }}>
            <label style={labelStyle}>Album</label>
            <input style={inputStyle} value={album} onChange={e => setAlbum(e.target.value)} placeholder="Album name" />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 90px' }}>
          <label style={labelStyle}>Key</label>
          <input style={inputStyle} value={key} onChange={e => setKey(e.target.value)} placeholder="G" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 90px' }}>
          <label style={labelStyle}>BPM</label>
          <input style={inputStyle} value={bpm} onChange={e => setBpm(e.target.value)} placeholder="~140" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 90px' }}>
          <label style={labelStyle}>Capo</label>
          <input style={inputStyle} value={capo} onChange={e => setCapo(e.target.value)} placeholder="—" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 160px' }}>
          <label style={labelStyle}>Tuning</label>
          <select style={inputStyle} value={tuning} onChange={e => setTuning(e.target.value)}>
            {TUNING_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* ── FILES ── */}
      <div style={sectionHeadingStyle}>Files (Google Drive)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
        <label style={labelStyle}>Drive Folder Link</label>
        <input style={inputStyle} value={driveFolderUrl} onChange={e => setDriveFolderUrl(e.target.value)} placeholder="https://drive.google.com/drive/folders/…" />
      </div>
      <div style={{ fontSize: 12, color: '#b6b5b2', marginBottom: 18 }}>
        This folder should hold the lyric doc, the .gp tab, the Logic project, and the mp3 demo.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 220px' }}>
          <label style={labelStyle}>Logic Project Link</label>
          <input style={inputStyle} value={logicUrl} onChange={e => setLogicUrl(e.target.value)} placeholder="https://drive.google.com/…" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 220px' }}>
          <label style={labelStyle}>Lyrics Doc Link</label>
          <input style={inputStyle} value={lyricsDocUrl} onChange={e => setLyricsDocUrl(e.target.value)} placeholder="https://docs.google.com/…" />
        </div>
      </div>

      {/* ── NOTES ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 32 }}>
        <label style={labelStyle}>Notes</label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' } as React.CSSProperties}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Anything worth remembering about this demo — takes, tempo drift, what still needs work…"
        />
      </div>

      {/* ── RIFF ── */}
      <div style={sectionHeadingStyle}>Riff</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['gp_tab', 'photo'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setRiffMode(mode)}
            style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', border: 'none', background: riffMode === mode ? '#17181c' : '#f1f1ef', color: riffMode === mode ? '#fff' : '#5f5e5b' }}
          >
            {mode === 'gp_tab' ? 'Guitar Pro tab' : 'Photo'}
          </button>
        ))}
      </div>
      <div style={{ border: '1px solid #ebebea', borderRadius: 10, padding: 16, background: '#fbfbfa', marginBottom: 32 }}>
        {riffMode === 'gp_tab' ? (
          <div>
            <input type="file" accept=".gp,.gp3,.gp4,.gp5,.gpx" onChange={e => setTabFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13 }} />
            {tabFile && (
              <div style={{ marginTop: 10, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: '#5f5e5b' }}>✓ {tabFile.name}</div>
            )}
          </div>
        ) : (
          <div style={{ width: '100%', height: 220, border: '2px dashed #dcdcda', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b6b5b2', fontSize: 13 }}>
            Drop the tab/riff photo here
          </div>
        )}
      </div>

      {/* ── CHORDS ── */}
      <div style={sectionHeadingStyle}>Chords</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Root</label>
          <select style={{ ...inputStyle, width: 90 }} value={chordRoot} onChange={e => setChordRoot(e.target.value)}>
            {CHORD_ROOTS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Chord Type</label>
          <select style={{ ...inputStyle, width: 140 }} value={chordType} onChange={e => setChordType(e.target.value)}>
            {CHORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#b6b5b2', marginBottom: 8 }}>
        Using tuning: <b style={{ color: '#5f5e5b' }}>{tuning}</b> — set above in Details
      </div>
      <div style={{ fontSize: 12, color: '#b6b5b2', marginBottom: 8 }}>
        Every fingering available for this chord — pick whichever fits how you play it.
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: 12, border: '1px solid #ebebea', borderRadius: 10, marginBottom: 18, maxHeight: 280, overflowY: 'auto' }}>
        {loadingVoicings ? (
          <div style={{ fontSize: 13, color: '#c9c8c4', padding: 8, fontStyle: 'italic' }}>Loading…</div>
        ) : voicings.length === 0 ? (
          <div style={{ fontSize: 13, color: '#c9c8c4', padding: 8, fontStyle: 'italic' }}>No fingerings found for this combination</div>
        ) : voicings.map((v, i) => {
          const diagram = buildDiagramData(v, 'small')
          return (
            <div key={i} onClick={() => addChord(v)} style={{ flex: '0 0 auto', width: 80, cursor: 'pointer', padding: 6, borderRadius: 8 }} className="hover:bg-[#f1f1ef]">
              <div style={{ fontWeight: 700, fontSize: 12, color: '#17181c', textAlign: 'center', marginBottom: 6 }}>{v.name}</div>
              <ChordDiagram data={diagram} size="small" />
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: '#9b9a97', marginBottom: 10 }}>Song chords</div>
      {addedChords.length === 0 ? (
        <div style={{ fontSize: 13, fontStyle: 'italic', color: '#c9c8c4', marginBottom: 32 }}>None added yet — click a chord above</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
          {addedChords.map(chord => {
            const diagram = buildDiagramData(chord, 'large')
            return (
              <div key={chord.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, border: '1px solid #ebebea', borderRadius: 10, padding: 14, flexWrap: 'wrap' }}>
                <ChordDiagram data={diagram} size="large" />
                <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#17181c' }}>{chord.name}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {chord.strings.map((s, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{ fontSize: 9, color: '#b6b5b2' }}>{'EADGBE'[i]}</span>
                        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#5f5e5b', width: 34, textAlign: 'center', padding: '4px 2px', border: '1px solid #ebebea', borderRadius: 4 }}>
                          {s === 'x' ? '×' : s}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => removeChord(chord.id)} style={{ background: 'none', border: 'none', color: '#b6b5b2', fontSize: 18, cursor: 'pointer', flex: '0 0 auto', padding: 4 }}>×</button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── STRUCTURE ── */}
      <div style={sectionHeadingStyle}>Structure</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {structureRows.map(row => (
          <div key={row.id} style={{ display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid #ebebea', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <input style={{ ...inputStyle, width: 110 }} value={row.section_label} onChange={e => updateStructureRow(row.id, { section_label: e.target.value })} placeholder="SECTION" />
              <input style={{ ...inputStyle, width: 60 }} value={row.bar_count} onChange={e => updateStructureRow(row.id, { bar_count: e.target.value })} placeholder="×2" />
              <select style={{ ...inputStyle, width: 120 }} value={row.section_type} onChange={e => updateStructureRow(row.id, { section_type: e.target.value })}>
                {SECTION_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <input style={{ ...inputStyle, flex: '1 1 160px' }} value={row.lyric_snippet} onChange={e => updateStructureRow(row.id, { lyric_snippet: e.target.value })} placeholder="Lyric snippet" />
              <button onClick={() => setStructureRows(prev => prev.filter(r => r.id !== row.id))} style={{ background: 'none', border: 'none', color: '#b6b5b2', fontSize: 18, cursor: 'pointer', flex: '0 0 auto', padding: 4 }}>×</button>
            </div>
            {addedChords.length > 0 ? (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {addedChords.map(chord => (
                  <button key={chord.id} onClick={() => appendChordToRow(row.id, chord.name)} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, fontWeight: 600, padding: '4px 9px', borderRadius: 5, cursor: 'pointer', background: '#f1f1ef', color: '#37352f', border: 'none' }} className="hover:bg-[#e8e8e5]">
                    {chord.name}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11.5, color: '#b6b5b2' }}>Add chords above first, then click one to add it here.</div>
            )}
            {row.chord_progression.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                {row.chord_progression.map((name, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {i > 0 && <span style={{ fontSize: 11, color: '#d8d7d3' }}>→</span>}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 600, padding: '3px 6px 3px 8px', borderRadius: 5, background: '#f1f1ef', color: '#37352f' }}>
                      {name}
                      <button onClick={() => removeChordFromRow(row.id, i)} style={{ background: 'none', border: 'none', color: '#b6b5b2', fontSize: 13, lineHeight: 1, cursor: 'pointer', padding: 0 }}>×</button>
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: '#b6b5b2', marginBottom: 12 }}>Click a chord to append it to that row's progression, in order.</div>
      <button onClick={addStructureRow} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', background: '#f1f1ef', color: '#5f5e5b', border: 'none', marginBottom: 36 }}>
        + Add row
      </button>

      {/* ── SAVE ── */}
      <div>
        <button
          onClick={handleSave}
          disabled={!title || saving}
          style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, padding: '12px 22px', borderRadius: 8, cursor: title ? 'pointer' : 'not-allowed', background: title ? '#17181c' : '#e0e0e0', color: '#fff', border: 'none' }}
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save song'}
        </button>
      </div>
    </div>
  )
}
